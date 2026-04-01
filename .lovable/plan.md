

# Prime Spiral — Living Intelligence Field

## Concept

Replace the busy grid of numbered cells with a **prime spiral** inspired by the Ulam spiral / the uploaded reference image. Numbers are plotted on a spiral path from the center outward. **Only prime numbers** are rendered as small luminous dots — composites are invisible. The result is a mysterious, organic pattern of dots spiraling outward that looks almost like DNA or a galaxy.

The cursor acts as a **spotlight**: in darkness, the spiral is barely visible (2-3% opacity). As the mouse moves, a soft radial glow (~280px radius) illuminates nearby prime dots, making them bloom to full gold brightness. Outside the spotlight, primes fade back to near-invisibility. The effect is visceral — you're literally searching through a field of mathematical intelligence.

The spiral **breathes**: a slow, continuous rotation (~0.0003 rad/frame) keeps it alive without being distracting. No text, no numbers, no factorizations — just pure dots on a spiral. Clean, crisp, precise.

## Changes

### 1. PrimeGrid.tsx — Complete Rewrite as Prime Spiral

**Remove entirely**: the rectangular grid, factorization strings, pretext measurement, all text rendering.

**New approach — spiral dot field:**
- Plot integers 1–4000 on an **Archimedean spiral** path: `r = a * sqrt(n)`, `θ = n * goldenAngle` (using golden angle ~2.3999 radians for even distribution, like sunflower seeds)
- For each position, check if `n` is prime — if yes, render a small dot; if no, skip entirely
- This naturally produces ~550 prime dots in a beautiful spiral pattern
- Center the spiral at viewport center (or slightly right to complement the left-aligned text)

**Dot rendering:**
- Base state: tiny circle (radius 1.5px), opacity 3% — barely a whisper
- Inside spotlight: radius grows to 2.5px, opacity rises to 40-50% gold (`hsl(38, 65%, 55%)`)
- Smooth cubic distance falloff within the spotlight radius
- No text whatsoever — dots only

**Spotlight (mouse lens):**
- 280px radius, cubic falloff
- Creates a dramatic "flashlight in the dark" effect
- On mouse leave, everything fades to whisper state

**Animation — living spiral:**
- Slow continuous rotation: `globalAngle += 0.0003` per frame
- This makes the entire spiral slowly turn, giving it a living, breathing quality
- Only re-render when mouse moves OR on each animation frame (rotation is always-on but cheap)

**Mobile:** No spotlight (no mouse). Instead, render primes at slightly higher base opacity (6%) so the pattern is visible as a static texture.

### 2. Remove PrimeSequenceCanvas

The drifting text stream competes with the spiral. Remove it from HeroSection to let the spiral be the single, clean prime visualization.

### 3. HeroSection.tsx — Simplified Background Layers

- Remove `PrimeSequenceCanvas` import and rendering
- Keep `PrimeGrid` (now the spiral) and `GalaxyAnimation`
- The spiral dots will complement the galaxy animation beautifully — both are circular/radial

## Technical Details

**Spiral positioning math:**
```text
for n = 1 to 4000:
  angle = n * 2.3999632 + globalRotation  // golden angle
  radius = spacing * sqrt(n)              // Archimedean via sqrt
  x = centerX + radius * cos(angle)
  y = centerY + radius * sin(angle)
  if isPrime(n): drawDot(x, y, ...)
```

**Spotlight opacity calculation:**
```text
dist = hypot(dotX - mouseX, dotY - mouseY)
if dist < 280:
  t = 1 - (dist/280)^3        // cubic falloff
  opacity = lerp(0.03, 0.45, t)
  dotRadius = lerp(1.5, 2.5, t)
else:
  opacity = 0.03
  dotRadius = 1.5
```

**Performance:** ~550 prime dots (primes below 4000) — trivial to render. No text measurement, no pretext needed. Pure circle drawing at 60fps.

## Files Modified

| File | Change |
|------|--------|
| `PrimeGrid.tsx` | Complete rewrite: spiral dot field with spotlight |
| `HeroSection.tsx` | Remove PrimeSequenceCanvas, keep spiral + galaxy |
| `PrimeSequenceCanvas.tsx` | No changes (just removed from HeroSection) |

