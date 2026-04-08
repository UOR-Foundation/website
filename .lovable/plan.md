

# Boot Sequence for UOR OS

## Overview

Create a cinematic boot-up animation that plays once per session when the user first navigates to `/os`. The sequence mimics a real OS boot — logo reveal, progress indicator, and a smooth transition into the desktop shell.

## Sequence (total ~4 seconds)

1. **Black screen** (0–400ms) — empty, builds anticipation
2. **Logo fade-in** (400–1400ms) — UOR logo/glyph scales up from 0.8 to 1.0 with opacity 0→1, subtle glow pulse
3. **"UOR OS" text** (1000–1800ms) — clean sans-serif text fades in below the logo with a slight upward slide
4. **Progress bar** (1400–3200ms) — thin horizontal line fills left-to-right with a slight ease-out, subtle shimmer effect
5. **Fade to desktop** (3200–4000ms) — entire boot screen fades out and scales up slightly (1.0→1.02) while the desktop shell fades in underneath

## Session-Only Trigger

- Use `sessionStorage.getItem("uor:booted")` to check if boot has already played this session
- If not booted: show boot sequence, then set `sessionStorage.setItem("uor:booted", "true")`
- On subsequent visits in the same tab session, skip straight to the desktop

## Files

### Create: `src/modules/desktop/BootSequence.tsx`
- Full-screen black overlay with `z-[9999]` (above everything)
- Uses `framer-motion` for all animations (opacity, scale, width of progress bar)
- Calls `onComplete` callback when the sequence finishes
- Renders: logo SVG/icon → "UOR OS" text → thin progress bar → fade out
- Self-contained, no external dependencies beyond framer-motion and the existing logo/icon assets

### Modify: `src/modules/desktop/DesktopShell.tsx`
- Add `booting` state initialized from `sessionStorage`
- Render `<BootSequence onComplete={() => setBooting(false)} />` when `booting === true`
- Render the normal desktop shell underneath (so the transition is seamless)
- The boot overlay sits on top and fades away, revealing the already-mounted desktop

## Visual Details

- Background: pure black (`#000`)
- Logo: use the existing UOR glyph/icon (or a minimal geometric mark) in white/amber
- Progress bar: 1px tall, amber/gold accent (`#D4A853`), with a subtle traveling shimmer highlight
- Typography: system sans-serif, light weight, letter-spaced, white at 60% opacity
- All animations use spring or cubic-bezier easing for organic feel — no linear motion

