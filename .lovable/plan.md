

# Sovereign Knowledge Graph — Hardening Plan

## Diagnosis

The architecture is fundamentally sound: GrafeoDB as canonical WASM store, content-addressing via singleProofHash at every ingestion point, swappable persistence providers, offline-first computation. Five structural gaps prevent it from being truly sovereign, truly secure, and truly scalable.

## Gap 1: Seal Enforcement (Security)

**Problem**: `importSovereignBundle()` logs a warning on seal mismatch but imports anyway. Tampered bundles enter the graph unchallenged.

**Fix**: `persistence/bundle.ts`
- Seal verification becomes strict: mismatch throws an error by default
- Add an `opts.allowUntrusted?: boolean` escape hatch for development
- Recompute seal from N-Quads (not JSON-LD) during both export AND import for consistency
- Route seal computation through `singleProofHash()` instead of raw SHA-256, ensuring the seal is a proper UOR identity

## Gap 2: True Transaction Atomicity (Sovereignty)

**Problem**: `transaction-envelope.ts` applies mutations one-by-one. Partial failures leave the graph in an inconsistent state.

**Fix**: `lib/transaction-envelope.ts`
- Buffer all mutations as a single concatenated SPARQL UPDATE
- Compute the CID BEFORE applying (from the mutation batch content)
- Apply as a single `sparqlUpdate()` call (GrafeoDB supports multi-statement updates)
- On failure, nothing is committed — true atomic semantics
- Only persist the CID to the provider after successful local apply

## Gap 3: Auth Abstraction (Portability)

**Problem**: `sync-bridge.ts` dynamically imports Supabase for auth session checks, breaking backend-agnostic contract.

**Fix**: `sync-bridge.ts` + `persistence/types.ts`
- Add `getAuthContext(): Promise<{ userId: string; isAuthenticated: boolean } | null>` to the `PersistenceProvider` interface
- `supabase-provider.ts` implements it using Supabase auth
- `local-provider.ts` returns `{ userId: "local", isAuthenticated: false }`
- `sync-bridge.ts` calls `provider.getAuthContext()` instead of importing Supabase

## Gap 4: Paginated Pull (Scalability)

**Problem**: `supabase-provider.ts` pulls at most 1000 triples, silently truncating larger graphs.

**Fix**: `persistence/supabase-provider.ts`
- Replace single `.limit(1000)` query with paginated cursor loop
- Pull in batches of 1000 using `.range(offset, offset + 999)` until no more rows
- Add `quadCount` query first to log progress

## Gap 5: Canonical Store Reference (Correctness)

**Problem**: `graph-compute.ts` imports from `./local-store` instead of `./grafeo-store`, operating on a divergent dataset.

**Fix**: `graph-compute.ts`
- Replace `import { localGraphStore } from "./local-store"` with `import { grafeoStore as localGraphStore } from "./grafeo-store"`
- All reasoning (similarity, compression, deduction, coherence) now operates on the single canonical instance

## Gap 6: UOR-Rooted Computation Inside the Graph

**Problem**: The graph stores data and the ring engine computes separately. There's no mechanism to execute ring arithmetic as graph operations — e.g., "traverse this edge AND apply this ring morphism."

**Fix**: Create `lib/graph-morphisms.ts`
- Define `GraphMorphism` type: `{ source: string; target: string; via: PrimitiveOp; deterministic: true }`
- `applyMorphism(nodeIri, op)` — retrieves the datum, applies the ring operation, returns/creates the target node
- `composeMorphisms(nodeIri, ops[])` — chains operations functorially
- `materializeMorphismEdge(from, op, to)` — stores the computation as a typed edge in the graph
- This enables "compute-in-graph": the knowledge graph becomes a category where edges are ring morphisms and traversal IS computation

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `persistence/bundle.ts` | Modify | Strict seal enforcement via singleProofHash |
| `persistence/types.ts` | Modify | Add getAuthContext to PersistenceProvider |
| `persistence/supabase-provider.ts` | Modify | Paginated pull + auth context |
| `persistence/local-provider.ts` | Modify | Auth context stub |
| `lib/transaction-envelope.ts` | Modify | True atomic batch commits |
| `lib/graph-morphisms.ts` | Create | Ring operations as graph edges |
| `graph-compute.ts` | Modify | Fix canonical store import |
| `sync-bridge.ts` | Modify | Use provider auth instead of direct Supabase |

## Technical Notes

- Gap 5 is a one-line fix but has the highest correctness impact
- Gap 6 (graph morphisms) is the architectural leap: it turns the knowledge graph from a passive data store into an active computational substrate where UOR ring operations are first-class graph edges — traversal becomes computation, and the graph becomes a category
- No database migrations needed
- All changes maintain backward compatibility

