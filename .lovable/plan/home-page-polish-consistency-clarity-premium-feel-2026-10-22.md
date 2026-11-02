# Home page polish: consistency, clarity, premium feel

## What I found
- **Section labels don't match**: "EXPLORE UOR Framework", "Build with Prism SDK", "CONNECT with COMMUNITY" mix capitals and lowercase.
- **The "Connect with community" label sits on the news block**, while the real Community section (closing line and Join button) has no label at all.
- **Headlines come in four sizes** (68px, 80px, 54px, 72px), so each section feels like a different page.
- **The two install boxes don't match**: the hero one is a pill with a grey "$", the Prism SDK one is a rounded box with a white "$" and smaller text.
- **Too many words in places**: the top ribbon repeats the Prism SDK section, and the hero line "Seamlessly build, ship and run self verifying AI systems and applications that just work." is long.
- **Small clutter**: the short lines above the three About points, and the footer links are small and quiet next to the large wordmark.

## Changes
1. **One label style**: every label in the same capitals, e.g. `// EXPLORE UOR FRAMEWORK`, `// BUILD WITH PRISM SDK`, `// LATEST`, `// CONNECT WITH COMMUNITY`.
2. **Labels match their content**: the news block gets "Latest" with the title "Highlights."; "Connect with community" moves above "Let's build the impossible together."
3. **Two headline sizes only**: one for main sections (About, Prism SDK, Community), one smaller size for Highlights. Line height and width stay the same everywhere.
4. **Matching install boxes**: both use the hero pill style, same font size and same "$" colour.
5. **Shorter copy**:
   - Hero line: "Build, ship and run AI systems that prove their own results."
   - Ribbon: "Prism SDK v1.0 is here." with the link "Read the docs".
6. **Less clutter**: remove the short lines above the About points and give the three points even text sizes. Make the footer links slightly larger with even spacing.
7. **Same rhythm everywhere**: the 256px gap between sections and the smaller gap above the footer both stay as they are. Label to headline and headline to body spacing becomes the same in every section.

## Checks
- Screenshots on desktop (1614px) and phone, reviewed section by section.
- Wording test passes (no dashes), and the build is clean.

## Technical details
- Edits: `foundation/content.ts` (labels, hero sub, ribbon) and `FoundationHome.tsx`. Shared heading class constants `h2Main` / `h2Sub`, shared `InstallPill` component, and the Label renders `toUpperCase()`.
- No changes to palette, fonts, footer wordmark, or Prism card image.
