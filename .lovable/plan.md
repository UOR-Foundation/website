

## Plan: Universal Ingestion Pipeline — Seamless Structured + Unstructured Data

### Analysis: What ANIMA Does That We Don't

ANIMA's data engineering stack has a 4-phase pipeline that our OS currently lacks:

```text
ANIMA Pipeline:
  Raw bytes → RawStore (immutable audit) → ADEE Engine → Knowledge Graph
                                            ↓
                                   AutoProfiler (learns structure)
                                   ProcessingProfile (adaptive cleaning)
                                   QualityScore (0.0–1.0)
                                   LazyDataFrameRegistry (LRU, Parquet)
                                   ProcessedDataPacket (lineage chain)
```

```text
Our Current Pipeline:
  File → extractText() → plain text string → chunkText() → vault store
                ↓
         Everything becomes flat text.
         CSV loses columns. Excel is unsupported.
         No quality scoring. No schema inference.
         No connection to universal-ingest.ts.
```

**Critical gap**: We already have `universal-ingest.ts` — a beautifully designed format-detecting, content-addressing ingest function. But it's completely disconnected from the File Explorer and Sovereign Vault. Files dropped into the explorer go through `extractText()` which flattens everything to a text string, bypassing UOR entirely.

### The Fix: Connect Universal Ingest to the Vault Pipeline

One new module (`ingest-pipeline`) that acts as the ADEE equivalent, sitting between file input and storage. It routes every file through `universal-ingest` for content-addressing, then applies format-specific processing before storage.

```text
New Pipeline:
  File/URL/Paste
       ↓
  IngestPipeline.ingest(file)
       ↓
  ┌─────────────────────────────────┐
  │ 1. Format Detection (magic bytes)│
  │ 2. universal-ingest → UOR CID   │
  │ 3. Format-specific extraction:   │
  │    • CSV/TSV → parsed columns    │
  │    • XLSX    → parsed sheets     │
  │    • JSON    → structured object │
  │    • PDF/DOCX → edge function    │
  │    • Image   → metadata + OCR    │
  │    • Text/MD → raw text          │
  │ 4. Quality score (completeness)  │
  │ 5. Chunk + store (vault or guest)│
  └─────────────────────────────────┘
       ↓
  GuestContextItem now has:
    - uorAddress (CID from universal-ingest)
    - structuredData? (parsed columns/rows for tabular)
    - qualityScore (0.0–1.0)
    - format (detected ArtifactFormat)
    - lineage[] (processing stages)
```

### Changes

**1. New: `src/modules/sovereign-vault/lib/ingest-pipeline.ts`**
The central orchestrator. One function: `ingestFile(file: File)` that:
- Reads the file as ArrayBuffer
- Calls `universal-ingest`'s `ingest()` to get the UOR CID and envelope
- Routes to format-specific extractors based on detected format
- For CSV/TSV: parses with a lightweight CSV parser (Papa Parse is already common, but we can use a simple split-based parser to avoid deps) — extracts column names, row count, data types, and a text representation
- For XLSX: delegates to `parse-document` edge function, receives structured sheet data
- For JSON: preserves structure, extracts keys as "columns"
- Computes a quality score (% non-null cells for tabular, % non-empty chunks for text)
- Returns an `IngestResult` with both the UOR identity and the extracted content

**2. New: `src/modules/sovereign-vault/lib/structured-extractor.ts`**
Handles structured data formats specifically:
- `parseCSV(text: string)` → `{ columns: string[], rows: string[][], rowCount: number, dtypes: Record<string, string> }`
- `parseJSON(text: string)` → flattened key paths for searchability
- `computeQuality(data)` → completeness score
- `toSearchableText(structured)` → generates a text representation that preserves column names and sample values for full-text search

**3. Update: `src/modules/sovereign-vault/lib/guest-context.ts`**
Extend `GuestContextItem` with:
- `uorAddress?: string` — the CID from universal-ingest
- `format?: ArtifactFormat` — detected format
- `qualityScore?: number` — 0.0–1.0
- `columns?: string[]` — for tabular data
- `rowCount?: number` — for tabular data
- `lineage?: { stage: string; timestamp: string }[]` — processing chain

Update `addFile()` to route through `ingestFile()` instead of raw `extractText()`.

**4. Update: `src/modules/sovereign-vault/lib/extract.ts`**
- Add CSV/TSV structured parsing (currently reads as raw text — loses all column info)
- Add XLSX support via `parse-document` edge function (currently unsupported)
- Add Excel MIME type detection

**5. Update: `src/modules/explorer/components/QuickLookModal.tsx`**
- For tabular files (CSV, XLSX): render a table preview showing columns + first N rows instead of raw text
- Show quality score badge
- Show row/column count in metadata

**6. Update: `src/modules/explorer/components/FileCard.tsx`**
- Show format-specific icons (table icon for CSV/XLSX, code icon for JSON)
- Display row count for tabular files ("1,247 rows · 12 columns")
- Quality score as a subtle colored dot (green >0.8, yellow >0.5, red <0.5)

**7. Large file handling**
- For files >5MB: stream through the edge function instead of base64-encoding in browser memory
- Add a progress callback to `ingestFile()` so the UI can show ingestion progress
- Chunk large CSVs during parsing (process first 10K rows for preview, full file for storage)

### Files Summary

| File | Action |
|------|--------|
| `src/modules/sovereign-vault/lib/ingest-pipeline.ts` | New — central orchestrator connecting universal-ingest to vault |
| `src/modules/sovereign-vault/lib/structured-extractor.ts` | New — CSV/JSON parsing + quality scoring |
| `src/modules/sovereign-vault/lib/guest-context.ts` | Extended GuestContextItem + route through pipeline |
| `src/modules/sovereign-vault/lib/extract.ts` | Add CSV structure + XLSX support |
| `src/modules/explorer/components/QuickLookModal.tsx` | Table preview for tabular data |
| `src/modules/explorer/components/FileCard.tsx` | Format-aware display + quality indicator |

### What This Enables

Once every file flows through universal-ingest:
- **Duplicate detection works across formats**: Same CSV uploaded twice → same CID → detected
- **Structured data is queryable**: Oracle can reason over column names and data types
- **Quality is visible**: Users see data completeness at a glance
- **The knowledge graph grows**: Every ingested file becomes a node with typed relationships
- **LLM context is richer**: Instead of feeding flat text, we can feed column schemas and sample rows

### ANIMA Patterns Adopted vs. Deferred

| ANIMA Pattern | Status | Rationale |
|---|---|---|
| RawStore (immutable audit trail) | **Adopted** — universal-ingest's envelope IS the immutable record |
| Format detection + adaptive parsing | **Adopted** — via detectFormat + structured-extractor |
| Quality scoring | **Adopted** — completeness metric |
| Processing lineage | **Adopted** — lightweight stage array |
| AutoProfiler (learning profiles) | Deferred — requires multiple ingestions of same source to learn |
| LazyDataFrameRegistry (LRU + Parquet) | Deferred — browser environment, no Parquet runtime |
| EngineeringTuner (cognitive feedback loop) | Deferred — requires reasoning engine integration |

