from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Optional, List
from pydantic import BaseModel
import datetime

from engines.aasist import aasist_engine
from engines.ecapa import ecapa_engine
from engines.nlp import nlp_engine
from engines.amvtf import amvtf_engine
from engines.spectrogram import spectrogram_engine
from engines.live_session import live_session_aggregator
from models import AudioAnalysisResponse, TranscriptMessage
from deps import require_current_user

router = APIRouter(prefix="/api/analyze", tags=["Analysis"])

MAX_AUDIO_BYTES = 25 * 1024 * 1024

class TextAnalysisRequest(BaseModel):
    text: str
    targetProfileId: Optional[str] = None

class TestEvaluationRequest(BaseModel):
    testType: str # "BENIGN_INQUIRY", "SUSPICIOUS_URGENCY", "SYNTHETIC_THREAT"
    transcript: Optional[str] = None
    targetProfileId: Optional[str] = None

@router.post("/audio", response_model=AudioAnalysisResponse)
async def analyze_audio_upload(
    file: UploadFile = File(...),
    transcript: Optional[str] = Form(""),
    target_profile_id: Optional[str] = Form(None),
    caller_name: Optional[str] = Form(None),
    _user: dict = Depends(require_current_user),
):
    """
    Analyzes an uploaded raw audio file (.wav, .mp3, .ogg, .flac) or recorded audio blob
    through the genuine multi-signal AMVTF pipeline.
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty audio file provided.")
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file exceeds 25MB limit.")

    from engines.audio_preprocess import validate_upload
    ok, reason, _samples, quality = validate_upload(content, max_bytes=MAX_AUDIO_BYTES, max_duration_s=300.0)
    if not ok and reason in ("file_too_large", "duration_exceeded", "decode_failed", "empty_payload"):
        raise HTTPException(status_code=400, detail=f"Audio rejected: {reason}")
    # Silence / too_short still analyzed so UI can show INSUFFICIENT_AUDIO

    # 1. Authenticity (heuristics ± sklearn SoftVoting — not Jung AASIST GNN)
    auth_res = aasist_engine.analyze_audio(audio_data=content)

    # 2. Real ECAPA-TDNN speaker verification against actual SQLite database voiceprints
    id_res = ecapa_engine.verify_speaker(live_audio=content, target_profile_id=target_profile_id)

    # 3. Transcribe audio to extract real spoken words from uploaded file
    extracted_text = transcript.strip() if transcript and transcript.strip() else ""
    if content:
        audio_transcript = nlp_engine.transcribe_audio(content)
        if audio_transcript:
            if extracted_text and extracted_text.lower() not in audio_transcript.lower():
                extracted_text = f"{extracted_text} {audio_transcript}".strip()
            else:
                extracted_text = audio_transcript

    eval_text = extracted_text if extracted_text else f"Audio recording analysis: {file.filename}"
    nlp_res = nlp_engine.analyze_text(text=eval_text)

    # 4. AMVTF Adaptive Multi-Signal Fusion
    fusion_res = amvtf_engine.fuse_signals(
        authenticity=auth_res["authenticity"],
        identity=id_res["identity"],
        context_risk=nlp_res["contextRisk"],
        matched_profile=id_res["matchedProfile"],
        is_identity_match=id_res["isMatch"],
        target_profile_requested=bool(target_profile_id),
        detection_state=auth_res.get("detectionState"),
        synthetic_probability=auth_res.get("syntheticProbability"),
    )

    caller_label = caller_name or f"Intake: {file.filename}"
    now_str = datetime.datetime.now().strftime("%H:%M:%S")

    # Build real transcript representation
    transcript_messages = []
    if extracted_text:
        transcript_messages.append(
            TranscriptMessage(
                speaker="Caller",
                text=extracted_text,
                time=now_str,
                alert=bool(nlp_res["threatKeywords"]),
                threatKeywords=nlp_res["threatKeywords"]
            )
        )
    else:
        transcript_messages.append(
            TranscriptMessage(
                speaker="Audio Ingest",
                text=f"Processed {file.filename} ({len(content)} bytes, Entropy: {auth_res['spectralEntropy']}, ZCR: {auth_res['zcr']})",
                time=now_str,
                alert=False
            )
        )

    transcript_messages.append(
        TranscriptMessage(
            speaker="AMVTF Core",
            text=f"Authenticity: {auth_res['authStatus']} | Identity: {id_res['idStatus']}",
            time=now_str,
            alert=fusion_res["verdict"] in ["WARNING", "CRITICAL"]
        )
    )

    # 5. Generate official Analysis Evidence Spectrogram directly from normalized audio used for inference
    norm_samples, _ = aasist_engine._decode_audio(content)
    spec_evidence = spectrogram_engine.generate_spectrogram(
        samples=norm_samples,
        filename=file.filename or "uploaded_audio.wav"
    )

    return AudioAnalysisResponse(
        callerName=caller_label,
        enrolledTarget=id_res["matchedProfile"],
        contextTitle=nlp_res["contextTitle"],
        authenticity=auth_res["authenticity"],
        identity=id_res["identity"],
        contextRisk=nlp_res["contextRisk"],
        fusedRiskScore=fusion_res["fusedRiskScore"],
        authStatus=auth_res["authStatus"],
        idStatus=id_res["idStatus"],
        nlpIntent=nlp_res["nlpIntent"],
        threatKeywords=nlp_res["threatKeywords"],
        semanticFlags=nlp_res["semanticFlags"],
        recommendedAction=fusion_res["recommendedAction"],
        actionType=fusion_res["actionType"],
        rationale=fusion_res["rationale"],
        transcript=transcript_messages,
        spectralEntropy=auth_res.get("spectralEntropy"),
        zcr=auth_res.get("zcr"),
        jitter=auth_res.get("jitter"),
        kurtosis=auth_res.get("kurtosis"),
        syntheticIndicators=auth_res.get("syntheticIndicators", []),
        spectrogram=spec_evidence,
        syntheticProbability=auth_res.get("syntheticProbability"),
        detectionState=auth_res.get("detectionState"),
        modelVersion=auth_res.get("modelVersion"),
        mlConfidence=auth_res.get("mlConfidence"),
        uncertainty=auth_res.get("uncertainty"),
    )

@router.post("/live", response_model=AudioAnalysisResponse)
async def analyze_live_mic(
    transcript: str = Form(""),
    target_profile_id: Optional[str] = Form(None),
    caller_name: Optional[str] = Form("Live Operator / Mic"),
    audio: Optional[UploadFile] = File(None),
    session_id: Optional[str] = Form(None),
    _user: dict = Depends(require_current_user),
):
    """
    Analyzes live microphone audio chunks with temporal session aggregation.
    """
    audio_bytes = await audio.read() if audio else None
    if audio_bytes and len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio chunk exceeds 25MB limit.")

    # 1. Authenticity + identity
    if audio_bytes and len(audio_bytes) >= 16:
        auth_res = aasist_engine.analyze_live_chunk(audio_data=audio_bytes)
        id_res = ecapa_engine.verify_speaker(live_audio=audio_bytes, target_profile_id=target_profile_id)
    else:
        auth_res = {
            "authenticity": 50.0,
            "syntheticProbability": 50.0,
            "detectionState": "WAITING_FOR_SPEECH",
            "authStatus": "WAITING_FOR_SPEECH: No audio chunk",
            "spectralEntropy": 0.45,
            "zcr": 0.08,
            "vocoderArtifactsDetected": False,
            "isSynthetic": False,
            "jitter": 0.0,
            "kurtosis": 0.0,
            "syntheticIndicators": [],
            "modelVersion": aasist_engine.model_version,
            "mlConfidence": 50.0,
            "uncertainty": 1.0,
            "voiced": False,
        }
        id_res = {
            "identity": 0.0,
            "idStatus": "Audio Feed Processing in Progress",
            "matchedProfile": "Live Speaker",
            "isMatch": False,
            "similarityScore": 0.0
        }

    sid = session_id or f"user_{_user.get('id', 'anon')}"

    # 3. Live captions: browser transcript + server ASR on the audio chunk
    browser_text = transcript.strip() if transcript and transcript.strip() else ""
    asr_text = ""
    if audio_bytes and len(audio_bytes) >= 1000:
        asr_text = nlp_engine.transcribe_audio(audio_bytes) or ""

    # Prefer new ASR fragment for session accumulation; keep browser cumulative for NLP
    caption_for_session = asr_text.strip() if asr_text.strip() else ""
    if browser_text and not caption_for_session:
        # Browser often sends the full cumulative string — store as session caption snapshot
        caption_for_session = browser_text

    extracted_text = browser_text
    if asr_text:
        if extracted_text and asr_text.lower() not in extracted_text.lower():
            extracted_text = f"{extracted_text} {asr_text}".strip()
        elif not extracted_text:
            extracted_text = asr_text

    session_meta = live_session_aggregator.update(
        session_id=sid,
        synthetic_probability=float(auth_res.get("syntheticProbability", 50.0)),
        voiced=bool(auth_res.get("voiced", False)),
        detection_state=str(auth_res.get("detectionState") or "UNCERTAIN"),
        caption_chunk=caption_for_session or None,
    )
    # Prefer session-level synthetic risk for SOC fusion when enough voiced audio exists
    session_state = session_meta["sessionDetectionState"]
    session_syn = session_meta["sessionSyntheticProbability"]
    session_caption = (session_meta.get("sessionCaption") or "").strip()
    fusion_detection_state = session_state if session_meta["voicedSecondsAccumulated"] >= 3.0 else auth_res.get("detectionState")
    fusion_syn = session_syn if session_meta["voicedSecondsAccumulated"] >= 3.0 else auth_res.get("syntheticProbability")

    # Display caption: session aggregate > current extract
    live_caption = session_caption or extracted_text
    if live_caption and (not extracted_text or len(live_caption) >= len(extracted_text)):
        extracted_text = live_caption

    print(
        f"[LIVE] bytes={len(audio_bytes) if audio_bytes else 0} | chunk={auth_res.get('detectionState')} "
        f"syn={auth_res.get('syntheticProbability')} | session={session_state} ema={session_syn} | "
        f"caption_len={len(live_caption)}"
    )

    nlp_res = nlp_engine.analyze_text(text=extracted_text)

    # 4. AMVTF Fusion (acoustic ≠ fraud language)
    fusion_res = amvtf_engine.fuse_signals(
        authenticity=auth_res["authenticity"],
        identity=id_res["identity"],
        context_risk=nlp_res["contextRisk"],
        matched_profile=id_res["matchedProfile"],
        is_identity_match=id_res["isMatch"],
        target_profile_requested=bool(target_profile_id),
        detection_state=fusion_detection_state,
        synthetic_probability=fusion_syn,
    )

    now_str = datetime.datetime.now().strftime("%H:%M:%S")
    display_mic_text = (
        live_caption
        if live_caption
        else "Listening… speak clearly into the microphone for live captions."
    )
    transcript_messages = [
        TranscriptMessage(
            speaker="Caller (Mic)",
            text=display_mic_text,
            time=now_str,
            alert=bool(nlp_res["threatKeywords"]),
            threatKeywords=nlp_res["threatKeywords"]
        ),
        TranscriptMessage(
            speaker="AMVTF Core",
            text=(
                f"Live Verdict: {fusion_res['verdict']} — {fusion_res['recommendedAction']} | "
                f"AI-voice state: {session_state} (EMA {session_syn:.1f}%)"
            ),
            time=now_str,
            alert=fusion_res["verdict"] in ["WARNING", "CRITICAL"]
        )
    ]

    # Generate live analysis spectrogram if audio frame present
    spec_evidence = None
    if audio_bytes and len(audio_bytes) >= 16:
        norm_live_samples, _ = aasist_engine._decode_audio(audio_bytes)
        spec_evidence = spectrogram_engine.generate_spectrogram(
            samples=norm_live_samples,
            filename=caller_name or "live_mic_stream.wav"
        )

    return AudioAnalysisResponse(
        callerName=caller_name,
        enrolledTarget=id_res["matchedProfile"],
        contextTitle=nlp_res["contextTitle"],
        authenticity=auth_res["authenticity"],
        identity=id_res["identity"],
        contextRisk=nlp_res["contextRisk"],
        fusedRiskScore=fusion_res["fusedRiskScore"],
        authStatus=auth_res["authStatus"],
        idStatus=id_res["idStatus"],
        nlpIntent=nlp_res["nlpIntent"],
        threatKeywords=nlp_res["threatKeywords"],
        semanticFlags=nlp_res["semanticFlags"],
        recommendedAction=fusion_res["recommendedAction"],
        actionType=fusion_res["actionType"],
        rationale=fusion_res["rationale"],
        transcript=transcript_messages,
        spectralEntropy=auth_res.get("spectralEntropy"),
        zcr=auth_res.get("zcr"),
        jitter=auth_res.get("jitter"),
        kurtosis=auth_res.get("kurtosis"),
        syntheticIndicators=auth_res.get("syntheticIndicators", []),
        spectrogram=spec_evidence,
        syntheticProbability=auth_res.get("syntheticProbability"),
        detectionState=auth_res.get("detectionState"),
        sessionDetectionState=session_state,
        sessionSyntheticProbability=session_syn,
        modelVersion=auth_res.get("modelVersion"),
        mlConfidence=auth_res.get("mlConfidence"),
        uncertainty=auth_res.get("uncertainty"),
        voicedSecondsAccumulated=session_meta.get("voicedSecondsAccumulated"),
        liveCaption=live_caption or None,
        sessionCaption=session_caption or None,
    )
