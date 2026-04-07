

# X-Ray Insights: Reveal What's Hidden Behind Every Answer

## The Problem With the Current X-Ray

The current sections (Understanding, Evidence, Alignment, Reasoning, Signature) describe *how the engine processed* the response. That's meta-information about the machinery. It answers "how did this work?" but not "what did I just learn that I didn't know before?"

The user's instinct is right: the current X-Ray risks the "so what?" response because it shows process, not revelation.

## The New Design: Three Insight Layers

Replace the current five sections with three that are content-derived, surprising, and immediately useful. Each one answers a question the reader didn't know to ask.

### 1. What You Didn't Ask (but should have)

**The "holy shit" moment.** Derived from the scaffold's constraint analysis and the response's claim coverage.

- The engine already knows which constraints the response satisfied and which it didn't (from `CurvatureReport.violations` and `gradeSentence`).
- We compute the **gap**: terms from the user's query that the response touched on, vs adjacent concepts that the response revealed but the user never mentioned.
- Present these as "blind spots": concepts the user's question implicitly depends on but never named.
- Implementation: Compare `scaffold.termMap` (what was asked) against terms extracted from the response text that don't appear in the original query. Use the ring engine to compute XOR distance between query terms and response terms, surfacing the most "algebraically distant" concepts that still appeared.
- Display: Clean list of 2-4 concepts with a one-line explanation of why each matters, each linked to its UOR receipt.

### 2. Trust Map (replaces Evidence + Alignment)

**The "I can see what to trust" moment.** The response text itself, re-rendered sentence by sentence, with each sentence's epistemic grade shown as a subtle left-border color. No separate panel, the text IS the visualization.

- Green border = grounded (A/B). Amber = plausible (C). Red-tint = unverified (D).
- Each sentence is clickable: opens its UOR receipt + external verification link.
- At the top: a single fraction: "7 of 9 claims backed" with the overall grade.
- This replaces the current Evidence section (which lists claims separately from the text) and Alignment (which is abstract). Now the user sees trust *in context*, directly on the words.

### 3. Proof Chain (replaces Reasoning + Signature, condensed)

**The "this is real" moment.** A single compact row showing the complete provenance chain:

```
Your question → 4 constraints extracted → 9 claims verified → converged ✓ → 0xA3 Irreducible · 3 × 7
```

One line. Every element is a clickable receipt. The entire reasoning chain and algebraic signature compressed into a single scannable provenance trail. No boxes, no sections, just a clean chain of linked facts.

## What Makes This Different

| Old X-Ray | New X-Ray |
|-----------|-----------|
| Shows engine internals | Shows content insights |
| "Understanding" = what the engine did | "What You Didn't Ask" = what you missed |
| Evidence listed separately from text | Trust Map overlaid on actual text |
| Alignment gauge (abstract number) | Trust visible per-sentence (concrete) |
| Reasoning + Signature in separate boxes | Single provenance chain (one line) |

## Data Sources (all existing, no new API calls)

- **What You Didn't Ask**: `scaffold.termMap` vs response text word extraction + `bridge.xor()` for ring distance
- **Trust Map**: `claims[].grade` + `claims[].text` + `receipts[claim-N]` (already computed)
- **Proof Chain**: `proof.constraintsCount`, `claims.length`, `converged`, composite ring + `classifyByte`/`factorize` (already computed)

## Files to Change

| File | Change |
|------|--------|
| `OraclePage.tsx` | Replace X-Ray panel content (lines ~449-663). Add blind-spot extraction function. Restructure into 3 layers. Add `responseText` to TrustData so we can re-render the trust map. |
| `OraclePage.tsx` | Store the raw response text in `TrustData` during `runVerificationLoop` |
| `index.css` | Add `.oracle-trust-sentence` border-left variants for A/B/C/D grades |

## Layout

```text
  ┌─────────────────────────────────────────────┐
  │  WHAT YOU DIDN'T ASK                        │
  │                                             │
  │  Your question about memory assumes         │
  │  several things you never stated:           │
  │                                             │
  │  • Neuroplasticity — the mechanism that     │
  │    makes memory possible. Without it,       │
  │    none of the above applies.     🔗 receipt │
  │                                             │
  │  • Encoding specificity — how context       │
  │    at storage time affects retrieval.        │
  │    This changes the practical advice.       │
  │                                   🔗 receipt │
  ├─────────────────────────────────────────────┤
  │  TRUST MAP          7 of 9 claims backed  B │
  │                                             │
  │  ┃ Memory involves encoding information     │
  │  ┃ into neural patterns that can be         │
  │  ┃ retrieved later.                    A 🔗 │
  │  ┃                                          │
  │  ┃ The hippocampus plays a central role     │
  │  ┃ in consolidating short-term memory       │
  │  ┃ into long-term storage.             B 🔗 │
  │  ┃                                          │
  │  ░ Some researchers believe emotional       │
  │  ░ memories may be stored differently. C 🔗 │
  ├─────────────────────────────────────────────┤
  │  Your question → 4 constraints → 9 claims  │
  │  → converged ✓ → 0xA3 Irreducible · 3 × 7 │
  │                              all receipts ↗ │
  └─────────────────────────────────────────────┘
```

