

## Performance Fix: Reduce Animation Load on Landing Page

### The Problem

The homepage runs **three simultaneous heavy animation layers** — this is why it crashes:

1. **GalaxyAnimation** — 1,400 real DOM nodes (2 × 20 × 35 divs), each CSS-animated with border-radius, transforms, and border colors. The browser must composite all 1,400 elements every frame.
2. **PrimeGrid** — A `requestAnimationFrame` canvas loop drawing 4,000 dots per frame (hero section only, desktop).
3. **PrimeConstellationBg** — A second `requestAnimationFrame` canvas loop (full-screen, fixed) rendering 180 field stars with radial gradients + 7 constellation patterns with glow effects.

That is **2 concurrent rAF loops + 1,400 CSS-animated DOM elements** all running at the same time on page load.

### The Fix (3 changes)

#### 1. Replace GalaxyAnimation DOM nodes with a single Canvas
Rewrite `GalaxyAnimation.tsx` to render the galaxy spiral on a single `<canvas>` element instead of 1,400 DOM divs. This eliminates the massive DOM tree and CSS animation overhead. The visual output (gold-to-violet spiral arms) will be identical, drawn via canvas arcs with the same color stops from `galaxy.css`. The CSS file becomes unused and can be removed.

#### 2. Merge PrimeGrid into PrimeConstellationBg (single rAF loop)
Remove `PrimeGrid` as a separate component. Integrate the Vogel spiral prime dots into the existing `PrimeConstellationBg` canvas as a "hero zone" layer that only draws when the viewport is near the top. This halves the number of animation loops from 2 to 1.

#### 3. Add visibility guards
- Use `document.hidden` checks (already partially in PrimeConstellationBg) to pause all animation when the tab is backgrounded.
- Use `IntersectionObserver` on the galaxy canvas so it stops drawing when scrolled out of view.
- Throttle the merged constellation canvas to ~30fps instead of 60fps (sufficient for slow, meditative animations).

### Technical Details

**Files modified:**
- `src/modules/landing/components/GalaxyAnimation.tsx` — full rewrite (DOM → Canvas)
- `src/modules/landing/components/galaxy.css` — delete (no longer needed)
- `src/modules/landing/components/PrimeConstellationBg.tsx` — absorb PrimeGrid's Vogel spiral logic, add 30fps throttle
- `src/modules/landing/components/HeroSection.tsx` — remove `PrimeGrid` import
- `src/modules/landing/components/PrimeGrid.tsx` — delete (merged into PrimeConstellationBg)

**Performance impact:**
- DOM nodes on hero: ~1,400 → ~0 animated nodes
- rAF loops: 3 → 1 (galaxy uses CSS `will-change: transform` on a single canvas, constellation is the sole rAF)
- Radial gradient calls per frame: reduced via 30fps cap
- First paint: significantly faster (no 1,400-node subtree to lay out)

