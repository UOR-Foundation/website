

# Knowledge Graph Engine: Oxigraph Integration

## Recommendation: Oxigraph

**Oxigraph** is the clear winner for this system. Here's why it's the right — and only — choice:

- **Rust-native, WASM-compiled**: Written in Rust, officially compiles to WebAssembly. Same engine runs in browser, Node.js, Deno, Cloudflare Workers, and native server. One codebase, every environment.
- **Full SPARQL 1.1**: SELECT, CONSTRUCT, ASK, DESCRIBE, UPDATE — complete spec compliance. No partial implementations.
- **Battle-tested**: v0.5.6 (March 2026), used in production by Wikidata tooling, EU open data projects, and multiple academic systems. 15k+ GitHub stars.
- **Apache 2.0 + MIT dual-licensed**: Fully open source, no restrictions.
- **Named graphs / Quads**: Native quad store — aligns perfectly with the existing `UnsGraph` ontology and Q0 named graph architecture.
- **RDF format support**: Turtle, TriG, N-Triples, N-Quads, RDF/XML — built-in serialization/deserialization.
- **npm package**: `npm install oxigraph` — drop-in, no build toolchain needed.

No other option comes close. Apache Jena is Java-only (no browser). RDFox is proprietary. N3.js is a parser, not a store. Comunica is a query engine without persistence. Oxigraph is the only production-grade, WASM-portable, full SPARQL graph database.

## Current State

The system currently has two custom graph stores:

1. **`local-store.ts`** — IndexedDB-backed triple store with manual index management. ~620 lines of hand-rolled cursor/transaction code. No SPARQL — queries are imperative JavaScript (queryBySubject, queryByPredicate).

2. **`uns-graph.ts`** — In-memory quad store with a hand-written SPARQL parser (~630 lines). Supports SELECT/CONSTRUCT/ASK but the parser is a custom regex-based implementation, not spec-compliant.

Both work, but they're fragile, limited, and would need to be rewritten for every new query pattern. Oxigraph replaces both with a single, spec-compliant engine.

## Implementation

### Phase 1 — Install and Create Oxigraph Adapter

Install the `oxigraph` npm package. Create `src/modules/knowledge-graph/oxigraph-store.ts` that wraps the Oxigraph WASM store with the same interface the bus currently expects (`putNode`, `putEdge`, `getNode`, `queryBySubject`, etc.). This adapter:

- Initializes Oxigraph's in-memory store (WASM)
- Translates KGNode/KGEdge objects to/from RDF quads using the existing UOR IRI conventions
- Exposes raw `sparqlQuery(sparql: string)` for full SPARQL 1.1
- Persists to IndexedDB by serializing the store as N-Quads on `flush()` and reloading on init
- Handles named graphs (ontology graph, Q0 graph, user graphs)

### Phase 2 — Migrate UnsGraph to Oxigraph Backend

Update `src/modules/kg-store/uns-graph.ts` to use Oxigraph internally instead of the hand-rolled quad array + regex SPARQL parser. The public API (`sparqlSelect`, `sparqlConstruct`, `sparqlAsk`, `loadOntologyGraph`, `materializeQ0`) stays identical — only the backend changes from `this.quads[]` to `oxStore.query()`.

### Phase 3 — Update Bus Graph Module

Update `src/modules/bus/modules/graph.ts` to add a `sparql` operation that passes raw SPARQL strings directly to Oxigraph. This gives the full power of SPARQL 1.1 through the bus:

```typescript
bus.call("graph/sparql", { query: "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10" })
```

### Phase 4 — Persistence Bridge

Create a persistence layer that:
- On every write batch, serializes changed named graphs to N-Quads and stores in IndexedDB
- On boot, deserializes N-Quads back into Oxigraph
- On cloud sync, sends N-Quads to the backend for replication
- This replaces the current manual IndexedDB cursor management with a clean serialize/deserialize cycle

### Phase 5 — Include in Boot Sequence

Wire Oxigraph initialization into the sovereign boot (Phase 1, Layer 0):
- Load WASM (Oxigraph ships its own `.wasm`)
- Restore persisted N-Quads from IndexedDB
- Materialize Q0 ontology
- Report quad count in boot receipt

## Files Summary

| Action | File |
|---|---|
| Install | `oxigraph` npm package |
| Create | `src/modules/knowledge-graph/oxigraph-store.ts` — adapter wrapping Oxigraph |
| Modify | `src/modules/kg-store/uns-graph.ts` — swap backend to Oxigraph |
| Modify | `src/modules/bus/modules/graph.ts` — add `sparql` operation |
| Modify | `src/modules/knowledge-graph/local-store.ts` — delegate to Oxigraph adapter |
| Modify | `src/modules/knowledge-graph/index.ts` — export Oxigraph store |
| Modify | `src/modules/boot/sovereign-boot.ts` — init Oxigraph in Phase 1 |

## Why This Is the Right Move

The current system has ~1250 lines of hand-rolled graph code that Oxigraph replaces with a battle-tested Rust engine. You get full SPARQL 1.1 for free, proper query optimization, standard RDF serialization, and the exact same WASM binary runs in browser, edge function, or cloud server. The UOR ontology, Q0 materialization, and named graph architecture all map directly to Oxigraph's native quad model with zero impedance mismatch.

