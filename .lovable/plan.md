

# Add Download Desktop App Button

## What

Add a "Download for {OS}" button next to the existing "Explore Projects" CTA on both mobile and desktop layouts. The `useOSDownload` hook already exists at the top of the file — it just needs to be wired up.

## Changes — single file

**`src/modules/landing/components/HeroSection.tsx`**

1. Call `useOSDownload()` inside the component to get `{ os, file }`
2. **Desktop** (line ~141): Add a second button after "Explore Projects" inside the `flex-wrap gap-3` div:
   - Style: ghost/transparent variant — `border border-foreground/25` with `hover:border-foreground/50`, matching the existing button proportions but visually secondary
   - Label: `Download for {os}` with the `Download` icon (already imported)
   - Links to `/releases/{file}` (placeholder path for the actual hosted installer)
3. **Mobile** (line ~53): Add the same button below "Explore Projects" in the `flex-col gap-3` div, slightly smaller text to stay proportional

The button uses the same animation delay cascade and `pointer-events-auto` pattern as the existing CTA.

