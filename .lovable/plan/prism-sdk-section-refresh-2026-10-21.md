# Prism SDK section refresh

Rename and simplify the section so a visitor understands Prism and starts in under a minute.

## Top
- Label: "Prism SDK" (replaces "PRISM Framework").
- Headline stays: "Every result proves itself."
- One line: "Prism is an open SDK that attaches a verifiable proof to everything your code computes."
- Buttons: Get started, GitHub. Install copy box stays.
- Prism image card stays on the right, caption "Prism SDK".

## Replace Why/How/What panels with a 3 step quick start
Numbered steps, each with a tiny code block and a one line explanation (Why/How/What kept implicit in the wording):
1. Install — `npm install @uor/prism` — "One package, no setup."
2. Wrap — `const add = prism((a, b) => a + b)` — "Wrap any function you already have."
3. Verify — `verify(add(2, 3))  // true` — "Anyone can check the result, anywhere."

Each code block gets a copy button. Cards share one bordered row, sharp corners matching the current style.

## Notes
- Install command and code are placeholders until you send the real ones.
- No dashes in visible text; copy test still covers it.

## Technical
- Update `FRAMEWORK` in `foundation/content.ts` (label, line, `steps` → `{n, t, code, d}`).
- Update the `#framework` block in `FoundationHome.tsx`; per step copy state.
