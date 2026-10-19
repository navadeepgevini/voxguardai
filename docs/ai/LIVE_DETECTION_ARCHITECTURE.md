# Live Detection Architecture

```text
Authorized mic / upload WAV
        │
        ▼
 PCM decode → 16 kHz mono
        │
        ▼
 Energy / voiced-frame check
        │
   insufficient ──► WAITING_FOR_SPEECH / INSUFFICIENT_AUDIO
        │
        ▼
 12-D acoustic features ± sklearn SoftVoting
        │
        ▼
 syntheticProbability + detectionState (chunk)
        │
        ▼
 LiveSessionAggregator (EMA, ~3 s voiced gate)
        │
        ▼
 AMVTF fuse (acoustic ≠ NLP fraud ≠ identity)
        │
        ▼
 EchoGuard Live Analysis UI
```

## Capture reality check

Browser `getUserMedia` captures the **local microphone**, not arbitrary cellular/app call audio. Telephony requires an authorized VoIP/SIP/WebRTC media bridge. Current product path: HTTP `POST /api/analyze/live` every ~1.8 s with WAV chunks + `session_id`.

WebSocket `/ws/audio-stream` is **not** the production inference path (simulated / non-product).

## Session semantics

| Field | Meaning |
|-------|---------|
| `syntheticProbability` | Chunk-level synthetic risk (0–100) |
| `detectionState` | Chunk state |
| `sessionSyntheticProbability` | EMA over voiced usable windows |
| `sessionDetectionState` | Aggregated session state |
| `voicedSecondsAccumulated` | Approximate voiced seconds |

Session prefers EMA for AMVTF once `voicedSecondsAccumulated >= 3.0`.

## UI states

`WAITING_FOR_SPEECH` · `INSUFFICIENT_AUDIO` · `UNCERTAIN` · `LIKELY_HUMAN` · `LIKELY_AI_GENERATED`

Overall SOC: `SAFE` / `WARNING` / `CRITICAL` (AMVTF) — independent of AI-voice label semantics.

## Multi-worker note

`LiveSessionAggregator` is in-process memory. Multi-worker Render needs Redis (or sticky sessions) before horizontal scale.
