

# De-clutter Hero Text Block

## Observation

The current text block beneath the galaxy has all four elements (subtitle, heading, description, CTA) compressed with minimal vertical gaps. The `clamp()` values for margins between them are too tight (e.g., `0.25rem` min for subtitle margin, `0.4rem` for description, `0.5rem` for CTA). This creates a visually dense, cluttered feel.

## Changes

### `src/modules/landing/components/HeroSection.tsx`

Increase the vertical breathing room between each text element in Row 3:

| Element | Current spacing | New spacing | Rationale |
|---------|----------------|-------------|-----------|
| "Universal Data Layer" bottom margin | `mb-[clamp(0.25rem,0.6vh,0.5rem)]` | `mb-[clamp(0.5rem,1.2vh,1rem)]` | More separation from heading |
| Heading `<h1>` line-height | `leading-[1.12]` | `leading-[1.18]` | Slightly more open heading lines |
| Description top margin | `mt-[clamp(0.4rem,1vh,1rem)]` | `mt-[clamp(0.75rem,1.8vh,1.5rem)]` | Clear gap between heading and body |
| Description font size | `text-[clamp(0.875rem,1.1vw,1.25rem)]` | `text-base` | Consistent with design system; less visual weight |
| CTA top margin | `mt-[clamp(0.5rem,1.2vh,1.5rem)]` | `mt-[clamp(1rem,2vh,2rem)]` | Generous space before the button |
| Row 3 bottom padding | `pb-[clamp(1.5rem,4vh,3rem)]` | `pb-[clamp(2rem,5vh,4rem)]` | More floor space so CTA doesn't feel cramped at the edge |

The galaxy size stays as-is since it looks good. These are purely spacing refinements to the copy block to let each element breathe.

