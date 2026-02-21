

# W3C Semantic Web Tower -- UOR Framework Alignment Plan

## Objective

Align the UOR implementation with the canonical W3C Semantic Web "layer cake" so that W3C practitioners immediately recognize the architecture, while the algebraic foundation (ring arithmetic) remains the grounding layer.

The W3C tower has 7 layers plus the "P" (People) axis. Below is the layer-by-layer mapping and the gaps that need closing.

---

## Layer-by-Layer Analysis

### Layer 0: Unicode + URI -- COMPLETE, minor enrichment needed

**W3C standard**: Unicode for character encoding, URI/IRI for resource identification.

**UOR mapping**: `identity/addressing.ts` provides Braille bijection (U+2800) and content-addressed IRIs (`https://uor.foundation/u/...`). Round-trip verified.

**Gap**: The JSON-LD context (`context.ts` and `uor-v1.jsonld`) is missing standard W3C namespace prefixes that W3C practitioners expect to see:
- `rdf:` (http://www.w3.org/1999/02/22-rdf-syntax-ns#)
- `rdfs:` (http://www.w3.org/2000/01/rdf-schema#) -- present in `.jsonld` but missing from `emitContext()`
- `owl:` (http://www.w3.org/2002/07/owl#) -- present in `.jsonld` but missing from `emitContext()`
- `skos:` (http://www.w3.org/2004/02/skos/core#)
- `dcterms:` (http://purl.org/dc/terms/)
- `foaf:` (http://xmlns.com/foaf/0.1/)
- `prov:` (http://www.w3.org/ns/prov#) -- critical for trace/provenance alignment

**Fix**: Add these 7 W3C-standard prefixes to `emitContext()` in `context.ts` and to `uor-v1.jsonld`. This makes every UOR JSON-LD document immediately parseable by any W3C-compliant tool.

### Layer 1: XML + Namespaces + XML Schema -- COMPLETE

**W3C standard**: XML serialization with namespace-qualified elements.

**UOR mapping**: JSON-LD 1.1 replaces XML as the serialization format (this is the modern W3C-endorsed approach). `xsd:` namespace already present for typed literals. 14 UOR namespaces registered.

**No gaps.**

### Layer 2: RDF + RDF Schema -- COMPLETE, alignment needed

**W3C standard**: RDF triples (subject-predicate-object), `rdf:type`, `rdfs:Class`, `rdfs:subClassOf`, `rdfs:label`, `rdfs:comment`, `rdfs:domain`, `rdfs:range`.

**UOR mapping**: `kg-store/store.ts` stores S/P/O triples in `uor_triples`. The emitter (`jsonld/emitter.ts`) already emits `rdf:type` triples.

**Gap**: UOR types use custom `schema:Datum`, `derivation:Record`, etc. but never declare them as `rdfs:Class` with `rdfs:subClassOf` hierarchies. W3C practitioners expect a formal RDFS vocabulary where:
- `schema:Datum rdfs:subClassOf rdfs:Resource`
- `derivation:Record rdfs:subClassOf prov:Activity`
- `cert:DerivationCertificate rdfs:subClassOf prov:Entity`
- `trace:ComputationTrace rdfs:subClassOf prov:Activity`
- Properties have `rdfs:domain` and `rdfs:range` declarations

**Fix**: Create a new file `src/modules/jsonld/vocabulary.ts` that emits the formal RDFS/OWL vocabulary as a JSON-LD document. This is a **static ontology declaration** -- it maps every UOR type to its W3C equivalent. Add a function `emitVocabulary()` that returns the full class hierarchy and property definitions.

### Layer 3: Ontology Vocabulary (OWL) -- PARTIAL, needs formal declaration

**W3C standard**: OWL for class restrictions, property characteristics (functional, inverse, transitive), equivalences.

**UOR mapping**: `shacl/shapes.ts` validates data shapes. `resolver/type-registry.ts` maps types. But there is no formal OWL ontology document.

**Gap**: The UOR ontology is implicit in code but never emitted as an OWL document. Key OWL declarations needed:
- `op:neg owl:inverseOf op:neg` (involution)
- `op:bnot owl:inverseOf op:bnot` (involution)
- `u:succ owl:equivalentProperty [chain of op:neg, op:bnot]`
- `schema:Datum owl:disjointWith derivation:Record`
- Partition classes are `owl:disjointUnionOf` the ring

**Fix**: Add OWL class declarations to `vocabulary.ts`. These are static JSON-LD nodes that describe the algebraic structure in W3C-standard terms. No new logic needed -- just formal declarations of what already exists.

### Layer 4: Logic -- COMPLETE (UOR's strongest layer)

**W3C standard**: Rules, inference engines, first-order logic.

**UOR mapping**: Ring arithmetic in Z/(2^n)Z IS the logic layer. The critical identity `neg(bnot(x)) = succ(x)` is the fundamental inference rule. `canonicalization.ts` applies 7 reduction rules. The ring IS a complete algebraic logic system.

**No gaps.** This is where UOR exceeds W3C -- algebraic certainty rather than probabilistic inference.

### Layer 5: Proof -- COMPLETE

**W3C standard**: Formal proofs that conclusions follow from premises.

**UOR mapping**: `trace/trace.ts` records step-by-step `ComputationTrace`. `self-verify/integrity-check.ts` runs 7 system-wide checks. `shacl/conformance.ts` runs 7 conformance tests. `derivation/derivation.ts` produces auditable derivation chains.

**Gap**: Traces should declare themselves as `prov:Activity` (W3C PROV-O standard) for interoperability.

**Fix**: Add `prov:` typed properties to `ComputationTrace` output:
- `prov:wasGeneratedBy` linking trace to derivation
- `prov:used` linking to input datum
- `prov:wasAttributedTo` for the agent/ring that produced it

### Layer 6: Digital Signature -- COMPLETE

**W3C standard**: Cryptographic signatures for authenticity.

**UOR mapping**: `derivation/certificate.ts` issues SHA-256 CID-based certificates. `derivation/receipt.ts` generates self-verifying receipts. Content-addressing provides tamper-evidence by construction.

**No gaps.**

### Layer 7: Trust -- COMPLETE

**W3C standard**: Trust policies, reputation systems.

**UOR mapping**: `epistemic/grading.ts` implements the 4-tier A/B/C/D grading system. Every SPARQL result carries an epistemic grade. The R1 enforcement trigger tags unverified claims as Grade D.

**No gaps.**

### The "P" Axis (People) -- COMPLETE

**W3C insight**: Standards must be accessible to people, not just machines.

**UOR mapping**: Dashboard, Ring Explorer, SPARQL Editor, Agent Console, Conformance page -- all provide human-facing interfaces to the algebraic stack.

**No gaps.**

---

## Implementation Plan

### File 1: `src/modules/jsonld/context.ts` -- Add W3C standard prefixes

Add 7 W3C-standard namespace prefixes to `emitContext()`:
- `rdf`, `rdfs`, `owl`, `skos`, `dcterms`, `foaf`, `prov`

This is a ~10 line addition to the existing return object.

### File 2: `public/contexts/uor-v1.jsonld` -- Sync W3C prefixes

Add the same 7 prefixes to the external context file so that externally-referenced contexts also include W3C namespaces. Also add `rdf` which is currently missing.

### File 3: `src/modules/jsonld/vocabulary.ts` -- NEW: Formal W3C Vocabulary

Create a new module that emits the UOR ontology as a proper RDFS/OWL document. This file:

- Declares all UOR classes as `rdfs:Class` with `rdfs:subClassOf` chains
- Maps UOR types to W3C equivalents (e.g., `trace:ComputationTrace` -> `prov:Activity`)
- Declares OWL properties (involutions, equivalences, disjointness)
- Declares `rdfs:domain` and `rdfs:range` for key properties
- Exports `emitVocabulary()` returning a JSON-LD document

Key class hierarchy:
```
rdfs:Resource
  schema:Datum (ring element)
  derivation:Record rdfs:subClassOf prov:Activity
  cert:DerivationCertificate rdfs:subClassOf prov:Entity
  trace:ComputationTrace rdfs:subClassOf prov:Activity
  observable:Observable rdfs:subClassOf prov:Entity
  morphism:Transform
  partition:Set
    partition:UnitSet
    partition:ExteriorSet
    partition:IrreducibleSet
    partition:ReducibleSet
  state:Context
  state:Frame
```

### File 4: `src/modules/jsonld/index.ts` -- Export vocabulary

Add `emitVocabulary` to barrel exports.

### File 5: `src/modules/trace/trace.ts` -- Add PROV-O properties

Enrich `ComputationTrace` with W3C PROV-O typed properties:
- `prov:wasGeneratedBy` -> derivation ID
- `prov:used` -> input data references
- `prov:startedAtTime` -> timestamp
- `prov:wasAttributedTo` -> "urn:uor:agent:ring-core"

### File 6: `src/modules/jsonld/emitter.ts` -- Use PROV-O in emitted nodes

Add `prov:wasGeneratedBy` to derivation nodes linking them to the ring coherence proof. Add `rdfs:label` and `rdfs:comment` to datum nodes for human readability.

### File 7: `public/contexts/uor-vocabulary.jsonld` -- Static ontology file

Publish the vocabulary as a static JSON-LD file at a well-known URL, enabling external tools to fetch and understand the UOR ontology.

### File 8: `src/test/vocabulary.test.ts` -- Vocabulary self-verification

Test that:
- Every class declared in the vocabulary has a valid `rdfs:subClassOf`
- Every property has `rdfs:domain` and `rdfs:range`
- The vocabulary is valid JSON-LD
- All UOR namespace prefixes resolve correctly
- OWL involution declarations match ring arithmetic reality

---

## What Stays Unchanged

- Ring arithmetic (Layer 0 foundation) -- untouched
- Identity/addressing -- untouched
- KG store, SPARQL, SHACL -- untouched
- Agent tools, resolution cycle -- untouched
- Epistemic grading, certificates, receipts -- untouched
- All existing tests continue to pass
- All 20 dashboard modules remain healthy

## Summary

The UOR stack already fully replicates the W3C Semantic Web tower. The changes above add **formal W3C vocabulary declarations** (RDFS/OWL/PROV-O) so that:

1. Any W3C tool can parse UOR JSON-LD documents with standard prefixes
2. The ontology is formally declared using the exact same vocabulary W3C practitioners use
3. Provenance traces align with W3C PROV-O for interoperability
4. The algebraic grounding (ring arithmetic) remains the distinguishing innovation beneath the familiar W3C surface

Total: ~3 new files, ~4 modified files. Zero changes to core arithmetic or verification logic.

