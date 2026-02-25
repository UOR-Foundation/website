# UOR v2.0.0 → Hologram: Phased Implementation Plan

## Phase 1: Foundation Types (Ontology Transcription)

### Intention
Transcribe the complete v2.0.0 ontology — 82 interfaces, 5 enums, 5 named individuals — into TypeScript with byte-level fidelity to the Rust-generated trait crate. Every trait name, method signature, and namespace path must match the canonical source. This phase produces the **single source of truth** for all downstream modules and eliminates hand-maintained type drift.

### Specification
- **Input:** `uor-foundation` Rust crate (14 namespaces, 3 spaces)
- **Output:** `src/types/uor-foundation/` — 15 files across kernel/bridge/user
- **Naming:** Rust `fn foo(&self) -> P::Integer` → TS `foo(): number`
- **Enums:** Rust `pub enum E { A, B }` → TS `export type E = "A" | "B"`
- **Supertraits:** Rust `: Trait<P>` → TS `extends Trait`
- **Constants:** Rust `pub mod ind` → TS `export const IND = { ... } as const`
- **Backward compat:** `src/types/uor.ts` becomes a shim re-exporting from foundation
- **Zero breaking changes:** Every existing import path continues to compile

### Test Suite: `src/test/v2-phase1-foundation.test.ts`
- T1.1: All 5 enums have correct variant counts
- T1.2: All kernel interfaces are structurally sound (Address, Datum, Operation, etc.)
- T1.3: All bridge interfaces exist with correct method signatures
- T1.4: All user interfaces exist with correct method signatures
- T1.5: Named individuals match canonical values (pi1.value=1, zero.value=0)
- T1.6: Backward compat — old `OperationName` type still resolves
- T1.7: Disjointness — no type overlap between kernel/bridge/user exports

---

## Phase 2: Ring & Morphism Alignment

### Intention
Align the existing ring engine (`ring.ts`, `quantum.ts`) and morphism module (`transform.ts`) to the v2.0.0 ontology by expanding the primitive operation set from 5 to 10, adding `GeometricCharacter` classification to each operation, and formalizing the morphism hierarchy (Transform → Isometry/Embedding/Action/Composition).

### Specification
- **Ring:** Add `add`, `sub`, `mul`, `xor`, `and`, `or` to ring.ts with GeometricCharacter tags
- **Morphism:** Formalize `Isometry extends Transform`, `Embedding extends Transform`, etc.
- **CompositionLaw:** Implement `critical_composition` named individual
- **DihedralGroup:** Implement `d2n` generator structure (neg, bnot generate D_{2^n})
- **No behavior change:** Existing `neg`, `bnot`, `succ`, `pred` signatures unchanged

### Test Suite: `src/test/v2-phase2-ring-morphism.test.ts`
- T2.1: All 10 PrimitiveOps are callable and return correct values at Q0
- T2.2: GeometricCharacter is assigned to each op (neg=RingReflection, bnot=HypercubeReflection, etc.)
- T2.3: Critical identity holds with expanded op set
- T2.4: Isometry extends Transform (structural check)
- T2.5: CompositionLaw: compose(neg, bnot) = succ
- T2.6: DihedralGroup: neg and bnot generate D_{256} (order 512)
- T2.7: Cross-quantum: all 10 ops work at Q0/Q1/Q2

---

## Phase 3: Observable & Partition Hierarchy

### Intention
Replace the flat `Observable` type with the v2.0.0's 13-type observable hierarchy organized by `MetricAxis`, and decompose the `PartitionComponent` string union into 4 disjoint set interfaces with `FiberBudget` tracking.

### Specification
- **Observable:** 13 subtypes: Stratum, Metric, Path, Cascade, Catastrophe, Ring, Hamming, Curvature, Holonomy, CascadeLength, CatastropheThreshold, DihedralElement
- **MetricAxis mapping:** Vertical={Stratum,Ring}, Horizontal={Hamming,Cascade,CascadeLength}, Diagonal={Curvature,Holonomy,Catastrophe,CatastropheThreshold}
- **Partition:** IrreducibleSet, ReducibleSet, UnitSet, ExteriorSet as separate interfaces
- **FiberBudget:** totalFibers, pinnedCount, isClosed, pinnings[]
- **FiberCoordinate:** bitIndex, fiberState (Pinned|Free), constraint reference

### Test Suite: `src/test/v2-phase3-observable-partition.test.ts`
- T3.1: All 13 observable subtypes instantiate correctly
- T3.2: MetricAxis assignment is correct for each subtype
- T3.3: Partition components are disjoint (no value belongs to two sets)
- T3.4: FiberBudget: 8 fibers at Q0, 16 at Q1, 32 at Q2
- T3.5: FiberPinning: pinning a fiber decreases free count
- T3.6: FiberBudget.isClosed = true when all fibers pinned
- T3.7: Observer still works with typed observables (backward compat)

---

## Phase 4: Constraint Algebra & Type System

### Intention
Implement the v2.0.0 constraint algebra (4 constraint subclasses with MetricAxis alignment and crossing costs) and extend the existing type system to support FiberBudget-aware constrained types.

### Specification
- **ResidueConstraint:** modulus m, residue r — selects x where x ≡ r (mod m)
- **CarryConstraint:** carry pattern string — selects x by addition carry behavior
- **DepthConstraint:** min/max factorization depth bounds
- **CompositeConstraint:** AND/OR composition of child constraints
- **MetricAxis on each:** crossingCost number, axis assignment
- **Integration with type-system.ts:** ConstrainedType can accept v2 Constraint objects

### Test Suite: `src/test/v2-phase4-constraints.test.ts`
- T4.1: ResidueConstraint(3, 1) selects {1, 4, 7, 10, ...} from R_8
- T4.2: CarryConstraint("1010") selects correct elements
- T4.3: DepthConstraint(2, 4) selects elements with 2–4 prime factors
- T4.4: CompositeConstraint AND: intersection of two constraints
- T4.5: CompositeConstraint OR: union of two constraints
- T4.6: crossingCost is non-negative for all constraints
- T4.7: ConstrainedType + FiberBudget: fiber pinning tracks constraint satisfaction

---

## Phase 5: Certificate Hierarchy & Resolver State Machine

### Intention
Replace the single generic certificate type with the v2.0.0 typed certificate hierarchy (Transform, Isometry, Involution) and implement the formal resolver state machine with ResolutionState lifecycle and RefinementSuggestions.

### Specification
- **TransformCertificate extends Certificate:** certifies a morphism:Transform
- **IsometryCertificate extends Certificate:** certifies a morphism:Isometry (lossless)
- **InvolutionCertificate extends Certificate:** certifies f∘f = id
- **Resolver:** DihedralFactorizationResolver, IterativeRefinementResolver
- **ResolutionState:** Unresolved → Partial → Resolved → Certified lifecycle
- **RefinementSuggestion:** constraint + expected fiber pinning count

### Test Suite: `src/test/v2-phase5-certs-resolver.test.ts`
- T5.1: TransformCertificate verifies a recorded transform
- T5.2: IsometryCertificate verifies round-trip fidelity
- T5.3: InvolutionCertificate verifies neg∘neg = id and bnot∘bnot = id
- T5.4: ResolutionState lifecycle: Unresolved → Partial → Resolved
- T5.5: RefinementSuggestion: suggests next constraint to apply
- T5.6: IterativeRefinementResolver: converges in ≤ bitWidth steps
- T5.7: All certificates pass SHACL validation

---

## Phase 6: Hologram OS Integration

### Intention
Wire all v2.0.0 types into the Hologram virtual OS, mapping ComputationTrace to processes, Context/Binding to file systems, and the observable hierarchy to real-time dashboard panels. This phase transforms Hologram from a UI shell into a mathematically grounded virtual operating system.

### Specification
- **Process Model:** Each "process" = ComputationTrace with step-by-step execution
- **File System:** Context = directory, Binding = file, Frame = view/snapshot
- **Type Inspector:** TypeDefinition → Partition → FiberBudget drill-down
- **Transform Pipeline:** Visual morphism composition (drag-and-drop)
- **Certificate Viewer:** Live verification panel with typed certificates
- **Observable Dashboard:** 3 MetricAxis-aligned panels (Vertical/Horizontal/Diagonal)
- **Constraint Composer:** Drag-and-drop constraint builder
- **Resolution Debugger:** Step-through fiber-pinning debugger

### Test Suite: `src/test/v2-phase6-hologram-os.test.ts`
- T6.1: ComputationTrace can be instantiated as a Hologram process
- T6.2: Context/Binding/Frame map to directory/file/view
- T6.3: FiberBudget renders as a progress component
- T6.4: MetricAxis panels receive correct observable subtypes
- T6.5: Constraint composition produces valid CompositeConstraint
- T6.6: Resolution debugger shows fiber pinning state at each step
- T6.7: Full round-trip: create type → resolve → certify → display

---

## Final Gate: Full System Coherence Test

After all 6 phases, run the complete gate battery:

1. **G0: Conformance Suite** — all 35 tests pass (0 failures)
2. **G1: Critical Identity** — neg(bnot(x)) = succ(x) at Q0/Q1/Q2
3. **G2: SHACL Shapes** — all v2 objects pass SHACL validation
4. **G3: Backward Compat** — existing test suites pass unchanged
5. **G4: Type Fidelity** — every v2 interface matches Rust trait 1:1
6. **G5: Fiber Closure** — FiberBudget.isClosed for all fully-resolved types
7. **G6: Certificate Chain** — all 3 certificate types verify
8. **G7: Observable Coverage** — all 13 observable types instantiated and classified
9. **G8: Constraint Algebra** — all 4 constraint types compose correctly
10. **G9: Hologram Coherence** — all 3 layers (kernel/bridge/user) render correctly

---

**Document Version:** 1.0.0
**Generated:** 2026-02-25
**Phases:** 6 + Final Gate
**Total Test Cases:** ~60 across all phases
