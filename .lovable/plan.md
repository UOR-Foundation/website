
## Dynamic Latency-Driven Model Selection

### Problem
All edge functions hardcode `google/gemini-3-flash-preview`. If that model is slow (cold starts, load spikes), users wait too long for first tokens. The goal is Google-Search-like TTFT (<400ms perceived).

### Design

**Two-layer system: client-side latency tracker + server-side model cascade.**

#### 1. Client: Latency Tracker (`src/modules/oracle/lib/latency-tracker.ts`)

A small module that:
- Records TTFT (time from fetch start to first `onDelta` call) for every stream
- Maintains a rolling window of the last 5 TTFTs in `localStorage`
- Exposes `getPreferredTier()`: returns `"fast"`, `"balanced"`, or `"quality"` based on median TTFT
  - Median TTFT < 800ms → `"quality"` (keep current model)
  - Median TTFT 800ms–2000ms → `"balanced"` (downgrade one tier)
  - Median TTFT > 2000ms → `"fast"` (use fastest model)
- Exposes `recordTTFT(ms: number)` called by stream clients
- On first visit (no history), defaults to `"balanced"`

#### 2. Client: Pass tier hint in all stream requests

Update `stream-knowledge.ts`, `stream-oracle.ts`, and `stream-resonance.ts` to:
- Call `getPreferredTier()` and include `latencyTier` in the request body
- Measure TTFT: capture `performance.now()` before fetch, call `recordTTFT()` on first `onDelta`

#### 3. Server: Model cascade in edge functions

Update `uor-knowledge`, `uor-oracle`, `book-resonance`, and `quantum-inference-stream` to read `latencyTier` from the request body and select model accordingly:

```text
Tier Map:
  "quality"   → google/gemini-3-flash-preview    (current default)
  "balanced"  → google/gemini-2.5-flash           (faster, slightly less capable)
  "fast"      → google/gemini-2.5-flash-lite      (fastest, good for summaries)
```

If `latencyTier` is missing, default to `"balanced"`.

#### 4. Server: Timeout-based automatic fallback

Inside each edge function, add a **race** pattern:
- Start the AI request with the selected model
- If no response within 3 seconds, abort and retry with the next-faster model
- This handles transient model slowness without waiting for client-side adaptation

```text
Primary request (selected model)
  ↓ no response body in 3s?
Fallback request (one tier faster)
  ↓ no response body in 3s?
Final fallback (flash-lite, always fast)
```

#### 5. Provenance transparency

The SSE `wiki` event from `uor-knowledge` already includes a `model` field. Ensure all functions emit the actual model used (not the requested one), so the client can display accurate provenance and the latency tracker records against the right model.

### Files Changed

| File | Change |
|---|---|
| `src/modules/oracle/lib/latency-tracker.ts` | New — rolling TTFT tracker + tier selector |
| `src/modules/oracle/lib/stream-knowledge.ts` | Add tier hint to request, measure TTFT |
| `src/modules/oracle/lib/stream-oracle.ts` | Add tier hint to request, measure TTFT |
| `src/modules/oracle/lib/stream-resonance.ts` | Add tier hint to request, measure TTFT |
| `supabase/functions/uor-knowledge/index.ts` | Read `latencyTier`, model cascade + timeout fallback |
| `supabase/functions/uor-oracle/index.ts` | Read `latencyTier`, model cascade + timeout fallback |
| `supabase/functions/book-resonance/index.ts` | Read `latencyTier`, model cascade + timeout fallback |
| `supabase/functions/quantum-inference-stream/index.ts` | Read `latencyTier`, model cascade + timeout fallback |

### Key Details

- **No new database tables** — latency history is per-device in `localStorage`
- **Graceful degradation** — even if all models are slow, the fastest tier ensures *something* streams quickly
- **Self-healing** — if latency improves (e.g. model warms up), the rolling window naturally shifts back to higher-quality models
- **Zero user friction** — fully automatic, no UI controls needed (though the provenance badge already shows which model was used)
