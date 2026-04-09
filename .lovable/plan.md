

## Plan: UOR-Native Personal Knowledge Graph with Full Offline/Online Computational Capability

### The Core Insight

The UOR framework already implements everything needed for a fully computational knowledge graph. Right now these capabilities are scattered across disconnected modules (`kg-store`, `code-kg`, `derivation`, `ring-core`, `canonicalization`, `jsonld`, `identity`, `triad`). The knowledge graph store (`kg-store/store.ts`) is Supabase-only — it requires auth and network. The file explorer's ingestion pipeline produces UOR addresses but never creates graph nodes or edges.

The fix: a **local-first Knowledge Graph** backed by IndexedDB (following the existing `weight-store.ts` pattern), where every ingested item becomes a graph node with typed edges, and the full UOR computational stack (ring arithmetic, term canonicalization, derivation, coherence verification, semantic similarity) operates entirely offline.

### What UOR Primitives We Already Have (and Will Leverage)

| Module | Capability | KG Use |
|--------|-----------|--------|
| `ring-core/ring.ts` | 10 ring operations (neg, bnot, xor, and, or, succ, pred, add, sub, mul) | Compute over graph node values offline |
| `ring-core/canonicalization.ts` | 7-rule term canonicalization to normal form | **Compression**: identical expressions reduce to same canonical form = same node |
| `derivation/derivation.ts` | Auditable computation records with epistemic grading | Every graph transformation gets a Grade-A receipt |
| `ring-core/coherence.ts` | 8-law exhaustive verification | Self-verifying graph: every node can prove its own integrity |
| `ring-core/reasoning.ts` | Deductive/Inductive/Abductive reasoning primitives | Graph traversal with formal reasoning modes |
| `ring-core/semantic-similarity.ts` | Trigram cosine similarity (<0.05ms) | Find related nodes without embeddings or network |
| `identity/addressing.ts` | Lossless Braille bijection (byte ↔ glyph ↔ IRI) | Every node has a permanent, invertible address |
| `uor-canonical.ts` | URDNA2015 → SHA-256 → 4 identity forms | Content-addressing for deduplication and integrity |
| `jsonld/emitter.ts` | W3C JSON-LD 1.1 graph emission | Export/import graphs as standard linked data |
| `triad/triad.ts` | Triadic decomposition (datum, stratum, spectrum) | Classify nodes by information density |
| `ring-core/compose.ts` | Operation composition (f ∘ g) | Chain graph transformations |

### Architecture

```text
┌──────────────────────────────────────────────────┐
│              Explorer / Oracle / Apps             │
├──────────────────────────────────────────────────┤
│         useKnowledgeGraph() React Hook            │
│    query · traverse · reason · export · sync      │
├──────────────────────────────────────────────────┤
│            KnowledgeGraphEngine                   │
│  ┌────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ Nodes  │ │  Edges   │ │   Derivations     │  │
│  │ (IDB)  │ │  (IDB)   │ │   (IDB)           │  │
│  └────────┘ └──────────┘ └───────────────────┘  │
│  ┌──────────────────────────────────────────────┐│
│  │         UOR Computational Layer              ││
│  │  Ring Ops · Canonicalize · Derive · Verify   ││
│  │  Reason (D/I/A) · Similarity · Compose       ││
│  └──────────────────────────────────────────────┘│
├──────────────────────────────────────────────────┤
│  SyncBridge: IDB ↔ Cloud (when online + authed)  │
└──────────────────────────────────────────────────┘
```

### Changes

**Phase 1: Local Knowledge Graph Store (IndexedDB)**

**New: `src/modules/knowledge-graph/local-store.ts`**
IndexedDB-backed triple store following the `weight-store.ts` pattern:
- Object stores: `nodes` (keyed by UOR address), `edges` (keyed by composite), `derivations` (keyed by derivation_id), `meta` (graph-level metadata)
- `putNode(node)` — upsert by UOR address (same content = same node, automatic dedup)
- `putEdge(subject, predicate, object)` — typed edges
- `getNode(uorAddress)` — O(1) lookup
- `queryByPredicate(pred)` — find all edges of a type
- `queryBySubject(subjectAddr)` — fan-out from a node
- `traverseBFS(startAddr, depth)` — breadth-first graph walk
- `exportAsJsonLd()` — serialize entire graph as W3C JSON-LD using existing `emitter.ts`
- `importFromJsonLd(doc)` — ingest a JSON-LD graph
- `getStats()` — node count, edge count, derivation count
- `clear()` — wipe local graph

**Phase 2: Ingestion → Graph Bridge**

**New: `src/modules/knowledge-graph/ingest-bridge.ts`**
Connects the existing ingestion pipeline to the knowledge graph:
- When `ingestFile/ingestPaste/ingestUrl` completes, automatically create a graph node with:
  - `@id`: the UOR address from the pipeline
  - `@type`: detected format (csv, json, text, markdown, image)
  - Properties: filename, size, quality score, stratum (from triad), format
  - Structured data columns become edge targets (`node --hasColumn--> columnNode`)
- For tabular data: each column becomes a sub-node, enabling queries like "show all files with a 'revenue' column"
- For text: extract entities via simple NLP (proper nouns, URLs, emails) and create edges to shared entity nodes — this is where the graph becomes powerful: two documents mentioning "UOR" share a common node
- Duplicate detection is free: same UOR address = same node, no extra work

**Phase 3: Computational Graph Operations**

**New: `src/modules/knowledge-graph/graph-compute.ts`**
Leverages the full UOR computational stack for offline graph operations:

1. **Canonicalization-based compression**: When two nodes contain equivalent expressions (detected via `canonicalize()` from `canonicalization.ts`), they collapse to the same canonical node. This is genuine data compression — not lossy, mathematically provable.

2. **Derivation chains**: Every graph transformation (merge, split, fork) creates a `Derivation` record via `derive()`. The graph carries its own audit trail. Any node can be re-derived and verified offline.

3. **Semantic search via Hamming distance**: Use `inductiveStep()` from `reasoning.ts` to find nodes with similar ring values (content similarity without embeddings). Combined with `SemanticIndex` from `semantic-similarity.ts` for text-level similarity.

4. **Graph reasoning**: 
   - `deductiveStep()`: Given constraints, narrow which nodes satisfy a query
   - `inductiveStep()`: Given an observation (new file), find the nearest existing node
   - `abductiveStep()`: Detect gaps — "you have nodes A and B but no edge between them; based on content similarity, should there be one?"

5. **Coherence verification**: `verifyQ0Exhaustive()` runs entirely offline, proving the ring substrate is sound. Every node's integrity can be verified by re-hashing its content.

**Phase 4: React Integration**

**New: `src/modules/knowledge-graph/hooks/useKnowledgeGraph.ts`**
React hook exposing the graph to UI:
- `nodes`, `edges`, `stats` — reactive state from IndexedDB
- `query(pattern)` — SPARQL-like pattern matching over local triples
- `findRelated(nodeAddr)` — semantic + structural similarity search
- `reason(mode, params)` — execute deductive/inductive/abductive steps
- `exportGraph()` — download as JSON-LD
- `importGraph(file)` — load a JSON-LD graph file

**Phase 5: Cloud Sync Bridge**

**Update: `src/modules/knowledge-graph/sync-bridge.ts`**
When authenticated and online:
- Push local IndexedDB nodes/edges → `uor_triples` table (existing schema)
- Pull cloud triples → local IndexedDB
- Conflict resolution via UOR address comparison (same address = identical, skip)
- Merge via `uor_triples` graph_iri namespacing (each device gets a named graph)

**Phase 6: Explorer Integration**

**Update: `src/modules/explorer/pages/FileExplorerPage.tsx`**
- After successful file ingestion, call `ingestBridge.addToGraph(item)` 
- Show graph node count in status bar: "12 files · 47 connections"
- Add a "Graph" view toggle alongside Grid/List that shows a minimap of connected nodes

**Update: `src/modules/sovereign-vault/lib/guest-context.ts`**
- After `addFile/addPaste/addUrl`, invoke ingest-bridge to populate the local KG

### Compression via UOR (the key differentiator)

Traditional storage: 10 files × 1MB = 10MB. Each file is an opaque blob.

UOR Knowledge Graph:
1. **Content dedup**: Same paragraph in 3 documents = 1 node with 3 edges. Storage: ~1/3.
2. **Term canonicalization**: `succ(succ(pred(x)))` and `succ(x)` are the same canonical form. Same derivation_id. One node.
3. **Structural sharing**: CSV files with overlapping columns share column-definition nodes. 10 CSVs with "date, amount, category" share 3 column nodes instead of duplicating 30.
4. **Triadic classification**: Stratum-based indexing (low/medium/high information density) enables efficient pruning — skip low-stratum nodes for detailed queries, skip high-stratum for overview queries.

### Files Summary

| File | Action |
|------|--------|
| `src/modules/knowledge-graph/local-store.ts` | New — IndexedDB triple store |
| `src/modules/knowledge-graph/ingest-bridge.ts` | New — Pipeline → Graph node creation |
| `src/modules/knowledge-graph/graph-compute.ts` | New — Offline computational operations |
| `src/modules/knowledge-graph/hooks/useKnowledgeGraph.ts` | New — React hook |
| `src/modules/knowledge-graph/sync-bridge.ts` | New — IDB ↔ Cloud sync |
| `src/modules/knowledge-graph/index.ts` | New — Barrel export |
| `src/modules/sovereign-vault/lib/guest-context.ts` | Wire ingest-bridge after file add |
| `src/modules/explorer/pages/FileExplorerPage.tsx` | Graph stats in status bar |

