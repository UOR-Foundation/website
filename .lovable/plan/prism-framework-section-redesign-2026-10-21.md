# PRISM Framework section redesign

Replace the six project cards in the Framework section with one focused Prism story, in the Effect.website style: big statements, few words, one clear next step.

## Layout (top to bottom)

```text
PRISM FRAMEWORK
Every result proves itself.                [ Prism image card ]
One line on what Prism is.                 (glass prism, glow)
[Get started]  [View on GitHub]

WHY            HOW              WHAT
Trust breaks   Prism attaches   A small library
when data      a proof to       you install in
moves.         every result.    one line.

$ npm install @uor/prism   (copy button)

Latest from the Foundation (3 news cards, unchanged)
```

- Why / How / What shown as three quiet columns, no labels shouting; short eyebrow words only.
- Image card: rounded, thin border, the existing prism artwork, subtle hover lift.
- Install line with one click copy, like Effect.
- "Get started" goes to the Prism page; GitHub opens the Foundation repo.
- No dashes in any visible text; copy test extended to cover the new words.

## Technical notes
- New `FRAMEWORK` object in `foundation/content.ts` (title, line, why/how/what, install, links).
- Rewrite the `#framework` section in `FoundationHome.tsx`; drop the project card grid.
- Reuse `src/assets/foundation-hero.jpg` (or generate a dedicated prism card image if it looks too similar to the hero).
- Install command remains a placeholder until you give the real one.
