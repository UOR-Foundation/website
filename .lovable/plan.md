

## Reduce Profile Banner Height with Golden Ratio Proportions

### Problem
The profile cover banner at `h-[200px] md:h-[260px]` dominates the viewport, pushing the actual content (title, identity, knowledge card) below the fold.

### Approach
Apply Golden Ratio reduction to the banner dimensions: divide current heights by φ (1.618) to produce a more elegant, cinematic strip that still showcases the galaxy imagery without overwhelming the page.

- **Mobile**: 200 ÷ φ ≈ **124px** → round to `h-[124px]`
- **Desktop**: 260 ÷ φ ≈ **161px** → round to `h-[161px]`
- Reduce the bottom gradient fade proportionally from `h-16` to `h-10`
- Adjust the parallax shift range from ±30px to ±18px (proportional reduction) and scale from 1.15 to 1.1 to keep the image from overflowing the shorter container

### File Changed

| File | Change |
|------|--------|
| `src/modules/oracle/components/ProfileCover.tsx` | Update container height classes, reduce parallax amplitude and scale, shrink gradient overlay |

