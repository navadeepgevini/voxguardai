# Dataset Manifest

Template generator:

```bat
python scripts\init_eval_manifest.py
```

Creates `data/eval/manifest.csv` and folders:

`human/`, `ai_chatgpt/`, `ai_gemini/`, `ai_elevenlabs/`, `ai_other/`, `degraded/`

## Columns

| Column | Meaning |
|--------|---------|
| path | Relative to manifest dir |
| label | 0=human, 1=AI |
| generator | e.g. human, elevenlabs, chatgpt, gemini |
| language | en, hi, … |
| codec | wav, opus, g711, … |
| duration_s | float |
| sha256 | optional integrity |
| license | provenance string |
| split | train / val / test |

## Rules

- Speaker-disjoint and generator-disjoint where possible
- Hold out entire generators for unseen eval
- Never commit private call audio
- ChatGPT/Gemini only via authorized personal/API generation
