

# Canonical Compliance Engine — Provenance Audit from UOR Atoms to Every Module

## The Problem

The system has ~37 active modules, 200+ exported functions, and 100+ types. There is currently no automated way to verify that every upstream operation traces back to a declared UOR Foundation primitive. The `pruning-gate.ts` checks module count hygiene, but not **type-level provenance**.

## The Solution: Three Enforcement Layers

### Layer 1 — Static Provenance Registry (`src/modules/canonical-compliance/`)

A new module that declares the complete "periodic table" of UOR atoms and maps every module's exports to them.

**`atoms.ts`** — The 4 atomic categories from `uor-foundation/`:
- **10 PrimitiveOps**: Neg, Bnot, Succ, Pred, Add, Sub, Mul, Xor, And, Or
- **3 Spaces**: Kernel, Bridge, User
- **Core Types**: Address, Datum, Triad, Operation, Morphism (Transform/Isometry/Embedding/Action), Proof, Certificate, Derivation, Observable, Query, Resolver, Context, Session, Effect, Stream, Predicate, Region
- **Core Identity Pipeline**: URDNA2015 → SHA-256 → CID → IPv6 → Braille

**`provenance-map.ts`** — A machine-readable registry mapping every module export to its UOR atom lineage:
```text
module: "uns/trust/auth"
  export: "UnsAuthServer"
  traces-to: [Address, Certificate, Proof, Session]
  pipeline: "encode → derive → certify → bind-session"

module: "compose/orchestrator"  
  export: "SovereignReconciler"
  traces-to: [Context, Transition, Effect, Observable]
  pipeline: "observe → predicate-dispatch → effect-chain → reduce"
```

**`audit.ts`** — Runtime audit function that:
1. Walks the provenance map
2. Checks that every referenced UOR atom actually exists in `uor-foundation/`
3. Flags any module export with no provenance chain (an "ungrounded" export)
4. Computes a **Grounding Score** (0–100): percentage of exports with complete provenance

### Layer 2 — Knowledge Graph Projection

**`provenance-graph.ts`** — Ingests the provenance map into the knowledge graph as triples:
- Each UOR atom → KGNode (type: `uor:Atom`)
- Each module export → KGNode (type: `uor:DerivedOperation`)  
- Each provenance link → KGEdge (predicate: `uor:derivedFrom`)
- The graph becomes navigable in the existing Sovereign Graph Explorer

This means you can visually trace from any module function all the way down to the ring operations it's built on.

### Layer 3 — Export as Machine-Readable Artifact

**`export.ts`** — Generates three output formats:
1. **Markdown** — A structured audit document with tables showing every module → atom chain
2. **JSON-LD** — Machine-readable provenance graph (importable by any RDF tool)
3. **N-Quads** — For SPARQL querying of the provenance tree

### Layer 4 — UI: Compliance Dashboard

A new page/panel (accessible from the App Store under a "System" category) showing:
- The Grounding Score prominently (Algebrica-style stat block)
- A searchable table of all module exports with their provenance chains
- Visual indicators: grounded (green), partial (amber), ungrounded (red)
- One-click export to Markdown or JSON-LD

## Build Error Fix

The `container.ts` file exists with all required exports. The build error is likely a stale cache or a file that was created but not flushed. The fix is to trigger a clean rebuild — no code changes needed to the file itself.

## Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `src/modules/canonical-compliance/atoms.ts` | Create | Declare all UOR atomic primitives |
| `src/modules/canonical-compliance/provenance-map.ts` | Create | Map every module export → UOR atoms |
| `src/modules/canonical-compliance/audit.ts` | Create | Runtime grounding audit + score |
| `src/modules/canonical-compliance/provenance-graph.ts` | Create | Ingest provenance into KG as triples |
| `src/modules/canonical-compliance/export.ts` | Create | Markdown / JSON-LD / N-Quads export |
| `src/modules/canonical-compliance/index.ts` | Create | Barrel export |
| `src/modules/canonical-compliance/pages/ComplianceDashboardPage.tsx` | Create | Visual audit dashboard |
| `src/App.tsx` | Modify | Add `/compliance` route |
| `src/modules/cncf-compat/categories.ts` | Modify | Add "System Audit" category |
| `src/modules/uns/build/index.ts` | Verify | Ensure container.ts resolves (rebuild) |

## Estimated Scope

~600-700 lines across 8 files. The provenance map is the largest piece (~200 lines) since it catalogs every module. The audit logic and KG projection are compact (~100 lines each).

