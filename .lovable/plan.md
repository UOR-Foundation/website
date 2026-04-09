

# Encyclopedia: High-Value Sources and Dynamic Rebalancing

## Current State

The `uor-knowledge` edge function already has:
- **Tier 1-3 domain reputation scoring** (lines 74-131)
- **5 auxiliary source fetchers**: DuckDuckGo Instant, Britannica, Stanford Encyclopedia of Philosophy, Library of Congress, PubMed (lines 311-457)
- **Firecrawl web search** for additional sources (lines 233-285)
- A flat scoring formula: `domainRep * 0.6 + titleRel * 0.4` (line 216)

## Part 1: New High-Value Source Fetchers

Add these definitive, no-API-key-required sources to `fetchAuxiliarySources()`:

| Source | Domain | Why Definitive | Query Method |
|--------|--------|----------------|--------------|
| **OpenAlex** | openalex.org | 250M+ scholarly works, open metadata | `api.openalex.org/works?search=...` |
| **Internet Archive** | archive.org | Historical verification, primary documents | `archive.org/advancedsearch.php?q=...&output=json` |
| **arXiv** | arxiv.org | Preprint canon for physics/math/CS | `export.arxiv.org/api/query?search_query=...` |
| **Wolfram MathWorld** | mathworld.wolfram.com | Definitive math reference | HEAD check on `/topic/` slug |
| **WHO** | who.int | Global health authority | `search.who.int` with JSON output |

Each fetcher follows the existing pattern: individual 2s timeout via `AbortSignal.timeout()`, graceful `null` return on failure, returns a `RankedSource` object.

## Part 2: Dynamic Rebalancing Module

### 2a. Query Domain Classifier

Add a `classifyQueryDomain()` function that uses keyword pattern matching (no LLM call needed) to return a domain category:

```text
biomedical  -> "cancer", "gene", "protein", "clinical", "disease", "pathogen"...
physics     -> "quantum", "relativity", "particle", "photon", "thermodynamics"...
mathematics -> "theorem", "algebra", "topology", "calculus", "conjecture"...
philosophy  -> "ethics", "epistemology", "ontology", "metaphysics", "Kant"...
history     -> "war", "empire", "dynasty", "revolution", "colonial"...
law         -> "statute", "constitutional", "tort", "jurisdiction"...
technology  -> "software", "algorithm", "machine learning", "neural network"...
environment -> "climate", "ecosystem", "biodiversity", "carbon"...
economics   -> "GDP", "inflation", "monetary", "fiscal", "trade"...
general     -> (fallback)
```

### 2b. Domain-Specific Source Boost Map

A `DOMAIN_SOURCE_BOOSTS` map that adds priority points to domain-specific authoritative sources when a matching query domain is detected:

```text
biomedical:  pubmed +15, nih.gov +12, who.int +10, mayoclinic.org +8
physics:     arxiv.org +15, nature.com +10, nasa.gov +8
mathematics: mathworld.wolfram.com +15, arxiv.org +10
philosophy:  plato.stanford.edu +15, britannica.com +8
history:     loc.gov +15, archive.org +12, britannica.com +8
law:         .gov domains +12, britannica.com +6
technology:  arxiv.org +10, ieee.org +10, acm.org +10
environment: ipcc.ch +15, epa.gov +12, who.int +8, nature.com +8
economics:   worldbank.org +12, oecd.org +12, imf.org +10
```

### 2c. Modified `rankSources()` 

The existing flat formula (`domainRep * 0.6 + titleRel * 0.4`) gets an additional term:

```
score = round(domainRep * 0.55 + titleRel * 0.35 + domainBoost * 0.10)
```

Where `domainBoost` is 0 for unmatched domains and the boost value (scaled to 0-100) for matched ones. This slightly reduces the weight of generic reputation in favor of domain-specific authority.

### 2d. Emit Domain Classification in SSE

The `wiki` SSE event will include `queryDomain` so the frontend can optionally display "Research domain: Biomedical" or similar in the ProvenanceBanner.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/uor-knowledge/index.ts` | Add 5 new fetchers, `classifyQueryDomain()`, `DOMAIN_SOURCE_BOOSTS`, modify `rankSources()` signature, emit `queryDomain` in SSE |
| `src/modules/oracle/lib/stream-knowledge.ts` | Extend `ProvenanceMeta` with optional `queryDomain` field |
| `src/modules/oracle/components/ProvenanceBanner.tsx` | Display detected research domain when present |

No new dependencies or secrets required. All new source APIs are free and keyless.

