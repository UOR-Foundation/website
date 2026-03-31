

# Rewrite Intro Section Copy

## Analysis

Studied CNCF, Rust, Signal, and Apache Foundation messaging. The pattern that earns developer trust:

- **CNCF**: One declarative sentence defining what they do, then proof (project counts, governance facts).
- **Rust**: Three concrete properties (Performance, Reliability, Productivity) — each one sentence of mechanism, one of outcome.
- **Signal**: "No ads. No trackers. No kidding." — blunt, factual, zero fluff.

The current UOR intro uses vague benefit language ("everything changes", "no middlemen, no gatekeepers") that sounds like marketing rather than specification. A skeptical developer wants to know *what it is*, *how it works*, and *why it matters* — in that order, stated as facts.

## Proposed Copy

**Label**: `INTRODUCING UOR` (unchanged)

**Paragraph 1** (What + How — the bold lead states the mechanism):

> **Every piece of data gets a permanent address derived from its content, not its location.** Identical content always resolves to the same identifier. References don't break when data moves. Any node can verify what it received independently — no round-trip, no central authority.

**Paragraph 2** (Why — the consequence, stated as fact):

> The result is infrastructure where integrity is structural, not bolted on. Scientists, developers, and institutions can build on a shared addressing layer that is open, auditable, and mathematically grounded.

**CTA**: `About The Foundation →` (unchanged)

**Footer line**: `Open source · Vendor-neutral · 501(c)(3) nonprofit · All specifications on GitHub` (unchanged)

## Technical Changes

**File**: `src/modules/landing/components/IntroSection.tsx`

- Replace lines 13–21 (the two `<p>` elements) with the new copy above.
- Keep all surrounding structure, classes, animations, dividers, CTA link, and ecosystem footer exactly as-is.

No other files change.

