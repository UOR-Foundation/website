

# UOR Semantic Web Implementation: Assessment and Fix Plan

## Assessment Summary

After thorough evaluation across all 6 parts of the UOR Roadmap implementation, here is the status:

### What is Working

**Frontend (Fully Operational)**
- The Semantic Web Tower page (/semantic-web) renders correctly with the W3C layer cake matching the reference image exactly: Trust at top, Unicode/URI at bottom, Digital Signature spanning Proof through RDF
- All 8 layer detail cards render with What It Does, Why It Matters, and UOR Implementation sections
- Comparison table (Original Proposal vs UOR) covers Identity, Schema, Reasoning, Proof, Trust, and Deduplication
- API Explorer (/api) loads cleanly with no console errors

**Frontend Modules (All Healthy)**
- Epistemic grading module: 4-tier system (A/B/C/D) with computeGrade(), gradeToLabel(), gradeToStyles(), gradeInfo()
- Derivation engine: SHA-256 derivation IDs, AC normalization, term canonicalization
- SHACL shapes: DatumShape, DerivationShape, CertificateShape, PartitionShape all validate correctly
- 7-test conformance suite: Ring, Primitives, TermGraph, StateLifecycle, Partition, CriticalIdentity, EndToEnd
- Morphism module: applyTransform, embedQ0toQ1, projectQ1toQ0
- Q0 graph builder: 265-node instance graph generation

**API Edge Function (Partially Working)**
- Kernel layer (Part 1-2): Critical identity verification, compute, operations catalog: WORKING
- Bridge SPARQL (Part 3): Query endpoint returning graded results with datum 42 at U282A: WORKING
- Bridge emit with R4 gate: WORKING
- Bridge derivation with SHA-256 IDs: WORKING
- Store namespace (read/write/verify with IPFS): WORKING

**Discovery Layer (Correct)**
- `.well-known/uor.json`: All 5 tool endpoints, artifact URIs, epistemic grades, W3C conformance data
- `public/shapes/uor-shapes.ttl`: W3C Turtle with DatumShape, DerivationShape, CertificateShape, PartitionShape, TransformShape, IsometryShape
- `public/openapi.json`: Full OpenAPI 3.1.0 spec with all endpoint definitions
- `public/llms.md`: LLM tool registration, epistemic grading docs, SPARQL verification queries

### What is NOT Working

**API Routes from Parts 4, 5, and 6 return 404 errors:**
The code for these routes exists in `supabase/functions/uor-api/index.ts` and the routing logic is correct, but the deployed edge function does not include the latest changes. The following endpoints are affected:

- `/tools/derive` (Part 4: uor_derive)
- `/tools/query` (Part 4: uor_query)
- `/tools/verify` (Part 4: uor_verify)
- `/tools/correlate` (Part 4: uor_correlate)
- `/tools/partition` (Part 4: uor_partition)
- `/bridge/morphism/transform` (Part 5: embedding verification)
- `/bridge/morphism/isometry` (Part 5: neg/bnot isometry)
- `/bridge/morphism/coerce` (Part 5: cross-quantum coercion)
- `/cert/issue` (Part 6: certificate chains)
- `/cert/portability` (Part 6: GDPR attestation)
- `/sparql/federation-plan` (Part 6: cardinality planning)
- `/bridge/resolver/entity` (Part 6: NL entity resolver)
- `/schema-org/extend` (Part 6: schema.org attribution)
- `/.well-known/void` (Part 6: VoID descriptor)

## Root Cause

The edge function code contains all route handlers (lines 4915-6228 of `index.ts`), but the deployed version does not include the latest changes. The function needs to be redeployed to activate the Part 4, 5, and 6 endpoints.

## Fix Plan

### Step 1: Force Redeploy the Edge Function

Trigger a redeployment of `supabase/functions/uor-api/index.ts` by making a trivial edit (e.g., updating a timestamp comment) to force the build system to redeploy the function with all the latest route handlers.

### Step 2: Verify All Routes End-to-End

After redeployment, test the following endpoints to confirm all 6 parts are operational:

1. `GET /tools/derive?term=xor(0x55,0xaa)&quantum=0` (Part 4)
2. `GET /tools/correlate?a=85&b=170&mode=full` (Part 5 enhanced)
3. `GET /bridge/morphism/isometry?op=neg` (Part 5)
4. `GET /cert/portability?derivation_id=urn:uor:derivation:sha256:...` (Part 6)
5. `GET /.well-known/void` (Part 6)

### Step 3: Verify AC Normalization Correctness

Test that `xor(0x55,0xaa)` and `xor(0xaa,0x55)` produce identical `derivation:derivationId` values, confirming the commutative argument sorting works.

## Technical Details

### Files Involved
- `supabase/functions/uor-api/index.ts` (6,251 lines): The monolithic edge function containing all endpoint handlers
- `public/.well-known/uor.json`: Discovery metadata (correct)
- `public/shapes/uor-shapes.ttl`: SHACL shapes (correct, includes TransformShape + IsometryShape)
- `public/openapi.json`: OpenAPI spec (correct, includes all Part 4-6 routes)
- `public/llms.md`: LLM documentation (correct, includes tool registration)

### Semantic Web Tower Layer Mapping (Verified)

| W3C Layer | UOR Implementation | Status |
|---|---|---|
| L0: Unicode + URI | Content-derived addresses via Braille bijection (U+2800-U+28FF) | Working |
| L1: XML + Schema | JSON-LD 1.1 with @context mapping 14 algebraic namespaces | Working |
| L2: RDF + RDFS | RDF triples with RDFS annotations, SKOS hierarchies | Working |
| L3: Ontology | OWL 2 DL with involution axioms, 82 classes, 121+ properties | Working |
| L4: Logic | 7 deterministic canonicalization rules (always terminates) | Working |
| L5: Proof | PROV-O aligned derivation records, cryptographic receipts | Working |
| L6: Trust | Mathematical: neg(bnot(x)) = succ(x), 4-tier epistemic grading | Working |
| L7: Digital Signature | CIDv1 content-addressed hashes (self-evident tampering) | Working |

