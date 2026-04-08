

## AI-Enhanced Knowledge Synthesis for Keyword Search

### Problem

Currently, searching a keyword like "cat" redirects to the Wikipedia article and renders it as a scraped web page. While functional, this doesn't create a **personal, synthesized experience** — it just mirrors an existing page. The user wants every keyword to produce a beautiful, consistent knowledge card that combines existing knowledge bases with AI synthesis.

### Approach: Multi-Source Knowledge Synthesis via Edge Function

Create a new edge function `uor-knowledge` that, given a keyword:
1. Fetches structured data from Wikipedia REST API (summary, Wikidata QID, thumbnail)
2. Sends a focused AI prompt to synthesize a concise, authoritative article about the term
3. Returns a unified JSON response combining both

The client assembles this into a new UOR type `uor:KnowledgeCard` — a canonical object that gets encoded and rendered with a consistent, beautiful layout regardless of the search term.

### What Changes

#### 1. New edge function: `supabase/functions/uor-knowledge/index.ts`

Accepts `{ keyword: string }`. Executes two parallel fetches:
- **Wikipedia REST API** (`/api/rest_v1/page/summary/{keyword}`) — gets QID, thumbnail, description, extract
- **Lovable AI Gateway** — sends a prompt like: *"Write a concise, well-structured article about '{keyword}'. Use markdown with clear sections. Include key facts, history, and significance. 600-800 words."*

Returns a JSON payload:
```json
{
  "keyword": "cat",
  "wiki": { "qid": "Q146", "thumbnail": "...", "description": "...", "extract": "..." },
  "synthesis": "# Cat\n\nThe domestic cat (*Felis catus*) is a small carnivorous mammal...",
  "sources": ["wikipedia.org/wiki/Cat", "wikidata.org/wiki/Q146"]
}
```

Non-streaming (invoke via `supabase.functions.invoke`), since we want the full synthesis before encoding.

#### 2. Update `handleKeywordResolve` in `ResolvePage.tsx`

Replace the current Wikipedia-redirect logic. Instead:
1. Call `uor-knowledge` edge function with the keyword
2. Build a `uor:KnowledgeCard` canonical object from the response
3. Encode it via the standard `encode()` pipeline
4. Set result with the enriched source object

The canonical object:
```json
{
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
  "@type": "uor:KnowledgeCard",
  "uor:label": "Cat",
  "uor:description": "Small domesticated carnivorous mammal",
  "uor:content": "<AI-synthesized markdown>",
  "uor:wikidata": { "qid": "Q146", "thumbnail": "...", "description": "..." },
  "uor:sources": ["wikipedia.org/wiki/Cat"],
  "uor:synthesizedAt": "2026-04-08T..."
}
```

#### 3. Add `KnowledgeCard` rendering to `HumanContentView.tsx`

When `@type` is `uor:KnowledgeCard`, render a dedicated layout:
- **Hero header**: Large thumbnail (if available) as a banner/float-right, title in display font, description as subtitle, Wikidata QID badge
- **AI synthesis**: The main content rendered as styled markdown with the existing `ReactMarkdown` + prose styles, bordered left with a primary accent
- **Sources footer**: List of source URLs as subtle linked badges
- **Consistent card style**: Same visual treatment regardless of keyword — clean, magazine-like layout

Add `KnowledgeCard` to `TYPE_STYLES` with a distinctive color (e.g., warm amber/gold to signal "synthesized knowledge").

#### 4. Add `"uor:sources"` and `"uor:synthesizedAt"` to label maps

Update `LABEL_MAP` in `HumanContentView.tsx` and `HUMAN_LABEL_MAP` in `ResolvePage.tsx` for the new fields. Add `"uor:synthesizedAt"` to `META_KEYS`.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/uor-knowledge/index.ts` | New — parallel Wikipedia + AI synthesis endpoint |
| `src/modules/oracle/pages/ResolvePage.tsx` | Replace `handleKeywordResolve` to call edge function, build KnowledgeCard |
| `src/modules/oracle/components/HumanContentView.tsx` | Add KnowledgeCard-aware rendering with hero layout |

### UX Flow

User types "cat" → loading state with "Synthesizing knowledge…" → edge function fetches Wikipedia metadata + AI writes a concise article simultaneously → canonical object built → encoded → result appears with a polished knowledge card featuring thumbnail, synthesized article, Wikidata badge, and UOR address. Same beautiful format whether they search "cat", "quantum entanglement", or "Baroque architecture".

