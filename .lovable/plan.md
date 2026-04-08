

# Infinite Improbability Drive — Particle-to-Wave Pre-Transition

## What changes

Add a **pre-phase** before the overlay appears: the existing search page elements dissolve from "particles" (sharp, solid) into "waves" (blurred, wavy, fading), then the improbability overlay takes over. On exit, the reverse happens — the result materializes from wave back to particle (crisp).

## Revised Sequence (~5s total)

```text
Phase 0 — PARTICLE → WAVE (0–800ms)  [NEW]
  The main page content (search bar, buttons, background) gets:
  - CSS filter: blur ramps from 0 → 12px
  - A subtle wave distortion via CSS transform (translateY sine wobble)
  - Opacity fades from 1 → 0.3
  This creates the feeling of matter dissolving into a wave function.
  After 800ms the overlay fades in on top.

Phase 1 — FLATLAND (800–1800ms)
  Same as current: overlay appears, 1D line → 2D square, exponent counter.
  But overlay initial opacity starts from 0.3 (smoother handoff from the blur).

Phase 2 — SCRAMBLE (1800–3600ms)
  Same as current: 3D cube → singularity, side-effect text cycling.

Phase 3 — UNSCRAMBLE (3600–4800ms)
  DON'T PANIC, confetti, result picked.

Phase 4 — WAVE → PARTICLE (4800–5200ms)  [NEW]
  Overlay dissolves. The result page materializes:
  - Blur ramps from 8px → 0
  - Opacity from 0.5 → 1
  - A brief "crystallizing" feel as content snaps into focus.
```

## Implementation Details

### New state: `drivePrePhase` (boolean)
- Set `true` at t=0, triggers blur/wave on the main content wrapper.
- Set `false` at t=800ms when overlay activates.

### New state: `drivePostPhase` (boolean)  
- Set `true` when overlay dissolves, applies reverse blur on result.
- Set `false` after 400ms, content is crisp.

### Main content wrapper gets conditional classes
- When `drivePrePhase`: `filter: blur(12px)`, `opacity: 0.3`, `transform: scale(1.02)`, plus a CSS `@keyframes waveWobble` (gentle vertical sine oscillation).
- When `drivePostPhase`: `filter: blur(8px)` → animates to `blur(0)` via transition.
- Both use `transition: filter 0.8s ease, opacity 0.8s ease, transform 0.8s ease`.

### Timing adjustments in `fireImprobabilityDrive`
- t=0: Set `drivePrePhase = true` (page blurs/waves)
- t=800ms: Set `drivePrePhase = false`, `improbabilityActive = true`, `improbPhase = 1`
- t=1800ms: Phase 2
- t=3600ms: Phase 3 + confetti
- t=4800ms: `improbabilityActive = false`, `drivePostPhase = true`, show result
- t=5200ms: `drivePostPhase = false` (snap to crisp)

### New CSS keyframe: `waveWobble`
```css
@keyframes waveWobble {
  0%, 100% { transform: translateY(0) scale(1); }
  25% { transform: translateY(-3px) scale(1.01); }
  50% { transform: translateY(2px) scale(1.02); }
  75% { transform: translateY(-2px) scale(1.015); }
}
```

### Overlay opacity now opaque
The overlay `bg-background` is fully opaque (no transparency issue the user flagged). The blur pre-phase handles the transition from visible page to overlay, so there's no moment where you see both simultaneously.

## File

| File | Change |
|------|--------|
| `src/modules/oracle/pages/ResolvePage.tsx` | Add `drivePrePhase`/`drivePostPhase` states, apply blur+wave CSS to main content wrapper, make overlay fully opaque, adjust timing to ~5s total, add `waveWobble` keyframe |

