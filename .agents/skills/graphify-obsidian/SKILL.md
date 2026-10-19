---
name: graphify-obsidian
description: >-
  Use this skill to update, generate, and maintain the Obsidian knowledge vault in docs/, managing wikilinks, tags, Mermaid diagrams, and Graphify visual nodes.
---

# Graphify & Obsidian Knowledge Graph Skill

## Vault Structure
```text
docs/
├── index.md                        # Master Map of Content (MOC)
├── architecture/
│   ├── system-overview.md          # Fullstack system topology
│   ├── audio-analysis-pipeline.md  # Dual-mode spectrogram & inference flow
│   ├── database-schema.md          # SQLite tables & ER diagram
│   └── notification-system.md      # Resend incident escalation
├── api/
│   └── routes-reference.md         # FastAPI & Next.js API endpoints
├── ui/
│   └── page-hierarchy.md           # Page routing & component tree
└── development-tooling.md          # MCP tools, agents & setup guide
```

## Graph Maintenance Rules
1. Maintain two-way wikilinks (`[[path|label]]`) connecting related subsystems.
2. Embed Mermaid diagrams (`sequenceDiagram`, `erDiagram`, `flowchart TD`) for visual rendering.
3. Keep YAML frontmatter updated with relevant tags.
4. Strictly omit private data, API keys, and raw audio files from documentation.
