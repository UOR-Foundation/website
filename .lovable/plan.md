

# Hero Section Redesign — SpaceX Split Layout

## Current State
The hero has the galaxy animation centered as a backdrop with text overlaid at the bottom-left. The text and image compete for the same space.

## SpaceX Pattern
SpaceX uses a **split layout**: text on the left (vertically centered), dramatic imagery on the right, both filling the full viewport width. The text includes a bold uppercase headline, a short description paragraph, and a single CTA button.

## Changes

### HeroSection.tsx — Split two-column layout

**Desktop (md+):**
- Switch from stacked/overlay layout to a **side-by-side grid**: `grid grid-cols-2` filling 100svh
- **Left column**: vertically centered, left-aligned text with generous left padding. Contains the uppercase headline, a short subtitle/description paragraph (e.g. "A universal mathematical framework for representing and transforming information across all domains"), and CTA buttons
- **Right column**: galaxy animation positioned to the right, allowed to extend/bleed toward the edge — sized larger to fill the right half dramatically (like SpaceX's Mars image)

**Mobile:**
- Stack vertically: galaxy on top (smaller), text below — similar to current but tighter

### Specific layout details
- Remove `absolute inset-0` centering of galaxy — place it in the right grid cell
- Galaxy container: `w-full h-full` within right column, centered vertically, allow it to be large and dramatic
- Left column: `flex flex-col justify-center px-8 md:px-16 lg:px-24`
- Add a 1-2 line description paragraph below the headline (SpaceX has one), styled as `text-white/60 text-base max-w-md`
- Keep both CTA buttons but style them SpaceX-like (already done)

### Files modified
- `src/modules/landing/components/HeroSection.tsx` — restructure to grid layout

