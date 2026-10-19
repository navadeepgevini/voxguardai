# Known Limitations

1. **Not a real AASIST GNN** — name is historical; runtime is heuristics ± sklearn SoftVoting.
2. **No licensed ChatGPT/Gemini eval audio in repo** — cannot claim detection rates on those systems yet.
3. **CV 93.1% ≠ operational TPR@1%FPR** — training CV overstates live conversational performance.
4. **Browser mic ≠ phone call tap** — cannot silently capture cellular/app audio.
5. **WebSocket audio path is not production inference**.
6. **Session aggregator is single-process** — breaks across multiple Uvicorn workers without shared store.
7. **Speaker verification ≠ deepfake detection** — ECAPA-named path is FFT embeddings, not full ECAPA-TDNN.
8. **NLP keywords ≠ synthetic speech** — fraud language can be spoken by humans.
9. **Provenance watermarks** — missing watermark ≠ human; presence is optional evidence only.
10. **Compressed / speakerphone / short speech** remain hard; expect elevated UNCERTAIN rates.
11. **Aspirational ≥95% recall @ ≤1% FPR is unmet / unmeasured** on representative held-out live calls.
12. Never auto-trust a single chunk; use session EMA + uncertainty states.
