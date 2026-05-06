## Why the hero feels heavy

Two animations stack in the hero, and both do more work than needed.

### Galaxy orb (`GalaxyAnimation` + `galaxy.css`)
- **1,400 absolutely-positioned `<div>`s** on desktop (2 galaxies × 20 stars × 35 dots), ~840 on mobile.
- Every `.circle` ring carries `will-change: transform` → 40 separate compositor layers.
- Wrapper has a 60px CSS `drop-shadow` filter applied on top of the constantly-animating subtree (one of the most expensive composite ops).

### Constellation background (`PrimeConstellationBg`)
- Full-window canvas at full `devicePixelRatio` (2× / 3× pixel work on retina/phones), running at ~60 fps.
- Per frame, **180 field stars** each call `ctx.createRadialGradient(...)` (uncached, very slow).
- Each constellation star draws **3 radial gradients** every frame (nebula + inner glow + core).

## Plan — light tune-up only (no visual changes)

### 1. Galaxy: drop the layer explosion and the heavy filter
File: `src/modules/landing/components/galaxy.css`
- Remove `will-change: transform` from `.circle` (collapses 40 compositor layers into 1–2).
- Remove the `drop-shadow(... 60px ...)` filter on `.galaxy-viewport`. Replace the warm halo with a static CSS `radial-gradient` background on `.galaxy-viewport` — same look, ~zero cost.
- Add `contain: strict` and `transform: translateZ(0)` on `.galaxy-wrapper` so the whole orb rasterizes once.

File: `src/modules/landing/components/GalaxyAnimation.tsx`
- Lower the dot count slightly with no visible difference:
  - Desktop: stars 20 → 16, dots per ring 35 → 28 (≈900 nodes, was 1,400).
  - Mobile: stars 12 → 8, dots per ring 35 → 24 (≈380 nodes, was 840).
- Pause the CSS animation when the orb is off-screen via `IntersectionObserver` toggling a `.is-paused` class that sets `animation-play-state: paused` on `.circle`.
- Honor `prefers-reduced-motion` (already partially done) and also pause when `document.hidden`.

### 2. Constellation canvas: throttle, cache, cap DPR
File: `src/modules/landing/components/PrimeConstellationBg.tsx`
- **Cap DPR**: `Math.min(window.devicePixelRatio, 1.25)` desktop, `1` on mobile.
- **Throttle to 30 fps** with a fixed-timestep guard inside `draw` (`if (now - last < 33) { rAF; return; }`). Twinkle at 30 fps is indistinguishable from 60.
- **Pre-bake field stars to an offscreen canvas** at `resize`: 180 radial-gradient blobs become one `drawImage` per frame, modulated with a single `globalAlpha` for twinkle.
- **Cache constellation glow sprites** (one offscreen per hue + brightness tier) and `drawImage` instead of building 3 gradients per star per frame.
- Keep the existing scroll-pause; also pause when `document.hidden`.
- Counts unchanged (180 desktop). Optional small reduction to 140 if profile still shows hot.

### 3. Verify

1. `browser--performance_profile` on `/` at 1363×792 and 390×844 before/after.
2. `browser--start_profiling` → idle 3s → scroll → `browser--stop_profiling`. Expect canvas-draw self-time and "Recalculate Style"/"Composite Layers" to drop sharply.
3. Visual check: orb still rotates with the same gold→violet ring, halo still present, star field unchanged.

## Out of scope
- No copy, layout, hero typography, or stats-row changes.
- No new dependencies.
- Same animation runs on mobile (just lighter), per your call.
