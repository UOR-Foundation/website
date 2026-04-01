

# Deepen Foundation Aesthetic with Prime Grid System

## What changes

### 1. Prime Dot Grid Background Component
**New file:** `src/modules/landing/components/PrimeGrid.tsx`

A full-page fixed background layer rendering a subtle dot grid where dots at prime-indexed positions (row × col) glow gold, while non-prime positions are neutral gray at very low opacity. This creates a field of structured irregularity -- the mathematical signature of primes made visible.

- Grid: dots spaced every ~40px, covering the viewport
- Prime-indexed dots (positions 2, 3, 5, 7, 11, 13...): rendered in gold (`primary`) at ~8% opacity
- Non-prime dots: rendered in foreground at ~3% opacity
- Fixed position behind all content, `z-0`, `pointer-events-none`
- Subtle parallax-like effect via CSS: the grid stays fixed while content scrolls over it

This is the single most impactful addition -- it transforms the entire background from flat dark into a living mathematical field, exactly like a psychohistorical console readout.

### 2. Section Background Depth Variation
**File:** `src/index.css`

Add subtle radial gradient overlays to `--section-dark` sections to create depth pools rather than flat color blocks. Each alternating section gets a barely-visible radial gradient (navy-to-transparent) that creates the feeling of looking into different depths of space, like the Foundation's layered cinematography.

```css
.section-depth {
  background: radial-gradient(ellipse at 30% 50%, hsl(225 35% 8% / 0.6), transparent 70%);
}
```

### 3. Gold Accent Line System
**File:** `src/index.css`

Replace the current flat `bg-foreground/8` dividers in sections with a new `.rule-prime` class: a thin line where small gold tick marks appear at prime-spaced intervals (similar to CTA's timeline but subtler). This replaces the plain gray `<div className="h-px w-full bg-foreground/8" />` dividers across Intro, Applications, and Pillars sections.

### 4. Hero Section Refinement
**File:** `src/modules/landing/components/HeroSection.tsx`

- Add a subtle gold horizontal rule below the subtitle, reinforcing the "console readout" aesthetic
- Add a faint coordinate marker in the bottom-left corner: `[ 0, 0 ]` in monospace at 4% opacity -- suggesting the viewer is at the origin of a coordinate system

### 5. Card Border Enhancement
**File:** `src/index.css`

Update card/panel borders from flat `border-foreground/8` to a slightly warmer tone with a 1px gold-tinted border on hover, making interactive panels feel like they're "activating" in the psychohistorical console when engaged.

```css
.panel-active:hover {
  border-color: hsl(var(--primary) / 0.15);
}
```

### 6. Layout Integration
**File:** `src/modules/core/components/Layout.tsx`

Mount the `PrimeGrid` component as a fixed background layer in the Layout, so it persists across all pages.

## Technical details

**PrimeGrid component logic:**
- Pre-compute a Set of primes up to ~2000 using a sieve
- Render a CSS grid of ~50×30 dots (1500 total, lightweight)
- Each dot is a 2px circle; prime-indexed ones get `bg-primary/[0.08]`, others get `bg-foreground/[0.025]`
- `position: fixed; inset: 0; z-index: 0` with `pointer-events-none`
- All content sections already have `relative` positioning so they layer above

**Files modified:**
| File | Change |
|------|--------|
| `src/modules/landing/components/PrimeGrid.tsx` | New component |
| `src/modules/core/components/Layout.tsx` | Mount PrimeGrid |
| `src/index.css` | `.rule-prime`, `.section-depth`, card hover borders |
| `src/modules/landing/components/HeroSection.tsx` | Coordinate marker, gold rule accent |
| `src/modules/landing/components/IntroSection.tsx` | Replace flat dividers with `.rule-prime` |
| `src/modules/landing/components/ApplicationsSection.tsx` | Replace flat dividers with `.rule-prime` |
| `src/modules/landing/components/PillarsSection.tsx` | Replace flat dividers with `.rule-prime` |

**What stays the same:** Galaxy animation, typography, gold/navy palette, SpaceX layout, all content/copy, prime section indexes (§2, §3, etc.), animation timing.

