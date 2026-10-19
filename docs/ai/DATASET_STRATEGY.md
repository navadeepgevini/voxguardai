# Dataset Strategy

## Goals

- Speaker-disjoint and generator-disjoint splits
- Untouched final test set
- Provenance, license, checksums
- No scraping of private calls; no secret recording

## Class definitions

| Label | Meaning |
|-------|---------|
| 0 | REAL human speech (mic, VoIP, telephone-quality, multilingual) |
| 1 | AI-generated / converted / cloned speech |

## Official / challenge corpora (verify license before download)

| Corpus | Use | Notes |
|--------|-----|-------|
| ASVspoof 2019 LA | Train / val / seen-attack test | Classic TTS/VC; not ChatGPT Voice |
| ASVspoof 2021 LA/DF | Codec robustness | Telephony-relevant |
| ASVspoof 5 | Newer attacks | Access via challenge process |
| MLAAD | In-the-wild / multilingual | Subject to license verification |
| WaveFake | Vocoder family study | Often paired with JSUT / LJ |

## Conversational commercial TTS (ChatGPT / Gemini / ElevenLabs)

Obtain **only** via authorized APIs, official export, or consented lab recording of **your own** generated sessions.

Place files under:

```text
data/eval/
  human/
  ai_chatgpt/          # authorized samples only
  ai_gemini/
  ai_elevenlabs/
  ai_other/
  degraded/            # codec-augmented copies of eval (never train on test)
```

Track a manifest CSV: `path,label,generator,language,codec,duration_s,sha256,license,split`.

## Leakage controls

- No speaker overlap across train/val/test
- Hold out entire generator families for unseen-generator eval
- Do not use filename, loudness, or codec alone as labels
- Keep final test untouched during threshold tuning

## Current repo status

**No licensed eval WAVs are checked into this repository.** Baseline harness supports synthetic smoke fixtures + optional `data/eval` when present. ChatGPT/Gemini metrics are **not** reportable until authorized samples exist.
