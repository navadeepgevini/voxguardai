# VoxGuard Enterprise Design System — Dark Aerospace SOC

**Version:** 3.0.0-Flagship  
**Aesthetic Family:** Aerospace Cyber-Defense & Real-Time Voice Intelligence  
**Core Tone:** Precise, Cinematic, Authoritative, Restrained, Trustworthy.

---

## 1. Color Palette Tokens

```css
:root {
  /* Surface & Spatial Foundations */
  --bg-primary: #080D17;      /* Abyss Void: Main application background */
  --bg-secondary: #0D1422;    /* Navy Deep: Secondary surfaces, containers, sidebar */
  --bg-elevated: #121C2D;     /* Tactical Surface: Cards, panels, modals */
  --bg-surface-hover: #18253B;/* Interactive Hover State */
  --bg-surface-active: #1D2D47;/* Interactive Active State */

  /* Structural Aerospace Borders */
  --border-subtle: #192538;   /* 1px subtle card separator */
  --border-medium: #223047;   /* Default active border */
  --border-strong: #334664;   /* Highlighted container border */
  --border-accent: rgba(246, 130, 31, 0.45); /* Orange brand focus border */

  /* Text & Typographic Hierarchy */
  --text-primary: #F7F9FC;    /* High-contrast headings and primary metrics */
  --text-secondary: #A9B7CC;  /* Standard UI labels, descriptions, subheadings */
  --text-muted: #74839B;      /* Technical metadata, disabled text, units */
  --text-dim: #4A576D;        /* Decorative borders, grid coordinates */

  /* Signature Brand Identity */
  --brand-orange: #F6821F;    /* VoxGuard Signature Ember Orange */
  --brand-orange-hover: #FA9538;
  --brand-orange-glow: rgba(246, 130, 31, 0.25);
  --brand-orange-deep: #B45309;

  /* Semantic Security States (WCAG AA Compliant on #121C2D) */
  --state-safe: #23C483;      /* Emerald 500: Genuine Human / Allowed */
  --state-safe-bg: rgba(35, 196, 131, 0.12);
  --state-safe-border: rgba(35, 196, 131, 0.35);

  --state-warning: #F4B942;   /* Amber 400: Suspicious / Step-Up Verification */
  --state-warning-bg: rgba(244, 185, 66, 0.12);
  --state-warning-border: rgba(244, 185, 66, 0.35);

  --state-critical: #FF5365;  /* Coral Red: Synthetic Voice / Threat Terminate */
  --state-critical-bg: rgba(255, 83, 101, 0.14);
  --state-critical-border: rgba(255, 83, 101, 0.40);

  --state-info: #569CFF;      /* Azure Blue: Processing / Baseline Monitoring */
  --state-info-bg: rgba(86, 156, 255, 0.12);
  --state-info-border: rgba(86, 156, 255, 0.35);
}
```

---

## 2. Typographic Roles

1. **Display & Hero Verdicts**: `Geist` / `Inter`, 24px - 32px, Font Weight 700 / 800, Tracking `-0.03em`.
2. **Interface & Controls**: `Inter`, 13px - 15px, Font Weight 500 / 600, Tracking `-0.01em`.
3. **Tabular Numerals & Telemetry**: Monospace / Tabular-nums `font-mono`, 12px - 20px, Font Weight 600 / 700.
4. **Micro Technical Labels**: 10px - 11px, Font Weight 700, All-Caps with `tracking-wider` (`0.05em`).

---

## 3. Spatial Hierarchy & Grid Rules

- **Gutter Spacing**: Consistent 16px / 20px / 24px grid gaps.
- **Card Styling**: `bg-[#0D1422]/90 backdrop-blur-md border border-[#223047] rounded-xl shadow-xl shadow-black/40`.
- **Accent Lighting**: Subtle top-border linear gradient highlight (`border-t border-t-white/10`).
- **Interactive Controls**: Height 36px / 40px, rounded-lg, crisp `:focus-visible:ring-2 ring-[#F6821F]/50`.

---

## 4. Signature 3D Voice Trust Core

A WebGL Canvas component (`VoiceTrustCore3D.tsx`) based on Three.js:
- **Geometry**: Dual nested icosahedron particle sphere with 4 concentric orbital resonance rings.
- **Particle Count**: 480 dynamic nodes with vertex displacement.
- **Modes**:
  - `IDLE`: Calm 0.3 rad/s orbital drift with deep cyan/navy pulses.
  - `LISTENING`: Real-time audio RMS amplitude ripple reacting to microphone input.
  - `ANALYZING`: High-speed orbital spin with scanning laser beam plane.
  - `LIKELY_HUMAN`: Stable harmonic resonance in emerald green (`#23C483`).
  - `UNCERTAIN`: Wavering dual-frequency flutter in amber (`#F4B942`).
  - `LIKELY_SYNTHETIC`: Jittery vocoder phase divergence in deep coral (`#FF5365`).
  - `CRITICAL_THREAT`: Multi-ring rapid alarm pulsation.
- **Performance**: Automatic 60fps frame limiter, WebGL context loss recovery, and zero-CPU idle suspension when out of viewport.
