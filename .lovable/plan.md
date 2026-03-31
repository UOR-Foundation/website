

## Hero Section Golden-Ratio Spacing Refinement

### Problem
The hero section elements (galaxy, heading, CTA buttons) feel visually cluttered. Spacing between the three rows needs to follow golden-ratio proportions for a balanced, airy layout that works across all screen sizes.

### Golden-Ratio Spacing System
The golden ratio (φ = 1.618) will govern vertical rhythm. Base unit derived from viewport height:
- Galaxy padding: `clamp(1rem, 2vh, 2.5rem)` (tighter, letting the galaxy breathe via its own size)
- Gap between galaxy and heading: `clamp(1.5rem, 4vh, 3.5rem)` (≈ φ × base)
- Gap between heading and CTAs: `clamp(2rem, 4.5vh, 4rem)` (≈ φ² × base)
- Bottom padding: `clamp(3rem, 7vh, 5rem)` (≈ φ³ × base)

### Changes to `HeroSection.tsx`

1. **Row 2 (Galaxy)**: Reduce vertical padding to `py-[clamp(0.75rem,2vh,2rem)]` so the galaxy container itself defines its visual space without extra padding eating into the gap.

2. **Row 3 (Copy + CTA)**: Restructure spacing to create clear visual hierarchy:
   - Add top padding `pt-[clamp(1.5rem,4vh,3.5rem)]` to create generous breathing room between galaxy and heading
   - Increase CTA margin to `mt-[clamp(2rem,4.5vh,4rem)]` for clear separation between heading and buttons
   - Increase bottom padding to `pb-[clamp(3rem,7vh,5rem)]` to ground the section with ample whitespace below the CTAs
   - Add `gap-4` between buttons (up from `gap-3`) for a more spacious feel

3. **Button gap on mobile**: Increase from `gap-3` to `gap-3 sm:gap-4` for better tap targets and visual separation.

### File
- `src/modules/landing/components/HeroSection.tsx` — single file edit adjusting clamp values on the three grid rows.

