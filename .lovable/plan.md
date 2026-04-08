

## Plan: Expand v0.2.0 Type Projections + OS Taxonomy + Containment Fix

### What's Already Done
All 25 new files (15 kernel, 5 bridge, 4 enforcement, 1 enum update) and barrel exports are in place. The WASM bridge and shim have been updated.

### What Remains (5 steps)

**Step 1 — Expand existing User types with v0.2.0 traits**

- `user/type.ts`: Add ~18 types — `ModuliSpace`, `LiftChain`, `DeformationFamily`, `GaloisConnection`, `TypeScheme`, `TypeVariable`, `RecursiveType`, `RefinementType`, `DependentType`, `HigherKindedType`, `UniverseLevel`, `TypeEquality`, `Subtyping`, `TypeInference`, `UnificationResult`, `TypeContext`, `TypeJudgment`, `TypeDerivation`
- `user/morphism.ts`: Add ~12 types — `GroundingMap`, `ProjectionMap`, `Witness`, `SymbolSequence`, `TopologicalDelta`, `FunctorMorphism`, `NaturalTransformation`, `AdjunctionPair`, `MonadMorphism`, `ComonadMorphism`, `DiagramMorphism`, `LimitCone`
- `user/state.ts`: Add ~7 types — `Session`, `SessionBoundary`, `SharedContext`, `ContextLease`, `ContextMigration`, `StateCheckpoint`, `StateSnapshot`
- Update `user/index.ts` and main `index.ts` to re-export all new types

**Step 2 — Expand existing Bridge types with v0.2.0 traits**

- `bridge/cert.ts`: Add ~8 types — `GeodesicCertificate`, `LiftChainCertificate`, `DeformationCertificate`, `CompositionCertificate`, `EmbeddingCertificate`, `ActionCertificate`, `SessionCertificate`, `CertificateChain`
- `bridge/resolver.ts`: Add ~10 types — `HomotopyResolver`, `SessionResolver`, `GeodesicResolver`, `SpectralResolver`, `LiftResolver`, `CascadeResolver`, `EnforcementResolver`, `ReductionResolver`, `CompositeResolver`, `ResolutionPlan`
- `bridge/observable.ts`: Add ~15 types — `TopologicalObservable`, `SpectralGap`, `SpectralObservable`, `EntropyObservable`, `ComplexityObservable`, `SessionObservable`, `BoundaryObservable`, `FiberObservable`, `ConvergenceObservable`, `ReductionObservable`, `InteractionObservable`, `HomologyObservable`, `CohomologyObservable`, `GroundingObservable`, `AggregateObservable`
- `bridge/proof.ts`: Add ~6 types — `InductiveProof`, `TacticApplication`, `ProofTerm`, `ProofContext`, `ProofObligation`, `ProofScript`
- `bridge/partition.ts`: Add ~4 types — `SiteBinding`, `PartitionProduct`, `PartitionRefinement`, `FiberProjection`
- `bridge/trace.ts`: Add ~4 types — `GeodesicTrace`, `MeasurementEvent`, `TraceAnnotation`, `TraceSegment`
- Update barrel exports

**Step 3 — Expand Kernel op.ts and schema.ts**

- `kernel/op.ts`: Add ~6 types — `DispatchOperation`, `SessionCompositionOperation`, `LiftOperation`, `ReductionOperation`, `ParallelOperation`, `OperationChain`
- `kernel/schema.ts`: Add ~6 types — `TermExpression`, `VariableBinding`, `W16Ring`, `W32Ring`, `RingHomomorphism`, `RingExtension`
- Update barrel exports

**Step 4 — OS Taxonomy + Desktop Integration**

- Create `src/modules/desktop/lib/os-taxonomy.ts` mapping 9 OS categories to UOR v0.2.0 modules:
  - RESOLVE → query, resolver, reduction
  - IDENTITY → proof, cert, conformance
  - ENFORCE → enforcement, boundary, predicate
  - COMPUTE → cascade, monoidal, parallel, stream
  - OBSERVE → observable, trace, derivation
  - TRANSFORM → morphism, effect, carry, convergence
  - EXCHANGE → interaction, boundary, state
  - STRUCTURE → homology, cohomology, operad, region
  - FAILURE → failure, recursion, linear
- Add `category` field to `DesktopApp` interface in `desktop-apps.ts`
- Update `SpotlightSearch.tsx` to group apps by category

**Step 5 — CSS Containment + Grade Engine**

- Add `contain: layout paint; isolation: isolate;` to `.desktop-window-chrome` in `desktop.css`
- Update `grade-engine.ts` to reference v0.2.0 and use `constRingEvalQ0` from the WASM bridge for Grade A ring verification

### Files Modified/Created

~15 files modified, 1 new file created (`os-taxonomy.ts`). All type additions are pure TypeScript interfaces with JSDoc anchored to UOR v0.2.0 Rust crate namespaces.

