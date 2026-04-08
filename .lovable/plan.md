

## Enriching Images with Multi-Source Open Access Media

### Current State

Images come exclusively from **Wikimedia Commons** via Wikipedia's API. This works well for encyclopedic topics but produces sparse or low-quality results for many searches (abstract concepts, modern topics, niche domains). The current `fetchCommonsMedia` function already has good relevance scoring and UOR hashing.

### New Sources (all free, no API keys required)

| Source | Strength | API |
|---|---|---|
| **Wikimedia Commons** | Encyclopedic, diagrams, historical | Already implemented |
| **Metropolitan Museum of Art** | Fine art, historical artifacts, paintings | `collectionapi.metmuseum.org` — no key |
| **NASA Images** | Space, science, Earth, astronomy | `images-api.nasa.gov` — no key |
| **Library of Congress** | Historical photos, maps, Americana | `loc.gov/search` — no key |
| **Europeana** | European cultural heritage, art, archives | `api.europeana.eu` — free key (wskey=apidemo for dev) |

These are all institutional, curated, high-resolution, and properly licensed (public domain or CC). They complement Wikimedia by covering art, space, history, and culture where Wikipedia images are weak.

### Architecture

Rename and expand `fetchCommonsMedia` into `fetchMultiSourceMedia`. It runs all sources **in parallel** (Promise.allSettled), merges results, then applies a unified relevance + diversity sort before emitting the SSE `media` event.

```text
fetchMultiSourceMedia(term, qid)
  ├── fetchWikimediaImages(term)         (existing logic, extracted)
  ├── fetchMetMuseumImages(term)         (new)
  ├── fetchNASAImages(term)              (new)
  ├── fetchLibraryOfCongressImages(term) (new)
  └── merge + relevance sort + deduplicate + UOR hash
      → top 8 images with source attribution
```

Each sub-fetcher returns `MediaImage[]` with `source` set to its origin (e.g. `"met-museum"`, `"nasa"`, `"loc"`). The existing `uorHash` and `relevance` scoring pattern is reused.

### Source Selection Logic

Not every source is relevant for every query. A lightweight keyword classifier picks which sources to query:

- **Met Museum**: art, painting, sculpture, ancient, historical figures, culture
- **NASA**: space, planet, star, galaxy, nebula, earth, satellite, physics
- **Library of Congress**: American history, presidents, civil war, jazz, photography
- **Wikimedia**: always queried (broadest coverage)

If the term doesn't match any specialty source, only Wikimedia + one general fallback runs, keeping latency tight.

### Relevance + Diversity Merge

After all sources return, images are merged into a single pool:
1. Score each image against the search term (existing `relevance` logic)
2. Apply a **source diversity bonus**: if the top 4 are all from Wikimedia, boost the highest-scoring image from other sources
3. Sort by final score, take top 8
4. Each image retains its `source` field for provenance display in the UI

### UOR Integration

Each image already gets a `uorHash` (FNV-1a of its URL). The `source` field maps to a UOR provenance category:
- `wikimedia-commons` → `uor:media/commons`
- `met-museum` → `uor:media/art`
- `nasa` → `uor:media/science`
- `loc` → `uor:media/archive`

This ensures images are semantically tagged within the UOR framework and can be coherently placed by the existing `distributeMediaAcrossSections` algorithm in `InlineMedia.tsx`.

### Client-Side Enhancement

Add a small source badge to `InlineFigure` — a subtle icon or text showing the image origin (e.g. a small "Met Museum" or "NASA" label in the figcaption). This builds trust and delight by showing users where the image comes from.

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/uor-knowledge/index.ts` | Expand `fetchCommonsMedia` into `fetchMultiSourceMedia` with parallel sub-fetchers for Met Museum, NASA, and Library of Congress. Add keyword classifier for source selection. Unified relevance merge. |
| `src/modules/oracle/components/InlineMedia.tsx` | Add subtle source attribution badge to `InlineFigure` figcaption (e.g. "via NASA" or "Met Museum"). |
| `src/modules/oracle/lib/stream-knowledge.ts` | Update `MediaImage` type to include optional `source` display name (already has `source` field, just ensure it flows through). |

### Latency Considerations

- All image fetches run in parallel with `Promise.allSettled` + 4s timeout each
- Source selection means we only query 2-3 APIs per request, not all 4
- Image fetch is already non-blocking (runs parallel to AI streaming)
- No impact on TTFT — images arrive independently via SSE `media` event

