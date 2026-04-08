

## Automatic Source Optimization — Dynamic Signal-to-Noise Source Selection

### Current State

The `uor-knowledge` edge function hardcodes exactly two sources: Wikipedia and Wikidata. These are excellent high-signal sources, but the system has no ability to dynamically discover, evaluate, or include additional authoritative sources based on the topic being explored.

### Design

Add an **automatic source discovery and ranking** stage to the edge function that runs in parallel with the existing Wikipedia fetch. The system uses Firecrawl Search (already connected) to find the best sources for each topic, then scores and filters them before feeding them to the AI synthesis prompt. The user never sees low-quality sources — the system handles it silently.

```text
User searches "CRISPR gene editing"
         │
         ├─── Wikipedia fetch (existing, fast)
         ├─── Firecrawl Search: "CRISPR gene editing" (limit 8)
         │         │
         │         ▼
         │    Source Ranker
         │    ├─ Domain reputation score (tier list)
         │    ├─ Content relevance (title/description match)
         │    ├─ Deduplication (remove wiki duplicates)
         │    └─ UOR hash for content-addressing
         │         │
         │         ▼
         │    Top 3-5 ranked sources
         │
         ▼
    AI Synthesis Prompt
    "Using these sources: [Wikipedia extract] + [top ranked sources with snippets]"
    → Richer, multi-source article with [1] [2] [3] citations
```

### Changes

#### 1. Source Ranker in Edge Function
**File: `supabase/functions/uor-knowledge/index.ts`**

Add a `rankSources()` function with a domain reputation tier system:
- **Tier 1 (score 95-100)**: wikipedia.org, nature.com, science.org, arxiv.org, pubmed.ncbi.nlm.nih.gov, plato.stanford.edu, britannica.com
- **Tier 2 (score 80-94)**: .edu domains, .gov domains, who.int, ieee.org, acm.org, springer.com, wiley.com
- **Tier 3 (score 60-79)**: well-known outlets (bbc.com, nytimes.com, reuters.com, theguardian.com)
- **Tier 4 (score 40-59)**: other known domains
- **Unranked (score 30)**: unknown domains

Score formula: `domainReputation * 0.6 + titleRelevance * 0.4`

Title relevance is computed by keyword overlap between the search term and the result title/description.

#### 2. Firecrawl Search Integration
**File: `supabase/functions/uor-knowledge/index.ts`**

Add a `fetchTopSources()` function:
- Calls Firecrawl Search API with the keyword (limit 8 results)
- Filters out Wikipedia URLs (already have that source)
- Runs results through `rankSources()`
- Returns top 3-5 sources with URL, title, description, and score
- Runs in parallel with Wikipedia fetch — no added latency

Falls back gracefully: if Firecrawl is unavailable or returns no results, the system proceeds with Wikipedia-only (current behavior). Zero degradation.

#### 3. Enriched AI Synthesis Prompt
**File: `supabase/functions/uor-knowledge/index.ts`**

Update the AI prompt to include source context:
- Append ranked source summaries to the user message: "Additional authoritative sources: [title] — [description snippet]"
- Update citation instructions: "[1] for Wikipedia, [2] for Wikidata, [3]-[N] for additional sources"
- The AI naturally weaves in multi-source information with proper citation markers

#### 4. Emit Richer Sources in SSE Stream
**File: `supabase/functions/uor-knowledge/index.ts`**

The `sources` array in the SSE `wiki` event currently contains Wikipedia + Wikidata. Extend it to include the ranked sources with metadata:
- Each source object: `{ url, title, type, score, domain }`
- `type` values: "wikipedia", "wikidata", "academic", "institutional", "news", "web"
- The client already handles rich source objects (see `normalizeSource` in citation-parser)

#### 5. Source Quality Badge on SourcesPills
**File: `src/modules/oracle/components/SourcesPills.tsx`**

Add a tiny visual quality indicator per source pill:
- Tier 1-2 sources get a small green dot or checkmark
- Tier 3 sources show normally (no indicator)
- The "Sources" label updates to show count: "5 Sources"
- Tooltip on hover shows: "High-signal source — academic/institutional" or similar

#### 6. Update Citation Parser for Rich Source Types
**File: `src/modules/oracle/lib/citation-parser.ts`**

Extend `normalizeSource` to recognize more source types beyond just "wikipedia" / "wikidata" / "web":
- "academic" for .edu, arxiv, pubmed, nature, science
- "institutional" for .gov, who.int, official organizations
- "news" for recognized news outlets
- "web" remains the fallback

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/uor-knowledge/index.ts` | Add `fetchTopSources()`, `rankSources()`, enrich AI prompt with multi-source context, emit ranked sources in SSE |
| `src/modules/oracle/components/SourcesPills.tsx` | Quality indicator dots, source count label |
| `src/modules/oracle/lib/citation-parser.ts` | Extended source type classification |

### What the User Experiences

1. **Search "CRISPR"** — Sources strip shows: `wikipedia.org` `nature.com` `nih.gov` `wikidata.org` — all auto-selected, highest signal sources for biology
2. **Search "machine learning"** — Sources: `wikipedia.org` `arxiv.org` `stanford.edu` `wikidata.org` — academic sources prioritized automatically
3. **Search "climate change"** — Sources: `wikipedia.org` `nasa.gov` `ipcc.ch` `nature.com` `wikidata.org` — institutional + scientific
4. **The article itself** cites `[1]` `[2]` `[3]` `[4]` drawing from multiple high-quality sources, richer than Wikipedia alone
5. **If Firecrawl is down** — seamlessly falls back to Wikipedia-only, zero user-visible degradation

