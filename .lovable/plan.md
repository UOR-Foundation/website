

# Honest Assessment: WASM UOR Is Not Enforcing Anything in the Oracle Today

## What exists

1. **The WASM binary is real and canonical.** The `uor-foundation` crate was compiled to WebAssembly. The bridge (`uor-bridge.ts`) exposes 15+ ring operations (neg, bnot, succ, pred, add, sub, mul, xor, verify_critical_identity, classify_byte, factorize, etc.) with TypeScript fallback. This part is sound.

2. **A complete neuro-symbolic verification engine exists** in `src/modules/ring-core/neuro-symbolic.ts` (532 lines). It has:
   - `buildScaffold(query)` — extracts constraints from a user query, maps terms to ring elements, builds a reasoning proof, and produces a `promptFragment` for LLM injection
   - `measureCurvatureAndAnnotate(scaffold, response)` — grades every sentence A/B/C/D, computes curvature, detects constraint violations
   - `processResponse()` — full loop orchestrator that produces refinement prompts when curvature is too high
   - `buildRefinementPrompt()` — re-prompts the LLM when verification fails
   - Epistemic grades, proof certificates, convergence detection

3. **Trust UI components exist** (`TrustScoreBar`, `EpistemicBadge`) — already built, never used in the Oracle.

## What is NOT wired up (the gap)

Searching the Oracle module for `buildScaffold`, `processResponse`, or `measureCurvatureAndAnnotate` returns **zero results**. None of the neuro-symbolic engine is connected to the Oracle.

Here is what actually happens today:

```text
User types question
  → Raw message sent to edge function (no scaffold, no constraints)
  → Edge function prepends a jargon-heavy system prompt
  → LLM generates response (unconstrained by UOR)
  → Client extracts "WASM_EXEC:" blocks from the text (if any)
  → Symbolic engine runs those expressions and shows results in sidebar
  → No grading, no curvature check, no constraint verification
```

The WASM engine only fires if the LLM happens to emit a `WASM_EXEC:` block in its text. The LLM is not constrained by UOR — it just talks about UOR. The user is correct: right now, this is just a prompt added to an LLM.

## The fix: wire the full neuro-symbolic pipeline

### What the flow should be

```text
User types question
  → buildScaffold(query)           ← WASM ring arithmetic runs here
  → scaffold.promptFragment injected into edge function request
  → LLM generates response (guided by scaffold constraints)
  → processResponse(scaffold, response, iteration)  ← WASM verification here
      → Splits response into sentences
      → Grades each sentence A/B/C/D using ring-derived curvature
      → Detects constraint violations
      → If curvature > threshold and iterations remain:
          → buildRefinementPrompt() → re-send to LLM → repeat
      → If converged: certifyProof() → done
  → Trust Surface displays grades, curvature, convergence
```

The WASM module is doing real work at two points: (1) building the scaffold constraints (ring element mapping, fiber budget, deductive steps), and (2) verifying the response (curvature measurement, abductive reasoning, proof certification).

### Files to change

**`supabase/functions/uor-oracle/index.ts`**
- Rewrite system prompt: human-first, no jargon, no forced WASM_EXEC blocks
- Accept `scaffoldFragment` from request body and prepend to system prompt
- Lower temperature to 0.4 for precision

**`src/modules/oracle/lib/stream-oracle.ts`**
- Add `scaffoldFragment?: string` parameter
- Include it in the POST body

**`src/modules/oracle/pages/OraclePage.tsx`**
- Import `buildScaffold`, `processResponse`, `overallGrade` from `ring-core/neuro-symbolic`
- Before each send: run `buildScaffold(query)`, pass fragment to `streamOracle`
- After streaming completes: run `processResponse(scaffold, response, iteration)`
- If not converged and iterations remain: auto-send refinement prompt (up to 3 iterations)
- Store per-message trust data (grade, claims, curvature, convergence)
- Replace sidebar with Trust Surface: overall grade, per-claim breakdown, curvature score, convergence status
- Replace jargon presets with human-interest questions
- Update header/placeholder copy

### What this gives the user

- **Every answer is structurally constrained** by the ring-derived scaffold before the LLM even sees the question
- **Every claim is individually graded** A through D using WASM-powered curvature measurement
- **Low-quality responses are automatically re-prompted** with specific violations until convergence
- **The proof trace is fully auditable** — expand any claim to see its ring constraint, curvature score, and derivation step
- **The framework is invisible** — the user sees clear answers with trust grades, not namespace paths

### Confirming canonical derivation

The WASM binary at `public/wasm/uor_wasm_shim_bg.wasm` was compiled from a shim crate that depends on `uor-foundation` from crates.io. The JS glue (`uor_wasm_shim.js`) exposes the same function signatures as the crate's `kernel::op` module: `neg`, `bnot`, `succ`, `pred`, `ring_add`, `ring_sub`, `ring_mul`, `ring_xor`, `ring_and`, `ring_or`, `verify_critical_identity`, `verify_all_critical_identity`, `classify_byte`, `factorize`, `byte_basis`, `byte_popcount`, `evaluate_expr`, `crate_version`, `list_namespaces`. The bridge layer (`uor-bridge.ts`) wraps each with a TypeScript fallback that implements the same Z/256Z arithmetic. The critical identity `neg(bnot(x)) === succ(x)` is verified exhaustively for all 256 elements.

The canonical derivation is sound. The problem is not the WASM — it is that the Oracle page never calls the verification engine that uses it.

