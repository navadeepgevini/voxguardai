---
name: shadcn-accessibility
description: >-
  Use this skill to implement, style, and audit accessible shadcn/ui components (dialogs, tabs, tooltips, tables) strictly preserving VoxGuard's dark-navy/orange SOC theme.
---

# shadcn/ui & Accessibility Skill

## Design System Tokens
- Background: Dark Navy (`#060B18`, `#0A1128`)
- Surface / Cards: Dark Slate Navy (`#0E1B38` with subtle border `rgba(255,255,255,0.08)`)
- Accent / Primary: Orange (`#F97316` / `rgb(249 115 22)`)
- Typography: High contrast text (`#F8FAFC`), muted (`#94A3B8`)

## Accessibility Principles
- Interactive elements must possess visible `:focus-visible` rings.
- Modals (`Dialog`) trap focus and restore focus to trigger upon dismissal.
- Tooltips are keyboard accessible via Tab/Focus.
- Tables include accessible headers, caption, and responsive overflow wrappers.
