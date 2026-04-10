

# Sovereign Graph-Database Architecture — Backend-Agnostic Knowledge Layer

## Current State

Three files directly import `supabase` in the knowledge-graph module:
- `store.ts` — datum/triple/derivation/certificate/receipt persistence
- `graph-manager.ts` — stats and named graph listing
- `sync-bridge.ts` — cloud sync

Meanwhile, `grafeo-store.ts` (850 lines) is fully self-contained — zero Supabase imports, pure WASM + IndexedDB. This is already the "sovereign core." The problem is the **three Supabase-coupled files** that bypass it.

## Core Insight

The ingenious move is NOT to build a massive abstraction layer. It's to **collapse the dual-write into single-write through the GrafeoDB canonical store**, then add a thin, swappable **persistence adapter** that syncs the GrafeoDB snapshot to any backend. Think of it like Docker: GrafeoDB IS the container image (self-contained, portable), and the persistence adapter is just `docker push/pull` to whatever registry you choose.

```text
┌─────────────────────────────────────────────┐
│  All Modules (Oracle, Messenger, Bus, etc.) │
└──────────────────┬──────────────────────────┘
                   │ single API
┌──────────────────▼──────────────────────────┐
│        grafeo-store.ts (canonical)          │
│  GrafeoDB WASM + IndexedDB (local-first)    │
│  SPARQL · Cypher · JSON-LD · N-Quads        │
└──────────────────┬──────────────────────────┘
                   │ persistence adapter
┌──────────────────▼──────────────────────────┐
│     Persistence Provider (swappable)        │
│  ┌─────────┐ ┌──────────┐ ┌─────────────┐  │
│  │Supabase │ │ SQLite   │ │ Export File  │  │
│  │(current)│ │ (Tauri)  │ │ (JSON-LD)   │  │
│  └─────────┘ └──────────┘ └─────────────┘  │
└─────────────────────────────────────────────┘
```

## Implementation

### Phase 1: Persistence Provider Interface

**Create: `src/modules/knowledge-graph/persistence/types.ts`**
Define the contract any backend must fulfill — 6 methods total:
- `pushSnapshot(quads: string): Promise<void>` — push N-Quads dump
- `pullSnapshot(): Promise<string | null>` — pull N-Quads dump
- `pushChanges(changes: ChangeEntry[]): Promise<void>` — incremental sync
- `pullChanges(sinceVersion: number): Promise<ChangeEntry[]>` — incremental pull
- `getVersion(): Promise<number>` — current remote version
- `exportBundle(): Promise<SovereignBundle>` — full portable export (JSON-LD + metadata)

A `SovereignBundle` is a single JSON file containing:
- All quads as JSON-LD `@graph`
- Schema version, export timestamp, device ID
- UOR seal hash for integrity verification
- Import instructions for any target database

**Create: `src/modules/knowledge-graph/persistence/supabase-provider.ts`**
Implements the interface using existing Supabase tables (`uor_triples`, `uor_datums`, etc.). Absorbs the logic currently in `store.ts` and `graph-manager.ts`. This is the ONLY file that imports `supabase`.

**Create: `src/modules/knowledge-graph/persistence/local-provider.ts`**
No-op provider for fully offline mode — GrafeoDB + IndexedDB is already persistent, so this just returns null for pull and no-ops for push.

**Create: `src/modules/knowledge-graph/persistence/index.ts`**
Provider registry with `getProvider()` / `setProvider()`. Default: Supabase when authenticated, local when offline/anonymous.

### Phase 2: Refactor Direct Supabase Coupling

**Modify: `store.ts`**
- Remove `import { supabase }` entirely
- `ingestDatum`, `ingestTriples`, etc. → write to `grafeoStore` first (canonical), then call `provider.pushChanges()` for async persistence
- `getDatum`, `getDerivation` → read from `grafeoStore` first, fall back to provider only on miss
- This eliminates the dual-write inconsistency

**Modify: `graph-manager.ts`**
- Remove `import { supabase }` entirely
- `getGraphStats()` → reads from `grafeoStore.getStats()` (already exists)
- `listGraphs()` → SPARQL `SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o } }` against GrafeoDB
- No more direct Supabase queries for stats

**Modify: `sync-bridge.ts`**
- Replace direct Supabase session checks with provider-based sync
- `syncToCloud()` → calls `provider.pushSnapshot()` / `provider.pullSnapshot()`

### Phase 3: Sovereign Bundle Export/Import

**Create: `src/modules/knowledge-graph/persistence/bundle.ts`**
- `exportSovereignBundle()`: calls `grafeoStore.exportAsJsonLd()` (already exists at line 707), wraps with metadata envelope (version, seal, device provenance)
- `importSovereignBundle(bundle)`: calls `grafeoStore.importFromJsonLd()` (already exists at line 746), validates seal
- Bundle format is a single `.uor.json` file — portable to ANY system that reads JSON-LD
- Add UI action in Graph Explorer to "Export Space" / "Import Space"

### Phase 4: Adjacency Index for O(1) Traversal

**Create: `src/modules/knowledge-graph/lib/adjacency-index.ts`**
- Maintains `Map<string, Set<string>>` built from GrafeoDB quads
- `getNeighbors(iri)` → O(1) vs current SPARQL query per hop
- `shortestPath(from, to, maxHops)` → BFS using adjacency map
- `getSubgraph(iri, depth)` → N-hop extraction
- Auto-updates on `grafeoStore.subscribe()` events
- Used by `traverseBFS` (currently does sequential SPARQL per node — line 614)

### Phase 5: Graph Namespace Partitioning

**Create: `src/modules/knowledge-graph/lib/graph-namespaces.ts`**
- Named namespace registry: `messenger`, `identity`, `agent`, `atlas`, `vault`
- Each maps to a graph IRI (e.g., `urn:uor:ns:messenger`)
- `queryNamespace(ns, sparql)` → auto-wraps SPARQL with `GRAPH <iri> { ... }`
- `getNamespaceStats()` → per-namespace quad counts
- Integrates with Sovereign Bus: `bus.call("graph/query", { namespace: "messenger", ... })`

### Phase 6: Transaction Envelopes

**Create: `src/modules/knowledge-graph/lib/transaction-envelope.ts`**
- `beginTransaction()` → mutation buffer
- `commitTransaction()` → content-address batch via `singleProofHash()`, apply atomically, persist CID
- `rollbackTransaction()` → discard
- Critical for trust graph mutations and identity operations

### Phase 7: Database Migration

One new table for transaction audit trail:

```sql
CREATE TABLE public.uor_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_cid text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  namespace text NOT NULL DEFAULT 'default',
  mutation_count integer NOT NULL DEFAULT 0,
  mutations jsonb NOT NULL DEFAULT '[]',
  committed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.uor_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own transactions"
ON public.uor_transactions FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `persistence/types.ts` | Create | Provider interface + SovereignBundle type |
| `persistence/supabase-provider.ts` | Create | Supabase implementation (absorbs store.ts coupling) |
| `persistence/local-provider.ts` | Create | Offline/local-only provider |
| `persistence/index.ts` | Create | Provider registry |
| `persistence/bundle.ts` | Create | Export/import sovereign bundles |
| `lib/adjacency-index.ts` | Create | O(1) graph traversal |
| `lib/graph-namespaces.ts` | Create | Scoped subgraph queries |
| `lib/transaction-envelope.ts` | Create | ACID-like batched mutations |
| `store.ts` | Modify | Route through grafeoStore + provider |
| `graph-manager.ts` | Modify | Route through grafeoStore (remove Supabase) |
| `sync-bridge.ts` | Modify | Use provider for sync |
| `index.ts` | Modify | Export new APIs |

## Why This Is the Docker-Like Solution

- **GrafeoDB = container image**: fully self-contained, runs anywhere (browser, Tauri, edge worker)
- **Persistence provider = registry**: push/pull to Supabase today, SQLite tomorrow, S3 next week
- **SovereignBundle = `docker save`**: single JSON-LD file that captures your entire knowledge space, verifiable by UOR seal, importable into any RDF-compatible system
- **Zero vendor lock-in**: only ONE file (`supabase-provider.ts`) knows about Supabase; swap it and everything else is unchanged

## On the OSS Stack Components

PostgREST, pg_graphql, GoTrue, Realtime, Storage, Edge Functions — these are already what powers the current backend. The abstraction layer means you don't need to self-host them to achieve sovereignty. Your data is always exportable as a portable bundle, and the provider swap is a single-file change. When you're ready for hybrid cloud or self-hosting, you write one new provider file implementing 6 methods.

