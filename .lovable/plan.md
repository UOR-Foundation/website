

# System Health Check + Canonical Tech Stack Manifest

## Current State

The system has **three overlapping graph implementations** and several modules the pruning gate already marked as absorbed:

### Graph Redundancy Found

| Store | Backend | Purpose | Status |
|---|---|---|---|
| `knowledge-graph/local-store.ts` (620 lines) | IndexedDB | Triple store for nodes/edges/derivations | Active — 43 files import |
| `knowledge-graph/oxigraph-store.ts` (574 lines) | Oxigraph WASM + IndexedDB persistence | Full SPARQL 1.1 quad store | Active — canonical choice |
| `kg-store/uns-graph.ts` (676 lines) | Oxigraph WASM (separate instance) | UNS ontology + Q0 named graphs | Active — duplicate Oxigraph wrapper |
| `kg-store/store.ts` (263 lines) | Supabase tables | Persists datums/derivations/certs/receipts | Active — cloud persistence |
| `knowledge-graph/raw-store.ts` (201 lines) | Separate IndexedDB (`uor-raw-audit`) | Immutable audit records | Active — audit trail |
| `sparql/executor.ts` (152 lines) | Supabase `uor_triples` table | Hand-rolled SPARQL-to-SQL | Redundant — Oxigraph does native SPARQL |

**Key finding**: `kg-store/uns-graph.ts` creates its own Oxigraph Store instance independently from `knowledge-graph/oxigraph-store.ts`. Two separate WASM store instances for the same engine is pure redundancy.

### Modules Already Marked as Absorbed (pruning-gate CONSOLIDATION_MAP)

These still exist as standalone modules but are logically absorbed:
- `shacl` → `sparql`, `semantic-index` → `kg-store`, `jsonld` → `kg-store`, `bulk-pin` → `oracle`, `donate` → `community`, `qr-cartridge` → `identity`, `triad` → `ring-core`, `ruliad` → `framework`, `uor-terms` → `framework`, `opportunities` → `hologram-ui`

However, **18 files** still import from these absorbed modules directly. They need to be redirected.

### `schema-org` module — zero imports

`src/modules/schema-org/` exists but has **zero imports** anywhere in the codebase. Dead module.

---

## Plan

### Step 1: Create Tech Stack Manifest (`src/modules/boot/tech-stack.ts`)

A self-declaring manifest of every canonical framework the system prefers, organized by function. At boot, the system validates each component is available and logs its status.

```text
TECH STACK MANIFEST (what the system declares as its preferences)

Category            │ Framework         │ Role                        │ Verify
────────────────────┼───────────────────┼─────────────────────────────┼─────────
Graph Engine        │ Oxigraph 0.5.x    │ SPARQL 1.1 quad store       │ typeof import("oxigraph")
Compute Engine      │ UOR Foundation    │ Ring algebra (WASM)         │ getEngine().version
Crypto              │ Web Crypto API    │ SHA-256 / randomness        │ crypto.subtle exists
Canonical Form      │ jsonld (URDNA2015)│ N-Quads canonicalization    │ typeof import("jsonld")
UI Framework        │ React 18          │ Component rendering         │ React.version
Bundler             │ Vite 5            │ Build + HMR                 │ import.meta.env
State               │ TanStack Query    │ Server state                │ typeof import("@tanstack/react-query")
Styling             │ Tailwind CSS 3    │ Utility-first CSS           │ document.styleSheets check
3D                  │ Three.js / R3F    │ Holographic visualization   │ typeof import("three")
Post-Quantum        │ @noble/post-quantum│ Lattice-based crypto       │ typeof import exists
Data Persistence    │ Supabase          │ Cloud relational store      │ supabase.from() test
Local Persistence   │ IndexedDB         │ Offline-first storage       │ indexedDB exists
```

Each entry includes: `name`, `version`, `role` (plain English), `verify()` (async function returning boolean), and `fallback` (what happens if missing).

### Step 2: Unify Graph to Single Oxigraph Instance

- **Merge** `kg-store/uns-graph.ts` to use the singleton store from `knowledge-graph/oxigraph-store.ts` instead of creating its own Oxigraph instance
- **Deprecate** `sparql/executor.ts` (hand-rolled SQL SPARQL) — Oxigraph does native SPARQL 1.1
- **Keep** `kg-store/store.ts` — it handles Supabase cloud persistence (different concern)
- **Keep** `knowledge-graph/local-store.ts` — it handles IndexedDB node/edge CRUD (feeds Oxigraph)
- **Keep** `knowledge-graph/raw-store.ts` — immutable audit trail (different concern)

Files to modify:
| File | Change |
|---|---|
| `src/modules/kg-store/uns-graph.ts` | Import `oxigraphStore` from `knowledge-graph/oxigraph-store` instead of creating new Store() |
| `src/modules/knowledge-graph/oxigraph-store.ts` | Export `getStore()` for shared singleton access |
| `src/modules/sparql/executor.ts` | Add deprecation notice, delegate to oxigraph where possible |

### Step 3: Redirect Absorbed Module Imports (18 files)

For each module in the CONSOLIDATION_MAP, create a thin re-export barrel in the absorbed module that imports from the parent. This preserves backward compatibility while making the canonical path clear.

Example — `src/modules/triad/index.ts` becomes:
```typescript
/** @deprecated Use @/modules/ring-core instead */
export { computeTriad, popcount, basisElements, stratumLevel, stratumDensity } from "@/modules/ring-core";
```

Modules to add re-export barrels:
- `triad` → re-exports from `ring-core`
- `shacl` → re-exports from `sparql`
- `jsonld` → re-exports from `kg-store` (or `ns/schema`)
- Other absorbed modules get the same treatment

### Step 4: Remove Dead Module

- Delete `src/modules/schema-org/` — zero imports, functionality lives in `kg-store/schema-org.ts`

### Step 5: Boot Integration — Stack Health Check

Modify `src/modules/boot/sovereign-boot.ts` to add a **Phase 0.5: Stack Validation** after device fingerprint. It:
1. Reads the tech stack manifest
2. Runs each `verify()` function
3. Records which components are present vs. missing
4. Includes `stackHash` in the seal input (so the seal reflects the exact tech stack)
5. Any missing critical component → `degraded` status with clear degradation log entry

### Step 6: Surface Stack in EngineStatusIndicator

Add a "Tech Stack" section to the diagnostic panel showing each framework, its version, and its status (green check / amber warning). This becomes the system's self-declaration of what it is running.

---

## Files Summary

| Action | File | Purpose |
|---|---|---|
| Create | `src/modules/boot/tech-stack.ts` | Canonical tech stack manifest with verify functions |
| Modify | `src/modules/kg-store/uns-graph.ts` | Use shared Oxigraph singleton |
| Modify | `src/modules/knowledge-graph/oxigraph-store.ts` | Export shared store accessor |
| Modify | `src/modules/sparql/executor.ts` | Add deprecation, delegate to Oxigraph |
| Modify | `src/modules/boot/sovereign-boot.ts` | Add stack validation phase |
| Modify | `src/modules/boot/EngineStatusIndicator.tsx` | Add Tech Stack section |
| Modify | `src/modules/boot/types.ts` | Add stack health fields to BootReceipt |
| Modify | `src/modules/triad/index.ts` | Re-export barrel → ring-core |
| Modify | `src/modules/shacl/index.ts` | Re-export barrel → sparql |
| Modify | `src/modules/jsonld/index.ts` | Re-export barrel → ns/schema |
| Delete | `src/modules/schema-org/` | Dead module, zero imports |

