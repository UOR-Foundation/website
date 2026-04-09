

# Module Consolidation Plan — 3341 → ~2800 Modules

## Diagnosis

The 3341 Vite module count comes from three sources:
1. **41 top-level modules** under `src/modules/`, several with overlapping responsibilities
2. **26 bus registrations** imported eagerly via side-effect in `App.tsx` — every bus handler and its transitive deps are in the initial bundle
3. **Dead dependencies** (`oxigraph` 7.6 MB still installed; `oxigraphStore` alias exported but zero consumers)

## Consolidation Opportunities (7 actions)

### 1. Merge `kg-store` into `knowledge-graph` (eliminate 1 module)

Both are graph storage layers. `kg-store` (7 files, 11 consumers) wraps ingest/query ops; `knowledge-graph` (14 files, 10 consumers) owns the GrafeoDB store. They share the same underlying store and `kg-store/uns-graph.ts` already imports from `knowledge-graph`. Merge `kg-store/*` into `knowledge-graph/` and re-export from `knowledge-graph/index.ts`. Update 18 import sites.

### 2. Merge `trace` into `verify` (eliminate 1 module)

`trace` is 3 files (record/get/recent traces). `verify` is the audit module (receipts, integrity checks). Traces are a subset of the audit pipeline. Merge `trace/trace.ts` and `trace/trace-module.ts` into `verify/`. Update 6 import sites.

### 3. Merge `semantic-index` into `resolver` (eliminate 1 module)

`semantic-index` has 5 files (entity linking, deduplication, index building). `resolver` already has entity resolution (`entity-resolver.ts`) and correlation. Both deal with entity lookup/matching. Only 1 external consumer of `semantic-index`. Merge into `resolver/`. Update 1 import site.

### 4. Delete dead modules: `uor-terms`, `framework`, `interoperability` (eliminate 3 modules)

- **`uor-terms`**: 0 external refs. Exports only a page component. Move page to `core/pages/`.
- **`framework`**: 0 external refs. Exports `StandardPage` and `SemanticWebPage`. Move pages to `core/pages/`. Already imported in `App.tsx` directly.
- **`interoperability`**: 1 external ref (likely a route). 4 files, pure UI. Move to `core/pages/`.

### 5. Fold `ns` namespace barrel into direct imports (eliminate 1 module)

`ns` is a re-export barrel with exactly 1 consumer (`namespace-registry.ts`). The barrel itself says "non-ontological modules import from their module dirs directly." Follow that advice — replace the single consumer's `ns/*` imports with direct module imports and delete `ns/`.

### 6. Remove `oxigraph` package dependency

`oxigraph` (7.6 MB) is still in `node_modules`. The `oxigraphStore` export alias has zero consumers. Remove from `package.json`, delete the re-export alias from `grafeo-store.ts` and `knowledge-graph/index.ts`.

### 7. Lazy-load bus module registrations

Currently `App.tsx` line 9 does `import "@/modules/bus/modules"` which eagerly pulls in all 26 bus handler modules and their transitive deps (the largest contributor to the 3341 count). Change to a dynamic `import()` triggered after first render or on `requestIdleCallback`, so the initial bundle only includes route-critical code.

## Impact Estimate

| Action | Modules Eliminated | Vite Modules Saved |
|--------|-------------------|-------------------|
| Merge kg-store → knowledge-graph | 1 top-level | ~30-50 |
| Merge trace → verify | 1 top-level | ~15 |
| Merge semantic-index → resolver | 1 top-level | ~20 |
| Delete uor-terms/framework/interoperability | 3 top-level | ~60 |
| Fold ns barrel | 1 top-level | ~25 |
| Remove oxigraph dep | 0 | ~100 (dead tree-shake) |
| Lazy bus registrations | 0 | ~300 (deferred to async chunk) |
| **Total** | **7 top-level modules** | **~550 fewer in initial bundle** |

Module count drops from 41 → 34 top-level modules (under the pruning gate's 40 budget with margin). Initial Vite transform count drops to ~2800.

## Files Modified

```text
DELETE  src/modules/kg-store/          → merge into knowledge-graph/
DELETE  src/modules/trace/             → merge into verify/
DELETE  src/modules/semantic-index/    → merge into resolver/
DELETE  src/modules/uor-terms/         → move page to core/pages/
DELETE  src/modules/framework/         → move pages to core/pages/
DELETE  src/modules/interoperability/  → move page to core/pages/
DELETE  src/modules/ns/               → inline imports at call sites

EDIT    src/modules/knowledge-graph/index.ts   (add kg-store exports, remove oxigraphStore)
EDIT    src/modules/knowledge-graph/grafeo-store.ts (remove oxigraphStore alias)
EDIT    src/modules/verify/index.ts            (add trace exports)
EDIT    src/modules/resolver/index.ts          (add semantic-index exports)
EDIT    src/App.tsx                            (lazy bus import, update page imports)
EDIT    package.json                           (remove oxigraph)
EDIT    ~25 files with import path updates
```

## Constraints

- No API surface changes — all public exports are preserved via new barrel locations
- No kernel function changes — P₀–P₆ frameworks untouched
- Bus handlers remain identical — only their registration timing changes (eager → idle)
- Pruning gate test remains green (34 < 40 modules)

