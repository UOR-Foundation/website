

## Plan: Hardened Data Ingestion — Anima-Grade Pipeline into UOR Knowledge Graph

### Audit Summary

After thoroughly comparing our implementation against Anima's ADEE (Adaptive Data Engineering Engine), the KG infrastructure is **structurally sound** but has six concrete gaps that prevent it from being truly robust for arbitrary data of any size or type. The architecture (IndexedDB triple store, ingest bridge, graph compute, sync bridge, React hook) is complete and elegant. What follows are targeted hardening changes — no architectural rewrites.

### What's Already Strong

- **IndexedDB local-store.ts**: Full triple store with BFS traversal, pattern queries, JSON-LD import/export — solid
- **Ingest bridge**: Entity extraction (URLs, emails, proper nouns), column sub-nodes for tabular data, dedup via UOR address — correct
- **Graph compute**: Canonicalization compression, D/I/A reasoning, similarity search, coherence verification — all functional
- **Sync bridge**: Device-namespaced cloud sync, conflict resolution via CID comparison — working
- **Pipeline (ingest-pipeline.ts)**: CSV/JSON structured extraction, quality scoring, UOR content-addressing — good foundation

### Gaps Found (Compared to Anima's ADEE)

```text
Anima's ADEE Pipeline:
  Raw bytes → RawStore (immutable audit) → ADEE Engine → Knowledge Graph
                                             ↓
                              AutoProfiler (learns structure)
                              ProcessingProfile (adaptive cleaning)
                              QualityScore (0.0-1.0)
                              LazyDataFrameRegistry (LRU, Parquet)
                              ProcessedDataPacket (lineage chain)

Our pipeline:
  File → extractText → ingest (UOR CID) → structured-extractor → guest-context → KG
                                                                        ↑
                                                              Only CSV & JSON parsed
                                                              No Markdown/YAML/XML
                                                              5MB truncation
                                                              Entity nodes use FNV hash (not UOR)
```

### Changes

**1. Expand format support in structured-extractor.ts**
File: `src/modules/sovereign-vault/lib/structured-extractor.ts`
- Add `parseMarkdownTable()`: Extract tables from Markdown (`| col | col |` syntax) into `StructuredData`
- Add `parseYAML()`: Parse YAML key-value and list structures into structured data (using simple regex-based parser — no dependency)
- Add `parseXML()`: Use browser-native `DOMParser` to extract XML into tabular form (tag → column mapping)
- Add `parseTSV()`: Explicit TSV support (currently only handled via delimiter detection — make it first-class)
- Update `toSearchableText()` to include data type summaries for richer KG entity extraction

**2. Fix entity/column addresses to use UOR content-addressing**
File: `src/modules/knowledge-graph/ingest-bridge.ts`
- Replace `entityAddress()` FNV-1a hash with proper SHA-256 via `crypto.subtle.digest` → `urn:uor:entity:{hex}`
- Replace `columnAddress()` similarly — ensures entity nodes are truly content-addressed and deduplicate correctly across sessions and devices
- Both functions become async (minor signature change)

**3. Add immutable raw-bytes audit store**
File: `src/modules/knowledge-graph/raw-store.ts` (new)
- IndexedDB object store `raw-bytes` keyed by UOR address
- Stores: `{ uorAddress, rawHash (SHA-256 of original bytes), size, mimeType, createdAt }`
- Text content stored only for files <1MB; for larger files, stores only the hash + metadata
- Purpose: every ingested item has an immutable audit record before any processing happens — mirrors Anima's RawStore
- `putRaw()`, `getRaw()`, `hasRaw()` API

**4. Streaming chunked ingestion for large files**
File: `src/modules/sovereign-vault/lib/ingest-pipeline.ts`
- Remove the 5MB truncation for UOR identity — instead, compute SHA-256 using streaming `crypto.subtle.digest` on the full `ArrayBuffer` (works natively in browsers for any file size)
- For text extraction of very large text files (>10MB), process in 1MB chunks for search indexing but still hash the full content
- Add `ingestBinary()` for binary files that can't be text-extracted — they still get UOR identity + KG node (metadata-only node)

**5. Richer entity extraction in ingest-bridge**
File: `src/modules/knowledge-graph/ingest-bridge.ts`
- Add date extraction: `YYYY-MM-DD` and common date formats → `schema:Date` entity nodes
- Add number/currency extraction: `$1,234.56`, `€500` → `schema:MonetaryAmount` entity nodes (useful for financial data cross-referencing)
- Increase proper noun scan window from 2000 to 5000 chars
- For structured data: create edges between column nodes that share the same data type (`schema:sameDataType`)
- Add `schema:derivedFrom` edge when a paste/URL produces structured data that overlaps with existing file columns

**6. Processing lineage as KG derivations**
File: `src/modules/knowledge-graph/ingest-bridge.ts`
- When ingesting an item with `lineage` entries, create a `KGDerivation` for each stage
- This connects the pipeline audit trail to the graph's derivation store, making the processing history queryable via the KG
- Each derivation gets an epistemic grade based on the pipeline stage (e.g., "extract" = "A", "fallback" = "C")

**7. Wire raw-store into the pipeline**
File: `src/modules/sovereign-vault/lib/ingest-pipeline.ts`
- After UOR identity computation but before structured extraction, write to `raw-store`
- This ensures the immutable audit record exists even if downstream processing fails

**8. Update local-store DB version for raw-bytes store**
File: `src/modules/knowledge-graph/local-store.ts`
- Bump `DB_VERSION` to 2
- Add `raw-bytes` object store in `onupgradeneeded`
- Add migration logic (version 1 → 2 is additive only, no data loss)

### Files Summary

| File | Action |
|------|--------|
| `src/modules/sovereign-vault/lib/structured-extractor.ts` | Add Markdown table, YAML, XML parsers |
| `src/modules/knowledge-graph/ingest-bridge.ts` | UOR content-addressed entities, richer extraction, lineage→derivations |
| `src/modules/knowledge-graph/raw-store.ts` | New — Immutable raw-bytes audit store |
| `src/modules/sovereign-vault/lib/ingest-pipeline.ts` | Streaming hash for large files, wire raw-store |
| `src/modules/knowledge-graph/local-store.ts` | DB v2 with raw-bytes store |
| `src/modules/knowledge-graph/index.ts` | Export raw-store |

### What This Achieves

After this pass, any file — a 500MB CSV, a 2KB YAML config, a pasted JSON array, a scraped web page, a PDF document, an image — follows the same deterministic path:

1. Raw bytes recorded immutably (audit trail)
2. Full-content SHA-256 computed regardless of size (no truncation)
3. Format-aware structured extraction (CSV, JSON, YAML, XML, Markdown tables, or plain text)
4. Content-addressed entity nodes (URLs, emails, dates, currencies, proper nouns)
5. Typed edges linking documents to shared entities and columns
6. Processing lineage stored as queryable graph derivations
7. All operations work offline in IndexedDB, sync to cloud when available

Same content, same address, everywhere. Every piece of data, one unified knowledge graph.

