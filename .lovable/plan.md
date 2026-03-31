

# Fix Hero Section: No-Scroll, No-Overlap Layout

## Problem
The galaxy animation overflows into the text and navbar because the CSS-scaled galaxy has no bounded container. The `flex-[1.618]` wrapper gives it unbounded height, so the galaxy's absolute-positioned dots extend beyond their container. The CTA button is pushed off-screen.

## Root Cause
1. `.galaxy-viewport` is `width:100%; height:100%` but has no explicit size constraint, so scaled dots overflow visually
2. The galaxy wrapper uses `transform: scale()` which doesn't affect layout flow, meaning the visual size exceeds the box model size
3. No `overflow: hidden` on the galaxy's flex container to clip the animation

## Solution

### 1. HeroSection.tsx — CSS Grid with bounded rows

Replace the flex layout with a CSS grid that guarantees three rows fit within `100svh`:

```
grid-rows-[auto_minmax(0,1fr)_auto]
```

- **Row 1 (auto):** Navbar spacer
- **Row 2 (minmax(0,1fr)):** Galaxy, constrained to available space with `overflow: hidden`
- **Row 3 (auto):** Copy + CTA, naturally sized

The galaxy container gets explicit max dimensions:
- `max-h-[50svh]` to never exceed half the viewport
- `aspect-square` to stay circular
- `overflow-hidden` to clip any overflow from the CSS transform scaling

The copy block uses fluid `clamp()` for all spacing. The CTA gets a bottom padding of `pb-[clamp(1.5rem,4vh,3rem)]`.

### 2. galaxy.css — Tighten the scale ceiling

Reduce the max scale from `1` to `0.85` so the animation fits comfortably within its bounded container:
```css
transform: scale(clamp(0.32, var(--auto-scale), 0.85));
```

## Files to Modify

| File | Change |
|------|--------|
| `src/modules/landing/components/HeroSection.tsx` | Replace flex layout with grid; add bounded galaxy container with overflow-hidden |
| `src/modules/landing/components/galaxy.css` | Reduce max scale; adjust vh-scale divisor for tighter fit |

