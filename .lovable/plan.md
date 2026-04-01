

# Integrate Pretext for Canvas-Rendered Prime Number Field

## What is Pretext

Pretext (`@chenglou/pretext`) is a pure JS library that measures and lays out multiline text without DOM reflow. It renders text to Canvas, SVG, or DOM with pixel-perfect accuracy. Key APIs: `prepare()` (one-time measurement), `layout()` (pure arithmetic height calc), `layoutWithLines()` (manual line rendering to Canvas).

## The Idea

Replace the current **PrimeGrid** (1,392 DOM nodes of tiny dots) with a single `<canvas>` element that renders a **prime number matrix** using Pretext. Instead of abstract dots, you see the actual numbers 1 through 1392 rendered in a grid. Primes glow gold. Composites are near-invisible gray. The numbers themselves become the texture.

This is more aligned with Foundation's "mathematical instrument revealing hidden structure" because you can actually read the primes. It also eliminates ~1,400 DOM nodes in favor of a single Canvas, which is a major performance win.

Additionally, we add a second Pretext-powered Canvas to the **Hero section**: a slowly drifting prime sequence rendered to Canvas that replaces the current DOM-based `<p>` tag background texture. This enables smooth animation (a gentle horizontal drift of the numbers, like data streaming through a psychohistorical console).

## Changes

### 1. Install Pretext
Add `@chenglou/pretext` as a dependency.

### 2. Replace PrimeGrid with Canvas-Based Prime Number Matrix
**File:** `src/modules/landing/components/PrimeGrid.tsx`

- Replace the 1,392-div grid with a single `<canvas>` element
- Use `prepare()` + `layoutWithLines()` to measure each number's width
- Render numbers 1..1392 in a grid pattern to Canvas via `ctx.fillText`
- Primes: rendered in gold (`hsl(38, 65%, 55%)`) at ~12% opacity
- Composites: rendered in white at ~3% opacity
- Coordinate axis labels still rendered at every 7th interval
- Canvas stays `position: fixed; inset: 0; z-0; pointer-events: none`
- Responsive: re-render on resize using `ResizeObserver`
- Single `useEffect` + `useRef` pattern, no DOM node explosion

### 3. Hero Section — Canvas-Rendered Drifting Prime Sequence
**File:** `src/modules/landing/components/PrimeSequenceCanvas.tsx` (new)

- A full-width Canvas behind the hero text
- Uses Pretext to lay out the prime sequence `2 3 5 7 11 13...` in monospaced font
- Gentle horizontal drift animation via `requestAnimationFrame` (0.5px/frame, very slow)
- Primes rendered in gold at 4% opacity, creating the "data stream" effect
- Replaces the current DOM `<p>` tag in HeroSection

**File:** `src/modules/landing/components/HeroSection.tsx`
- Remove the DOM-based prime sequence `<p>` tag
- Mount `<PrimeSequenceCanvas />` in its place

### 4. Masonry-Style Highlights Section Height Prediction
**File:** `src/modules/landing/components/HighlightsSection.tsx`

- Use Pretext's `prepare()` + `layout()` to predict text heights for highlight card titles and descriptions
- This enables a true masonry layout where cards are tightly packed based on actual text height rather than uniform grid cells
- Cards with shorter titles get less vertical space, creating the "structured irregularity" effect aligned with Foundation principle 5

## Technical Details

**PrimeGrid Canvas rendering loop:**
```text
1. Sieve primes up to COLS × ROWS
2. For each cell (row, col):
   - number = row * COLS + col + 1
   - x = col * cellWidth + padding
   - y = row * cellHeight + padding
   - ctx.fillStyle = isPrime ? goldAt12% : whiteAt3%
   - ctx.font = "9px 'IBM Plex Mono'"
   - ctx.fillText(String(number), x, y)
3. Overlay axis labels at every 7th interval
```

**Hero drift animation:**
```text
1. prepare(primeSequenceString, "10px 'IBM Plex Mono'")
2. layoutWithLines(prepared, canvasWidth * 3, lineHeight)
3. Each frame: clear canvas, offset x by -0.3px, draw lines
4. When offset exceeds one "page width", reset (seamless loop)
```

**Performance:**
- PrimeGrid: 1,392 DOM nodes → 1 Canvas node (massive improvement)
- Hero texture: 1 DOM `<p>` → 1 Canvas with RAF animation
- Pretext's `prepare()` runs once; `layout()` is pure arithmetic (~0.09ms for 500 texts)

## Files Modified
| File | Change |
|------|--------|
| `package.json` | Add `@chenglou/pretext` dependency |
| `PrimeGrid.tsx` | Rewrite: DOM grid → Canvas with Pretext-measured numbers |
| `PrimeSequenceCanvas.tsx` | New: drifting prime sequence Canvas for hero |
| `HeroSection.tsx` | Swap DOM `<p>` texture for `<PrimeSequenceCanvas />` |
| `HighlightsSection.tsx` | Use Pretext height prediction for masonry layout |

## What Stays the Same
- Galaxy animation, all section content, gold/navy palette
- Prime section indexes (§2, §3, etc.)
- Layout structure, typography, animation timing
- All other landing components unchanged

