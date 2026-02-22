

# UOR Phase 2 Test Elevate: Verification, Compliance, and Redundancy Audit

This plan is divided into four sections as requested: (1) Documentation vs. Specification Compliance, (2) Certificate Verification, (3) Full System Integration, and (4) Redundancy Elimination.

---

## Section 1: Documentation Compliance Audit

Verify that all published documentation (llms.md, llms.txt, agent-discovery.md, .well-known/uor.json, openapi.json, ai-plugin.json) is in strict alignment with the live API behaviour.

### Findings (Issues Identified)

**1.1 — llms.md: Duplicate rows in Endpoint-to-Grade table (line 422-423)**
The table lists `/kernel/op/verify` twice with Grade A. Remove the duplicate row.

**1.2 — llms.md: SPARQL endpoint URL inconsistency**
- Line 468 references `https://api.uor.foundation/v1/bridge/sparql`
- Phase 2 table (line 896) references `/sparql` (without `/bridge/` prefix)
- The API actually has BOTH `/bridge/sparql` and `/sparql` registered as separate paths
- Decision needed: canonicalise to one path and alias the other, or document both explicitly

**1.3 — llms.md: "Phase 3" label mismatch (line 572)**
Section header reads "Certificate Chains and Semantic Web Surface (Phase 3)" but these endpoints were implemented in Phase 2. The label should be "Phase 2" for consistency.

**1.4 — llms.md: closure_mode enum mismatch (line 538)**
The LLM Tool Registration block lists `closure_mode` enum as `["GRAPH_CLOSED", "FIXED_POINT"]`, but the Prompt 7 spec defines `["OPEN", "CLOSED", "GRAPH_CLOSED"]`. These must agree.

**1.5 — .well-known/uor.json: Missing SPARQL paths**
`phase2_endpoints` array lists `GET /v1/sparql` but the KNOWN_PATHS also registers `/bridge/sparql`. Only one canonical path should exist.

**1.6 — .well-known/uor.json: Artifact URL discrepancy**
`artifacts.q0_instance_graph` points to `https://uor.foundation/uor_q0.jsonld` (a static file URL), but the actual live endpoint is `https://api.uor.foundation/v1/graph/q0.jsonld`. The `q0_graph.dump_url` field correctly points to the API. Remove the stale static URL or redirect it.

**1.7 — openapi.json: Missing Phase 2 endpoint schemas**
The openapi.json was partially updated (EpistemicGrading schema added) but the five tool endpoints, graph endpoints, and new cert/morphism endpoints are likely missing from the `paths` section. Full path entries with request/response schemas need to be added.

**1.8 — llms.txt: Response example is outdated**
Line 8 of llms.txt shows a minimal verify response without `epistemic_grade` or `derivation:derivationId`. Since Phase 2 adds these to every response, the example should be updated.

---

## Section 2: Certificate Verification Audit

Verify that the system produces valid, verifiable certificates at every grade level.

### Test Matrix

| Test | Endpoint | Expected Certificate | Grade |
|------|----------|---------------------|-------|
| 2.1 | GET /tools/derive?term=neg(bnot(42)) | derivation:derivationId present, starts with `urn:uor:derivation:sha256:`, 89 chars | A |
| 2.2 | GET /tools/verify?derivation_id={id from 2.1} | verified: true, cert_chain includes proof node | A |
| 2.3 | POST /bridge/morphism/transform (isometry, neg, 42) | cert:TransformCertificate with cert:verified: true | B |
| 2.4 | POST /cert/issue with valid derivation_id | cert:TransformCertificate issued, epistemic_grade: "B" | B |
| 2.5 | GET /cert/portability | W3C VerifiablePresentation structure valid | A |
| 2.6 | GET /bridge/cert/involution?operation=neg | cert:InvolutionCertificate, 256 elements verified | A |
| 2.7 | AC normalisation: derive xor(42,10) and xor(10,42) | Identical derivation:derivationId | A |
| 2.8 | GET /sparql/verify | all_passed: true across 4 verification queries | A |
| 2.9 | GET /test/e2e | all_stages_passed: true, 8 stages | A |

### Certificate Chain Integrity Check
- Derive a term, get its derivation_id
- Issue a cert for that derivation_id
- Verify the cert's `cert:certifies` field matches the original derivation_id
- Verify the portability endpoint can export the derivation as a W3C VerifiableCredential

---

## Section 3: Full System Integration Audit

### 3.1 — End-to-End Resolution Cycle (8 Stages)
Run GET /test/e2e and verify all 8 stages pass. Then independently verify each stage:

1. **Context Binding**: GET /user/state confirms Q0 ring binding
2. **Type Extraction**: GET /user/type/primitives returns U8
3. **Entity Resolution**: GET /bridge/resolver?x=42 returns partition:ReducibleSet (42 is even)
4. **Partition Retrieval**: POST /bridge/partition returns 4-component partition summing to 256
5. **Fact Retrieval**: GET /bridge/observable/metrics?x=42 returns RingMetric + HammingMetric
6. **Certificate Verification**: GET /bridge/cert/involution?operation=neg returns verified
7. **Trace Recording**: GET /bridge/trace?x=42&ops=neg,bnot returns totalHammingDrift=0
8. **Transform Recording**: GET /user/morphism/transforms returns valid homomorphism

### 3.2 — Q0 Graph Integrity
- GET /graph/q0.jsonld: confirm 265 nodes (1 Ring + 256 Datums + 6 Derivations + 1 Proof + 1 Partition)
- GET /graph/q0/datum/42: verify all 9 required properties present
- GET /graph/q0/datum/0 and /graph/q0/datum/255: boundary checks
- SPARQL: `SELECT (COUNT(?d) AS ?count) WHERE { ?d a schema:Datum }` returns 256

### 3.3 — Cross-Endpoint Consistency
- Verify that datumIRI(42, 8) from /kernel/schema/datum matches the @id in /graph/q0/datum/42
- Verify that derivation_id from /tools/derive matches what /tools/verify can look up
- Verify that /tools/correlate?a=42&b=42 returns fidelity=1.0 and a=0, b=255 returns fidelity=0.0

---

## Section 4: Redundancy Elimination ("Less is More")

### Identified Redundancies

**4.1 — Duplicate IRI functions: `datumIRI` / `computeDatumIri` / `q0DatumIri`**
Three functions compute datum IRIs:
- `datumIRI(value, n)` (line 195) — general-purpose, supports all quantum levels
- `computeDatumIri(value, n)` (line 411) — trivial wrapper that just calls `datumIRI`
- `q0DatumIri(v)` (line 7513) — Q0-specific, hardcoded for 8-bit

**Action**: Delete `computeDatumIri` (replace all 15+ call sites with `datumIRI`). Replace `q0DatumIri` calls with `datumIRI(v, 8)`. Net: eliminate 2 functions.

**4.2 — Duplicate SPARQL endpoints: `/bridge/sparql` and `/sparql`**
Both are registered in KNOWN_PATHS and routed. They likely share the same handler.

**Action**: Canonicalise to `/sparql` (the Phase 2 path). Make `/bridge/sparql` a 301 redirect to `/sparql` with a deprecation note. Update llms.md to reference only `/sparql`.

**4.3 — Duplicate stratum/popcount functions**
- `q0Stratum(v)` (line 7517) — manual bit-counting loop
- `bytePopcount(b)` (line 213) — identical logic

**Action**: Delete `q0Stratum`, replace with `bytePopcount` in Q0 graph generation.

**4.4 — Duplicate spectrum functions**
- `q0Spectrum(v)` (line 7523) — `v.toString(2).padStart(8, '0')`
- Same logic inline in `makeDatum` (line 262)

**Action**: Extract a single `spectrum(v, n)` utility and use it everywhere.

**4.5 — llms.md: Epistemic grade table appears THREE times**
1. Lines 406-415 (main "Epistemic Grading" section)
2. Lines 417-432 (endpoint-to-grade mapping — has the duplicate row)
3. Lines 919-928 (Phase 2 section)

**Action**: Keep ONE canonical grade table (the Phase 2 version at 919-928, which is the most complete). Remove the earlier two and replace with a cross-reference link.

**4.6 — llms.md: Agent tool table appears twice**
1. Lines 256-262 (Step 6 section)
2. Lines 496-543 (LLM Tool Registration JSON block — different format)

Both describe the same 5 tools. The JSON block is more useful for agents; the markdown table is more useful for humans.

**Action**: Keep both but ensure they are identical in content (fix the closure_mode enum mismatch in 4.6).

**4.7 — Edge function: makeSha256 usage for derivation IDs**
The `computeDerivationId` function calls `makeSha256` which uses Web Crypto. Confirm there is only ONE SHA-256 hashing function — no duplicate crypto implementations.

---

## Implementation Sequence

1. **Documentation fixes** (Section 1): Fix all 8 documentation issues
2. **Redundancy elimination** (Section 4): Remove duplicate functions and consolidate
3. **Test execution** (Sections 2 and 3): Run the full test matrix via browser against the live API
4. **Self-verification**: After all fixes, run GET /test/e2e to confirm system coherence

### Technical Details

**Files to modify:**
- `public/llms.md` — Fix duplicate grade rows, phase label, closure_mode enum, SPARQL URL, remove redundant grade tables
- `public/llms.txt` — Update verify response example
- `public/.well-known/uor.json` — Fix artifact URL, deduplicate SPARQL path references
- `public/openapi.json` — Add missing Phase 2 path definitions
- `supabase/functions/uor-api/index.ts` — Eliminate `computeDatumIri`, `q0DatumIri`, `q0Stratum`, `q0Spectrum`; consolidate `/bridge/sparql` as redirect to `/sparql`

**Estimated scope:** 6 files, ~80 lines removed, ~20 lines modified, 0 new functions added. Net reduction in codebase size.

