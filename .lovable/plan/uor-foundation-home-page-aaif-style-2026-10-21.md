# UOR Foundation home page, AAIF style

Rebuild the home page as a foundation site in the spirit of aaif.io: a bold editorial headline over a large atmospheric image, then a calm sequence of clear sections. Prism stays, but becomes one featured project among others.

## Copy rules
- No dashes in visible text. One short line per idea. No filler.

## Sections (top to bottom)
1. **Slim top ribbon**: one line announcement with a single link (dismissible).
2. **Top bar**: UOR Foundation wordmark, links (About, Projects, Research, Community), one "Join" button.
3. **Hero**: very large headline, for example "The internet runs on addresses. Data should own its own." with an animated last line, short subtitle, two buttons, full bleed generated background image (soft, dark, light rays).
4. **Projects grid**: "Build open standards with open people." Cards with logo, name, one line, GitHub and site icons. Prism first, then other existing UOR projects.
5. **Briefing / news strip**: latest news item from existing news data, with "Read more".
6. **Subscribe band**: one line pitch and an email field (front end only for now).
7. **Members / community**: simple row of community stats or partner marks from existing data.
8. **Closing call to action** and a minimal footer.

## Look and feel
- Deep navy/black canvas, crisp white type, one luminous accent (electric blue to teal glow), hairline borders, generous whitespace.
- Large grotesk headings, uppercase small mono labels like "PROJECTS".
- Rounded cards with subtle hover lift; fade in on scroll; respects reduced motion.

## Technical details
- New `src/modules/landing/foundation/` home component wired as the `/` page; Prism home kept and moved to `/prism`.
- Theme tokens added to the global stylesheet; no hardcoded colors.
- Content pulled from existing `projects`, `news-items` data files.
- Extend the existing no dash copy test to cover the new content.
- Update page title and description.
