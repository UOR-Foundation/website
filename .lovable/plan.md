

# Infinite Improbability Drive — Theme Alignment & Dimensional Experience

## What changes

Rework the overlay in `ResolvePage.tsx` to use the site's own palette (midnight navy `--background`, gold `--primary`, warm purple `--accent`, muted foreground tones) instead of the current extreme saturated gradients. Slow the total sequence from ~2.5s to ~4s, and replace the flat phase transitions with a **dimensional transformation** narrative.

## The Revised Sequence (~4s total)

```text
Phase 1 — FLATLAND (0–1000ms)
  Overlay fades in using bg-background. A single horizontal line draws across
  the center (1D). Then it rotates/multiplies into a wireframe square (2D).
  Improbability counter ticks in gold (text-primary), slower cadence (~150ms).
  Gentle screen shake (1px, slower frequency).
  Label: "Collapsing into one dimension…"

Phase 2 — SCRAMBLE (1000–2800ms)
  Wireframe square extrudes into a rotating 3D cube (CSS perspective transform).
  The cube "shatters" — fragments scatter outward, then reverse into a singularity
  point at center (the black hole). Side-effect text cycles every 500ms.
  Background shifts subtly: bg-background → a slightly lighter navy with a faint
  radial glow of primary/10 at center.
  Label: "Passing through every point in the universe…"

Phase 3 — UNSCRAMBLE (2800–4000ms)
  Singularity expands back out. "DON'T PANIC" appears in primary gold.
  Confetti uses site palette colors. Overlay dissolves. Result + toast shown.
```

## Visual Details — On-Brand

- **Backgrounds**: `hsl(var(--background))` with subtle radial glow of `hsl(var(--primary) / 0.08)` — no alien purples or teals
- **Counter text**: `text-primary` (gold, `38 65% 55%`) instead of hardcoded `hsl(45 90% 60%)`
- **"DON'T PANIC"**: `text-primary` with `font-display`
- **Side effects text**: `text-muted-foreground/50` — already in the site's muted palette
- **Confetti colors**: derived from `--primary`, `--accent`, `--foreground`
- **Screen shake**: reduced to 1px translation, 0.12s interval (gentler)

## Dimensional Shapes (pure CSS/SVG)

The 1D→2D→3D transformation uses simple inline SVG `<line>` and `<rect>` elements plus a CSS `perspective` + `rotateY` cube — no external libraries. Lightweight, performant, thematic.

## Timing Changes

| Interval | Current | New |
|----------|---------|-----|
| Total duration | ~2.5s | ~4s |
| Exponent tick | 85ms | 150ms |
| Side effect cycle | 300ms | 500ms |
| Phase 1 duration | 600ms | 1000ms |
| Phase 2 duration | 1200ms | 1800ms |
| Phase 3 (DON'T PANIC visible) | 700ms | 1200ms |

## File

| File | Change |
|------|--------|
| `src/modules/oracle/pages/ResolvePage.tsx` | Restyle overlay to site palette, slow timings, add 1D→2D→3D dimensional SVG/CSS shape morphing sequence, reduce shake intensity |

