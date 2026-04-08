

## Wikipedia UOR Encoding — Enhanced Structured Knowledge Showcase

### The Opportunity

Wikipedia is the ideal showcase because it has **two data sources** we can combine:
1. **Firecrawl scrape** — markdown content, rawHtml (with existing semantic data)
2. **Wikipedia REST API** (`/api/rest_v1/page/summary/{title}`) — returns structured JSON with Wikidata ID, thumbnail, description, taxonomy, revision info

By combining both, we produce a richer `uor:WebPage` document than any generic website — and the UI can render Wikipedia articles in a **familiar, Wikipedia-like format** that humans instantly recognize, while the underlying JSON-LD is fully machine-readable.

### What Changes

#### 1. Detect Wikipedia URLs and enrich via REST API (`ResolvePage.tsx`)

In `handleWebEncode`, after scraping via Firecrawl, detect if the URL is a Wikipedia article (`en.wikipedia.org/wiki/`). If so, also call the Wikipedia REST API to get:
- `wikibase_item` (Wikidata Q-ID, e.g. `Q146`)
- `thumbnail.source` (image URL)
- `description` ("Small domesticated carnivorous mammal")
- `extract` (clean plaintext summary)
- `revision` + `timestamp` (version provenance)

Merge this into the canonical object as `uor:wikidata` (a structured sub-object containing the Wikidata ID, thumbnail, and classification). The Wikidata Q-ID is particularly powerful — it's already the global identifier used by knowledge graphs, and now it gets folded into the UOR address.

The canonical object becomes:
```json
{
  "@type": "uor:WebPage",
  "uor:sourceUrl": "https://en.wikipedia.org/wiki/Cat",
  "uor:title": "Cat",
  "uor:description": "Small domesticated carnivorous mammal",
  "uor:content": "<full markdown>",
  "uor:existingSemantics": { ... },
  "uor:wikidata": {
    "qid": "Q146",
    "thumbnail": "https://upload.wikimedia.org/...",
    "extract": "The cat, also called domestic cat..."
  },
  "uor:semanticWebLayers": { ... }
}
```

This is a **pure client-side fetch** to the Wikipedia API — no new edge function needed.

#### 2. Wikipedia-aware rendering in `HumanContentView.tsx`

When the source has `uor:wikidata`, render a Wikipedia-style card at the top of the content:
- **Thumbnail image** (from Wikipedia API) displayed as a float-right or top banner
- **Wikidata QID badge** (e.g. "Q146") as a clickable link to `wikidata.org/wiki/Q146`
- **Description** displayed as a subtitle under the title
- The markdown content renders below with the existing `ReactMarkdown` renderer

This makes the encoded page **look and feel like Wikipedia** — immediately familiar to humans — while being fully semantic underneath.

#### 3. Extract Wikipedia infobox/taxonomy from markdown (`semantic-extract.ts`)

Add a `extractWikiInfobox(markdown)` function that parses the taxonomy table at the top of Wikipedia articles (Kingdom, Phylum, Class, Order, etc.) from the markdown. This structured data goes into `uor:wikidata.taxonomy` — making biological classification computationally accessible.

This is extracted from the already-scraped markdown using simple regex parsing of the table structure that Firecrawl returns.

### Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/pages/ResolvePage.tsx` | Detect Wikipedia URLs, fetch REST API summary, merge into canonical object |
| `src/modules/oracle/components/HumanContentView.tsx` | Render Wikipedia thumbnail, QID badge, description subtitle, taxonomy card |
| `src/modules/oracle/lib/semantic-extract.ts` | Add `extractWikiInfobox()` for taxonomy table parsing |

### No backend changes needed
- Wikipedia REST API is public (no auth required), fetched client-side
- Firecrawl scrape already works
- WASM encoding pipeline unchanged — same `encode()` → `singleProofHash()` → ring engine

### Why This Is Powerful

The user pastes `en.wikipedia.org/wiki/Cat` and sees:
1. A thumbnail of a cat, "Cat" title, "Small domesticated carnivorous mammal" subtitle
2. Wikidata QID `Q146` badge — linking to the global knowledge graph
3. Full article content rendered in familiar Wikipedia style
4. Semantic Web Tower showing all 8 layers active
5. A single canonical UOR address (CID, IPv6, triword, glyph) for the entire article
6. The Human/Machine toggle reveals the full JSON-LD with extracted taxonomy, existing semantics, and Wikidata metadata

Same page. Two views. Humans see Wikipedia. Machines see a computable semantic graph. Both share the same content-addressed identity.

