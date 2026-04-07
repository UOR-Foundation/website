

# Response X-Ray — Reveal What's Behind Every Answer

## What It Is

A per-message toggle (Layers icon) that morphs the response bubbles into a visual decomposition of the five dimensions the UOR framework computed to build and verify that answer. Every value shown is real — computed by the WASM ring engine and the neuro-symbolic pipeline. Nothing decorative.

## The Five Dimensions (all grounded in existing computed data)

| Dimension | Human question it answers | Data source (already computed) | Visual |
|-----------|--------------------------|-------------------------------|--------|
| **What You Asked** | "What did the engine understand from my question?" | `scaffold.constraints[]` (type + description) and `scaffold.termMap[]` | Colored pills grouped by type: factual (blue), logical (purple), causal (amber). Key terms shown as ring-mapped tokens with their byte value. |
| **What's Grounded** | "Which parts of this answer have evidence behind them?" | `claims[].grade` + `claims[].text` | The original response text re-rendered with inline background highlights: green (A/B = backed), amber (C = plausible), red-tinted (D = generated). User sees exactly which sentences are strong vs weak. |
| **How Far It Drifted** | "Did the answer stay on track or wander?" | `curvature` (0–1 normalized) | A single horizontal gauge bar, gradient green→amber→red, with a dot at the actual value. Low = answer aligned with what you asked. High = answer drifted. |
| **How It Was Built** | "What reasoning process produced this?" | `proof.stepsCount`, `proof.premisesCount`, `iterations`, `converged` | Three connected nodes (Deductive → Inductive → Abductive) with counts. Shows whether the loop converged or needed refinement. |
| **Ring Fingerprint** | "What's the mathematical signature of this response?" | WASM bridge: `classifyByte`, `bytePopcount`, `factorize` on the scaffold's composite ring value | A compact row showing: partition class (Unit/Irreducible/Reducible), popcount, factorization. This is the unique algebraic identity of the query→response pair — computed by the actual Rust WASM crate. |

## Why Each Dimension Passes the "So What?" Test

- **What You Asked**: Users see whether the engine truly understood their intent, or misread it. Actionable: they can rephrase.
- **What's Grounded**: Users see exactly which sentences to trust and which to double-check. This is the single most valuable transparency feature.
- **How Far It Drifted**: One number that tells you "did the AI stay on topic?" Zero jargon.
- **How It Was Built**: Shows the answer wasn't just generated — it went through a verification loop. Builds trust.
- **Ring Fingerprint**: The "wow" moment — a unique mathematical identity for this specific exchange, verifiable via the WASM engine. No other AI product shows this.

## Implementation

### Data: Extend `TrustData` to carry scaffold info

Add `constraints` and `termMap` fields to `TrustData`. Populate them in `runVerificationLoop` from the scaffold that's already available there.

### State: Add `xrayOpen: Set<number>`

Tracks which message indices have X-Ray toggled on.

### UI: Toggle button + X-Ray panel

- Small `Layers` icon button appears at top-right of each assistant message group, only after verification completes (`trustMap[i]` exists)
- When toggled ON: bubbles dim to `opacity-20`, X-Ray panel slides in with `AnimatePresence`
- The five dimensions render as staggered sections (100ms apart), each with a subtle header and visual content
- The "What's Grounded" section re-renders the full response text with inline colored backgrounds per sentence grade — this is the centerpiece
- The curvature gauge is a simple CSS gradient bar with a positioned dot
- Ring Fingerprint calls WASM bridge functions (`classifyByte`, `bytePopcount`, `factorize`) on a composite ring value derived from the scaffold's term hashes

### Files to Change

| File | Changes |
|------|---------|
| `src/modules/oracle/pages/OraclePage.tsx` | Add `constraints` and `termMap` to `TrustData`. Store them in `runVerificationLoop`. Add `xrayOpen` state. Add Layers toggle button per assistant message. Add X-Ray panel with 5 dimension sections. Import `Layers` from lucide-react. Import WASM bridge functions for Ring Fingerprint. |
| `src/index.css` | Add `.oracle-xray-panel` for the panel container, `.oracle-xray-gauge` for the curvature bar, `.oracle-xray-sentence` variants for grounded/plausible/unverified inline highlights. |

### Layout Sketch

```text
  ┌─ X-Ray ──────────────────────────── [×] ─┐
  │                                           │
  │  WHAT YOU ASKED                           │
  │  ┌─────┐ ┌───────┐ ┌──────┐              │
  │  │ factual: memory │ factual: brain │ logical: Q │
  │  └─────┘ └───────┘ └──────┘              │
  │  Terms: memory(0xA3) brain(0x7F) encoding │
  │                                           │
  │  WHAT'S GROUNDED                          │
  │  ██ Memory involves encoding info...    A │
  │  ██ The hippocampus plays a key...      B │
  │  ░░ Some researchers believe...         C │
  │  ░░ This could potentially change...    D │
  │                                           │
  │  HOW FAR IT DRIFTED                       │
  │  ═══════════●──── 0.18 (low)              │
  │                                           │
  │  HOW IT WAS BUILT                         │
  │  ● Deductive(4) → ● Inductive(12) →      │
  │    ● Abductive → Converged ✓              │
  │                                           │
  │  RING FINGERPRINT                         │
  │  Irreducible · popcount 5 · 3 × 7 × 11   │
  └───────────────────────────────────────────┘
```

