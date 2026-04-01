

# Prime Constellation Easter Egg — Scroll-Revealed Background

## Concept

A full-page fixed canvas sits behind all content on the index page. It renders a slowly evolving **Ulam spiral** of prime numbers — dots placed on a spiral grid where only primes are visible, forming the mysterious diagonal patterns that mathematicians have marveled at since 1963. The visualization starts completely invisible and awakens as the user scrolls, creating the feeling of an ancient mathematical consciousness emerging beneath the page.

The Asimov Foundation resonance: like psychohistory revealing hidden patterns in apparent chaos, the primes reveal their secret structure only to those who look (scroll) deep enough.

## How It Works

1. **New component: `PrimeConstellationBg.tsx`** — a fixed-position canvas (`position: fixed; inset: 0; z-index: 0`) that renders behind all page content.

2. **Ulam spiral visualization**: Numbers 1 to ~40,000 are placed on a rectangular spiral outward from center. Only primes are drawn as dots. This naturally produces the famous diagonal line patterns — no artificial arrangement needed. The spiral slowly rotates (matching the existing `ROTATION_SPEED` aesthetic).

3. **Scroll-driven revelation**:
   - At scroll 0%: canvas is fully transparent (invisible).
   - As the user scrolls, global alpha increases smoothly from 0 to a subtle peak (~0.06–0.08 opacity) using `window.scrollY / document.scrollHeight`.
   - Simultaneously, the dot radius grows slightly and a faint gold glow (`hsla(38, 65%, 55%)`) intensifies — the constellation "wakes up."
   - By ~60% scroll depth, the full pattern is visible. The final 40% holds steady.

4. **Layering**: The canvas sits at `z-index: 0`. All existing sections already have backgrounds or relative positioning that will naturally layer on top, letting the prime constellation peek through in the gaps and margins between sections.

5. **Connection to existing hero**: The hero's `PrimeGrid` (Vogel spiral) is the "seed." As you scroll past it, the Ulam spiral beneath takes over — a different mathematical face of the same primes, as if the page itself is built on a foundation of prime numbers.

## Technical Details

### New file: `src/modules/landing/components/PrimeConstellationBg.tsx`
- Full-viewport fixed canvas, pointer-events-none
- Ulam spiral coordinate generator (simple arithmetic spiral mapping)
- Prime sieve reused from existing pattern (up to ~40,000)
- Scroll listener (passive) drives opacity/scale uniforms
- Single `requestAnimationFrame` loop with slow rotation
- Dot color: gold (`hsla(38, 65%, 55%)`) matching existing prime palette
- Optional: faint connecting lines between adjacent primes on the spiral for the "constellation" effect, also scroll-gated

### Modified file: `src/modules/landing/pages/IndexPage.tsx`
- Import and render `PrimeConstellationBg` as the first child inside `<Layout>`, before `<HeroSection>`

### Modified file: `src/modules/core/components/Layout.tsx`
- Ensure `<main>` has `position: relative; z-index: 1` so content layers above the fixed canvas

### Performance
- Canvas renders only prime dots (~4,200 out of 40,000) — lightweight
- Culls off-screen dots
- Uses `devicePixelRatio` for retina sharpness
- Single RAF loop, pauses when tab is hidden via `document.hidden`

