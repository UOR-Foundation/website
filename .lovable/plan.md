

## Make the Hero Title Feel Physically Present

Goal: the words "MAKE DATA IDENTITY / UNIVERSAL" should feel like they're lifting off the screen — more real than the pixels around them — without resorting to obvious tricks (no drop shadows, no 3D flips, no parallax-on-scroll cliches).

### The Insight

Three perceptual cues, layered subtly, create the illusion of physical presence:

1. **Sub-pixel anti-gravity** — the title responds to the cursor's position with a *micro* 3D tilt (max 1.5°) and a *featherlight* translation (max 4px). The brain reads "this object has weight in space" without registering an animation.
2. **Atmospheric separation** — a barely-there contact shadow beneath the letters (not a drop shadow — a *contact* shadow, soft and warm, ~6% opacity) plus a hairline highlight on the top edge of each glyph. Together they create the illusion the letters are floating ~2mm above the background.
3. **Breathing depth** — when idle, the title imperceptibly "breathes" with a 6-second sine wave on `letter-spacing` (±0.3px) and `text-shadow` blur (±1px). Not animation — *life*.

The crispness comes from doing all three at once with restraint. Any one of them alone is a gimmick. All three together cross the threshold into "feels real."

### Implementation

A new lightweight component `PhysicalTitle.tsx` wrapping the existing two `<span>` lines. It:

- Uses a single `requestAnimationFrame` loop driven by mouse position (relative to the title's bounding box).
- Applies one CSS transform: `perspective(1200px) rotateX(...) rotateY(...) translateZ(...)` to the wrapper.
- Each character keeps its existing flex distribution; the transform applies to the whole title block, so kerning stays pixel-perfect.
- Adds two pseudo-elements via CSS:
  - `::before` — top-edge highlight (`linear-gradient` clipped to text via `background-clip: text`, 1px tall band, 8% white).
  - `::after` — contact shadow below the baseline (radial gradient, warm amber at 4% opacity, blur 24px, offset 8px down).
- Idle breathing via a CSS keyframe on `letter-spacing` and `filter: drop-shadow()` blur radius, 6s ease-in-out infinite.
- Honors `prefers-reduced-motion` — strips the cursor tilt and breathing, keeps only the static contact shadow + edge highlight (which still give the "lifting off" feel without motion).

### Files to modify

- **NEW** `src/modules/landing/components/PhysicalTitle.tsx` — the wrapper component (~80 lines).
- **MODIFY** `src/modules/landing/components/HeroSection.tsx` — replace the inline `<h1>` blocks (both mobile and desktop) with `<PhysicalTitle>`. Pass through the existing clamp font sizes and tracking unchanged.
- **MODIFY** `src/index.css` — add the `@keyframes hero-breathe` keyframe and one utility class for the contact shadow gradient.

### What we will NOT do

- No `text-shadow: 0 4px 8px rgba(0,0,0,0.5)` style drop shadows — too obvious, looks like a 2010 web design.
- No mouse-parallax on the galaxy orb — the title is the subject.
- No scroll-driven effects — the magic must be present on first paint.
- No font-weight changes on hover — breaks crispness.
- No backdrop-filter — performance cost, not worth it for this surface.

### Resulting feel

On a still page, the title sits with a faint contact shadow and a hairline top highlight — it reads as a physical plate of metal type laid on the dark background. Move the cursor and the plate tilts almost imperceptibly toward you, with sub-pixel weight. Stop moving and it breathes. The effect is impossible to point at, but the page feels *alive* in a way the previous version did not.

