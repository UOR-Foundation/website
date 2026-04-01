

# The Living Prime Field — Two Dimensions of Revelation

## Concept

The prime number grid becomes a living instrument with two axes of interaction, both subtle and non-overwhelming:

**Dimension 1 — Mouse (Spatial Lens):** A soft radial glow follows the cursor. Numbers near the mouse become slightly more visible and primes within the radius reveal their prime factorization (e.g., `12` becomes `2²·3`). Primes themselves glow gold and stand alone. The effect fades smoothly at the edges — like holding a magnifying glass over a mathematical manuscript.

**Dimension 2 — Scroll (Temporal Depth):** As the user scrolls from top to bottom, the grid progressively transforms. At the top (hero), you see plain numbers. By mid-page, prime numbers begin showing their ordinal position in the prime sequence (e.g., prime `7` shows `π₄` — the 4th prime). By the bottom of the page, the field reveals the full factorization of every visible number. The scroll acts as a "depth dial" — scrolling deeper into the page literally reveals deeper mathematical structure.

Both effects are extremely subtle — opacity changes from ~3% to ~12% at most. The grid never competes with content.

## Changes

### 1. PrimeGrid.tsx — Complete Rewrite with Dual Interaction

- **Base state:** Numbers at very low opacity (primes 5%, composites 2%) — a whisper
- **Mouse lens:** Track mouse position via `mousemove` on the canvas. Within a ~200px radius, increase opacity with smooth distance falloff. Composites within the lens show their prime factorization using pretext's `prepareWithSegments()` to measure variable-width strings (e.g., `2²·3·5`) for perfect cell centering. Primes glow gold. Cache all pretext measurements in a Map for performance.
- **Scroll dimension:** Read `window.scrollY / maxScroll` as a 0→1 `depth` value. As depth increases:
  - 0.0–0.3: plain numbers only
  - 0.3–0.6: primes begin showing their ordinal `πₙ` notation
  - 0.6–1.0: all numbers show factorization, base opacity increases slightly
- **Mobile:** No mouse lens (touch devices get scroll-only reveal). Use `window.matchMedia` to detect.
- **Performance:** Only ~60-80 cells fall within the lens radius. Factorization strings are cached. Pretext `prepareWithSegments()` results cached per unique string. `requestAnimationFrame` drives rendering only when mouse moves or scroll changes — idle when static.

### 2. PrimeSequenceCanvas.tsx — Pretext-Powered Layout

- Replace raw `ctx.measureText` with pretext's `prepareWithSegments()` + `layoutWithLines()` for accurate text measurement of the drifting prime sequence
- Reduce opacity to 4% and drift speed to 0.2px/frame for a more meditative, non-overwhelming feel

### 3. Layout.tsx — Scope Grid to Landing

- Remove `PrimeGrid` import and rendering from the global Layout component

### 4. IndexPage.tsx — Mount Grid Here

- Import and render `PrimeGrid` inside the landing page specifically, so other pages are not affected

## Technical Details

**Factorization function:**
```text
factorize(12) → "2²·3"
factorize(30) → "2·3·5"
factorize(7)  → "7" (prime — rendered brighter)
factorize(1)  → "1"
```

Uses superscript unicode characters (², ³, etc.) and middle-dot (·) as separator.

**Pretext integration in PrimeGrid:**
- `prepareWithSegments(factString, font)` called once per unique factorization, cached in a `Map<number, { text: string, width: number }>`
- Width from pretext used to center each factorization string in its cell
- This is the key pretext value-add: variable-width strings like `2²·3·7` vs `2⁵` are perfectly centered without DOM reflow

**Scroll-driven depth calculation:**
```text
depth = scrollY / (documentHeight - windowHeight)
// Clamped to [0, 1]
// Used to interpolate between rendering modes
```

**Rendering modes by depth:**
```text
depth < 0.3  → plain numbers
depth 0.3–0.6 → primes show πₙ (e.g., π₄ for 7)
depth > 0.6  → composites show factorization
```

Transitions between modes use opacity interpolation so the change is gradual, not abrupt.

**Mouse lens rendering:**
```text
For each cell:
  dist = distance(cellCenter, mousePos)
  if dist > LENS_RADIUS: render at base opacity
  else:
    t = 1 - (dist / LENS_RADIUS)²  // quadratic falloff
    opacity = lerp(baseOpacity, peakOpacity, t)
    if showFactorization: render factString centered via pretext width
    else: render plain number
```

## Files Modified
| File | Change |
|------|--------|
| `PrimeGrid.tsx` | Full rewrite: mouse lens + scroll depth + pretext factorization |
| `PrimeSequenceCanvas.tsx` | Pretext-powered layout, reduced opacity/speed |
| `Layout.tsx` | Remove PrimeGrid |
| `IndexPage.tsx` | Mount PrimeGrid here |

