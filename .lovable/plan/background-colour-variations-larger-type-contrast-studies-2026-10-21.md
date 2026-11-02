# Background colour variations, larger type, contrast studies

## What you get
A theme switcher (small pill, bottom right of the homepage) to flip the live site between five looks, so you can compare them on the real page instead of mockups:

1. **Graphite** (AI SDK style): near black `#0A0A0A`, soft grey text, white headlines, no colour tint. Developer friendly.
2. **Midnight** (current): deep navy with electric blue accent, kept for comparison.
3. **Paper** (AAIF style): warm white `#FAFAF7`, ink black text, hairline grey lines, blue accent used sparingly.
4. **Power vs Force**: the hero split diagonally, white on one side, black on the other; the headline reads across both halves ("Your Verifiable" dark on light, "Agentic Foundation" light on dark). Rest of the page alternates light and dark sections.
5. **Inverse bands**: light page with full width black bands for the Prism SDK section and the closing area, for strong rhythm.

The choice is remembered on reload. Once you pick a favourite, I remove the switcher and make it the default.

## Larger type (LangChain scale), all themes
- Hero headline: up to about 88px on desktop, tighter line spacing.
- Section headings: about 48 to 56px.
- Body and card text: 18 to 20px (from 14 to 16px).
- Stats numbers larger, labels slightly larger, nav text 15px.
- More generous spacing between sections so the larger type breathes.

## Technical details
- `src/index.css`: define each theme as a `.foundation[data-theme="..."]` block overriding the existing `--fd-bg/panel/fg/dim/line/accent` tokens; add `--fd-split` gradient for the diagonal hero; add type scale tokens.
- `FoundationHome.tsx`: `theme` state persisted in localStorage, `data-theme` on root, small switcher component; section level `data-band="invert"` for alternating bands; replace text size classes with the new scale.
- Hero image card and icons checked for contrast on light themes (UOR mark switches to black on light).
- Verify all five themes on desktop and phone with screenshots; no-dash copy test keeps passing.
