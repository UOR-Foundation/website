

# CNCF Terminology Alignment + Build Fix

## Two tasks

### 1. Fix the build error (blocking)

The file `src/modules/uns/build/container.ts` exists (221 lines, valid TypeScript) but the build sandbox cannot resolve `"./container"` from `index.ts`. This is a known Vite/Rollup sandbox caching issue. The fix is to add a trivial trailing comment to `container.ts` to force the build system to re-index it. If that fails, we add an explicit `.ts` extension in the import path in `index.ts` (i.e., `from "./container.ts"`).

### 2. Update doc comments and display strings to CNCF terminology

The ontology in `vocabulary.ts` already defines the canonical CNCF labels (e.g., "Service Mesh" not "Sovereign Bus", "Container Runtime" not "AppKernel"). But ~57 files still use the legacy "Sovereign" naming in doc comments, JSDoc headers, and UI-facing strings. The plan:

**What changes (doc comments and string literals only — no renames of exports/classes/filenames):**

| Legacy term (in comments/strings) | CNCF term (from ontology) | Ontology ID |
|---|---|---|
| "Sovereign Bus" | "Service Mesh" | `uor:ServiceMesh` |
| "Sovereign Reconciler" | "Reconciliation Controller" | `uor:Reconciler` |
| "Sovereign Boot" | "Init System" | `uor:InitSystem` |
| "Sovereign Compose" | "Scheduling & Orchestration" | `uor:Scheduler` |
| "AppKernel" (in descriptions) | "Container Runtime" | `uor:ContainerRuntime` |
| "Sovereign Auto-Scaler" | "Horizontal Pod Autoscaler" | `uor:HPA` |

**What does NOT change:** Class names (`AppKernel`, `SovereignReconciler`), function names (`sovereignBoot`), file names, and export signatures. These stay stable. The legacy names are already listed as `skos:altLabel` in the ontology, so they remain valid aliases.

**How it links to the ontology:** Each updated comment will include the ontology `@id` (e.g., `@see uor:ServiceMesh`) so the terminology is machine-traceable to its canonical definition. When the user switches ontology profile, the UI-facing labels automatically change via `labelForProfile()`.

**Files to update (~20 highest-impact files):**

- `src/modules/bus/registry.ts` — header: "Sovereign Bus" → "Service Mesh (uor:ServiceMesh)"
- `src/modules/bus/types.ts` — header
- `src/modules/bus/client.ts` — header
- `src/modules/bus/middleware.ts` — header
- `src/modules/bus/modules/index.ts` — header
- `src/modules/bus/modules/*.ts` (~15 files) — headers: "Sovereign Bus — X Module" → "Service Mesh — X Module"
- `src/modules/compose/reconciler.ts` — header + class doc
- `src/modules/compose/app-kernel.ts` — header + class doc
- `src/modules/compose/orchestrator.ts` — AppKernel references in comments
- `src/modules/boot/sovereign-boot.ts` — header
- `src/modules/boot/types.ts` — header
- `src/modules/desktop/BootSequence.tsx` — comment references
- `src/modules/cncf-compat/gateway.ts` — "Sovereign Bus operations" → "Service Mesh operations"
- `src/modules/uns/build/index.ts` — orchestration table comments
- `src/modules/namespace-registry.ts` — "Sovereign Bus namespace" → "Service Mesh namespace"

Each header update follows the pattern:
```
// Before:
/**
 * Sovereign Bus — Vault Module.

// After:
/**
 * Service Mesh — Vault Module.
 * @ontology uor:ServiceMesh
```

This ensures every module's documentation is canonically linked to the ontology, making it trivial to audit which terms are in use and swap them by changing the active profile.

