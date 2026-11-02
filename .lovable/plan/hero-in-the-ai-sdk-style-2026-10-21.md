# Hero in the AI SDK style

## What changes

1. **Remove the hero image** (the glass prism photo) and its overlays. Plain dark background.
2. **Centered layout**: large headline centered on two lines, tight letter spacing, plain white (no blue glow), current wording kept.
3. **One short centered line** below it (current sub line).
4. **For humans / For agents toggle**: two small text tabs with a thin divider; the active one is bright, the other dim.
5. **Install pill** under the toggle: rounded dark pill with a dim `$`, the command, and a copy icon that turns into a check when clicked.
   - For humans: `npm install @uor/prism`
   - For agents: `npx skills add uor-foundation/prism`
   Both are placeholders until you send the real commands.
6. **Get started / Join us buttons removed** so the hero stays as clean as the reference. The four stats row moves out of the hero, sitting just under it with the same hairline style.

## Technical details

- Edit `src/modules/landing/foundation/FoundationHome.tsx` hero block only; add `HERO.install` (humans/agents) to `foundation/content.ts`.
- Drop the `foundation-hero.jpg` import; new `mode` state for the toggle, reuse the existing copy pattern.
- No dashes in copy; no dash test must pass.
