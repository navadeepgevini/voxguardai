import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import uvicorn
import json
import logging
from database import init_db, get_connection
from routers import calls, identities, settings, analyze, auth, keys, notifications
from middleware_util import RateLimitMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("voxguard")

# Initialize database
init_db()

app = FastAPI(
    title="VoxGuard / EchoGuard AI — SOC Backend Engine",
    description="Real-Time Multi-Modal Voice Trust & Threat Response System (AMVTF v2.4)",
    version="2.4.0",
)

app.add_middleware(RateLimitMiddleware)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Let FastAPI/Starlette HTTPException handlers own 4xx responses
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    env = os.environ.get("ENVIRONMENT", "development").strip().lower()
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    detail = str(exc) if env not in ("production", "prod") else "Internal server error"
    return JSONResponse(status_code=500, content={"detail": detail})


def _cors_origins() -> list:
    raw = os.environ.get("ALLOWED_ORIGINS", "").strip()
    if raw:
        origins = [o.strip() for o in raw.split(",") if o.strip()]
        if origins:
            return origins
    env = os.environ.get("ENVIRONMENT", "development").strip().lower()
    if env in ("production", "prod"):
        # Fail closed in production if misconfigured: empty list forces explicit config
        print("[CORS] WARNING: ALLOWED_ORIGINS unset in production; denying browser CORS.")
        return []
    return ["http://localhost:3000", "http://127.0.0.1:3000"]


_origins = _cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins if _origins else ["http://127.0.0.1:0"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(keys.router)
app.include_router(calls.router)
app.include_router(identities.router)
app.include_router(settings.router)
app.include_router(analyze.router)
app.include_router(notifications.router)


@app.get("/api/health")
def health_check():
    """Honest readiness summary — labels match implemented engines, not marketing names."""
    joblib_path = os.path.join(os.path.dirname(__file__), "engines", "trained_live_classifier.joblib")
    return {
        "status": "healthy",
        "system": "EchoGuard AI",
        "engine": "AMVTF v2.4",
        "environment": os.environ.get("ENVIRONMENT", "development"),
        "models": {
            "authenticity": {
                "id": "aasist_engine",
                "implementation": "acoustic_heuristics_optional_sklearn",
                "optional_sklearn_weights_present": os.path.isfile(joblib_path),
            },
            "identity": {
                "id": "ecapa_engine",
                "implementation": "fft_mel_projection_192d_cosine",
            },
            "nlp": {
                "id": "nlp_engine",
                "implementation": "speechrecognition_google_asr_plus_keyword_dictionary",
            },
            "fusion": {
                "id": "amvtf_engine",
                "implementation": "deterministic_weighted_rules",
            },
        },
        "realtime": {
            "websocket_audio_stream": "simulated_demo",
            "websocket_live_analyze": "real_authenticity_inference",
            "http_live_analyze": "supported",
        },
        "detector_backend": os.environ.get("VOXGUARD_DETECTOR_BACKEND", "sklearn"),
    }


def _ws_token_valid(token: str | None) -> bool:
    if not token:
        return False
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT expires_at FROM sessions WHERE token = ?", (token,))
        row = cursor.fetchone()
        if not row:
            return False
        from deps import _session_expired
        if _session_expired(row["expires_at"]):
            cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()
            return False
        return True
    finally:
        conn.close()


@app.websocket("/ws/audio-stream")
async def websocket_audio_stream(websocket: WebSocket, token: str | None = Query(None)):
    """
    Demo WebSocket frame echo. Requires ?token=<session> unless ALLOW_DEMO_WS=true.
    Prefer /ws/live-analyze for real authenticity inference.
    """
    allow_demo = os.environ.get("ALLOW_DEMO_WS", "").strip().lower() in ("1", "true", "yes", "on")
    if not allow_demo and not _ws_token_valid(token):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                json.loads(data)
                await websocket.send_json({
                    "type": "FRAME_PROCESSED",
                    "mode": "simulated_demo",
                    "vadActive": True,
                    "frameRms": 0.42,
                    "authenticityEstimate": 96.5,
                    "latencyMs": 18,
                    "note": "Simulated frame — use /ws/live-analyze for real inference.",
                })
            except Exception:
                await websocket.send_text("PONG")
    except WebSocketDisconnect:
        pass


@app.websocket("/ws/live-analyze")
async def websocket_live_analyze(
    websocket: WebSocket,
    token: str | None = Query(None),
    session_id: str | None = Query(None),
):
    """
    Real-time authenticity inference over WebSocket.

    Auth: ?token=<session> required (same sessions table as HTTP Bearer).

    Send either:
      - binary: PCM16 LE mono @ 16 kHz (preferred) or WAV bytes
      - text JSON: {"type":"pcm16_b64","data":"..."} or {"type":"ping"}

    Server responds with LIVE_INFERENCE JSON when ~1.8 s of audio accumulates.
    """
    if not _ws_token_valid(token):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    from engines.ws_live import LiveStreamBuffer, analyze_window, decode_text_message, pcm_from_b64
    from engines.live_session import live_session_aggregator

    sid = session_id or f"ws_{token[:12]}"
    buf = LiveStreamBuffer(sr=16000, window_seconds=1.8)

    await websocket.accept()
    await websocket.send_json({
        "type": "SESSION_READY",
        "sessionId": sid,
        "windowSeconds": 1.8,
        "sampleRate": 16000,
        "note": "Send PCM16@16kHz binary frames. Browser mic ≠ arbitrary call audio.",
    })
    try:
        while True:
            message = await websocket.receive()
            window = None
            if message.get("type") == "websocket.disconnect":
                break
            if "bytes" in message and message["bytes"] is not None:
                window = buf.push_bytes(message["bytes"])
            elif "text" in message and message["text"] is not None:
                text = message["text"]
                if text.strip().upper() == "PING":
                    await websocket.send_json({"type": "PONG"})
                    continue
                try:
                    payload = decode_text_message(text)
                except Exception:
                    await websocket.send_json({"type": "ERROR", "detail": "invalid_json"})
                    continue
                if payload.get("type") == "ping":
                    await websocket.send_json({"type": "PONG"})
                    continue
                if payload.get("type") == "end":
                    live_session_aggregator.reset(sid)
                    await websocket.send_json({"type": "SESSION_ENDED", "sessionId": sid})
                    break
                if payload.get("type") == "pcm16_b64" and payload.get("data"):
                    window = buf.push_pcm16(pcm_from_b64(payload["data"]))
                if payload.get("session_id"):
                    sid = str(payload["session_id"])

            if window is not None and len(window) > 0:
                result = analyze_window(window, session_id=sid, sr=16000)
                await websocket.send_json(result)
    except WebSocketDisconnect:
        pass
    finally:
        # Keep session state for HTTP poll continuity; caller may reset via type=end
        pass


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
