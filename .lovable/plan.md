

# Tailslayer Analysis & Knowledge Graph Compression Opportunities

## What Tailslayer Actually Does

Tailslayer is **not** a compression library. It is a **tail-latency elimination** tool for DRAM reads. Its core technique:

1. **Redundant replication** — every datum is copied N times across independent DRAM channels
2. **Hedged reads** — N workers (pinned to separate CPU cores) race to read the same logical index from different physical channels
3. **First-responder wins** — whichever channel is NOT in a DRAM refresh cycle responds first, eliminating the ~300ns stall

Key implementation insights from the source:
- Hugepage allocation (1GB `MAP_HUGETLB`) eliminates TLB misses
- Channel-aware addressing via bit manipulation (`channel_bit`, `chunk_shift`, `chunk_mask`) ensures replicas land on different physical DRAM channels
- All hot-path functions are `[[gnu::always_inline]]` — zero call overhead
- Precomputed stride arithmetic avoids any division/modulo in the read path
- `mlock()` prevents the OS from paging out the data

## Applicable Insights for Our System

### 1. Hedged Reads for Knowledge Graph (Latency, Not Compression)

**Principle**: When the graph is stored in both GrafeoDB WASM (IndexedDB) and an in-memory cache, issue reads to both and take whichever responds first. This eliminates IndexedDB I/O tail latency (~5-50ms spikes).

**Implementation**: Add a `hedgedGet` to `grafeo-store.ts` that queries both the WASM engine and a lightweight `Map<string, KGNode>` LRU cache in parallel, resolving with whichever returns first.

### 2. Hot-Path Inlining (Already Designed)

The `callDirect()` fast-path in AppKernel (from the previous plan) is the exact browser analog of Tailslayer's `always_inline` pattern — bypass middleware overhead for performance-critical operations.

### 3. Precomputed Address Tables

Tailslayer precomputes `chunk_shift_`, `chunk_mask_`, and `stride_in_elements_` at construction time. We should do the same for UOR addresses: maintain a precomputed `Map<string, number>` index of node addresses to internal IDs, avoiding repeated string hashing during graph traversals.

---

## Compression Opportunities (Lossless, Zero Fidelity Loss)

These are the significant space-saving opportunities identified from analyzing the knowledge graph storage layer:

### A. IRI Prefix Interning (40-60% quad storage reduction)

**Problem**: Every quad stores full IRI strings like `https://uor.foundation/schema/nodeType` repeatedly. A node with 10 properties generates 10 quads, each repeating `https://uor.foundation/` as a prefix.

**Solution**: Maintain a prefix table (like SPARQL's `PREFIX` declarations but at the storage level). Store integer prefix IDs + suffix instead of full IRIs. This is standard in RDF databases (HDT format does exactly this).

```text
Before: <https://uor.foundation/schema/qualityScore> = 47 bytes per occurrence
After:  prefix_id=2, suffix="qualityScore" = ~14 bytes
Savings: ~70% on predicate storage alone
```

### B. Property Map Columnar Compression

**Problem**: `node.properties` is stored as `JSON.stringify(properties)` — a single literal blob per node. Two nodes with `{format: "csv", size: 1024}` and `{format: "csv", size: 2048}` store redundant schema structure.

**Solution**: Extract the property schema (key set) as a content-addressed template. Store only the values array per node, referencing the shared schema by CID.

```text
Before: {"format":"csv","size":1024,"columns":5} = 38 bytes × N nodes
After:  schema_cid + [csv, 1024, 5] = ~15 bytes × N nodes  (schema stored once)
```

### C. Canonical Form Deduplication (Already Exists — Enhance It)

**Current**: `compressGraph()` merges nodes with identical `canonicalForm`. But it only runs on-demand.

**Enhancement**: Make it incremental — on every `putNode()`, check if a node with the same canonical form already exists before inserting. This prevents duplicates from ever entering the graph, rather than cleaning them up after the fact.

### D. Structural Sharing for Subgraphs (Content-Addressed DAG)

**Principle**: When two subgraphs are structurally identical (same predicate/object patterns, different subjects), store the pattern once and reference it. This is the graph equivalent of Git's tree objects.

**Example**: If 100 dataset nodes all have the same edge pattern (`hasColumn → revenue`, `hasColumn → date`, `hasFormat → csv`), store that pattern as a single content-addressed "subgraph template" and link each node to it.

### E. Vault Chunk Deduplication

**Problem**: `vault-store.ts` chunks documents and stores each chunk separately. If two documents share paragraphs (e.g., versioned docs), identical chunks are stored twice.

**Solution**: Before writing a chunk to the Data Bank, check if a chunk with the same CID already exists. The CID is already computed — just add a lookup step. This gives automatic cross-document deduplication with zero fidelity loss.

---

## Implementation Plan

### Files Created/Modified

| File | Change |
|------|--------|
| `src/modules/knowledge-graph/lib/iri-intern.ts` | Create — IRI prefix interning table with bidirectional lookup |
| `src/modules/knowledge-graph/lib/hedged-read.ts` | Create — parallel read from WASM + LRU cache, first-responder wins |
| `src/modules/knowledge-graph/lib/schema-templates.ts` | Create — content-addressed property schema extraction and sharing |
| `src/modules/knowledge-graph/grafeo-store.ts` | Modify — integrate IRI interning on insert/query, add incremental dedup on `putNode`, add hedged reads for `getNode` |
| `src/modules/sovereign-vault/lib/vault-store.ts` | Modify — add CID-based chunk dedup check before `writeSlot` |
| `src/modules/knowledge-graph/graph-compute.ts` | Modify — add subgraph template detection to `compressGraph()` |

### Step 1: IRI Prefix Interning (`iri-intern.ts`)

A singleton that maintains a bidirectional prefix table. On first use, registers the 8-10 standard prefixes (`uor:`, `rdf:`, `rdfs:`, `schema:`, etc.). Every quad insert compresses IRIs to `[prefixId, suffix]` before storage. Every query expands them back. Fully lossless — the prefix table is persisted alongside the graph.

### Step 2: Hedged Read Layer (`hedged-read.ts`)

An LRU cache (configurable size, default 500 nodes) that sits alongside GrafeoDB. On `getNode()`, both the cache and WASM are queried via `Promise.race()`. Cache is populated on every successful read and invalidated on writes. This eliminates IndexedDB tail latency for hot nodes.

### Step 3: Property Schema Templates (`schema-templates.ts`)

On `putNode()`, extract the property key set, sort it, hash it via `singleProofHash()` to get a schema CID. If the schema CID already exists, store only the values array. If new, register the schema. On `getNode()`, reconstruct the full properties object from schema + values.

### Step 4: Incremental Canonical Dedup

In `grafeoStore.putNode()`, before inserting, check if any existing node shares the same `canonicalForm`. If so, merge properties and skip the insert. This makes `compressGraph()` unnecessary for new data.

### Step 5: Vault Chunk Dedup

In `vaultStore.ingestDocument()`, before calling `writeSlot()` for each chunk, check if a slot with key `vault:*:chunk:*` having the same CID already exists. If so, store a reference (pointer) instead of duplicating the encrypted blob.

## Compression Impact Estimate

| Technique | Expected Savings | Fidelity Loss |
|-----------|-----------------|---------------|
| IRI interning | 40-60% on quad storage | Zero |
| Property schema templates | 30-50% on property blobs | Zero |
| Incremental canonical dedup | Prevents unbounded growth | Zero |
| Vault chunk dedup | Variable (high for versioned docs) | Zero |
| Subgraph templates | 20-40% on edge storage | Zero |
| **Combined** | **~50% overall graph size reduction** | **Zero** |

All techniques are fully reversible and lossless — they exploit structural redundancy in how RDF data is represented, not in the information itself.

