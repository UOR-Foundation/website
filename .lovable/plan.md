

# Knowledge Graph-First OS Conformance — Analysis & Plan

## Current State Assessment

The system is **architecturally sound** but has **execution gaps** between the KG-first aspiration and current reality:

### What's Already Working (Strengths)
- **GrafeoDB (WASM)** is the single canonical graph engine with IndexedDB persistence
- **PersistenceProvider interface** abstracts backend (Supabase, local, bundle) — truly agnostic
- **anchor()** API exists for fire-and-forget graph writes from any module
- **Graph Anchor Gate** checks coverage of user-facing modules
- **UNS Graph** stores ring operations, ontology, and Q0 data as quads
- **Store module** ingests datums, derivations, certificates as graph triples
- **Bus module** exposes SPARQL query/update via `graph/sparql`
- **Sync bridge** handles push/pull between local graph and remote persistence

### Gaps — Where the OS Bypasses the Graph

1. **Static data arrays** (`src/data/`) — 24 files of hardcoded constants (nav items, app store entries, team members, framework layers, etc.) are imported directly by React components. These define what the OS "knows" but exist outside the graph.

2. **Boot sequence** does NOT anchor its results into the graph — the seal, kernel hash, device provenance, and tech stack verification live in a closure variable (`_receipt`) rather than being written as graph triples.

3. **Bus module registry** — registered operations and their metadata (descriptions, layers, namespaces) live in a `Map<string, OperationDescriptor>` in memory. The graph has no record of what operations exist or their relationships.

4. **Ontology vocabulary** (`vocabulary.ts`) — SKOS concepts and profile labels are TypeScript objects, not graph quads. The "Ontology Panel" reads from TS arrays, not from a SPARQL query.

5. **Zero user-facing modules** actually call `anchor()` — the search found 0 imports of `useGraphAnchor` or `anchor` outside the knowledge-graph module itself. The gate would report 0% coverage.

6. **Ingest bridge** still imports from deprecated `local-store.ts` instead of canonical `grafeo-store`.

7. **No graph-projection pattern** — UI components read hardcoded data; there's no `useGraphProjection()` hook that queries the graph and projects results into React state.

## Plan

### Task 1: Graph Seed Layer — Ingest Static Data into KG on Boot
**File: `src/modules/knowledge-graph/seed.ts`** (new)

Create a `seedStaticData()` function that runs once after GrafeoDB init. It imports each `src/data/*.ts` file, wraps each entry in JSON-LD with `@type` from schema.org types registry, runs `singleProofHash()` for content addressing, and writes the result as graph triples via `grafeoStore.putNode()`. This makes nav items, app store entries, team members, etc. all queryable via SPARQL.

### Task 2: Boot Anchoring — Write Seal + Provenance into Graph
**File: `src/modules/boot/sovereign-boot.ts`** (update)

After the seal is computed, call `anchor("boot", "seal:created", { ... })` with the full seal data (kernel hash, derivation ID, device provenance, stack components). This makes the boot receipt a first-class graph citizen, queryable and auditable.

### Task 3: Graph Projection Hook — `useGraphProjection()`
**File: `src/modules/knowledge-graph/hooks/useGraphProjection.ts`** (new)

A React hook that takes a SPARQL query or graph pattern and returns reactive state. Components can progressively migrate from `import { navItems } from "@/data/nav-items"` to `useGraphProjection("SELECT ?item WHERE { ?item a schema:SiteNavigationElement }")`. Includes a fallback to static data if graph isn't ready yet.

### Task 4: Bus Registry Graph Sync
**File: `src/modules/bus/registry.ts`** (update)

After each `register()` call, fire-and-forget write the operation descriptor as a graph triple: `<urn:bus:ns/op> a uor:Operation ; rdfs:label "..." ; uor:layer N`. This makes the full API surface discoverable via SPARQL.

### Task 5: Ontology Vocabulary Graph Materialization
**File: `src/modules/ontology/vocabulary.ts`** (update)

Add a `materializeToGraph()` function that writes all SKOS concepts as proper `skos:Concept` triples into the ontology named graph. The OntologyPanel can then optionally query the graph instead of reading TS arrays.

### Task 6: KG Substrate Conformance Gate
**File: `src/modules/knowledge-graph/graph-anchor-gate.ts`** (update)

Expand the existing gate with three new checks:
- **Substrate Coverage**: Verify that static data files have corresponding graph nodes (checks seed completeness)
- **Boot Anchoring**: Verify that a boot seal triple exists in the graph
- **Bus Registry Sync**: Verify that registered bus operations have corresponding graph triples
- **Ontology Materialization**: Verify SKOS concepts exist as graph quads

Score deductions for each missing substrate layer.

### Task 7: Fix Ingest Bridge Import
**File: `src/modules/knowledge-graph/ingest-bridge.ts`** (update)

Replace deprecated `local-store.ts` import with canonical `grafeo-store` import.

## File Summary

| File | Action | Purpose |
|---|---|---|
| `src/modules/knowledge-graph/seed.ts` | Create | Ingest all static data into KG on boot |
| `src/modules/knowledge-graph/hooks/useGraphProjection.ts` | Create | SPARQL-to-React-state projection hook |
| `src/modules/boot/sovereign-boot.ts` | Update | Anchor seal into graph post-boot |
| `src/modules/bus/registry.ts` | Update | Sync registrations to graph |
| `src/modules/ontology/vocabulary.ts` | Update | Materialize SKOS to graph |
| `src/modules/knowledge-graph/graph-anchor-gate.ts` | Update | KG Substrate Conformance checks |
| `src/modules/knowledge-graph/ingest-bridge.ts` | Update | Fix deprecated import |

## Architecture After Implementation

```text
┌─────────────────────────────────────────────────┐
│              React UI Components                │
│    useGraphProjection()  ←──  SPARQL queries     │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│           GrafeoDB (WASM + IndexedDB)           │
│   ┌─────────┬──────────┬──────────┬──────────┐  │
│   │ Static  │  Boot    │  Bus     │ Ontology │  │
│   │ Seed    │  Seal    │  Registry│ SKOS     │  │
│   │ Data    │  Anchors │  Triples │ Concepts │  │
│   └─────────┴──────────┴──────────┴──────────┘  │
│              Named Graphs (SPARQL 1.1)          │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│         PersistenceProvider (agnostic)           │
│   Supabase │ Local │ Edge │ Mobile │ Bundle     │
└─────────────────────────────────────────────────┘
```

Every piece of data the OS displays originates from or is materialized into the single KG instance. The gate enforces this conformance continuously.

