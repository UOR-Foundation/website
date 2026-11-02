# Prism homepage, Effect style

Replace the current home page with a single, sharp, premium landing page for **Prism**, styled after effect.website: a dark canvas, crisp type, monospaced accents, code as the hero visual, and lots of breathing room.

## Rules for every word on the page
- No dashes of any kind (no "-", "–", "—") in visible copy.
- One short line per idea. No filler, no repeated claims, no decorative badges.

## Page sections (top to bottom)
1. **Top bar**: UOR mark, three links (Docs, Pipeline, GitHub), one button.
2. **Hero**: headline "Verifiable computation, by design." One line subtitle. Install command with a copy button. Two buttons: Get started, Run Prism.
3. **Live code panel**: tabs for the core Prism stages (Type, Resolve, Partition, Certify, Trace). Left: a short code sample. Right: a minimal animated result view, like Effect's interactive demo.
4. **What Prism solves**: three or four tight cards (Typed identity, Proofs built in, Full replay, Content addressing), each a title plus one line.
5. **The eight stages**: one clean horizontal timeline using the existing stage names, each with a one line description.
6. **Closing call to action**: one sentence and the install command again.
7. **Footer**: a single line with a few links.

## Look and feel
- Near black background, off white text, one cool accent color, hairline borders.
- A sharp sans serif for headings and a mono font for code and labels (not Inter or Poppins).
- Spacing follows the golden ratio scale already used in the project.
- Subtle fade and slide on scroll only; respects reduced motion.

## Technical details
- New landing module page wired to the `/` route; old home page sections left in place but unused.
- New theme tokens in the global stylesheet; no hardcoded colors in components.
- Reuse existing Prism stage data from the pipeline page so content stays consistent.
- Update page title and description for Prism.
- Small check that the page copy contains no dash characters.
