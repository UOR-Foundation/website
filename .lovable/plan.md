

# Copy & Clarity Pass: Replace Jargon, Sharpen Wording Site-Wide

## Summary

After reviewing every page component and data file, I found ~40 instances of technical jargon, vague phrasing, or insider terminology that can be replaced with clearer, more intuitive language. The changes are purely textual — no layout or logic changes.

## Findings by Area

### 1. Landing Page Sections

**IntroSection / WhatIsUorSection**
- "No coordination protocol" → unclear to most readers
- Current: "No central registry, no coordination protocol, no single point of failure"
- Better: "No central registry. No middleman. No single point of failure."
- "References that survive migration, replication, and federation" → technical triad
- Better: "Addresses that survive when data moves between systems, gets copied, or spans organizations."

**ApplicationsSection**
- "middleware" → jargon
- Current: "…without custom translations or middleware"
- Better: "…without custom adapters or glue code"
- "Proof-Based Computation" → abstract
- Better: "Verifiable Computation"
- "produce a receipt anyone can check" → good, keep
- "composable across institutions, disciplines, and borders without special tooling" → slightly verbose
- Better: "composable across institutions and disciplines — no special tooling required"

**CodeExampleSection**
- "Every UOR address is a prime factorization. The address IS the proof." → assume math knowledge
- Better: "The address is computed directly from the content. If the content matches, the address matches. No lookup required."

**EcosystemSection / ProjectsShowcase**
- "UOR Ecosystem" pre-label → "Our Projects" is clearer (already used in EcosystemSection, but ProjectsShowcase still says "UOR Ecosystem")

### 2. Developer Tool Pages (Heroes)

**RingExplorerPage**
- "Explore the algebraic foundation of the UOR Framework. Z/(2^n)Z ring operations with live coherence verification and API cross-validation."
- Better: "Explore how UOR computes addresses. Test every operation, verify correctness across all values, and compare results against the live API."

**DerivationLabPage**
- "Every computation produces an auditable derivation record, a verifiable certificate, and a self-verifying canonical receipt."
- Better: "Run any operation and get three things back: a step-by-step record of what happened, a certificate proving it was done correctly, and a receipt anyone can independently verify."

**KnowledgeGraphPage**
- "Persistent dual-addressed storage. Every datum has a UOR IRI for identity and a database record for querying. JSON-LD remains the canonical format."
- Better: "A searchable store where every piece of data has a permanent address. Look up any value by its content or by its identifier."

**SparqlEditorPage**
- "Query the UOR triple store using SPARQL-like syntax. Every result is enriched with an epistemic grade from the derivation chain."
- Better: "Search the knowledge graph using structured queries. Every result includes a trust grade showing how it was verified."

**CodeKnowledgeGraphPage**
- "Transform TypeScript/JavaScript source code into a UOR-grounded knowledge graph. Every code entity receives a canonical derivation and IRI."
- Better: "Turn source code into a searchable graph. Every function, class, and variable gets a permanent, verifiable address."

**EpistemicPage**
- "Submit claims with evidence to receive certificates from Grade A (algebraically proven) to Grade D (unverified)."
- Better: "Submit any claim with its evidence. The system assigns a trust grade from A (mathematically proven) to D (unverified)."

**CertificatesPage**
- "Issue and verify metric-preserving transform certificates. Confirm that transforms preserve ring or Hamming metrics across partition classes."
- Better: "Test whether an operation preserves the mathematical properties it should. The system issues a certificate with the result."

### 3. Infrastructure Pages

**AppStorePage**
- "Every CNCF landscape category — implemented natively with content-addressed isolation, algebraic verification, and unified knowledge graph integration."
- Better: "Every cloud-native category, reimagined with built-in verification, content-based identity, and a unified data layer."
- "Algebraic Isolation" → "Permission Isolation"
- "AppKernel enforces permissions via set intersection — no OS-level hacks needed." → "Permissions are enforced mathematically. No OS-level workarounds needed."
- "Knowledge Graph Native" → "Graph-Native"

**UnsPage** — already clean, minor tweak:
- "A naming system where addresses come from the content itself." — good

**InteroperabilityPage**
- "Every external standard is a deterministic projection of a single UOR identity. Explore how they compose into cross-protocol synergy chains."
- Better: "Every standard is a different view of the same underlying identity. See how they connect and translate between each other."

### 4. Verify Page Internal Sections

**VerifyPage sections** (internal section titles and descriptions):
- "Universal Coherence Proof" → "Full-Range Verification"
- "Verify the critical identity holds for every element in Z/256Z" → "Verify that this property holds for all 256 possible values"
- "Triadic Coordinates" → "Three Views of a Value"
- "Dihedral Group" → "Symmetry Group" with simplified explanation
- "Ergodicity" → "Full Reachability"
- "schema:Datum ⊥ schema:Term" → simplified to "Values vs. Expressions"

### 5. Prism Pipeline Page

**Stage descriptions** are pure math notation:
- "Declare T ∈ 𝒯ₙ. verify ring coherence at quantum level n" → "Check the input and confirm the system is ready"
- "Construct query: CoordinateQuery | MetricQuery | RepresentationQuery" → "Decide what to ask about this value"
- "Select Resolver ρ; compute Π(T) = ρ(T, n, K)" → "Choose a method and compute the result"
- "Produce P=(Irr, Red, Unit, Ext); enforce |I|+|R|+|U|+|E| = 2ⁿ" → "Classify the result into four groups that must add up correctly"
- "Compute observables from 7 observable categories (§5.2)" → "Measure properties like distance, density, and symmetry"
- "Emit Certificate C (Transform | Isometry | Involution)" → "Issue a certificate proving the result is correct"
- "Construct ComputationTrace τ; τ carries trace:certifiedBy → C" → "Record every step so anyone can replay and verify"
- "Snapshot Frame; record Transition; create new Frame with Binding" → "Save the final state for future reference"

### 6. Data Files

**closure-modes.ts** — already clear
**signature-ops.ts** — already clear
**canonicalization-rules.ts** — already clear
**pillars.ts** — "Add the canonical Rust crate — cargo add uor-foundation — and implement the ontology traits" → "Install the core library and start building with the UOR tools"

### 7. Tool Registry Page

Tool descriptions use heavy jargon like "cert:TransformCertificate (Grade A)", "morphism:Transform", "SHA-256 derivation_id". These should be simplified in the user-facing descriptions while keeping the technical detail in expandable sections.

## Implementation

~20 files modified. All changes are string replacements in JSX/TSX — no logic, no layout, no structural changes. Each file gets 1-5 text edits.

Files to modify:
1. `src/modules/landing/components/WhatIsUorSection.tsx` (2 edits)
2. `src/modules/landing/components/IntroSection.tsx` (2 edits)
3. `src/modules/landing/components/ApplicationsSection.tsx` (3 edits)
4. `src/modules/landing/components/CodeExampleSection.tsx` (1 edit)
5. `src/modules/landing/components/ProjectsShowcase.tsx` (1 edit)
6. `src/modules/ring-core/pages/RingExplorerPage.tsx` (1 edit)
7. `src/modules/derivation/pages/DerivationLabPage.tsx` (1 edit)
8. `src/modules/knowledge-graph/pages/KnowledgeGraphPage.tsx` (1 edit)
9. `src/modules/sparql/pages/SparqlEditorPage.tsx` (1 edit)
10. `src/modules/code-kg/pages/CodeKnowledgeGraphPage.tsx` (1 edit)
11. `src/modules/epistemic/pages/EpistemicPage.tsx` (1 edit)
12. `src/modules/certificate/pages/CertificatesPage.tsx` (1 edit)
13. `src/modules/app-store/pages/AppStorePage.tsx` (3 edits)
14. `src/modules/interoperability/pages/InteroperabilityPage.tsx` (1 edit)
15. `src/modules/verify/pages/VerifyPage.tsx` (5 edits)
16. `src/modules/projects/pages/PrismPipelinePage.tsx` (8 edits — stage descriptions)
17. `src/data/pillars.ts` (1 edit)
18. `src/modules/agent-tools/pages/ToolRegistryPage.tsx` (tool descriptions)

