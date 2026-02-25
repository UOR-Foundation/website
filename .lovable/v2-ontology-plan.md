# UOR Framework v2.0.0 → Hologram TypeScript Implementation Plan

## Executive Summary

The UOR Framework v2.0.0 formalizes 14 namespaces, 98 OWL classes, 166 properties, and 18 named individuals into a machine-generated Rust trait crate (`uor-foundation`). This plan translates that ontology 1:1 into TypeScript interfaces, preserving every trait name, method signature, and namespace path. The result replaces all hand-maintained types in `src/types/uor.ts` and `src/modules/uor-sdk/types.ts` with auto-generated, ontology-compliant definitions.

---

## 1. Complete v2.0.0 Ontology Inventory

### 1.1 Tri-Space Architecture (14 Namespaces)

| Space | Module | Namespace IRI | Classes | Purpose |
|-------|--------|--------------|---------|---------|
| **Kernel** | `address` | `u/` | Address, Glyph | Content-addressable Braille identifiers |
| **Kernel** | `schema` | `schema/` | Datum, Term, Triad, Literal, Application, Ring | Ring elements, term language, ring container |
| **Kernel** | `op` | `op/` | Operation, UnaryOp, BinaryOp, Involution, Identity, Group, DihedralGroup | 10 primitive operations, dihedral symmetry |
| **Bridge** | `query` | `query/` | Query, CoordinateQuery, MetricQuery, RepresentationQuery | Information extraction |
| **Bridge** | `resolver` | `resolver/` | Resolver, DihedralFactorizationResolver, IterativeRefinementResolver, ResolutionState, RefinementSuggestion | Type → Partition resolution |
| **Bridge** | `partition` | `partition/` | Partition, Component, IrreducibleSet, ReducibleSet, UnitSet, ExteriorSet, FiberCoordinate, FiberBudget, FiberPinning | Irreducibility decomposition + fiber tracking |
| **Bridge** | `observable` | `observable/` | Observable, StratumObservable, MetricObservable, PathObservable, CascadeObservable, CatastropheObservable, RingMetric, HammingMetric, CurvatureObservable, HolonomyObservable, CascadeLength, CatastropheThreshold, DihedralElement | 13 observable types |
| **Bridge** | `proof` | `proof/` | Proof, CoherenceProof, CriticalIdentityProof, WitnessData | Kernel-produced verification |
| **Bridge** | `derivation` | `derivation/` | Derivation, DerivationStep, RewriteStep, RefinementStep, TermMetrics | Term rewriting witnesses |
| **Bridge** | `trace` | `trace/` | ComputationTrace, ComputationStep | Execution traces |
| **Bridge** | `cert` | `cert/` | Certificate, TransformCertificate, IsometryCertificate, InvolutionCertificate | Kernel-produced attestations |
| **User** | `type` | `type/` | TypeDefinition, PrimitiveType, ProductType, SumType, ConstrainedType, Constraint, ResidueConstraint, CarryConstraint, DepthConstraint, CompositeConstraint | Runtime type declarations |
| **User** | `morphism` | `morphism/` | Transform, Isometry, Embedding, Action, Composition, Identity, CompositionLaw | Maps between UOR objects |
| **User** | `state` | `state/` | Context, Binding, Frame, Transition | Parameterized address spaces |

### 1.2 Enumerations (5 Total)

| Enum | Variants | Source |
|------|----------|--------|
| `Space` | Kernel, User, Bridge | Tri-space classification |
| `PrimitiveOp` | Neg, Bnot, Succ, Pred, Add, Sub, Mul, Xor, And, Or | 10 operations |
| `MetricAxis` | Vertical, Horizontal, Diagonal | Tri-metric geometry |
| `FiberState` | Pinned, Free | Fiber resolution tracking |
| `GeometricCharacter` | RingReflection, HypercubeReflection, Rotation, RotationInverse, Translation, Scaling, HypercubeTranslation, HypercubeProjection, HypercubeJoin | 9 geometric roles |

### 1.3 Named Individuals (Constants)

| Individual | Module | Key Properties |
|-----------|--------|---------------|
| `pi1` | schema | value = 1 (ring generator) |
| `zero` | schema | value = 0 (additive identity) |
| `critical_identity` | op | forAll = "x ∈ R_n", lhs = succ, rhs = [neg, bnot] |
| `d2n` | op | generatedBy = [neg, bnot], presentation = "⟨r, s | r^{2^n} = s² = e, srs = r⁻¹⟩" |
| `critical_composition` | morphism | lawComponents = [neg, bnot], lawResult = succ |

---

## 2. Delta Analysis: v2.0.0 vs Current Implementation

### 2.1 What's NEW in v2.0.0 (Not in Current Codebase)

| Category | v2.0.0 Addition | Impact |
|----------|----------------|--------|
| **Fiber Budget System** | `FiberBudget`, `FiberCoordinate`, `FiberPinning`, `FiberState` enum | Enables bit-level type resolution tracking — currently absent |
| **Constraint Algebra** | `Constraint`, `ResidueConstraint`, `CarryConstraint`, `DepthConstraint`, `CompositeConstraint` | Formalized constraint composition with `MetricAxis` + `crossingCost` |
| **Geometric Characters** | 9-variant `GeometricCharacter` enum | Expands our 5-op set (neg/bnot/xor/and/or) to 10 ops with typed geometry |
| **MetricAxis** | Vertical/Horizontal/Diagonal tri-metric | Replaces ad-hoc ring/hamming metric distinction |
| **Resolver State Machine** | `ResolutionState`, `RefinementSuggestion`, `IterativeRefinementResolver` | Formal resolution lifecycle (currently implicit) |
| **Observable Hierarchy** | 13 typed observables (Stratum, Metric, Path, Cascade, Catastrophe, Dihedral, Holonomy, Curvature) | Replaces our flat `Observable` type with rich taxonomy |
| **Derivation Steps** | `RewriteStep`, `RefinementStep`, `TermMetrics` | Formal term rewriting witnesses (currently just string IDs) |
| **Computation Traces** | `ComputationTrace`, `ComputationStep` with monodromy + certification | Replaces our informal trace model |
| **Certificate Hierarchy** | `TransformCertificate`, `IsometryCertificate`, `InvolutionCertificate` | Typed certificates (currently just one generic cert) |
| **Morphism Hierarchy** | `Isometry`, `Embedding`, `Action`, `Composition`, `CompositionLaw`, `Identity` | Formal morphism category (currently partially implemented) |
| **Ring Schema** | `Literal`, `Application`, `Ring`, `Triad` as separate traits | Formalized term language (currently merged into Datum) |
| **Disjointness Axioms** | 44 owl:disjointWith declarations | Formal type safety guarantees |

### 2.2 What's RENAMED/RESTRUCTURED

| Current Name | v2.0.0 Canonical Name | Change Type |
|-------------|----------------------|-------------|
| `OperationName` | `PrimitiveOp` (enum) | Rename + expand to 10 variants |
| `ExtendedOperationName` | Removed — all 10 are `PrimitiveOp` | Merge |
| `PartitionComponent` (string union) | 4 separate traits: `IrreducibleSet`, `ReducibleSet`, `UnitSet`, `ExteriorSet` | Decompose |
| `PartitionClassification` | `Partition` trait with typed component accessors | Restructure |
| `EpistemicGrade` | Not in v2.0.0 — remains our extension | No change needed |
| `ObserverZone` | Not in v2.0.0 — remains our extension | No change needed |
| `UorAddress` | `Address` trait in `kernel::address` | Rename + formalize |
| `Derivation` (our type) | `Derivation` trait in `bridge::derivation` | Align methods |
| `CanonicalReceipt` | `Certificate` trait in `bridge::cert` | Restructure |
| `ModuleHealth` | Not in v2.0.0 — remains our extension | No change needed |

### 2.3 What We KEEP (Our Extensions Beyond Ontology)

These types are Hologram-specific and NOT in the v2.0.0 ontology. They layer on top:

- `EpistemicGrade` (A/B/C/D grading system)
- `ObserverZone` (COHERENCE/DRIFT/COLLAPSE)
- `ObserverProfile`, `ObservationResult`, `RemediationRecord`
- `HologramProjection`, `HologramSpec`, `Fidelity`
- `HolographicLens`, `LensElement`, `LensWire`
- `ExecutableBlueprint`, `HologramSession`
- `TspEnvelope`, `FppPersona`, `PolyTree`
- All Hologram UI types (frame layers, etc.)

---

## 3. TypeScript Generation Strategy

### 3.1 Primitives Type Family

The Rust `Primitives` trait maps to a TypeScript generic parameter:

```typescript
// src/types/uor-foundation/primitives.ts
// The TypeScript equivalent of Rust's Primitives trait
export interface Primitives {
  String: string;
  Integer: number;
  NonNegativeInteger: number;
  PositiveInteger: number;
  Decimal: number;
  Boolean: boolean;
}

// Default concrete implementation (equivalent to PRISM's impl)
export type P = Primitives;
```

### 3.2 Naming Convention Mapping

| Rust Pattern | TypeScript Pattern | Example |
|-------------|-------------------|---------|
| `pub trait Foo<P: Primitives>` | `export interface Foo` | `Datum` → `Datum` |
| `fn bar(&self) -> P::Integer` | `bar(): number` | `value(): number` |
| `fn bar(&self) -> &P::String` | `bar(): string` | `glyph(): string` |
| `fn bar(&self) -> P::Boolean` | `bar(): boolean` | `verified(): boolean` |
| `fn bar(&self) -> &[Self::T]` | `bar(): T[]` | `steps(): ComputationStep[]` |
| `fn bar(&self) -> &Self::T` | `bar(): T` | `input(): Datum` |
| `type T: Foo<P>` | (elided — TypeScript uses structural typing) | N/A |
| `pub enum E { A, B }` | `export type E = "A" \| "B"` | `Space` |
| `pub mod ind { pub const X: &str = "v" }` | `export const IND = { X: "v" } as const` | `critical_identity` |
| `: Trait<P>` (supertrait) | `extends Trait` | `Isometry extends Transform` |

### 3.3 File Structure

```
src/types/uor-foundation/
├── index.ts              # Barrel export (replaces src/types/uor.ts)
├── primitives.ts         # Primitives type family
├── enums.ts             # 5 enums
├── kernel/
│   ├── index.ts
│   ├── address.ts       # Address, Glyph
│   ├── schema.ts        # Datum, Term, Triad, Literal, Application, Ring + pi1, zero
│   └── op.ts            # Operation, UnaryOp, BinaryOp, Involution, Identity, Group,
│                        #   DihedralGroup + critical_identity, d2n
├── bridge/
│   ├── index.ts
│   ├── query.ts         # Query, CoordinateQuery, MetricQuery, RepresentationQuery
│   ├── resolver.ts      # Resolver, DihedralFactorizationResolver, etc.
│   ├── partition.ts     # Partition, Component, Fiber*, Sets
│   ├── observable.ts    # 13 observable types
│   ├── proof.ts         # Proof, CoherenceProof, CriticalIdentityProof, WitnessData
│   ├── derivation.ts    # Derivation, DerivationStep, RewriteStep, etc.
│   ├── trace.ts         # ComputationTrace, ComputationStep
│   └── cert.ts          # Certificate hierarchy
└── user/
    ├── index.ts
    ├── type.ts          # TypeDefinition, PrimitiveType, ProductType, SumType,
    │                    #   ConstrainedType, 4 Constraint subclasses
    ├── morphism.ts      # Transform, Isometry, Embedding, Action, Composition,
    │                    #   Identity, CompositionLaw + critical_composition
    └── state.ts         # Context, Binding, Frame, Transition
```

---

## 4. Phased Implementation Plan

### Phase 1: Foundation Types (Immediate — This Session)

**Goal:** Generate all 98 interfaces + 5 enums + constants, preserving backward compatibility.

| Step | Action | Files |
|------|--------|-------|
| 1.1 | Create `src/types/uor-foundation/enums.ts` with all 5 enums | 1 file |
| 1.2 | Create `src/types/uor-foundation/primitives.ts` | 1 file |
| 1.3 | Create kernel interfaces (Address, Glyph, Datum, Term, Triad, Literal, Application, Ring, Operation, UnaryOp, BinaryOp, Involution, Identity, Group, DihedralGroup) | 3 files |
| 1.4 | Create bridge interfaces (all 37 classes across 7 modules) | 7 files |
| 1.5 | Create user interfaces (all 17 classes across 3 modules) | 3 files |
| 1.6 | Create barrel exports + backward-compat aliases in `src/types/uor.ts` | 2 files |
| 1.7 | Update `src/modules/uor-sdk/types.ts` to re-export from foundation | 1 file |

**Estimated interfaces:** 98 interfaces, 5 enums, ~5 named-individual const objects

### Phase 2: Align Existing Implementations

**Goal:** Update all existing modules to implement v2.0.0 interfaces.

| Step | Action | Impact |
|------|--------|--------|
| 2.1 | Update `src/modules/uns/core/ring.ts` — add `GeometricCharacter` to each op | Extends ring with 9 geometric roles |
| 2.2 | Update `src/modules/observable/` — align to 13-type observable hierarchy | Replaces flat Observable with typed tree |
| 2.3 | Update `src/modules/state/` — align Context/Binding/Frame/Transition | Adds formal Transition.trace linkage |
| 2.4 | Update `src/modules/state/type-system.ts` — add Constraint subclasses | Adds fiber budget tracking |
| 2.5 | Update `src/modules/uns/core/hologram/` — align morphism types | Formal Isometry/Embedding/Action hierarchy |
| 2.6 | Update certificate module — align to v2 Certificate hierarchy | Typed certificates |

### Phase 3: New Feature Modules (Fiber Budget + Constraint Algebra)

**Goal:** Implement the two major new subsystems from v2.0.0.

| Step | Action | Hologram Synergy |
|------|--------|-----------------|
| 3.1 | Implement `FiberBudget` engine — tracks bit-by-bit type resolution | **Visual progress bars** for resolution in Hologram console |
| 3.2 | Implement `Constraint` algebra — compose residue/carry/depth constraints | **Constraint editor** widget in Hologram UI |
| 3.3 | Implement `ResolutionState` machine with `RefinementSuggestion` | **Interactive type resolver** — suggests next refinement |
| 3.4 | Implement `MetricAxis` classification on all observables | **Tri-axis visualization** on Hologram canvas |

### Phase 4: Hologram OS Integration

**Goal:** Wire v2.0.0 types into the Hologram virtual OS.

| Feature | v2.0.0 Anchor | Implementation |
|---------|--------------|----------------|
| **Process Model** | `ComputationTrace` + `ComputationStep` | Each "process" is a live trace with step-by-step execution |
| **File System** | `Context` + `Binding` | Contexts = directories, Bindings = files, Frames = views |
| **Type Inspector** | `TypeDefinition` → `Partition` → `FiberBudget` | Interactive drill-down from type → partition → individual fibers |
| **Transform Pipeline** | `Transform` → `Isometry`/`Embedding`/`Composition` | Visual dataflow editor for morphism composition |
| **Certificate Viewer** | `Certificate` hierarchy | Live verification status panel with typed certificates |
| **Observable Dashboard** | 13 Observable subtypes | Real-time metrics panel organized by MetricAxis |
| **Constraint Composer** | `Constraint` algebra | Drag-and-drop constraint builder with crossing-cost display |
| **Resolution Debugger** | `Resolver` + `ResolutionState` | Step-through debugger for type resolution showing fiber pinning |

---

## 5. Hologram Synergies & Efficiency Gains

### 5.1 Layer Mapping (Tri-Space → HologramFrame)

| v2.0.0 Space | Hologram Layer | Keyboard Shortcut | Role |
|-------------|---------------|-------------------|------|
| Kernel | Layer 0 (Canvas) | Cmd+1 | Immutable ring substrate — never modified at runtime |
| Bridge | Layer 1 (Chrome) | Cmd+2 | Kernel-computed observables, partitions, proofs |
| User | Layer 2 (Content) | Cmd+3 | Runtime type declarations, morphisms, state |
| — | Layer 3 (Overlay) | Cmd+4 | Hologram-specific (sessions, lenses, blueprints) |

### 5.2 MetricAxis → Spatial Rendering

The three metric axes map directly to Hologram's 3D parallax system:

| MetricAxis | Spatial Dimension | Visual Effect |
|-----------|------------------|---------------|
| Vertical (ring/additive) | Y-axis depth | Parallax depth shift |
| Horizontal (Hamming/bitwise) | X-axis spread | Lateral displacement |
| Diagonal (curvature) | Z-axis tilt | 3D rotation/perspective |

### 5.3 Fiber Budget → Progress System

The FiberBudget gives Hologram a mathematically grounded progress indicator:
- `totalFibers` = total bits in the quantum level
- `pinnedCount` = resolved bits
- `isClosed` = fully resolved (task complete)
- Each `FiberPinning` records which constraint pinned which bit

This replaces arbitrary percentage progress bars with algebraically meaningful resolution tracking.

### 5.4 Constraint Algebra → Hologram Commands

Each constraint type maps to a Hologram OS "command":
- `ResidueConstraint` → `mod(m, r)` — filter by divisibility
- `CarryConstraint` → `carry("1010")` — filter by carry pattern
- `DepthConstraint` → `depth(min, max)` — filter by factorization depth
- `CompositeConstraint` → `compose(c1, c2)` — pipeline constraints

### 5.5 Observable Hierarchy → Dashboard Panels

The 13 observable types organize naturally into 3 MetricAxis-aligned panels:
- **Vertical Panel:** StratumObservable, RingMetric
- **Horizontal Panel:** HammingMetric, CascadeLength, CascadeObservable
- **Diagonal Panel:** CurvatureObservable, HolonomyObservable, CatastropheThreshold

### 5.6 Efficiency Improvements

| Area | Before (v1) | After (v2) | Improvement |
|------|------------|------------|-------------|
| Type files | 3 hand-maintained files, ~200 lines | 1 generated tree, ~800 lines | **Single source of truth** |
| Operations | 5 primitive + 6 extended (ad-hoc) | 10 canonical PrimitiveOp | **40% fewer, 100% formal** |
| Observables | 1 flat Observable type | 13 typed subtypes | **13× richer type safety** |
| Partition | String union type | 4 disjoint set traits | **Compile-time disjointness** |
| Certificates | 1 generic certificate | 4 typed certificates | **4× more specific verification** |
| Morphisms | Partial hierarchy | Full 7-class hierarchy | **Complete categorical structure** |
| Fiber tracking | None | FiberBudget + FiberCoordinate | **Bit-level resolution tracking** |
| Constraints | Ad-hoc string predicates | 4-class constraint algebra | **Composable, typed constraints** |

---

## 6. Backward Compatibility Strategy

### 6.1 Type Aliases

`src/types/uor.ts` will be preserved as a backward-compat shim:

```typescript
// src/types/uor.ts — BACKWARD COMPATIBILITY SHIM
// All types now re-exported from the v2 foundation

export type { Datum, Triad, Address as UorAddress } from "./uor-foundation";
export type { PrimitiveOp as OperationName } from "./uor-foundation";
export type { PrimitiveOp as ExtendedOperationName } from "./uor-foundation";
// ... etc
```

### 6.2 SDK Types

`src/modules/uor-sdk/types.ts` will re-export v2 foundation types where they overlap and keep SDK-specific types (API response shapes) alongside.

### 6.3 No Breaking Changes

Every existing import path continues to work. The v2 foundation is additive — new files under `src/types/uor-foundation/`, with existing files shimmed.

---

## 7. Quality Gates

| Gate | Criterion | Tool |
|------|----------|------|
| **G1: Byte-Level Fidelity** | Every enum variant, interface name, and method signature matches the generated Rust traits character-for-character (modulo Rust→TS syntax mapping) | Manual diff against `foundation/src/` |
| **G2: Namespace Preservation** | File paths mirror `kernel/`, `bridge/`, `user/` exactly | Directory structure audit |
| **G3: Disjointness** | All 44 `disjointWith` declarations documented as JSDoc `@disjoint` tags | Grep for `@disjoint` |
| **G4: Backward Compat** | All existing imports in `src/modules/` continue to compile | TypeScript build check |
| **G5: Coherence Gate** | Existing coherence-gate.test.ts passes with v2 types | `vitest run` |

---

## 8. Implementation Order (Recommended)

1. **Phase 1.1–1.5** — Generate all foundation types (can be done in one session)
2. **Phase 1.6–1.7** — Wire backward compat aliases
3. **Phase 2.1** — Align ring.ts to 10-op PrimitiveOp (smallest change, biggest payoff)
4. **Phase 3.1** — FiberBudget engine (new visual capability for Hologram)
5. **Phase 3.4** — MetricAxis classification (unlocks tri-axis dashboard)
6. **Phase 4** — Hologram OS features (process model, file system, etc.)

---

## 9. Appendix: Complete Interface Count by Module

| Module | Interfaces | Enums | Constants | Total Exports |
|--------|-----------|-------|-----------|--------------|
| kernel/address | 2 | 0 | 0 | 2 |
| kernel/schema | 6 | 0 | 2 | 8 |
| kernel/op | 7 | 0 | 2 | 9 |
| bridge/query | 4 | 0 | 0 | 4 |
| bridge/resolver | 5 | 0 | 0 | 5 |
| bridge/partition | 9 | 0 | 0 | 9 |
| bridge/observable | 13 | 0 | 0 | 13 |
| bridge/proof | 4 | 0 | 0 | 4 |
| bridge/derivation | 5 | 0 | 0 | 5 |
| bridge/trace | 2 | 0 | 0 | 2 |
| bridge/cert | 4 | 0 | 0 | 4 |
| user/type | 10 | 0 | 0 | 10 |
| user/morphism | 7 | 0 | 1 | 8 |
| user/state | 4 | 0 | 0 | 4 |
| enums | 0 | 5 | 0 | 5 |
| **TOTAL** | **82** | **5** | **5** | **92** |

*Note: The ontology spec header says 98 classes. The difference is that some classes (like MetricAxis) are represented as enums rather than traits, and some intermediate abstract classes may be elided. The count above reflects the actual generated trait/interface surface.*

---

**Document Version:** 1.0.0
**Generated:** 2026-02-25
**Source:** https://github.com/UOR-Foundation/UOR-Framework @ commit 4ffeee5
**Ontology Version:** 2.0.0
**Target:** Hologram Virtual Operating System
