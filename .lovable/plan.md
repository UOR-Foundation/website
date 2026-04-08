

## Plan: Recompile UOR Foundation v0.2.0 WASM + Update TypeScript Projections + OS Taxonomy

### Current State

The crate has been updated to **v0.2.0** (confirmed on docs.rs). Our codebase is pinned to a pre-v0.1.5 WASM binary with only 21 exported functions (ring ops + classify/factorize). The TypeScript type projections cover 14 namespaces. The v0.2.0 crate now has **33 namespaces** with 442+ traits.

### Gap: What v0.2.0 adds that we are missing

**Kernel (was 3, now 13 sub-modules):**
- `carry` — Carry chain algebra, carry profiles, encoding quality
- `cascade` — Sequential ψ-map composition (ψ₉ ∘ … ∘ ψ₁)
- `convergence` — Hopf tower: R, C, H, O (normed division algebras)
- `division` — Cayley-Dickson construction, multiplication tables
- `effect` — Typed endomorphisms, pinning/unbinding effects
- `failure` — Partial computations, typed failure propagation, recovery
- `linear` — Linear discipline on fiber consumption, lease allocation
- `monoidal` — Sequential composition via monoidal product A ⊗ B
- `operad` — Structural type nesting via operad composition
- `parallel` — Independent computations over disjoint fiber budgets
- `predicate` — Boolean-valued functions, dispatch tables, match expressions
- `recursion` — Well-founded descent measures, bounded recursion
- `reduction` — Full cascade reduction pipeline (epochs, leases, phase gates)
- `region` — Spatial locality, address regions, working sets
- `stream` — Coinductive sequences of cascade epochs

**Bridge (was 8, now 13 sub-modules):**
- `boundary` — IO boundary, source/sink, ingest/emit effects
- `cohomology` — Cochain complexes, sheaf cohomology, obstruction detection
- `conformance_` — SHACL-equivalent constraint shapes for validation
- `homology` — Simplicial complexes, chain complexes, boundary operators
- `interaction` — Multi-entity interaction, commutator/associator states

**User (same 3, but massively expanded):**
- `morphism` — Added: GroundingMap, ProjectionMap, Witness, SymbolSequence, TopologicalDelta, etc.
- `state` — Added: Session, SessionBoundary, SharedContext, ContextLease, etc.
- `type_` — Added: ModuliSpace, LiftChain, DeformationFamily, GaloisConnection, etc.

**Enforcement (entirely new top-level module):**
- 32 structs: Datum, Validated, Derivation, FiberBudget, all 9 builders, TermArena, etc.
- 1 enum: Term (AST nodes)
- 2 traits: Grounding, GroundedValue
- 8 const fn ring evaluators (Q0-Q7, binary + unary)

**Enums (was 5, now 21+):**
- Added: WittLevel (struct), AchievabilityStatus, ComplexityClass, ExecutionPolicyKind, GroundingPhase, MeasurementUnit, PhaseBoundaryType, ProofModality, ProofStrategy, QuantifierKind, RewriteRule, SessionBoundaryType, SiteState, TriadProjection, ValidityScopeKind, VarianceAnnotation, VerificationDomain, ViolationKind

### Implementation Steps

**Step 1 — Recompile WASM from uor-foundation v0.2.0**

Create a Rust WASM crate at `/tmp/uor-wasm-crate/` that depends on `uor-foundation = "0.2.0"`. The crate will expose `#[wasm_bindgen]` functions for:
- All existing 21 functions (ring ops, classify, factorize, etc.)
- `crate_version()` returning `"0.2.0"`
- `list_namespaces()` returning all 33 namespace names
- `list_enums()` returning all enum variant names as JSON
- `list_enforcement_structs()` returning enforcement type inventory
- `const_ring_eval_q0(op, a, b)` / `const_ring_eval_unary_q0(op, a)` — expose the enforcement const fns to JS

Compile with `nix shell nixpkgs#rustc nixpkgs#cargo nixpkgs#wasm-pack nixpkgs#lld` using `wasm-pack build --target web --release`. Copy `.wasm` to `public/wasm/`, glue JS to `src/lib/wasm/uor-foundation/`.

**Step 2 — Update TypeScript type projections to match v0.2.0**

Create new files for all missing modules:

```text
src/types/uor-foundation/
├── kernel/
│   ├── carry.ts          (5 traits)
│   ├── cascade.ts        (existing concept, formalize)
│   ├── convergence.ts    (5 traits)
│   ├── division.ts       (5 traits)
│   ├── effect.ts         (9 traits)
│   ├── failure.ts        (11 traits)
│   ├── linear.ts         (6 traits)
│   ├── monoidal.ts       (3 traits)
│   ├── operad.ts         (2 traits)
│   ├── parallel.ts       (5 traits)
│   ├── predicate.ts      (9 traits)
│   ├── recursion.ts      (7 traits)
│   ├── reduction.ts      (38 traits — largest module)
│   ├── region.ts         (5 traits)
│   └── stream.ts         (6 traits)
├── bridge/
│   ├── boundary.ts       (8 traits)
│   ├── cohomology.ts     (10 traits)
│   ├── conformance.ts    (22 traits)
│   ├── homology.ts       (14 traits)
│   └── interaction.ts    (9 traits)
├── enforcement/
│   ├── index.ts          (re-exports)
│   ├── witnesses.ts      (Datum, Validated, Derivation, FiberBudget, FreeRank)
│   ├── builders.ts       (10 builder structs + declarations)
│   ├── term.ts           (Term enum, TermArena, TermList, Binding, Assertion)
│   └── boundary.ts       (SourceDeclaration, SinkDeclaration, BoundarySession, GroundedCoord, GroundedTuple)
├── enums.ts              (update: add 16 new enums + WittLevel struct)
├── index.ts              (update: re-export all new modules)
└── primitives.ts         (unchanged)
```

Also expand existing files:
- `user/morphism.ts` — add ~12 new traits (GroundingMap, ProjectionMap, Witness, etc.)
- `user/state.ts` — add ~7 new traits (Session, SessionBoundary, SharedContext, etc.)
- `user/type.ts` — add ~18 new traits (ModuliSpace, LiftChain, etc.)
- `bridge/cert.ts` — add ~8 new traits (GeodesicCertificate, LiftChainCertificate, etc.)
- `bridge/resolver.ts` — add ~14 new traits (HomotopyResolver, SessionResolver, etc.)
- `bridge/observable.ts` — add ~30+ new traits (TopologicalObservable, SpectralGap, etc.)
- `bridge/proof.ts` — add ~10 new traits (InductiveProof, TacticApplication, etc.)
- `bridge/partition.ts` — add ~6 new traits (SiteBinding, PartitionProduct, etc.)
- `bridge/trace.ts` — add ~5 new traits (GeodesicTrace, MeasurementEvent, etc.)
- `kernel/op.ts` — add ~8 new traits (DispatchOperation, SessionCompositionOperation, etc.)
- `kernel/schema.ts` — add ~8 new traits (TermExpression, VariableBinding, W16Ring, etc.)

**Step 3 — Update WASM bridge with new exports**

Update `src/lib/wasm/uor-bridge.ts` to wrap new WASM exports with TypeScript fallbacks. Update `uor_wasm_shim.d.ts` with new function signatures.

**Step 4 — Update grade engine for v0.2.0**

Update `src/modules/epistemic/grade-engine.ts` version references and ensure enforcement module's `const_ring_eval` functions are callable via the WASM bridge for Grade A derivations at all quantum levels (Q0, Q1, Q3, Q7).

**Step 5 — Fix window containment + declare OS taxonomy**

This was already approved in the previous plan. Execute it after the WASM recompilation:
- CSS containment on `.desktop-window-chrome`
- LibraryPage window context detection
- OS taxonomy file (`os-taxonomy.ts`) mapping apps to UOR v0.2.0 modules
- Update `DesktopApp` interface with `category` field
- Spotlight grouping by category

### OS Component ↔ UOR v0.2.0 Module Mapping

```text
OS CATEGORY     UOR v0.2.0 MODULES                 OS APPS
─────────────────────────────────────────────────────────────
RESOLVE         query, resolver, reduction           Search, Oracle, Library, Browser
IDENTITY        proof, cert, conformance_            Vault, Profiles, Ceremony
ENFORCE         enforcement, boundary, predicate     Settings, Permissions
COMPUTE         cascade, monoidal, parallel, stream  Terminal, Activity Monitor
OBSERVE         observable, trace, derivation         System Monitor, Logs
TRANSFORM       morphism, effect, carry, convergence  Files, Gallery, Music
EXCHANGE        interaction, boundary, state          Messenger, Mail
STRUCTURE       homology, cohomology, operad, region  (internal framework)
FAILURE         failure, recursion, linear             Error handling (internal)
```

### Technical Details

**WASM compilation command:**
```bash
cd /tmp/uor-wasm-crate && \
nix shell nixpkgs#rustc nixpkgs#cargo nixpkgs#wasm-pack nixpkgs#lld -c \
  wasm-pack build --target web --release
```

**Cargo.toml for the WASM crate:**
```toml
[package]
name = "uor-wasm"
version = "0.2.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
uor-foundation = "0.2.0"
wasm-bindgen = "0.2"
```

**New WASM exports to add beyond existing 21:**
- `list_enums() -> String` (JSON array of all enum names)
- `list_kernel_modules() -> String` (JSON)
- `list_bridge_modules() -> String` (JSON)
- `const_ring_eval_q0(op: u8, a: u8, b: u8) -> u8`
- `const_ring_eval_unary_q0(op: u8, a: u8) -> u8`
- `witt_level_new(bits: u32) -> u32` (WittLevel constructor)

**Scope:** ~35 new/updated TypeScript files, 1 recompiled WASM binary, updated WASM bridge and shim types.

