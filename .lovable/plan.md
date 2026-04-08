

## Semantic Web Bridge — Encode Any URL into UOR Space

### What This Does

When a user pastes a URL (e.g. `https://example.com`) into the search bar and hits Enter, the system will:
1. Detect it's a URL (not a triword or address)
2. Scrape the page via Firecrawl (markdown + rawHtml + links + metadata)
3. Extract any existing structured data (JSON-LD, Open Graph, RDFa) from the rawHtml
4. Wrap everything into a canonical `uor:WebPage` JSON-LD document
5. Content-address it via `singleProofHash` → `encode()` → full UOR identity
6. Display the result in the existing profile layout with Human/Machine toggle

The experience is seamless: paste a URL, press Enter, watch the internet fold into UOR space.

### Technical Changes

#### 1. New utility: `src/modules/oracle/lib/semantic-extract.ts`
Pure function that parses rawHtml to extract existing semantic data from any web page:
- `<script type="application/ld+json">` blocks → parsed JSON-LD
- `<meta property="og:*">` tags → Open Graph metadata
- `<meta name="description">` → fallback description
- Returns a structured `ExistingSemantics` object

This is the key refinement: UOR **absorbs** existing Semantic Web data rather than just overlaying it.

#### 2. Modify `src/modules/oracle/pages/ResolvePage.tsx`

**In `handleSearch` (~line 419)**: Add URL detection before the existing triword lookup:
```
if input starts with http:// or https:// or contains a dot with no spaces:
  → call new handleWebEncode(url) instead of triword lookup
```

**New `handleWebEncode` function**: 
- Show loading state with "Reading page…" toast
- Call `firecrawlApi.scrape(url, { formats: ['markdown', 'rawHtml', 'links'] })`
- Extract existing semantics from rawHtml via `semantic-extract.ts`
- Build canonical `uor:WebPage` JSON-LD object:
  ```json
  {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@type": "uor:WebPage",
    "uor:sourceUrl": "https://example.com",
    "uor:title": "...",
    "uor:description": "...",
    "uor:language": "en",
    "uor:content": "<markdown content>",
    "uor:linkedResources": ["..."],
    "uor:scrapedAt": "2026-04-08T...",
    "uor:existingSemantics": { ... extracted JSON-LD/OG data ... },
    "uor:semanticWebLayers": { "L0": "content-addressed", "L1": "json-ld", "L2": "urdna2015" }
  }
  ```
- Pass to `encode(sourceObj)` → get full UOR identity
- Set result and display profile (existing UI handles everything)

**Update `submit` function**: Route to `handleWebEncode` when URL detected.

**Update placeholder**: Change search placeholder to "Search an address or paste a URL…"

#### 3. Modify `src/modules/oracle/components/HumanContentView.tsx`

Add `WebPage` type support:
- Add to `TYPE_STYLES`: `WebPage: { color: "hsl(200 70% 55%)", bg: "hsl(200 70% 55% / 0.08)" }`
- Add label mappings for `uor:sourceUrl`, `uor:content`, `uor:existingSemantics`, `uor:linkedResources`, `uor:scrapedAt`
- Add `uor:content` to `LONG_TEXT_KEYS` (already there)
- Add `uor:sourceUrl` to `TITLE_KEYS` as fallback
- Special rendering for WebPage: show source URL as a clickable link, render markdown content with `ReactMarkdown`, show existing semantics in a collapsible section

#### 4. Update `src/lib/api/firecrawl.ts`

Update the `ScrapeOptions` type to include `rawHtml` in formats (already supported by the edge function, just needs the client to request it).

### No backend/database changes needed
- Firecrawl connector already configured with API key
- Edge function already supports `rawHtml` format
- `encode()` pipeline handles everything client-side

### Layer Mapping (Semantic Web Tower)

| Layer | Implementation |
|-------|---------------|
| L0 (URI) | Content-derived address replaces location URI |
| L1 (Schema) | JSON-LD `@context` makes document self-describing |
| L2 (RDF) | URDNA2015 produces N-Quads automatically |
| L3 (Ontology) | `uor:existingSemantics` preserves original ontology |
| L5 (Proof) | `singleProofHash` → structural cryptographic proof |
| L6 (Trust) | Same content → same address → verifiable deduplication |
| P-axis | Human/Machine toggle = the missing People axis |

