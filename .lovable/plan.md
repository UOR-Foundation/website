

## Rendering Lenses — Switchable Perspectives for Knowledge

### Concept

Add a "lens switcher" to the knowledge rendering pipeline. The same underlying content (Wikipedia + Wikidata facts) gets re-synthesized through different LLM system prompts, each producing a radically different reading experience. The lens choice is passed to the edge function, which swaps the system prompt accordingly.

### Preset Lenses (5 to start)

| Lens ID | Label | Icon | Prompt Character |
|---------|-------|------|------------------|
| `encyclopedia` | Encyclopedia | BookOpen | Current Wikipedia-style (default) |
| `magazine` | Magazine | Newspaper | Entertainment journal — vivid, magazine-style feature article with pull quotes |
| `explain-like-5` | Simple | Baby | Explain to an 8-year-old — short sentences, analogies, wonder |
| `expert` | Deep Dive | GraduationCap | Graduate-level technical depth, assumes domain expertise |
| `storyteller` | Story | BookText | Narrative arc — tells the topic as a compelling story with characters and drama |

### Architecture

```text
User clicks lens pill
       │
       ├─ State update: activeLens = "magazine"
       │
       └─ Re-stream from edge function with { keyword, context, lens: "magazine" }
              │
              ├─ Edge function selects system prompt for "magazine" lens
              ├─ Streams AI tokens with magazine-style writing
              └─ Same Wikipedia/Wikidata facts, completely different voice
```

The lens does NOT re-fetch Wikipedia. The wiki metadata and infobox stay the same. Only the AI synthesis is re-generated through a different prompt.

### UI: Lens Switcher Bar

A horizontal pill bar rendered above the article content inside `ContextualArticleView`. Five small pills with icons + labels. The active lens is highlighted. Clicking a different lens triggers a re-stream — the article dissolves and rebuilds token-by-token in the new voice.

The bar is compact, elegant, and feels like switching a camera filter.

### Changes

#### 1. Define lens presets

**File:** `src/modules/oracle/lib/knowledge-lenses.ts` (new)

A simple typed registry of lens definitions: `{ id, label, icon, description }`. No UOR complexity here — just the metadata. Future custom lenses will extend this array.

#### 2. Update edge function to accept `lens` parameter

**File:** `supabase/functions/uor-knowledge/index.ts`

- Accept `lens` string in the request body
- Add a `buildLensPrompt(lens, context)` function that returns a different system prompt per lens
- The `encyclopedia` lens uses the current prompt (backward compatible)
- Each lens prompt maintains factual accuracy but changes tone, structure, depth, and style

#### 3. Update streaming client

**File:** `src/modules/oracle/lib/stream-knowledge.ts`

- Add optional `lens?: string` parameter to `streamKnowledge()`
- Pass it in the JSON body to the edge function

#### 4. Lens Switcher UI + re-stream logic

**File:** `src/modules/oracle/components/ContextualArticleView.tsx`

- Add `activeLens` state (default: `encyclopedia`)
- Render lens pills above the article
- Accept an `onLensChange(lens)` callback prop
- When a lens is clicked, call `onLensChange` which triggers re-streaming in ResolvePage

#### 5. Wire up ResolvePage

**File:** `src/modules/oracle/pages/ResolvePage.tsx`

- Add `activeLens` state
- Pass `lens` to `streamKnowledge()`
- Add `handleLensChange` that re-streams the current keyword with the new lens
- Pass `onLensChange` and `activeLens` through `HumanContentView` → `ContextualArticleView`

#### 6. Pass-through in HumanContentView

**File:** `src/modules/oracle/components/HumanContentView.tsx`

- Add `activeLens` and `onLensChange` props, pass them to `ContextualArticleView`

### Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/lib/knowledge-lenses.ts` | **New** — lens preset definitions |
| `supabase/functions/uor-knowledge/index.ts` | Accept `lens` param, multi-prompt routing |
| `src/modules/oracle/lib/stream-knowledge.ts` | Add `lens` to request body |
| `src/modules/oracle/components/ContextualArticleView.tsx` | Lens switcher pills UI |
| `src/modules/oracle/components/HumanContentView.tsx` | Pass lens props through |
| `src/modules/oracle/pages/ResolvePage.tsx` | Lens state + re-stream on switch |

### What the User Experiences

1. Search "black holes" — article renders in Encyclopedia mode (default)
2. Click "Magazine" pill — article dissolves, re-streams as a vivid feature article: "Deep in the cosmic abyss, where light itself surrenders..."
3. Click "Simple" — re-renders for an 8-year-old: "Imagine a vacuum cleaner so powerful that even light can't escape..."
4. Click "Deep Dive" — graduate-level: "The Kerr metric solution to Einstein's field equations describes..."
5. Switching is instant — the streaming starts immediately, building the new perspective token by token

