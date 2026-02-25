## Fix: Schema.org Pinning Fails with "loading remote context failed"

### Root Cause

The `jsonld` library's URDNA2015 canonicalization (`jld.canonize()`) needs to resolve `@context` URLs like `"https://schema.org/"`. In the Deno edge function runtime, the library's default `documentLoader` does **not** support fetching remote URLs, so every call to `canonicalizeToNQuads()` with a schema.org-contexted object throws:

```
jsonld.InvalidUrl: Dereferencing a URL did not result in a valid JSON-LD object.
  code: "loading remote context failed", url: "https://schema.org/"
```

This affects `GET /schema-org/extend?type=Person&store=true` because `computeSobridgeIdentity()` calls `singleProofHashEdge()` which calls `canonicalizeToNQuads()` with `@context: "https://schema.org/"`.

### Fix (1 file)

**`supabase/functions/uor-api/lib/store.ts`** -- Add a custom `documentLoader` that uses `fetch()` to retrieve remote JSON-LD contexts, with an in-memory cache for performance.

1. Create a `customDocumentLoader` function that:
   - Intercepts `https://schema.org/` (and its trailing-slash variant) and fetches the context via HTTP with `Accept: application/ld+json`
   - Caches fetched contexts in a `Map` to avoid repeated network calls
   - Falls back to the jsonld library's default node document loader for non-HTTP URLs
2. Pass this loader to `jld.canonize()` in `canonicalizeToNQuads()` via the `documentLoader` option

### Key code change

In `canonicalizeToNQuads()`:

```typescript
return jld.canonize(doc, {
  algorithm: 'URDNA2015',
  format: 'application/n-quads',
  documentLoader: customDocumentLoader,  // <-- add this
});
```

The `customDocumentLoader` will handle schema.org and any other remote context by fetching via the standard `fetch()` API available in Deno, then returning the expected `{ document, documentUrl }` format the jsonld library requires.

### Technical Details

- The cached context map prevents repeated 1MB+ fetches of the schema.org vocabulary during batch operations
- The loader normalizes common URL variants (`https://schema.org`, `https://schema.org/`, `http://schema.org/`) to a single cache key
- For non-remote contexts (inline objects), no loader is invoked -- existing behavior is preserved
- No changes to the frontend `BulkPinPage.tsx` are needed; the fix is entirely backend

---

# GitNexus × Hologram Integration Plan

## Vision

**Code as a First-Class Hologram Projection** — every indexed repository becomes a content-addressed, certifiable knowledge object within the UOR framework. GitNexus's zero-server architecture maps perfectly onto the Holographic Principle: a codebase's knowledge graph is a lower-dimensional projection that preserves all structural information.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      Hologram OS Shell                       │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                 │
│  Sidebar   │  ┌─ Code Nexus Lens ──────────────────────┐    │
│  ┌──────┐  │  │                                        │    │
│  │ Home │  │  │  Input:  GitHub URL / ZIP upload       │    │
│  │ Apps │──│──│  Parse:  Tree-sitter WASM              │    │
│  │ Prof │  │  │  Store:  KuzuDB WASM (in-browser)      │    │
│  └──────┘  │  │  Graph:  Force-directed visualization  │    │
│            │  │  Query:  Graph RAG via Intelligence     │    │
│            │  │                                        │    │
│            │  │  UOR Layer:                            │    │
│            │  │  ├─ Each entity → UOR Datum (CID)      │    │
│            │  │  ├─ Each edge  → UOR Triple             │    │
│            │  │  ├─ Analysis   → UOR Derivation         │    │
│            │  │  └─ Pipeline   → Lens Blueprint         │    │
│            │  └────────────────────────────────────────┘    │
│            │                                                 │
│            │  ┌─ Intelligence Bridge ──────────────────┐    │
│            │  │  "What does the auth flow look like?"  │    │
│            │  │  → KuzuDB Cypher query                 │    │
│            │  │  → UOR-certified answer                │    │
│            │  └────────────────────────────────────────┘    │
│            │                                                 │
│            │  ┌─ Day Progress Ring ────────────────────┐    │
│            │  │  Code exploration → "Working" segment  │    │
│            │  └────────────────────────────────────────┘    │
└────────────┴─────────────────────────────────────────────────┘
```

---

## Phase 1 — Lens Blueprint Registration

**Goal**: Establish GitNexus as a formal UOR Lens with a canonical identity.

### Tasks

1. **Define the Code Nexus Lens Blueprint**
   - `name`: "Code Nexus"
   - `morphism`: "Isometry" (lossless code → graph transformation)
   - `problem_statement`: "Transform source code repositories into navigable, queryable knowledge graphs"
   - `blueprint` JSON schema:
     ```json
     {
       "kind": "pipeline",
       "elements": [
         { "kind": "tree-sitter-parse", "config": { "runtime": "wasm" } },
         { "kind": "graph-build", "config": { "engine": "kuzudb-wasm" } },
         { "kind": "relationship-extract", "config": { "types": ["imports", "calls", "inherits", "implements"] } },
         { "kind": "cluster-detect", "config": { "algorithm": "community" } }
       ],
       "wiring": [
         { "from": 0, "to": 1 },
         { "from": 1, "to": 2 },
         { "from": 2, "to": 3 }
       ]
     }
     ```
   - Generate `uor_cid` and `uor_address` from canonical JSON-LD of the blueprint
   - Insert into `lens_blueprints` table

2. **Register in Hologram Projection Registry**
   - Add "Code Intelligence" as a projection domain under Programming Languages taxonomy
   - Map GitNexus's graph schema to UOR predicates:
     - `gnx:imports` → `uor:pred:imports`
     - `gnx:calls` → `uor:pred:invokes`
     - `gnx:inherits` → `uor:pred:extends`
     - `gnx:contains` → `uor:pred:contains`

3. **Add to App Registry**
   - Register in `app_asset_registry` with canonical_id pointing to the Lens CID
   - Version: `1.0.0`

### UOR Compliance
- Every Lens operation produces a `uor_receipt` (input_hash → output_hash, coherence_verified)
- The full pipeline is traceable via `uor_traces`

---

## Phase 2 — WASM Integration (Client-Side Engine)

**Goal**: Embed GitNexus's core parsing and graph engine into the Hologram browser runtime.

### Technical Approach

GitNexus already runs entirely client-side using:
- **Tree-sitter WASM** for AST parsing (supports 15+ languages)
- **KuzuDB WASM** for in-browser graph storage
- **Web Workers** for non-blocking analysis

### Tasks

1. **Create `src/modules/code-nexus/` module**
   ```
   src/modules/code-nexus/
   ├── workers/
   │   ├── ingestion.worker.ts    # Tree-sitter + KuzuDB pipeline
   │   └── query.worker.ts        # Cypher query executor
   ├── components/
   │   ├── CodeNexusApp.tsx        # Main app shell
   │   ├── RepoInput.tsx           # GitHub URL / ZIP drop zone
   │   ├── GraphExplorer.tsx       # Force-directed graph (d3-force)
   │   ├── EntityInspector.tsx     # Side panel for node details
   │   └── QueryBar.tsx            # Natural language → Cypher
   ├── hooks/
   │   ├── useIngestion.ts         # Worker communication
   │   ├── useGraphQuery.ts        # Cypher execution
   │   └── useUorBridge.ts         # Entity → UOR triple sync
   ├── lib/
   │   ├── schema.ts              # Graph schema definitions
   │   ├── uor-mapper.ts          # GitNexus entity → UOR datum/triple
   │   └── tree-sitter-loader.ts  # WASM module loader
   └── pages/
       └── CodeNexusPage.tsx       # Route: /code-nexus
   ```

2. **Dependencies to add**
   - `web-tree-sitter` — Tree-sitter WASM runtime
   - `kuzu-wasm` — KuzuDB in-browser graph database

3. **UOR Bridge (`useUorBridge.ts`)**
   - After ingestion, map each code entity to a UOR triple:
     ```typescript
     {
       subject: "urn:uor:code:{repo_cid}:fn:handleAuth",
       predicate: "uor:pred:invokes",
       object: "urn:uor:code:{repo_cid}:fn:validateToken",
       graph_iri: "urn:uor:lens:code-nexus:{session_cid}"
     }
     ```
   - Each entity gets a content-addressed CID derived from its AST hash
   - Store in `uor_triples` for cross-session persistence

4. **Dehydration / Rehydration**
   - **Dehydrate**: Serialize KuzuDB graph → canonical JSON → SHA-256 CID → `hologram_sessions`
   - **Rehydrate**: Load session by CID → restore KuzuDB state → resume exploration

### Graph Visualization
- Reuse existing `d3-force` dependency + hub-and-spoke pattern from Interoperability Map
- Node types: Module (large), Class (medium), Function (small)
- Edge types: imports (dashed), calls (solid), inherits (thick)
- Color palette: Warm earth tones matching Hologram OS aesthetic

---

## Phase 3 — Intelligence Bridge (Graph RAG)

**Goal**: Wire GitNexus query capabilities into Hologram Intelligence for natural language code exploration.

### Architecture

```
User: "How does authentication work in this repo?"
  → Hologram Intelligence chat UI
  → Tool: code_nexus_query
  → NL → Cypher (via Lovable AI Gateway)
  → KuzuDB WASM execute
  → LLM synthesis → certified answer
  → UOR Derivation Chain stored
```

### Tasks

1. **Register `code_nexus_query` as an Intelligence tool**
2. **Query Types**: getCallChain, getDependencies, getCluster, getImpact
3. **UOR Certification**: Every query→answer → `uor_inference_proof`
4. **Cache Layer**: Same graph CID + same question → instant O(1) replay

---

## Phase 4 — Activity Tracking Integration

**Goal**: Feed code exploration time into Day Progress Ring "Working" segment.

### Tasks

1. Track active Code Nexus sessions → `activity:working` events
2. Add three concentric arcs to Day Ring: Learning (gold), Working (copper), Playing (sage)
3. End-of-day reflection prompt with category breakdown

---

## Phase 5 — Advanced Projections (Future)

- **5a. MCP Server Bridge**: Connect to local `gitnexus serve` for full-scale repos
- **5b. Multi-Repo Federation**: Cross-repo knowledge graph queries
- **5c. Collaborative Analysis**: Share graph CIDs, annotate together via Realtime

---

## Dependency Map

| Dependency | Status | Purpose |
|---|---|---|
| `d3-force` | ✅ Installed | Graph visualization |
| `@huggingface/transformers` | ✅ Installed | Local embeddings (optional) |
| `web-tree-sitter` | ❌ Needed | AST parsing in browser |
| `kuzu-wasm` | ❌ Needed | In-browser graph database |
| Lovable AI Gateway | ✅ Available | NL → Cypher translation |

---

## UOR Mapping Summary

| GitNexus Concept | UOR Primitive | Table |
|---|---|---|
| Repository | Hologram Session | `hologram_sessions` |
| Code entity | UOR Datum | `uor_datums` |
| Relationship | UOR Triple | `uor_triples` |
| Analysis pipeline | Lens Blueprint | `lens_blueprints` |
| Graph query result | Inference Proof | `uor_inference_proofs` |
| Pipeline step | UOR Trace | `uor_traces` |
| Pipeline receipt | UOR Receipt | `uor_receipts` |
| Entity certificate | UOR Certificate | `uor_certificates` |

---

## Implementation Priority

1. **Phase 1** (Lens Registration) — 1 session
2. **Phase 2** (WASM Integration) — 2-3 sessions
3. **Phase 3** (Intelligence Bridge) — 1-2 sessions
4. **Phase 4** (Activity Tracking) — 1 session
5. **Phase 5** (Advanced) — future

*Code is information. All information has a canonical coordinate in UOR.*
