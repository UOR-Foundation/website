

## Model Upgrade & Provenance Clarity

### Current State

The primary content-rendering pipeline (`uor-knowledge`) already uses `google/gemini-3-flash-preview` — the fastest next-gen model available. However, the provenance banner displays **"Gemini 3 Flash Preview"** via naive string formatting, and secondary functions still use older models. The user's screenshot shows this attribution text prominently, and it should feel polished rather than exposing raw model identifiers.

### Changes

#### 1. Upgrade All Edge Functions to Best Available Models

| Edge Function | Current Model | Upgrade To |
|---|---|---|
| `uor-knowledge` | `gemini-3-flash-preview` | ✅ Already optimal |
| `uor-oracle` | `gemini-3-flash-preview` | ✅ Already optimal |
| `quantum-inference-stream` (70B) | `gemini-3-flash-preview` | Upgrade to `google/gemini-3.1-pro-preview` for the "70B" tier — latest and most powerful reasoning model |
| `quantum-inference-stream` (8B) | `gemini-2.5-flash` | Upgrade to `google/gemini-3-flash-preview` |
| `quantum-inference-stream` (default) | `gemini-2.5-flash-lite` | Upgrade to `google/gemini-2.5-flash` |
| `hologram-code-ai` (completion) | `gemini-2.5-flash-lite` | Upgrade to `google/gemini-2.5-flash` |
| `confidential-inference` | `gemini-3-flash-preview` | ✅ Already optimal |

#### 2. Clean Up Provenance Banner — Remove Model Attribution

**File: `src/modules/oracle/components/ProvenanceBanner.tsx`**

The provenance banner currently exposes the raw model name. Since the purpose is a seamless personal internet experience (not a model showcase), replace the model identifier with human-friendly, brand-aligned language:

- Badge row: Replace "⚙ Gemini 3 Flash Preview" → "⚙ UOR Synthesis" or simply remove the model badge entirely
- Expanded detail: Replace "This article was synthesized by **Gemini 3 Flash Preview**" → "This article was synthesized by **UOR**" — keeping the focus on the framework, not the underlying model
- Remove the `model` prop dependency from display (keep it internally for debugging/logging if needed)

#### 3. Update SSE Metadata Label

**File: `supabase/functions/uor-knowledge/index.ts`**

Change the `model` field in the SSE `wiki` event from `"gemini-3-flash-preview"` to `"uor-synthesis"` so the client receives a clean label. Three occurrences (~lines 797, 814, and the response metadata).

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/quantum-inference-stream/index.ts` | Upgrade model tiers to latest |
| `supabase/functions/hologram-code-ai/index.ts` | Upgrade completion model |
| `supabase/functions/uor-knowledge/index.ts` | Change model label in SSE metadata |
| `src/modules/oracle/components/ProvenanceBanner.tsx` | Display "UOR Synthesis" instead of raw model name |

