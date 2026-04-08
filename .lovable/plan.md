

## Streaming Knowledge Rendering — Make It Fast and Feel Alive

### The Problem

Right now, when you search "dog," the flow is:
1. Wikipedia REST API fetch (~200ms) → partial card displayed
2. Edge function call to `uor-knowledge` (Wikipedia + AI synthesis in parallel, ~3-5s) → waits for full response → replaces content

The user stares at "Synthesizing knowledge…" for several seconds with no visible progress. The AI generates 1000+ words but delivers them all at once.

### The Solution: Stream the Article Into View

Convert the knowledge pipeline from batch (wait-for-everything) to streaming (tokens appear as they're generated). The article text materializes paragraph by paragraph, section by section — like watching someone type at superhuman speed. Combined with the instant Wikipedia metadata already showing, this creates a perception of near-zero latency.

### Architecture

```text
User types "dog"
    │
    ├─ [instant] Wikipedia REST API → thumbnail, description, extract
    │   └─ Render partial card with cover image + wiki extract immediately
    │
    └─ [streaming] Edge function streams AI tokens via SSE
        └─ WikiArticleView renders markdown progressively
            ├─ TOC builds as new ## headers arrive
            ├─ Sections appear one by one
            └─ Typing cursor blinks at the insertion point
```

### Changes

#### 1. Convert `uor-knowledge` edge function to streaming SSE

**File:** `supabase/functions/uor-knowledge/index.ts`

- Keep the Wikipedia fetch as-is (returns fast, included in initial response)
- Switch the AI gateway call to `stream: true`
- Return an SSE stream: first emit a `data: {"wiki": ...}` event with Wikipedia metadata, then pipe through each AI token as `data: {"delta": "..."}` events, ending with `data: [DONE]`
- This means the client gets Wikipedia data in ~200ms and AI tokens start flowing ~500ms later

#### 2. Create a streaming client helper

**File:** `src/modules/oracle/lib/stream-knowledge.ts`

A small function (similar to the existing `stream-oracle.ts`) that:
- Calls the streaming `uor-knowledge` endpoint
- Emits `onWiki(wikidata)` when the wiki metadata event arrives
- Emits `onDelta(text)` for each AI token
- Emits `onDone()` when complete
- Handles 429/402 errors

#### 3. Update `ResolvePage.tsx` keyword resolution to use streaming

**File:** `src/modules/oracle/pages/ResolvePage.tsx`

Replace the current `supabase.functions.invoke("uor-knowledge", ...)` call with the new streaming client. As tokens arrive:
- Accumulate the synthesis markdown in state
- Pass it to `WikiArticleView` which re-renders progressively
- The TOC, sections, and body text grow in real-time
- When done, compute the final canonical receipt

The Wikipedia phase 1 (instant metadata + cover image) stays exactly as-is.

#### 4. Add streaming visual polish to `WikiArticleView`

**File:** `src/modules/oracle/components/WikiArticleView.tsx`

- Add a subtle blinking cursor at the end of the content while `synthesizing` is true
- TOC entries appear as new `##` headers are detected in the growing markdown
- Smooth fade-in for each new paragraph as it completes

### What This Achieves

- **Perceived latency drops from ~4s to ~300ms** — content starts appearing almost immediately
- **Progressive rendering** — the article builds itself in front of you, section by section
- **Wikipedia data is instant** — cover image, thumbnail, description appear before AI even starts
- **Future-ready** — this same SSE pattern extends naturally to personalized/contextual rendering where the AI tailors content to the user's sovereign context

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/uor-knowledge/index.ts` | Convert to SSE streaming response |
| `src/modules/oracle/lib/stream-knowledge.ts` | **New** — streaming client for knowledge endpoint |
| `src/modules/oracle/pages/ResolvePage.tsx` | Use streaming client instead of `invoke()` |
| `src/modules/oracle/components/WikiArticleView.tsx` | Add typing cursor + progressive TOC |

