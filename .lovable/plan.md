

# Top 3 UOR-Unique Features for the Oracle

## Analysis: What Makes UOR Genuinely Novel

After auditing the full WASM-Rust implementation, the ring-core reasoning engine, and the neuro-symbolic pipeline, here are the three capabilities that no other AI interface offers. Each is grounded in the Z/256Z ring arithmetic running in WASM, demonstrable in real-time, and explainable without jargon.

---

## Feature 1: Claim-by-Claim Trust Grades (Epistemic X-Ray)

**What it is**: Every sentence in every answer gets an individual trust grade (A through D) computed by the WASM ring engine. Not a vague "confidence score" on the whole response — each claim is independently measured.

**Why it is unique**: No chatbot grades individual claims. ChatGPT, Claude, Gemini — they give you a wall of text and you have to trust all of it or none of it. UOR decomposes the response into atomic claims and runs each one through curvature measurement against the ring-derived scaffold. The user can see exactly which parts are well-grounded and which are speculative.

**How it works under the hood**: `measureCurvatureAndAnnotate()` splits the response into sentences, computes term coverage against the scaffold's `termMap` (ring-hashed), checks constraint satisfaction, and measures `abductiveCurvature` via the WASM bridge. Each sentence gets a grade based on its curvature distance from the scaffold constraints.

**How to showcase it**: Below each assistant message, show an expandable "Trust Map" — a visual bar of colored segments (green/blue/amber/red) representing the grade of each claim. Tap any segment to highlight that sentence and see its grade + reasoning. Label: **"See exactly which claims are verified."**

---

## Feature 2: Self-Correcting Answers (Auto-Refine Loop)

**What it is**: When an answer scores below a trust threshold, the system automatically sends it back to the LLM with specific constraint violations identified by the WASM engine. The answer improves itself — visibly, in front of the user.

**Why it is unique**: No AI self-corrects against algebraic constraints. Existing "retry" buttons just re-roll the dice. UOR's D-I-A (Deductive-Inductive-Abductive) loop identifies *exactly what went wrong* — which claims violated which constraints — and sends a targeted `buildRefinementPrompt()` back. The user watches the trust grade climb from C to B to A across iterations. This is the full reasoning cycle from `reasoning.ts`: deductive constraint propagation, inductive Hamming similarity, abductive curvature measurement — all running through WASM.

**How to showcase it**: When Auto-Refine is ON and a response grades C or D, show a subtle animation: "Refining... (iteration 2/3)" with the trust grade visibly updating. After convergence, show the before/after grades. Label: **"Answers that improve themselves."**

---

## Feature 3: Full Proof Trace (Reasoning Receipt)

**What it is**: Every answer produces a content-addressed proof object (`ReasoningProof` from `proof-machine.ts`) that records every deductive, inductive, and abductive step. The user can expand it and trace exactly how each claim was derived and verified — from the original query constraints through the ring arithmetic to the final grade.

**Why it is unique**: This is true interpretability, not a "chain of thought" that the LLM narrates about itself. The proof is computed independently by the WASM engine on the client side. It includes: scaffold constraints (ring-mapped terms), fiber budget allocations, Hamming distances, curvature values, and convergence status. It is a mathematical receipt that proves the verification actually happened. No other AI system provides a machine-verifiable audit trail for its answers.

**How to showcase it**: A small "Proof" button on each response that expands to show a clean, minimal timeline: Query → Scaffold (N constraints) → Response (M claims) → Verification (curvature X%) → Grade. Each step is expandable for detail. Label: **"Every answer leaves a proof trail."**

---

## Implementation Plan

### New UI: Three controls in the sidebar + enhanced per-message display

**Sidebar controls** (above the Trust Surface card):

1. **Precision slider** — "Balanced → Maximum"
   - Maps to LLM temperature: 0.7 → 0.2
   - Passed via `streamOracle` → edge function
   - One-liner: "How precise should the answer be?"

2. **Auto-Refine toggle** — ON/OFF
   - When ON: if grade is C or D, automatically runs `buildRefinementPrompt()` and re-sends (up to 3 iterations)
   - Shows iteration progress in real-time
   - One-liner: "Automatically improve low-trust answers"

3. **Scrutiny selector** — Lenient / Standard / Strict
   - Controls convergence epsilon: 0.1 / 0.01 / 0.001
   - Affects how strictly claims are graded
   - One-liner: "How strict should claim verification be?"

**Per-message enhancements**:

- **Trust Map**: Visual bar of colored segments below each response (always visible, compact)
- **Proof Trail**: Expandable panel showing the full D→I→A trace
- Clicking a claim segment highlights it in the response and shows its individual grade + source

### Files to change

| File | Change |
|------|--------|
| `src/modules/oracle/pages/OraclePage.tsx` | Add precision/auto-refine/scrutiny controls to sidebar. Implement auto-refinement loop (call `buildRefinementPrompt`, re-stream, re-verify). Add Trust Map and Proof Trail per message. Pass temperature to `streamOracle`. |
| `src/modules/oracle/lib/stream-oracle.ts` | Accept `temperature` parameter and pass to edge function |
| `supabase/functions/uor-oracle/index.ts` | Accept optional `temperature` from request body |

### How the auto-refine loop works in code

```text
send(query)
  → buildScaffold(query)
  → streamOracle(messages, scaffold.promptFragment, temperature)
  → onDone: processResponse(scaffold, response, iteration=0)
  → if grade <= "B" or !autoRefine → done, show results
  → if grade >= "C" and autoRefine and iteration < maxIterations:
      → buildRefinementPrompt(violations, curvature, iteration)
      → append refinement as user message
      → streamOracle again with same scaffold
      → onDone: processResponse(scaffold, newResponse, iteration=1)
      → repeat until converged or maxIterations
```

Each iteration updates the trust display in real-time so the user sees the grade improving.

