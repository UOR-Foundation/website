

# Golden Ratio Hero & Navigation — SpaceX-Grade Balance

## Analysis

Comparing the SpaceX reference to current implementation:

1. **Navbar text too small**: Currently 11px — SpaceX uses ~13px with generous spacing. On large screens (1920px+) the nav feels tiny.
2. **Hero headline too small**: Clamped at max 3.5rem (56px) — SpaceX headline is ~48-60px and feels commanding. On large screens the text doesn't scale up enough.
3. **Text positioned too low**: `pb-[18vh]` pushes text to the bottom. SpaceX positions text at roughly the vertical center-left (~40-45% from top).
4. **Galaxy not dramatic enough on large screens**: Currently 62% width — SpaceX's Mars takes ~55-60% of viewport and is positioned to bleed off the right edge.
5. **No golden ratio in layout**: Spacing between elements should follow φ (1.618) relationships.

## Plan

### 1. Navbar — Larger, More Confident Typography

**File:** `src/modules/core/components/Navbar.tsx`

- Increase nav link font size: `11px` → `clamp(11px, 0.85vw, 14px)` — scales fluidly from small to large screens
- Increase link padding: `px-5 lg:px-6` → `px-4 lg:px-7` for wider breathing room on large screens
- Logo wordmark: `11px` → `clamp(11px, 0.85vw, 13px)` 
- Donate button text: `10px` → `clamp(10px, 0.7vw, 12px)`
- Social icons: `15px` → `17px`
- Navbar height: keep `4.5rem` on desktop (matches SpaceX's slim bar)

### 2. HeroSection — Golden Ratio Positioning & Bigger Type

**File:** `src/modules/landing/components/HeroSection.tsx`

**Text positioning** — use golden ratio vertical placement:
- Instead of `justify-end` with `pb-[18vh]`, use `justify-center` with a slight upward offset
- Text block sits at ~38.2% from top (1 - 1/φ ≈ 0.382) — the golden section point
- Implement as: `items-start` + `pt-[38.2vh]` equivalent, or a flex layout with golden ratio spacers

**Headline sizing** — much larger, fluid:
- Mobile: `clamp(2.2rem, 8vw, 3rem)` 
- Desktop: `clamp(2.5rem, 4vw, 4.5rem)` — allows up to 72px on ultrawide
- This matches SpaceX's bold, commanding presence

**Subtext**: `14px` → `clamp(14px, 1vw, 17px)` for proportional scaling

**CTA button**: `10px` → `clamp(10px, 0.7vw, 12px)` with slightly larger padding

**Galaxy positioning** — more dramatic:
- Desktop: `w-[62%]` → `w-[58%]` with `mr-[-4%]` to bleed slightly off-edge like Mars in SpaceX
- Large screens (lg+): scale up to `w-[55%] h-[95%]` for maximum drama
- The galaxy should feel like it's emerging from the right edge

### 3. Responsive Scaling Table

```text
Viewport    Nav Links    Headline        Subtext    Galaxy Width
─────────   ─────────    ────────        ───────    ────────────
375px       11px         2.2rem (35px)   14px       85%
768px       12px         2.5rem (40px)   15px       62%
1280px      13px         3.5rem (56px)   16px       58%
1920px      14px         4.2rem (67px)   17px       55%
2560px      14px         4.5rem (72px)   17px       55%
```

### 4. Golden Ratio Spacing Relationships

```text
Hero vertical layout (top to bottom):
┌─────────────────────────────┐
│   38.2% (1/φ)               │  ← empty space / navbar
│─────────────────────────────│
│   HEADLINE                  │
│   gap: 1.618rem             │
│   Subtext                   │
│   gap: 2.618rem (φ²)        │
│   [CTA Button]              │
│                             │
│   remaining 61.8% fills     │
│   below text naturally      │
└─────────────────────────────┘
```

## Files Modified

| File | Change |
|------|--------|
| `Navbar.tsx` | Fluid font sizes with clamp(), larger icons, proportional spacing |
| `HeroSection.tsx` | Golden ratio vertical positioning, larger fluid headline, dramatic galaxy sizing |

