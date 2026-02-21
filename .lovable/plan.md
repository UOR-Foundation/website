

# UOR Semantic Web Agentic Roadmap v3 — Gap Analysis and Implementation Plan

## Summary

The roadmap defines a 4-layer Agentic Semantic Web stack with 14 namespaces, 9 bottleneck resolutions, an 8-stage agent resolution cycle, and 6 strict adherence requirements (R1-R6). After a thorough comparison against the existing 18-module implementation, the system covers approximately 85% of the roadmap. Below are the remaining gaps, ordered by roadmap priority (Critical, Medium, Strategic).

---

## Gap 1: Computation Trace Module (`trace:` namespace) — MISSING

**Roadmap requirement (Section 6.3, Stage 7; Section 7 Medium priority):**
> "Record full computation trace for audit. trace:ComputationTrace. PROV-O compatible. trace:certifiedBy."

**Current state:** The `trace:` namespace is registered in the JSON-LD context but has **zero implementation**. No `trace:ComputationTrace` type, no trace recording, no trace storage. The roadmap lists this as Medium priority (required for production deployment) and it appears in the 8-stage agent resolution cycle (Stage 7).

**Fix:**
- Create `src/modules/trace/trace.ts` — defines `ComputationTrace` type and `recordTrace()` function that captures step-by-step ring operations with inputs, outputs, and timestamps
- Create `src/modules/trace/index.ts` — barrel export
- Create `src/modules/trace/module.json` — manifest with `trace:` namespace
- Database: create `uor_traces` table (trace_id TEXT PK, derivation_id TEXT, operation TEXT, steps JSONB, certified_by TEXT, created_at TIMESTAMPTZ) with public RLS
- Wire into `uor_derive` tool: after derivation, call `recordTrace()` and persist
- Add to dashboard MODULES array and integrity check

---

## Gap 2: Observable Module (`observable:` namespace) — MISSING

**Roadmap requirement (Section 7 Strategic Enhancement; Section 6.3 Stage 5):**
> "Fact Retrieval: observable:Observable, observable:value, observable:source"
> "Scientific data streams. IoT sensor integration. Financial time-series."

**Current state:** Namespace registered in JSON-LD context but no implementation exists. The roadmap marks this as Strategic Enhancement, but it is referenced in the 8-stage resolution cycle (Stage 5: Fact Retrieval).

**Fix:**
- Create `src/modules/observable/observable.ts` — defines `Observable` type with value, source, stratum index, and timestamp; provides `recordObservable()` and `queryObservables()` functions
- Create `src/modules/observable/index.ts` and `module.json`
- Database: create `uor_observables` table (id UUID PK, observable_iri TEXT, value NUMERIC, source TEXT, stratum INTEGER, quantum INTEGER, context_id TEXT, created_at TIMESTAMPTZ) with public RLS
- Add to dashboard MODULES array

---

## Gap 3: 8-Stage Agent Resolution Cycle Not Implemented as Unified Pipeline

**Roadmap requirement (Section 6.3):**
The roadmap defines 8 sequential stages: Context Binding -> Type Extraction -> Entity Resolution -> Partition Retrieval -> Fact Retrieval -> Certificate Verification -> Trace Recording -> Transform.

**Current state:** Individual pieces exist (state context, resolver, partition, certificate, morphism) but there is **no orchestrating function** that executes all 8 stages as a single auditable pipeline. The roadmap maps this to "Test 7 end-to-end conformance."

**Fix:**
- Create `src/modules/agent-tools/resolution-cycle.ts` — implements `executeResolutionCycle(query, quantum)` that chains all 8 stages, returning a full `ResolutionResult` with trace at each stage
- Each stage delegates to existing modules (state -> resolver -> partition -> kg-store -> certificate -> trace -> morphism)
- The function produces a canonical receipt for the full cycle
- Wire into Agent Console as a new "Resolve" command alongside derive/query/verify/correlate/partition

---

## Gap 4: `type:PrimitiveType` / Type Extraction (Stage 2) — MISSING

**Roadmap requirement (Section 6.3 Stage 2):**
> "LLM extracts entity type from natural language. Maps to formal type. type:PrimitiveType, type:bitWidth."

**Current state:** The `type:` namespace is registered in JSON-LD context but there is no type registry or type extraction logic. The `type:` namespace is declared in the ontology (82 classes) but there is no mapping function from natural language to `type:PrimitiveType`.

**Fix:**
- Add a type registry in `src/modules/resolver/type-registry.ts` — maps common type names to `type:PrimitiveType` objects with `bitWidth` and ring quantum
- Used in Stage 2 of the resolution cycle above
- Minimal implementation: registry of canonical type mappings (integer -> Q0, character -> Q1, etc.)

---

## Gap 5: SPARQL Federation `uor-api` Endpoint is Stubbed

**Roadmap requirement (Section 3 Layer Cake - SPARQL 1.1, Section 4 Bottleneck 7):**
> "Federated SPARQL-queryable JSON-LD. Partition query via SERVICE keyword. Cardinality enables accurate join ordering."

**Current state:** `src/modules/sparql/federation.ts` has a `uor-api` endpoint type but returns empty results (stub). The roadmap says ring partition cardinality should enable accurate join planning.

**Fix:**
- Implement the `uor-api` endpoint handler in `federation.ts`: fetch from `https://api.uor.foundation/v1/kernel/op/compute` for ring-grounded queries, parse response into `SparqlResult` format
- Add partition cardinality hints to federated query planning (use ring arithmetic to estimate result sizes before dispatching)

---

## Gap 6: Integrity Check Missing State Module Verification

**Current state:** `systemIntegrityCheck()` runs 4 checks (Ring Q0, Ring Q1, Derivation Integrity, Receipt Chain, Store Consistency) but does not verify the state module tables or the trace/observable modules once created.

**Fix:**
- Add `checkStateIntegrity()` to `integrity-check.ts` — verifies `uor_state_frames`, `uor_contexts` tables are accessible and structurally valid
- Add `checkTraceIntegrity()` once trace module is created
- Register both in `systemIntegrityCheck()`

---

## Gap 7: R1 Enforcement — Derivation-First Writes Not Enforced at DB Level

**Roadmap requirement (Section 9.1 R1):**
> "Every claim written to the knowledge graph must carry a derivation_id or be explicitly tagged epistemic_grade: D."

**Current state:** The SHACL conformance suite checks this logically, but there is no database-level trigger enforcing R1. Untagged inserts into `uor_triples` are allowed.

**Fix:**
- Create a validation trigger on `uor_triples` that checks: if no corresponding `uor_derivations` record exists with the subject IRI, set a default `graph_iri` tag of `urn:uor:grade:D`
- This is a soft enforcement (tagging, not blocking) consistent with the roadmap's "Untagged claims are treated as Grade D by default"

---

## What Is Already Complete (No Changes Needed)

The following roadmap components are fully implemented and verified:

| Roadmap Component | Status |
|---|---|
| Ring Arithmetic Engine (Layer 0) | Complete: Q0/Q1 with exhaustive coherence |
| Content-Addressed IRI Layer | Complete: `identity` module |
| Derivation Certificate System | Complete: `derivation` module with receipt + cert |
| Triadic Coordinate System | Complete: `triad` module |
| JSON-LD 1.1 Emission (R6) | Complete: `jsonld` module with all 14 namespaces |
| Coherence Verification | Complete: `ring-core` verify() + `self-verify` |
| 5 Agent Tool Functions | Complete: `agent-tools` module |
| 4-Tier Epistemic Grading | Complete: `epistemic` module |
| SHACL Conformance Suite (7 tests) | Complete: `shacl` module |
| State Context (state: namespace) | Complete: `state` module with DB persistence |
| Resolver / Entity Resolution | Complete: `resolver` module |
| Morphism / Transform Layer | Complete: `morphism` module |
| Correlation / Fidelity Engine | Complete: `resolver/correlation` |
| Partition / Coset Management | Complete: `resolver/partition` |
| SPARQL Query (local) | Complete: `sparql` module |
| Code-to-KG Bridge | Complete: `code-kg` module |
| Semantic Index / Entity Linking | Complete: `semantic-index` module |
| Certificate Authority (cert:) | Complete: `derivation/certificate` |
| R2 Canonical Form | Complete: `ring-core/canonicalization` |
| R3 Quantum Consistency | Complete: morphism records cross-quantum transforms |
| R4 verify() before emit() | Complete: enforced in all 5 tool functions |
| R5 IRI Immutability | Complete: content-addressed by construction |

---

## Technical Implementation Details

### New Files to Create

1. **`src/modules/trace/trace.ts`** — ComputationTrace type, `recordTrace()`, `getTrace()`
2. **`src/modules/trace/index.ts`** — barrel export
3. **`src/modules/trace/module.json`** — manifest
4. **`src/modules/observable/observable.ts`** — Observable type, `recordObservable()`, `queryObservables()`
5. **`src/modules/observable/index.ts`** — barrel export
6. **`src/modules/observable/module.json`** — manifest
7. **`src/modules/agent-tools/resolution-cycle.ts`** — 8-stage orchestrator
8. **`src/modules/resolver/type-registry.ts`** — PrimitiveType mappings
9. **`src/test/trace.test.ts`** — trace module tests
10. **`src/test/observable.test.ts`** — observable module tests

### Files to Modify

1. **`src/modules/dashboard/pages/DashboardPage.tsx`** — add "trace" and "observable" to MODULES array (total: 20)
2. **`src/modules/self-verify/integrity-check.ts`** — add state + trace integrity checks
3. **`src/modules/agent-tools/tools.ts`** — call `recordTrace()` in `uor_derive`
4. **`src/modules/agent-tools/pages/AgentConsolePage.tsx`** — add "resolve" command for 8-stage cycle
5. **`src/modules/sparql/federation.ts`** — implement `uor-api` endpoint handler
6. **`src/data/route-table.ts`** — no new routes needed (trace/observable are backend modules, not pages)

### Database Migration

One migration creating:
- `uor_traces` table with public read/insert RLS
- `uor_observables` table with public read/insert RLS
- Validation trigger on `uor_triples` for R1 default Grade D tagging

### Verification

After implementation, all existing tests continue to pass, plus:
- `trace.test.ts`: recordTrace produces valid ComputationTrace with certifiedBy link
- `observable.test.ts`: recordObservable creates content-addressed observable IRI
- Resolution cycle: Stage 1-8 executes end-to-end, produces receipt with selfVerified: true
- Dashboard health grid shows all 20 modules healthy
- **neg(bnot(x)) = succ(x) -- VERIFIED -- ALL SYSTEMS OPERATIONAL**

