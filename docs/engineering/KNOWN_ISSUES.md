# Known Issues

1. **No git repository** — experiment provenance uses snapshot folders until `git init`.
2. **No NVIDIA on Laptop 1** — torch CUDA work deferred.
3. **TorchCheckpointDetector** refuses inference until graph wired + checkpoint present (by design).
4. **ECAPA engine** is FFT projection, not SpeechBrain ECAPA-TDNN.
5. **Payment UTR** must not be sole proof of payment.
6. **LiveSessionAggregator** is process-local (multi-worker unsafe).
7. **No licensed ChatGPT/Gemini WAVs** in repo → no generator-specific accuracy claims.
8. **`/ws/audio-stream`** remains simulated; use `/ws/live-analyze`.
9. Aspirational **95% recall @ 1% FPR** unmet / unmeasured on held-out live calls.
