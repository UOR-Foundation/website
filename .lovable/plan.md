

# Blueprint Conformance Gate — Architectural Minimality Enforcer

## Current Conformance Assessment

The system already has strong foundations for this philosophy:

| Principle | Current State | Gap |
|---|---|---|
| Content-addressed components | LensBlueprint system exists with UOR addresses | Not enforced — components can be built without a blueprint |
| Pruning / minimality | Pruning Gate tracks 37 active vs 13 absorbed modules | 54 directories still on disk; 14+ are orphaned or unlisted |
| Reusable Lego blocks | Holographic Lens + Element Registry exists | No gate verifies that components are registered and reusable |
| Blueprint-before-build | LensBlueprint has `@context`, `@type`, versioning | No enforcement — code can be added without a corresponding blueprint entry |
| Pyramid principle | U1 framework declares boundaries | No gate measures distance-from-kernel or enforces layer budgets |

**Key metric**: 54 module directories, ~52K lines across 968 files. The pruning gate says 37 active, but 17 directories exist that are neither active nor absorbed — ghost weight.

## Proposed: Blueprint Conformance Gate

A single gate that enforces the pyramid principle through three checks:

### Check 1 — Ghost Directory Detection
Scan `src/modules/` for directories not declared in either the ACTIVE or ABSORBED lists. These are unlisted weight — code that exists without a canonical declaration.

Current ghosts: `api-explorer`, `app-builder`, `app-store`, `auth`, `ceremony`, `compose`, `media`, `sovereign-spaces`, `takeout`, `time-machine` (and others).

### Check 2 — Layer Budget Enforcement (Pyramid)
Each layer in the pyramid gets a module budget:

```text
Layer 0 — Shell (4 max):        core, landing, desktop, boot
Layer 1 — Algebra (4 max):      engine, ring-core, identity, morphism
Layer 2 — Knowledge (4 max):    knowledge-graph, derivation, epistemic, sparql
Layer 3 — Resolution (4 max):   resolver, observable, state, bus
Layer 4 — Verification (4 max): verify, agent-tools, canonical-compliance, uns
Layer 5 — Features (12 max):    atlas, audio, oracle, quantum, ...
```

If any layer exceeds its budget, the gate flags it. Closer to the kernel = stricter limits.

### Check 3 — Blueprint Coverage
For each active module, check whether it exports a manifest or blueprint declaration (a `@context` + `@type` bearing object). Modules without a canonical self-declaration are flagged as "ungrounded" — they exist but have no identity in the knowledge graph.

### Scoring
- Ghost directories: -5 per ghost
- Layer budget violations: -8 per excess module
- Missing blueprint declarations: -3 per ungrounded module
- Starting score: 100

## Files

| File | Action | Purpose |
|---|---|---|
| `src/modules/canonical-compliance/gates/blueprint-conformance-gate.ts` | Create | The three-check gate described above |
| `src/modules/canonical-compliance/gates/index.ts` | Update | Register the new gate |

## Activation Strategy

This gate runs synchronously on every Health Panel render (same as the Pruning and Pattern Sentinel gates). It requires no IndexedDB or async — it's pure static analysis of the module registry.

To maximize activation frequency:
1. **Health Panel** — runs on every dashboard view (already wired)
2. **Boot sequence** — the sovereign boot can include a blueprint conformance check as a kernel verification step, failing loudly if ghost modules appear
3. **Oracle hook** — after any conversation that mentions "add module" or "create component," the reflection gate's pattern detector can flag it for blueprint review

## Immediate Cleanup Opportunity

As part of implementation, the gate will immediately surface the ~10 ghost directories and ~14 modules missing blueprint declarations, giving you a concrete reduction roadmap. The pyramid budgets make the "how lean can we go" question quantitative rather than subjective.

