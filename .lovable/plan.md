

## Streamline the Knowledge Pipeline for Real-Time Responsiveness

### The Problem

The current pipeline has several sequential bottlenecks that delay time-to-first-token and create jank during streaming. From query submission to first visible content, the user waits through: WASM encoding of a partial card, Wikipedia + Firecrawl resolution (both must complete before AI starts), and then raw token-per-setState renders without buffering.

### Bottleneck Analysis

```text
Current flow (worst case ~3-5s to first AI token):

  User hits Enter
    → getRecentKeywords (DB query)          ~100ms
    → getSearchHistory + computeCoherence   ~150ms
    → encode(partialSource) via WASM        ~50-200ms
    → setResult (first card appears)        ← FIRST PAINT
    → fetch to edge function                ~100ms network
      → Wikipedia + Firecrawl IN PARALLEL   ~800-2500ms (blocks AI start)
      → Build prompt, call AI gateway       ~200ms
      → First SSE wiki event arrives        ← FIRST SSE
      → First AI delta token                ← FIRST TOKEN
    → onDelta calls setResult per token     ← RE-RENDER STORM
```

### Plan

#### 1. Edge Function: Stream Wiki Metadata Before AI Is Ready (Critical)

**File: `supabase/functions/uor-knowledge/index.ts`**

The biggest win. Currently, Wikipedia and Firecrawl are awaited together (`Promise.all`), and the AI call only starts after both complete. Restructure to:

- Fire Wikipedia fetch immediately
- Send the SSE `wiki` event as soon as Wikipedia resolves (don't wait for Firecrawl)
- Fire AI call with Wikipedia-only context immediately after wiki resolves
- Let Firecrawl results arrive in the background and enrich the prompt if they arrive fast enough, otherwise skip them for the AI call

This alone could cut 1-2 seconds off time-to-first-token when Firecrawl is slow.

Additionally, start the AI stream **without waiting for Firecrawl** by using only Wikipedia context. If Firecrawl sources arrive within ~500ms, include them; otherwise proceed with wiki-only.

#### 2. Client: Defer WASM Encoding Until After First Paint

**File: `src/modules/oracle/pages/ResolvePage.tsx`**

In `handleKeywordResolve`, the partial card is encoded via WASM (`await encode(partialSource)`) before `setResult` is called. This blocks the first visual response by 50-200ms.

- Show the partial card immediately with a placeholder receipt (no WASM call)
- Encode the receipt in the background after the card is visible
- Only encode the final card after streaming completes (already happens)

#### 3. Client: Add TokenBuffer to Knowledge Streaming

**File: `src/modules/oracle/pages/ResolvePage.tsx`**

The `onDelta` callback currently calls `setResult(prev => ({...prev, source: {...src, "uor:content": accumulated}}))` on every single token. This creates a new object spread and React re-render per token (~30-60/sec).

- Integrate `TokenBuffer` (already exists, only used in Oracle chat) into the knowledge stream
- Buffer tokens and flush to React state at 30fps cadence instead of per-token
- Increase `rushChars` to ~200 for knowledge cards so the first paragraph appears instantly

#### 4. Client: Reduce Prefetch Debounce

**File: `src/modules/oracle/lib/speculative-prefetch.ts`**

- Reduce debounce from 600ms to 350ms — Wikipedia summary API is fast and lightweight
- This means the LivePreviewCard appears sooner, and the prefetch cache is warm when the user hits Enter

#### 5. Client: Parallelize Context Fetch with Stream Start

**File: `src/modules/oracle/pages/ResolvePage.tsx`**

Currently `handleKeywordResolve` does these sequentially:
1. `getRecentKeywords(15)` — DB query
2. `getSearchHistory(50)` — DB query  
3. `computeCoherence` — CPU work
4. Show partial card
5. Start stream

Restructure to fire context DB queries in parallel and don't block the partial card display on them. Start showing the card immediately, pass context to the stream when it's ready.

#### 6. Remove Confetti on Every Completion

**File: `src/modules/oracle/pages/ResolvePage.tsx`**

The confetti animation fires on every single knowledge card completion. Remove it — it adds ~50ms of canvas overhead and doesn't serve the "passing use" pattern. Reserve it for first-ever or milestone moments only.

#### 7. TokenBuffer Tuning for Knowledge Mode

**File: `src/modules/oracle/lib/token-buffer.ts`**

- Reduce `sentencePause` from 280ms to 120ms for snappier feel
- Increase `rushChars` from 80 to 250 so the opening paragraph renders instantly
- Reduce `baseInterval` from 35ms to 22ms for faster apparent throughput

### Expected Impact

```text
Optimized flow (~0.8-1.5s to first AI token):

  User hits Enter
    → Show partial card INSTANTLY (no WASM)    ← FIRST PAINT (~50ms)
    → Fire context queries in background
    → Edge function receives request
      → Wikipedia resolves (~300-500ms)
      → Send wiki SSE + start AI immediately   ← Don't wait for Firecrawl
      → First AI token arrives                 ← FIRST TOKEN (~800ms)
    → TokenBuffer batches renders at 30fps     ← SMOOTH STREAM
    → Firecrawl/media arrive asynchronously
    → WASM encode on completion only
```

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/uor-knowledge/index.ts` | Decouple Wikipedia from Firecrawl; start AI stream as soon as wiki resolves |
| `src/modules/oracle/pages/ResolvePage.tsx` | Defer WASM encode, add TokenBuffer, parallelize context queries, remove per-completion confetti |
| `src/modules/oracle/lib/speculative-prefetch.ts` | Reduce debounce 600ms → 350ms |
| `src/modules/oracle/lib/token-buffer.ts` | Tune for knowledge mode: faster rush, shorter pauses |

