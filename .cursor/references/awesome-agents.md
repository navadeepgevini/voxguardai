# Awesome Agents — VoxGuard bookmarks

Catalog: https://github.com/kyrolabs/awesome-agents  
Related ADE list: https://github.com/kyrolabs/awesome-ade

This file is a **research bookmark**, not an install. Use when extending VoxGuard *product* agent features (not Cursor IDE config).

## Highest relevance to VoxGuard

| Project | Why |
|---------|-----|
| [Pipecat](https://github.com/pipecat-ai/pipecat) | Real-time voice / multimodal conversational pipelines — candidate to replace demo `/ws/audio-stream` |
| [Voice Lab](https://github.com/saharmor/voice-lab) | Eval framework for voice agents (models, prompts, personas) |
| [CrewAI](https://github.com/crewAIInc/crewAI) | Role-based multi-agent orchestration for SOC triage workflows |
| [LangGraph / LangChain](https://github.com/langchain-ai/langchain) | Graph workflows for analyze → alert → human approval |
| [AutoGen / AG2](https://github.com/ag2ai/ag2) | Multi-agent cooperation patterns |
| [Letta](https://github.com/letta-ai/letta) | Stateful agents with long-term memory (threat intel memory) |
| [Mastra](https://github.com/mastra-ai/mastra) | TypeScript agent framework — fits Next.js EchoGuard side |
| [OpenHands](https://github.com/OpenHands/OpenHands) | Software-dev agent platform (engineering automation) |

## How to use with this repo

1. Pick one library for a concrete feature (e.g. Pipecat live stream).
2. Spike in a branch; do not dump frameworks into `backend/` without a design.
3. Keep Cursor IDE agents (ECC / Agency / ADHD) separate from in-app agent runtimes.

## Cursor vs product agents

| Layer | Tools already wired |
|-------|---------------------|
| IDE (this machine) | ECC, Agency Agents rules, i-have-adhd skill, VoxGuard rules |
| Product (future) | Frameworks from this list inside FastAPI / Next |
