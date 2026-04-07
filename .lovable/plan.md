

# Streamlined Trust Card — Focused, Expandable, Delightful

## Current State

The "How we checked" panel shows 6 metrics in a flat list: Confidence, Statements checked, Evidence found, Key topics covered, Consistency, Answer improved. Some are redundant (e.g., "Statements checked" and "Evidence found" overlap with the summary line above). The section feels like a data dump rather than a curated insight.

## New Design: Three-Metric Trust Card with Drill-Down

Reduce to **3 core dimensions** that each tell a distinct, meaningful story. Each one is clickable to expand further detail.

### The Three Pillars

| Pillar | Label | Value | What it reveals | Expandable detail |
|--------|-------|-------|-----------------|-------------------|
| **Trust** | "How much can I trust this?" | "High" / "Moderate" / "Low" with a smooth arc or bar | Overall epistemic grade mapped to a human word + a subtle percentage | Expands to show the claim-by-claim breakdown (the existing Statement Breakdown list, already built) |
| **Evidence** | "What's backed by evidence?" | "8 of 16 statements" | How many claims were grounded vs generated | Expands to highlight only the grounded vs ungrounded claims, color-coded |
| **Consistency** | "Did everything check out?" | "Yes, all checks agree" / "Some uncertainty" | Whether the iterative refinement converged | Expands to show iteration count and convergence status in plain language |

### Visual Treatment

- Each pillar is a compact row with: colored indicator dot → bold label → value on the right
- Clicking a pillar smoothly expands its detail underneath (accordion-style, only one open at a time)
- The "Trust" pillar's detail view IS the existing Statement Breakdown (reuse that code)
- Remove the separate "Statement breakdown" toggle button from the summary line — it now lives inside the Trust pillar
- Keep the colored grade bar at the top (it's visually strong)
- Footer becomes just: "Checked independently · [derivation count] verifications"

### Summary Line Simplification

Replace the current summary line with just:
- Left: `✓ 8 of 16 backed by evidence`  
- Right: `Details ▸` (toggles the three-pillar card)

No separate "How we checked" and eye icon toggles — one single toggle reveals the focused card.

## Files to Change

| File | Changes |
|------|---------|
| `src/modules/oracle/pages/OraclePage.tsx` | Lines ~374-458: Replace the two separate expandable sections (claims + proof) with a single expandable three-pillar trust card. Remove `expandedProofs` state — merge into a single `expandedTrust` toggle. Each pillar gets its own accordion sub-state. Reuse Statement Breakdown markup inside the Trust pillar's expansion. |

## Layout Sketch

```text
── collapsed ──────────────────────────────
  ✓ 8 of 16 backed by evidence    Details ▸
───────────────────────────────────────────

── expanded ───────────────────────────────
  ✓ 8 of 16 backed by evidence    Details ▾

  ┌─────────────────────────────────────┐
  │ ● Trust level          High      ▸ │  ← click to see claims
  │ ● Evidence             8 of 16   ▸ │  ← click to see which
  │ ● Consistency          Confirmed ▸ │  ← click for details
  │                                     │
  │ Checked independently · 16 checks  │
  └─────────────────────────────────────┘
───────────────────────────────────────────
```

