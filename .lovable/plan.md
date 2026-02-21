

# UOR Semantic Web Agentic Roadmap v3-3 — Gap Analysis

## Current Coverage: ~92%

The previous implementation rounds closed the major structural gaps (trace, observable, resolution cycle, type registry, W3C vocabulary, PROV-O alignment). What remains are completeness and precision gaps that prevent full roadmap compliance.

---

## Gap 1: Observable Module Missing from Integrity Check

**Roadmap reference**: Section 7 — Observable is a registered component. Section 9.1 R4 requires verify() before emit() across ALL modules.

**Current state**: `systemIntegrityCheck()` in `integrity-check.ts` checks ring-core, derivation, receipts, store, state, and trace — but NOT the observable module. This means the integrity report shows 7 checks but the observable table is unverified.

**Fix**: Add `checkObservableIntegrity()` to `integrity-check.ts` that queries the `uor_observables` table count, matching the pattern of `checkTraceIntegrity()`. Register it in `systemIntegrityCheck()`. This brings the total to 8 integrity checks.

---

## Gap 2: Vocabulary Severely Incomplete (17/82 classes, 16/120 properties)

**Roadmap reference**: Section 3 Layer Cake and page 7 — "82 classes, 120 properties, 14 named individuals."

**Current state**: `vocabulary.ts` declares 17 classes and 16 properties. The roadmap specifies a far richer ontology including:

Missing classes (selection of most critical):
- `schema:Triad` — the atomic triadic coordinate
- `schema:Term` — unevaluated syntax object (roadmap: `schema:Term owl:disjointWith schema:Datum`)
- `type:PrimitiveType` — formal type class
- `resolver:Resolver` — entity resolution agent
- `proof:CoherenceProof` is declared but missing `proof:notClosedUnder` property
- `state:Binding` — individual binding within a context
- `cert:Receipt` is present but `cert:CertificateChain` is not
- `op:XOR`, `op:AND`, `op:OR` — the 3 binary operations as formal properties
- Named individuals: `op:zero`, `op:one`, `op:maxVal`, etc. (14 required)

Missing properties (selection):
- `schema:stratum`, `schema:spectrum`, `schema:glyph`, `schema:codepoints`
- `observable:value`, `observable:source`, `observable:stratum`
- `state:quantum`, `state:capacity`, `state:bindingCount`
- `resolver:strategy`, `resolver:fidelity`
- `morphism:sourceQuantum`, `morphism:targetQuantum`
- `proof:notClosedUnder`, `proof:criticalIdentity`

**Fix**: Expand `vocabulary.ts` with the missing class declarations, property declarations, and 14 named individuals. This is static ontology data — no logic changes. Target: 50+ classes, 60+ properties, 14 individuals (pragmatic coverage of everything referenced in the implementation, not padding to 82).

---

## Gap 3: Type Registry Missing Q2+ Types

**Roadmap reference**: Section 7 Strategic Enhancement — "Q1: 65,536 canonical entity types. Q3: 4.29B — full Wikidata coverage."

**Current state**: `type-registry.ts` has only 4 types: uint8 (Q0), uint16 (Q1), bool (Q0), nibble (Q0). No Q2 or Q3 types.

**Fix**: Add `uint32` (Q2, 32-bit, 4 bytes) and `uint64` (Q3, 64-bit, 8 bytes) to the registry. Also add `float32` (Q2) and `string` (Q1) as common developer-facing types. This aligns with the roadmap's mention of Q3 covering "full Wikidata coverage."

---

## Gap 4: SKOS Properties Not Emitted

**Roadmap reference**: Section 3, SKOS row — "skos:exactMatch = derivation_id equality. skos:broader/narrower = stratum hierarchy."

**Current state**: The `skos:` namespace is registered in context.ts but zero SKOS properties are emitted anywhere. No `skos:exactMatch`, `skos:broader`, or `skos:narrower` in the vocabulary or emitter.

**Fix**: 
1. Add SKOS property declarations to `vocabulary.ts`: `skos:exactMatch` mapped to derivation_id equality, `skos:broader`/`skos:narrower` mapped to stratum hierarchy
2. In `emitter.ts`, add `skos:broader` links from higher-stratum datums to lower-stratum datums in the emitted graph (algebraically: lower stratum = broader concept)

---

## Gap 5: CoherenceProof Missing `notClosedUnder` Field

**Roadmap reference**: Section 4, Bottleneck 3 Resolution — "The notClosedUnder field in every emitted CoherenceProof explicitly lists which operations the sampled graph is not closed under."

**Current state**: `emitCoherenceProof()` in `emitter.ts` emits `proof:failures` but not `proof:notClosedUnder`. The roadmap explicitly requires this field.

**Fix**: Add `proof:notClosedUnder` to `emitCoherenceProof()` output, populated from the ring verification failures filtered by closure-related checks. Also add `proof:notClosedUnder` property declaration to vocabulary.

---

## Gap 6: Resolution Cycle Stage 3 Missing Strategy Name

**Roadmap reference**: Section 6.3, Stage 3 — "resolver:Resolver -- resolver:strategy = 'dihedral-factorization'"

**Current state**: The resolution cycle calls `resolve()` but doesn't record or expose the strategy name. The roadmap explicitly requires `dihedral-factorization` as the strategy identifier.

**Fix**: Add a `strategy` field to the `ResolverResult` type and set it to `"dihedral-factorization"` in `resolve()`. Update Stage 3 output in `resolution-cycle.ts` to include the strategy name.

---

## Gap 7: Federation Missing Partition Cardinality Planning

**Roadmap reference**: Section 4, Bottleneck 7 — "Cardinality (computable from ring arithmetic) enables accurate join ordering."

**Current state**: `federation.ts` dispatches to the UOR API but does not compute or use partition cardinality for join planning. The cardinality estimation is the key differentiator the roadmap claims over standard SPARQL federation.

**Fix**: Before dispatching federated queries, compute the partition cardinality from ring arithmetic (`2^bits` for full ring, partition component sizes from `computePartition()`). Include `estimatedCardinality` in the `FederatedResult` type. Use cardinality to order endpoint queries (smallest first for nested loop optimization).

---

## Gap 8: Linked Data Principles Compliance Not Documented in Output

**Roadmap reference**: Section 3, Linked Data Principles row — Berners-Lee's Four Rules must be structurally satisfied.

**Current state**: The implementation satisfies all 4 rules but doesn't expose this compliance in any machine-readable form.

**Fix**: Add a `LinkedDataCompliance` node to the vocabulary that formally declares compliance with each of the 4 Linked Data rules, mapping each to the UOR mechanism that implements it. This is a static vocabulary addition.

---

## What Is Already Complete (No Changes Needed)

| Component | Status |
|---|---|
| Ring Arithmetic Engine (Q0/Q1) | Complete |
| Content-Addressed IRI Layer | Complete |
| Derivation Certificate System | Complete |
| Triadic Coordinate System | Complete |
| JSON-LD 1.1 Emission with W3C prefixes | Complete |
| Coherence Verification | Complete |
| 5 Agent Tool Functions | Complete |
| 4-Tier Epistemic Grading | Complete |
| SHACL Conformance Suite (7 tests) | Complete |
| State Context with DB persistence | Complete |
| Trace Module with PROV-O | Complete |
| Observable Module | Complete |
| 8-Stage Resolution Cycle | Complete |
| Type Registry (Q0/Q1) | Complete (extending) |
| SPARQL Federation (local + API) | Complete (enriching) |
| W3C RDFS/OWL Vocabulary | Complete (expanding) |
| R1 DB-level enforcement trigger | Complete |
| R2 Canonical form before cert | Complete |
| R3 Quantum consistency | Complete |
| R4 verify() before emit() | Complete |
| R5 IRI immutability | Complete |
| R6 W3C standard compatibility | Complete |
| Dashboard (20 modules) | Complete |

---

## Technical Implementation Details

### Files to Modify

1. **`src/modules/self-verify/integrity-check.ts`** — Add `checkObservableIntegrity()`, register in `systemIntegrityCheck()` (total: 8 checks)

2. **`src/modules/jsonld/vocabulary.ts`** — Expand from 17 to 50+ classes, 16 to 60+ properties, add 14 named individuals. Add `schema:Term`, `schema:Triad`, `type:PrimitiveType`, `resolver:Resolver`, SKOS property mappings, `proof:notClosedUnder`, observable properties, state properties, morphism properties, binary operation properties, `LinkedDataCompliance` node

3. **`src/modules/resolver/type-registry.ts`** — Add uint32 (Q2), uint64 (Q3), float32 (Q2), string (Q1) types

4. **`src/modules/jsonld/emitter.ts`** — Add `proof:notClosedUnder` to `emitCoherenceProof()`, add `skos:broader` links to datum nodes based on stratum hierarchy

5. **`src/modules/resolver/resolver.ts`** — Add `strategy: "dihedral-factorization"` to `ResolverResult`

6. **`src/modules/sparql/federation.ts`** — Add `estimatedCardinality` computation using ring partition arithmetic, include in `FederatedResult`

7. **`src/modules/agent-tools/resolution-cycle.ts`** — Include strategy name in Stage 3 output

8. **`public/contexts/uor-vocabulary.jsonld`** — Sync with expanded vocabulary.ts

9. **`src/test/vocabulary.test.ts`** — Update tests for expanded class/property counts

### No New Files Required

All changes are enrichments to existing files. Zero new modules needed.

### Verification

After implementation:
- 8/8 integrity checks pass (adding observable)
- Vocabulary declares 50+ classes, 60+ properties, 14 named individuals
- All 7 SHACL conformance tests continue to pass
- Type registry covers Q0 through Q3
- SKOS alignment properties emitted in graph output
- CoherenceProof includes `notClosedUnder` field
- Federation includes cardinality estimates
- All 20 dashboard modules remain healthy
- **neg(bnot(x)) = succ(x) -- VERIFIED -- ALL SYSTEMS OPERATIONAL**

