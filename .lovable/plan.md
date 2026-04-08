

## Perplexity-Style Provenance and Citation System — UOR-Anchored

### Problem

The current citation system is minimal: only `encyclopedia` and `expert` lenses emit `[N]` markers referencing just Wikipedia + Wikidata (2 sources max). Magazine, storyteller, and explain-like-5 lenses have zero citations. There is no indication of where content comes from — whether it's AI-generated, sourced from the web, or influenced by user context. The reader has no intuitive way to verify claims or open original sources quickly.

Perplexity solves this elegantly: every claim is marked, every source is one click away, and the UI never overwhelms the reading experience.

### Design Principles

1. **Always accessible, never in the way** — Citations are subtle inline superscripts. The detail layer (popover, source drawer) only appears on interaction.
2. **Three-tier provenance** — Every piece of content is labeled as one of: `Web Source` (Wikipedia, Wikidata, external), `AI Synthesized` (LLM-generated), or `Personalized` (shaped by user context). This is the transparency guarantee.
3. **One-tap source access** — Tapping any citation opens the original source instantly. The popover shows a preview; the click goes to the URL.
4. **UOR-anchored** — Every source gets an fnv1a content-address. The provenance metadata is part of the UOR identity space.

### Implementation

#### 1. Enrich all lens prompts with citations (not just encyclopedia/expert)

**File:** `supabase/functions/uor-knowledge/index.ts`

Add citation instructions to `magazine`, `explain-like-5`, and `storyteller` lenses. Currently they say "Do NOT add citations." Change to: add `[N]` markers after factual claims, but keep them minimal (3-5 per article for narrative lenses vs 8-15 for encyclopedia/expert). The rule changes from "no citations" to "light citations that don't break narrative flow."

Update the sources array to include richer metadata. Currently sources are just URL strings. Emit them as `{ url, title, type }` objects in the SSE `wiki` event. Add a `title` field extracted from the Wikipedia API response (`data.titles.display`). This gives the citation popover a proper title instead of just a domain.

#### 2. Add a provenance banner — transparent "how this was made"

**File:** `src/modules/oracle/components/ProvenanceBanner.tsx` (new)

A slim, collapsible banner below the SourcesPills that states exactly how this content was generated. Shows three provenance signals as tiny labeled badges:

```text
┌──────────────────────────────────────────────────────────┐
│ 🌐 Wikipedia · Wikidata    ⚙ Gemini 2.5 Flash    👤 3 topics │
│ ▸ How this was generated                                       │
└──────────────────────────────────────────────────────────┘
```

- **Web sources** badge: count of external sources used
- **AI model** badge: which model synthesized the content (from edge function metadata)
- **User context** badge: if personalization was active, shows "Personalized · N topics" — clicking reveals which recent searches influenced the article

Collapsed by default (just the badges). Expandable to show a 2-3 line explanation: "This article was synthesized by Gemini 2.5 Flash using 2 web sources (Wikipedia, Wikidata) and personalized based on your recent exploration of [quantum mechanics, photosynthesis]. All facts marked with [N] link to their original source."

#### 3. Enhance InlineCitation popover with richer metadata

**File:** `src/modules/oracle/components/InlineCitation.tsx`

Upgrade the popover to include:
- **Source title** (not just domain) — e.g., "Quantum mechanics - Wikipedia" 
- **Source type badge** — color-coded pill: `Wikipedia` (blue), `Wikidata` (green), `Web` (gray)
- **"Open source" button** — explicit button text instead of relying on the user knowing to click the URL
- **UOR hash** stays as the subtle anchor at the bottom

Also add touch support: on mobile, tap toggles the popover (currently only hover works).

#### 4. Extend SourceMeta with title field

**File:** `src/modules/oracle/lib/citation-parser.ts`

Add `title?: string` to `SourceMeta`. Update `normalizeSource` to accept and pass through the title when available. This flows from edge function → SSE → client → popover.

#### 5. Update stream-knowledge to carry richer source metadata

**File:** `src/modules/oracle/lib/stream-knowledge.ts`

The `onWiki` callback currently receives `sources: string[]`. Update to accept `sources: Array<string | { url: string; title?: string; type?: string }>` and normalize them in the handler. Backward compatible — plain strings still work.

#### 6. Add SourcesPills + ProvenanceBanner to narrative lenses

**Files:** `MagazineLensRenderer.tsx`, `StoryLensRenderer.tsx`, `SimpleLensRenderer.tsx`

These lenses currently have zero citation UI. Add:
- `SourcesPills` at the top (same as encyclopedia/expert)
- Citations via `CitedMarkdown` instead of raw `ReactMarkdown`
- A compact references footer at the bottom

The narrative lenses keep their visual identity — the citations are subtle superscripts that don't break the magazine/story/simple reading flow.

#### 7. Edge function: emit model metadata in wiki event

**File:** `supabase/functions/uor-knowledge/index.ts`

Add `model: "gemini-2.5-flash"` and `personalized: boolean` fields to the SSE `wiki` event payload. The client uses these to populate the ProvenanceBanner.

### What the User Sees

1. **Sources appear instantly** at top — favicon pills showing Wikipedia, Wikidata
2. **Provenance banner** below sources: "🌐 2 sources · ⚙ AI synthesized · 👤 Personalized" — one line, always visible, expandable for details
3. **Text streams with subtle citations** — superscript markers after factual claims, even in magazine/story lenses (but fewer, tasteful)
4. **Tap/hover any marker** → popover with source title, type badge, one-tap "Open source" link, UOR hash
5. **Context transparency** — if personalized, the banner shows which recent searches influenced the content
6. **References footer** — numbered list at bottom of every lens, with source titles and UOR hashes
7. **Never overwhelming** — the provenance layer is opt-in depth. The default reading experience is clean. Citations are 0.7em superscript, provenance banner is one line.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/uor-knowledge/index.ts` | Add citations to all lenses; emit title + model metadata in SSE |
| `src/modules/oracle/components/ProvenanceBanner.tsx` | **New** — provenance transparency banner |
| `src/modules/oracle/components/InlineCitation.tsx` | Richer popover with title, type badge, open button, touch support |
| `src/modules/oracle/lib/citation-parser.ts` | Add `title` to SourceMeta |
| `src/modules/oracle/lib/stream-knowledge.ts` | Accept richer source objects |
| `src/modules/oracle/components/lenses/MagazineLensRenderer.tsx` | Add SourcesPills, CitedMarkdown, references footer |
| `src/modules/oracle/components/lenses/StoryLensRenderer.tsx` | Add SourcesPills, CitedMarkdown, references footer |
| `src/modules/oracle/components/lenses/SimpleLensRenderer.tsx` | Add SourcesPills, CitedMarkdown, references footer |
| `src/modules/oracle/components/WikiArticleView.tsx` | Add ProvenanceBanner |
| `src/modules/oracle/components/lenses/DeepDiveLensRenderer.tsx` | Add ProvenanceBanner |

