

## Contextual Knowledge Renderer — Personalized AI-Rendered Web Experience

### Vision

Transform the current "search → static article" flow into a **live, context-aware knowledge renderer** where the article content, layout, and emphasis adapt to **who the user is** and **what they've been exploring**. The three pillars:

1. **User context** — browsing history, past searches, sovereign identity preferences
2. **Open web knowledge** — Wikipedia, Wikidata, existing semantic web APIs
3. **LLM synthesis** — personalized article generation that prioritizes sections relevant to the user's context

All anchored in UOR's content-addressing: every rendered view produces a canonical receipt, so the "personalized web page" is itself a verifiable, addressable object.

### Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                        User Context Layer                        │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ Search       │  │ Sovereign Data  │  │ Session Context     │  │
│  │ History      │  │ (Pod/Profiles)  │  │ (Current Session)   │  │
│  └──────┬──────┘  └───────┬─────────┘  └──────────┬──────────┘  │
│         └─────────────────┼──────────────────────┬┘              │
│                           ▼                      │               │
│               ┌──────────────────────┐           │               │
│               │  Context Compiler    │◄──────────┘               │
│               │  (Edge Function)     │                           │
│               └──────────┬───────────┘                           │
└──────────────────────────┼───────────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Knowledge Fusion Layer                        │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────┐             │
│  │ Wikipedia │  │ Wikidata   │  │ LLM (Gemini)     │             │
│  │ REST API  │  │ SPARQL/API │  │ Context-Aware    │             │
│  └────┬─────┘  └─────┬──────┘  │ Prompt           │             │
│       └──────────────┬┘        └────────┬─────────┘             │
│                      ▼                  ▼                        │
│               ┌──────────────────────────────┐                  │
│               │  Streaming SSE Response       │                  │
│               │  wiki → context-cards → body  │                  │
│               └──────────────┬───────────────┘                  │
└──────────────────────────────┼───────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Rendering Layer (Browser)                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  ContextualArticleView                                     │ │
│  │  ├─ Context Banner ("You explored X, Y — here's how...")   │ │
│  │  ├─ WikiArticleView (existing, enhanced)                   │ │
│  │  ├─ Related Nodes sidebar (graph of past searches)         │ │
│  │  └─ UOR Receipt (canonical proof of this rendered view)    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Implementation Plan

#### Step 1: User Context Store (database + client)

Create a `search_history` table to persist what the user has explored. This forms the "context" that personalizes future searches.

```sql
CREATE TABLE public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  keyword TEXT NOT NULL,
  cid TEXT,
  searched_at TIMESTAMPTZ DEFAULT now(),
  wiki_qid TEXT
);
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own history" ON public.search_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own history" ON public.search_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_search_history_user ON public.search_history(user_id, searched_at DESC);
```

Record every keyword search in `ResolvePage.tsx` after resolution completes.

#### Step 2: Context-Aware Edge Function

Update `uor-knowledge/index.ts` to accept an optional `context` parameter — the user's recent search history (last 10-20 terms). The LLM system prompt becomes context-aware:

- "The user has recently explored: [quantum physics, Feynman, electron]. Write about 'photon' with emphasis on connections to those topics."
- This produces articles that feel **personally relevant** — emphasizing the connections between what you just explored and what you're looking at now.

The prompt remains encyclopedic but gains a "Connections" section and prioritizes sections that relate to the user's recent exploration path.

#### Step 3: Wikidata Enrichment (structured data from the open web)

Add a Wikidata SPARQL query to the edge function to fetch structured properties (population, coordinates, chemical formula, date of birth — whatever is available). This data flows into the infobox, replacing the current thumbnail-only approach with rich, typed facts pulled from the world's largest open knowledge graph.

The fetch is a simple REST call to `https://www.wikidata.org/w/api.php?action=wbgetentity&ids=Q144&props=claims&format=json` using the QID already obtained from Wikipedia.

#### Step 4: Contextual Article View Component

Create `ContextualArticleView.tsx` wrapping the existing `WikiArticleView`:

- **Context Banner**: A subtle bar at the top showing "Based on your exploration of X, Y, Z" with clickable links back to those searches
- **Related Nodes**: A small sidebar section showing a graph of related searches the user has made, connecting the current topic to their personal knowledge graph
- **Connection Highlights**: When the AI mentions a topic the user previously searched, it's rendered as a clickable link that navigates to that search — creating a **hyperlinked personal knowledge web**

#### Step 5: Record and Certify the Rendered View

Every personalized render produces a UOR receipt — the combination of `{user_context_cid, topic_cid, synthesis_cid}` is itself content-addressed. This means:
- The exact view the user saw is verifiable
- The same user with the same context searching the same term will produce the same canonical address
- Different users get different addresses (different contexts = different content = different identity)

### Technology Decisions

**TypeScript, not Rust/WASM for this feature.** Here's why:

- The personalization logic is I/O-bound (API calls, LLM streaming), not compute-bound — WASM provides no benefit here
- The existing UOR canonical pipeline (URDNA2015 + SHA-256) already has a Rust WASM encoder with TypeScript fallback — content-addressing is already fast
- The rendering layer is React — it must stay in TypeScript
- WebGPU compute (already implemented) handles the heavy math when needed
- **Rust WASM is already doing the right job**: canonical hashing. Adding Rust for I/O orchestration would add complexity without performance gain

The architecture is: **TypeScript for orchestration and rendering, Rust WASM for canonical computation, LLM for synthesis, open web APIs for facts**.

### Files Changed

| File | Change |
|------|--------|
| Database migration | New `search_history` table with RLS |
| `supabase/functions/uor-knowledge/index.ts` | Accept context param, enrich prompt, add Wikidata structured data |
| `src/modules/oracle/lib/search-history.ts` | **New** — read/write search history via database client |
| `src/modules/oracle/components/ContextualArticleView.tsx` | **New** — wraps WikiArticleView with context banner + related nodes |
| `src/modules/oracle/components/WikiArticleView.tsx` | Accept enriched Wikidata props, render structured infobox fields |
| `src/modules/oracle/pages/ResolvePage.tsx` | Record searches, pass context to streaming client, use ContextualArticleView |
| `src/modules/oracle/lib/stream-knowledge.ts` | Pass context array to edge function |

### What the User Experiences

1. Search "dog" — get a rich Wikipedia-style article (as today, but with richer infobox from Wikidata)
2. Search "wolf" — article now includes a "Connections" section noting "Unlike the domestic dog you explored earlier, wolves..."
3. Search "evolution" — the AI emphasizes canid evolution because your context includes dog and wolf
4. A subtle banner says "Based on your exploration of dog, wolf" with links
5. Each rendered view has its own UOR address — your personal knowledge path is itself addressable

