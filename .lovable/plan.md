

# Wire UOR Neuro-Symbolic Verification into the Oracle

## Problem
The Oracle page ignores the existing neuro-symbolic engine entirely. It sends raw messages to the edge function with a jargon-heavy system prompt, and the sidebar shows raw WASM computation results. Meanwhile, the project already has a complete verification pipeline (`buildScaffold`, `measureCurvatureAndAnnotate`, `processResponse`) and polished trust UI components (`TrustScoreBar`, `EpistemicBadge`) sitting unused.

## What Changes

### 1. Rewrite the system prompt to be human-first
**File: `supabase/functions/uor-oracle/index.ts`**

Strip all UOR jargon from the system prompt. The new prompt instructs the LLM to:
- Be a world-class explainer on any topic, using clear conversational prose
- Structure responses as distinct, verifiable claims (one idea per sentence)
- State uncertainty explicitly when relevant
- Never mention UOR internals, namespaces, crate modules, `cargo add`, or `WASM_EXEC` blocks unless the user explicitly asks about UOR
- Accept an optional `scaffoldFragment` field from the request body and prepend it to the system prompt, so client-side ring constraints guide the LLM's reasoning

Lower temperature from 0.7 to 0.4 for more precise answers.

### 2. Pass scaffold constraints to the edge function
**File: `src/modules/oracle/lib/stream-oracle.ts`**

Update the `streamOracle` function signature to accept an optional `scaffoldFragment: string` parameter. Include it in the POST body so the edge function can inject it into the system prompt.

### 3. Wire the full neuro-symbolic pipeline into OraclePage
**File: `src/modules/oracle/pages/OraclePage.tsx`**

This is the main integration work:

**Before sending each message:**
- Call `buildScaffold(query)` from `ring-core/neuro-symbolic`
- Pass `scaffold.promptFragment` to `streamOracle` so it reaches the edge function

**After streaming completes:**
- Call `processResponse(scaffold, assistantText, iteration)` to get the `CurvatureReport` with per-claim `AnnotatedClaim[]` and overall epistemic grade
- Store the result per-message (add a parallel state array for trust data)

**In the chat panel:**
- Below each assistant message, render `TrustScoreBar` with the grade, claims, curvature, and convergence status
- Wire `TrustScoreBar`'s `onSendFollowUp` to the `send` function so "Improve Trust" actions work

**Replace the sidebar** with a Trust Surface:
- Overall trust grade for the latest response (large, prominent)
- Verification details: curvature score, convergence status, claim count, iteration count
- Remove: WASM engine status card, raw computation results, 14 Namespaces card, `cargo add` copy button
- Keep a subtle "Powered by UOR" footer with the crate link

### 4. Human-first presets
Replace the current UOR-jargon presets with general-interest questions:
- "How does memory work in the brain?"
- "Explain quantum computing simply"
- "What causes inflation?"
- "How do vaccines work?"
- "Is cold fusion possible?"
- "What is UOR?" (the one UOR-specific option)

### 5. Updated copy
- Header: "Ask Anything" instead of "UOR Oracle"
- Subtitle: "Every answer is structurally verified for accuracy and clarity."
- Placeholder: "Ask anything..." instead of "Ask about UOR..."
- Empty state: "Ask any question. The verification engine works behind the scenes to grade every claim for accuracy."

## Value-Adds Enabled by UOR

Beyond precision and interpretability, three additional unique capabilities:

1. **Self-improving conversations**: When trust is low (Grade C/D), the `TrustScoreBar` suggests specific follow-up actions ("Request sources", "Narrow the question"). Each action sends a targeted re-prompt, and the next response gets re-graded. The conversation gets more precise over time.

2. **Epistemic honesty at scale**: Every response carries a visible trust grade. Users immediately know whether an answer is well-grounded (A/B) or speculative (C/D). No other chatbot does this.

3. **Full audit trail**: The proof object from `processResponse` contains every deductive, inductive, and abductive step. The "Chain of thought" tab in `TrustScoreBar` shows the complete derivation. Any claim can be inspected down to its ring-level constraint.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/uor-oracle/index.ts` | Rewrite system prompt; accept `scaffoldFragment` in request body |
| `src/modules/oracle/lib/stream-oracle.ts` | Add `scaffoldFragment` parameter to `streamOracle` |
| `src/modules/oracle/pages/OraclePage.tsx` | Integrate `buildScaffold` + `processResponse`; replace sidebar with Trust Surface; render `TrustScoreBar` per message; new presets and copy |

