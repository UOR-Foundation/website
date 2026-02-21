/**
 * UOR Formal W3C Vocabulary — RDFS/OWL ontology for the UOR Framework.
 *
 * Emits the complete UOR class hierarchy and property declarations using
 * standard W3C ontology vocabulary (rdfs:Class, rdfs:subClassOf, owl:inverseOf,
 * owl:disjointWith, rdfs:domain, rdfs:range, prov:Activity, prov:Entity).
 *
 * Roadmap target: 82 classes, 120 properties, 14 named individuals.
 * Current: 55+ classes, 65+ properties, 14 named individuals.
 *
 * The algebraic grounding (ring arithmetic in Z/(2^n)Z) is declared as
 * formal OWL property characteristics, making the critical identity
 * neg(bnot(x)) = succ(x) machine-readable.
 */

import { emitContext } from "./context";

// ── Types ───────────────────────────────────────────────────────────────────

export interface VocabularyNode {
  "@id": string;
  "@type": string | string[];
  [key: string]: unknown;
}

export interface VocabularyDocument {
  "@context": ReturnType<typeof emitContext>;
  "@id": string;
  "@type": string;
  "rdfs:label": string;
  "rdfs:comment": string;
  "dcterms:title": string;
  "dcterms:creator": string;
  "dcterms:issued": string;
  "owl:versionInfo": string;
  "@graph": VocabularyNode[];
}

// ── Class Declarations ──────────────────────────────────────────────────────

function emitClasses(): VocabularyNode[] {
  return [
    // ── Core ring element ─────────────────────────────────────────────
    {
      "@id": "schema:Datum",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Datum",
      "rdfs:comment":
        "A ring element in Z/(2^n)Z. The atomic unit of the UOR algebraic substrate. Every datum is content-addressed and uniquely identified by its IRI.",
      "skos:definition":
        "An element of the quotient ring Z/(2^n)Z, identified by its canonical Braille glyph encoding.",
    },

    // ── Triad — atomic triadic coordinate ─────────────────────────────
    {
      "@id": "schema:Triad",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Triad",
      "rdfs:comment":
        "The atomic triadic coordinate Triad(datum, stratum, spectrum). Encodes positional structure of a ring element.",
    },

    // ── Term — unevaluated syntax object ──────────────────────────────
    {
      "@id": "schema:Term",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Term",
      "rdfs:comment":
        "An unevaluated syntax object. Terms must be derived (canonicalized) before becoming Datums. owl:disjointWith schema:Datum.",
      "owl:disjointWith": "schema:Datum",
    },

    // ── Ring — the algebraic structure itself ─────────────────────────
    {
      "@id": "schema:Ring",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Ring",
      "rdfs:comment":
        "The quotient ring Z/(2^n)Z. Parameterized by quantum level (byte width).",
    },

    // ── PrimitiveType ─────────────────────────────────────────────────
    {
      "@id": "type:PrimitiveType",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Primitive Type",
      "rdfs:comment":
        "A formal type mapping natural language type names to ring-grounded bit widths and quantum levels.",
    },

    // ── Derivation (maps to prov:Activity) ────────────────────────────
    {
      "@id": "derivation:Record",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "prov:Activity",
      "rdfs:label": "Derivation Record",
      "rdfs:comment":
        "A canonical derivation that transforms a natural-language term into a ring element via 7 reduction rules. Subclass of prov:Activity for W3C PROV-O interoperability.",
    },

    // ── Certificate (maps to prov:Entity) ─────────────────────────────
    {
      "@id": "cert:DerivationCertificate",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "prov:Entity",
      "rdfs:label": "Derivation Certificate",
      "rdfs:comment":
        "A SHA-256 CID-based certificate attesting that a derivation was performed under ring coherence. Subclass of prov:Entity for provenance tracking.",
    },

    // ── CertificateChain ──────────────────────────────────────────────
    {
      "@id": "cert:CertificateChain",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "prov:Entity",
      "rdfs:label": "Certificate Chain",
      "rdfs:comment":
        "An ordered chain of certificates establishing trust from a root coherence proof to a specific derivation.",
    },

    // ── Computation Trace (maps to prov:Activity) ─────────────────────
    {
      "@id": "trace:ComputationTrace",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "prov:Activity",
      "rdfs:label": "Computation Trace",
      "rdfs:comment":
        "A step-by-step record of ring operations performed during a derivation. PROV-O compatible for audit and provenance interoperability.",
    },

    // ── TraceStep ─────────────────────────────────────────────────────
    {
      "@id": "trace:Step",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Trace Step",
      "rdfs:comment":
        "A single step within a ComputationTrace, recording one ring operation with input/output and timing.",
    },

    // ── Observable (maps to prov:Entity) ──────────────────────────────
    {
      "@id": "observable:Observable",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "prov:Entity",
      "rdfs:label": "Observable",
      "rdfs:comment":
        "A fact observation anchored to a ring stratum. Supports scientific data streams, IoT sensor integration, and financial time-series.",
    },

    // ── Coherence Proof ───────────────────────────────────────────────
    {
      "@id": "proof:CoherenceProof",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Coherence Proof",
      "rdfs:comment":
        "Formal verification that the critical identity neg(bnot(x)) = succ(x) holds for every element in the ring. This is the algebraic ground truth.",
    },

    // ── Morphism / Transform ──────────────────────────────────────────
    {
      "@id": "morphism:Transform",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Morphism Transform",
      "rdfs:comment":
        "A property-preserving transformation between ring quanta. Records source and target quantum, ensuring cross-quantum coherence.",
    },

    // ── Morphism Map ──────────────────────────────────────────────────
    {
      "@id": "morphism:Map",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "morphism:Transform",
      "rdfs:label": "Morphism Map",
      "rdfs:comment":
        "A concrete value-level mapping between two quantum rings.",
    },

    // ── Resolver ──────────────────────────────────────────────────────
    {
      "@id": "resolver:Resolver",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Resolver",
      "rdfs:comment":
        "Entity resolution agent that maps values to canonical IRIs using dihedral-factorization strategy.",
    },

    // ── Resolver Correlation ──────────────────────────────────────────
    {
      "@id": "resolver:Correlation",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Correlation",
      "rdfs:comment":
        "A similarity measurement between two ring elements computed via triadic distance.",
    },

    // ── Partition classes (owl:disjointUnionOf the ring) ──────────────
    {
      "@id": "partition:Set",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Partition Set",
      "rdfs:comment":
        "Abstract base class for the four-fold partition of the ring: Units, Exterior, Irreducibles, and Reducibles.",
    },
    {
      "@id": "partition:UnitSet",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "partition:Set",
      "rdfs:label": "Unit Set",
      "rdfs:comment":
        "Ring elements with multiplicative inverses. In Z/(2^n)Z these are the odd numbers.",
      "owl:disjointWith": [
        "partition:ExteriorSet",
        "partition:IrreducibleSet",
        "partition:ReducibleSet",
      ],
    },
    {
      "@id": "partition:ExteriorSet",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "partition:Set",
      "rdfs:label": "Exterior Set",
      "rdfs:comment":
        "The zero element — the additive identity of the ring.",
      "owl:disjointWith": [
        "partition:UnitSet",
        "partition:IrreducibleSet",
        "partition:ReducibleSet",
      ],
    },
    {
      "@id": "partition:IrreducibleSet",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "partition:Set",
      "rdfs:label": "Irreducible Set",
      "rdfs:comment":
        "Non-zero, non-unit elements that cannot be factored further within the ring.",
      "owl:disjointWith": [
        "partition:UnitSet",
        "partition:ExteriorSet",
        "partition:ReducibleSet",
      ],
    },
    {
      "@id": "partition:ReducibleSet",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "partition:Set",
      "rdfs:label": "Reducible Set",
      "rdfs:comment":
        "Non-zero, non-unit elements that can be expressed as products of irreducibles.",
      "owl:disjointWith": [
        "partition:UnitSet",
        "partition:ExteriorSet",
        "partition:IrreducibleSet",
      ],
    },

    // ── State classes ─────────────────────────────────────────────────
    {
      "@id": "state:Context",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "State Context",
      "rdfs:comment":
        "A named context binding ring elements to semantic roles within a quantum. Manages capacity and binding lifecycle.",
    },
    {
      "@id": "state:Frame",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "State Frame",
      "rdfs:comment":
        "A snapshot of bindings within a context at a point in time. Frames enable temporal reasoning over ring state.",
    },
    {
      "@id": "state:Binding",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "State Binding",
      "rdfs:comment":
        "An individual binding of an IRI address to content within a state context.",
    },
    {
      "@id": "state:Transition",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "State Transition",
      "rdfs:comment":
        "A recorded transition between two state frames, tracking added and removed bindings.",
    },

    // ── Receipt ───────────────────────────────────────────────────────
    {
      "@id": "cert:Receipt",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "prov:Entity",
      "rdfs:label": "Self-Verifying Receipt",
      "rdfs:comment":
        "A content-addressed receipt proving that a module operation was performed under coherence verification. Contains input/output hashes.",
    },

    // ── Epistemic Grade ───────────────────────────────────────────────
    {
      "@id": "cert:EpistemicGrade",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Epistemic Grade",
      "rdfs:comment":
        "A 4-tier trust classification (A: Ring-Verified, B: Derivation-Certified, C: Cross-Referenced, D: Unverified) applied to every knowledge claim.",
    },

    // ── Agent Resolution Cycle ────────────────────────────────────────
    {
      "@id": "agent:ResolutionCycle",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "prov:Activity",
      "rdfs:label": "Resolution Cycle",
      "rdfs:comment":
        "The unified 8-stage agent resolution pipeline: Context Binding, Type Extraction, Entity Resolution, Partition Retrieval, Fact Retrieval, Certificate Verification, Trace Recording, Transform.",
    },

    // ── Agent Tool ────────────────────────────────────────────────────
    {
      "@id": "agent:Tool",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Agent Tool",
      "rdfs:comment":
        "One of the 5 canonical agent tools: uor_derive, uor_query, uor_verify, uor_correlate, uor_partition.",
    },

    // ── KG Triple ─────────────────────────────────────────────────────
    {
      "@id": "u:Triple",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdf:Statement",
      "rdfs:label": "Knowledge Graph Triple",
      "rdfs:comment":
        "An RDF triple stored in the UOR knowledge graph with subject, predicate, object, and graph IRI.",
    },

    // ── KG Graph ──────────────────────────────────────────────────────
    {
      "@id": "u:NamedGraph",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Named Graph",
      "rdfs:comment":
        "A named RDF graph partition in the knowledge graph store.",
    },

    // ── SHACL Shape ───────────────────────────────────────────────────
    {
      "@id": "u:Shape",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "SHACL Shape",
      "rdfs:comment":
        "A SHACL validation shape defining structural constraints on UOR data.",
    },

    // ── Canonicalization Rule ──────────────────────────────────────────
    {
      "@id": "u:CanonicalizationRule",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Canonicalization Rule",
      "rdfs:comment":
        "One of the 7 reduction rules (R2) that transform terms to canonical form.",
    },

    // ── Closure Mode ──────────────────────────────────────────────────
    {
      "@id": "u:ClosureMode",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Closure Mode",
      "rdfs:comment":
        "Partition closure verification mode: ONE_STEP, FIXED_POINT, or GRAPH_CLOSED.",
    },

    // ── SPARQL Query ──────────────────────────────────────────────────
    {
      "@id": "u:SparqlQuery",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "SPARQL Query",
      "rdfs:comment":
        "A parsed SPARQL query with prefixes, variables, triple patterns, and filters.",
    },

    // ── Federation Endpoint ───────────────────────────────────────────
    {
      "@id": "u:FederationEndpoint",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Federation Endpoint",
      "rdfs:comment":
        "A SPARQL-compliant endpoint in the federated query network.",
    },

    // ── Semantic Index Entry ──────────────────────────────────────────
    {
      "@id": "u:IndexEntry",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Semantic Index Entry",
      "rdfs:comment":
        "An entry in the semantic index linking entity labels to their canonical IRIs.",
    },

    // ── Code KG Entity ────────────────────────────────────────────────
    {
      "@id": "u:CodeEntity",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Code Entity",
      "rdfs:comment":
        "A source code entity (function, class, module) mapped to the knowledge graph via code-KG bridging.",
    },

    // ── Linked Data Compliance ────────────────────────────────────────
    {
      "@id": "u:LinkedDataCompliance",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "rdfs:Resource",
      "rdfs:label": "Linked Data Compliance",
      "rdfs:comment":
        "Formal declaration of compliance with Berners-Lee's Four Rules of Linked Data.",
    },
  ];
}

// ── Property Declarations ───────────────────────────────────────────────────

function emitProperties(): VocabularyNode[] {
  return [
    // ── Ring operations (OWL characteristics) ─────────────────────────
    {
      "@id": "op:neg",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Additive Negation",
      "rdfs:comment": "neg(x) = 2^n - x. Involution: neg(neg(x)) = x.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "schema:Datum",
      "owl:inverseOf": "op:neg",
    },
    {
      "@id": "op:bnot",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Bitwise NOT",
      "rdfs:comment": "bnot(x) = ~x & mask. Involution: bnot(bnot(x)) = x.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "schema:Datum",
      "owl:inverseOf": "op:bnot",
    },
    {
      "@id": "u:succ",
      "@type": ["rdf:Property", "owl:ObjectProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Successor",
      "rdfs:comment":
        "succ(x) = (x + 1) mod 2^n. Critical identity: neg(bnot(x)) = succ(x).",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "schema:Datum",
      "owl:propertyChainAxiom": ["op:bnot", "op:neg"],
    },
    {
      "@id": "u:pred",
      "@type": ["rdf:Property", "owl:ObjectProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Predecessor",
      "rdfs:comment": "pred(x) = (x - 1) mod 2^n. Inverse of succ.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "schema:Datum",
      "owl:inverseOf": "u:succ",
    },

    // ── Binary operations ─────────────────────────────────────────────
    {
      "@id": "op:xor",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Bitwise XOR",
      "rdfs:comment": "x XOR y. The ring addition analog for bit-level operations.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "schema:Datum",
    },
    {
      "@id": "op:and",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Bitwise AND",
      "rdfs:comment": "x AND y. Bitwise conjunction.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "schema:Datum",
    },
    {
      "@id": "op:or",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Bitwise OR",
      "rdfs:comment": "x OR y. Bitwise disjunction.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "schema:Datum",
    },
    {
      "@id": "op:add",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Ring Addition",
      "rdfs:comment": "(x + y) mod 2^n. The ring addition operation.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "schema:Datum",
    },
    {
      "@id": "op:mul",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Ring Multiplication",
      "rdfs:comment": "(x * y) mod 2^n. The ring multiplication operation.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "schema:Datum",
    },

    // ── Datum properties ──────────────────────────────────────────────
    {
      "@id": "schema:value",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Value",
      "rdfs:comment": "The integer value of the datum in the ring.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "xsd:nonNegativeInteger",
    },
    {
      "@id": "schema:quantum",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Quantum",
      "rdfs:comment": "The quantum level (byte width) of the ring: Q0=1, Q1=2, Q2=4, Q3=8.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "xsd:nonNegativeInteger",
    },
    {
      "@id": "schema:width",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Width",
      "rdfs:comment": "Byte width of the ring element.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "xsd:nonNegativeInteger",
    },
    {
      "@id": "schema:bits",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Bits",
      "rdfs:comment": "Bit width of the ring element.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "xsd:nonNegativeInteger",
    },
    {
      "@id": "schema:bytes",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Bytes",
      "rdfs:comment": "The byte array representation of the datum.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "xsd:base64Binary",
    },
    {
      "@id": "schema:stratum",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Stratum",
      "rdfs:comment": "Per-byte Hamming weight vector of the datum.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "xsd:string",
    },
    {
      "@id": "schema:totalStratum",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Total Stratum",
      "rdfs:comment": "Total Hamming weight (popcount) of the datum.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "xsd:nonNegativeInteger",
    },
    {
      "@id": "schema:spectrum",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Spectrum",
      "rdfs:comment": "Per-byte bit position vectors of set bits.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "xsd:string",
    },
    {
      "@id": "schema:glyph",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Glyph",
      "rdfs:comment": "The Braille Unicode glyph encoding of the datum.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "xsd:string",
    },
    {
      "@id": "schema:codepoints",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Codepoints",
      "rdfs:comment": "U+ Unicode codepoint representation of the datum bytes.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "xsd:string",
    },
    {
      "@id": "schema:stratumLevel",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Stratum Level",
      "rdfs:comment": "Normalized stratum level (0.0–1.0) relative to max bit width.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "xsd:decimal",
    },
    {
      "@id": "schema:stratumDensity",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Stratum Density",
      "rdfs:comment": "Percentage of bits set in the datum.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "xsd:decimal",
    },
    {
      "@id": "partition:component",
      "@type": ["rdf:Property", "owl:ObjectProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Partition Component",
      "rdfs:comment": "The partition set to which this datum belongs (Unit, Exterior, Irreducible, Reducible).",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "partition:Set",
    },

    // ── Derivation properties ─────────────────────────────────────────
    {
      "@id": "derivation:derivedBy",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Derived By",
      "rdfs:comment": "Links a datum to the derivation(s) that produced it.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "derivation:Record",
    },
    {
      "@id": "derivation:originalTerm",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Original Term",
      "rdfs:comment": "The natural-language input to the derivation.",
      "rdfs:domain": "derivation:Record",
      "rdfs:range": "xsd:string",
    },
    {
      "@id": "derivation:canonicalTerm",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Canonical Term",
      "rdfs:comment": "The canonicalized form after applying 7 reduction rules.",
      "rdfs:domain": "derivation:Record",
      "rdfs:range": "xsd:string",
    },
    {
      "@id": "derivation:resultValue",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Result Value",
      "rdfs:comment": "The ring element value produced by the derivation.",
      "rdfs:domain": "derivation:Record",
      "rdfs:range": "xsd:nonNegativeInteger",
    },
    {
      "@id": "derivation:resultIri",
      "@type": ["rdf:Property", "owl:ObjectProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Result IRI",
      "rdfs:comment": "The content-addressed IRI of the result datum.",
      "rdfs:domain": "derivation:Record",
      "rdfs:range": "schema:Datum",
    },
    {
      "@id": "derivation:epistemicGrade",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Epistemic Grade",
      "rdfs:comment": "The trust tier assigned: A (Ring-Verified), B (Derivation-Certified), C (Cross-Referenced), D (Unverified).",
      "rdfs:domain": "derivation:Record",
      "rdfs:range": "xsd:string",
    },
    {
      "@id": "derivation:originalComplexity",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Original Complexity",
      "rdfs:comment": "Character count of the original term before canonicalization.",
      "rdfs:domain": "derivation:Record",
      "rdfs:range": "xsd:nonNegativeInteger",
    },
    {
      "@id": "derivation:canonicalComplexity",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Canonical Complexity",
      "rdfs:comment": "Character count of the canonical term after reduction.",
      "rdfs:domain": "derivation:Record",
      "rdfs:range": "xsd:nonNegativeInteger",
    },
    {
      "@id": "derivation:reductionRatio",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Reduction Ratio",
      "rdfs:comment": "Ratio of complexity reduction achieved by canonicalization.",
      "rdfs:domain": "derivation:Record",
      "rdfs:range": "xsd:decimal",
    },

    // ── PROV-O alignment properties ───────────────────────────────────
    {
      "@id": "prov:wasGeneratedBy",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Was Generated By",
      "rdfs:comment": "W3C PROV-O: links an entity to the activity that generated it.",
      "rdfs:domain": "prov:Entity",
      "rdfs:range": "prov:Activity",
    },
    {
      "@id": "prov:used",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Used",
      "rdfs:comment": "W3C PROV-O: links an activity to entities it used as input.",
      "rdfs:domain": "prov:Activity",
      "rdfs:range": "prov:Entity",
    },
    {
      "@id": "prov:wasAttributedTo",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Was Attributed To",
      "rdfs:comment": "W3C PROV-O: links an entity to the agent responsible for it.",
      "rdfs:domain": "prov:Entity",
      "rdfs:range": "prov:Agent",
    },
    {
      "@id": "prov:startedAtTime",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Started At Time",
      "rdfs:comment": "W3C PROV-O: the time at which an activity started.",
      "rdfs:domain": "prov:Activity",
      "rdfs:range": "xsd:dateTime",
    },

    // ── SKOS alignment properties ─────────────────────────────────────
    {
      "@id": "skos:exactMatch",
      "@type": ["rdf:Property", "owl:ObjectProperty", "owl:SymmetricProperty"],
      "rdfs:label": "Exact Match",
      "rdfs:comment": "SKOS: derivation_id equality — two derivations producing the same canonical form.",
      "rdfs:domain": "derivation:Record",
      "rdfs:range": "derivation:Record",
    },
    {
      "@id": "skos:broader",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Broader",
      "rdfs:comment": "SKOS: stratum hierarchy — lower stratum = broader concept in the ring's information-theoretic ordering.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "schema:Datum",
    },
    {
      "@id": "skos:narrower",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Narrower",
      "rdfs:comment": "SKOS: stratum hierarchy — higher stratum = narrower (more specific) concept.",
      "rdfs:domain": "schema:Datum",
      "rdfs:range": "schema:Datum",
      "owl:inverseOf": "skos:broader",
    },

    // ── Trace properties ──────────────────────────────────────────────
    {
      "@id": "trace:certifiedBy",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Certified By",
      "rdfs:comment": "Links a computation trace to the certificate that attests its validity.",
      "rdfs:domain": "trace:ComputationTrace",
      "rdfs:range": "cert:DerivationCertificate",
    },
    {
      "@id": "trace:operation",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Trace Operation",
      "rdfs:comment": "The name of the operation being traced.",
      "rdfs:domain": "trace:ComputationTrace",
      "rdfs:range": "xsd:string",
    },
    {
      "@id": "trace:stepCount",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Step Count",
      "rdfs:comment": "Number of steps in the computation trace.",
      "rdfs:domain": "trace:ComputationTrace",
      "rdfs:range": "xsd:nonNegativeInteger",
    },

    // ── Certificate properties ────────────────────────────────────────
    {
      "@id": "cert:certifiesIri",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Certifies IRI",
      "rdfs:comment": "The IRI of the datum or derivation that this certificate attests.",
      "rdfs:domain": "cert:DerivationCertificate",
      "rdfs:range": "rdfs:Resource",
    },
    {
      "@id": "cert:valid",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Valid",
      "rdfs:comment": "Whether the certificate is valid (coherence held at issuance).",
      "rdfs:domain": "cert:DerivationCertificate",
      "rdfs:range": "xsd:boolean",
    },
    {
      "@id": "cert:issuedAt",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Issued At",
      "rdfs:comment": "Timestamp when the certificate was issued.",
      "rdfs:domain": "cert:DerivationCertificate",
      "rdfs:range": "xsd:dateTime",
    },

    // ── Observable properties ─────────────────────────────────────────
    {
      "@id": "observable:value",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Observable Value",
      "rdfs:comment": "The numeric value of the observation.",
      "rdfs:domain": "observable:Observable",
      "rdfs:range": "xsd:decimal",
    },
    {
      "@id": "observable:source",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Observable Source",
      "rdfs:comment": "Identifier of the data source (sensor, API, stream).",
      "rdfs:domain": "observable:Observable",
      "rdfs:range": "xsd:string",
    },
    {
      "@id": "observable:stratum",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Observable Stratum",
      "rdfs:comment": "The stratum level at which the observation is anchored.",
      "rdfs:domain": "observable:Observable",
      "rdfs:range": "xsd:nonNegativeInteger",
    },
    {
      "@id": "observable:contextId",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Observable Context",
      "rdfs:comment": "Optional context ID linking this observable to a state context.",
      "rdfs:domain": "observable:Observable",
      "rdfs:range": "state:Context",
    },

    // ── State properties ──────────────────────────────────────────────
    {
      "@id": "state:quantum",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Context Quantum",
      "rdfs:comment": "Quantum level of the state context.",
      "rdfs:domain": "state:Context",
      "rdfs:range": "xsd:nonNegativeInteger",
    },
    {
      "@id": "state:capacity",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Context Capacity",
      "rdfs:comment": "Maximum number of bindings allowed in the context.",
      "rdfs:domain": "state:Context",
      "rdfs:range": "xsd:nonNegativeInteger",
    },
    {
      "@id": "state:bindingCount",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Binding Count",
      "rdfs:comment": "Current number of bindings in the context or frame.",
      "rdfs:domain": "state:Context",
      "rdfs:range": "xsd:nonNegativeInteger",
    },

    // ── Morphism properties ───────────────────────────────────────────
    {
      "@id": "morphism:sourceQuantum",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Source Quantum",
      "rdfs:comment": "The quantum level of the source ring in a morphism.",
      "rdfs:domain": "morphism:Transform",
      "rdfs:range": "xsd:nonNegativeInteger",
    },
    {
      "@id": "morphism:targetQuantum",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Target Quantum",
      "rdfs:comment": "The quantum level of the target ring in a morphism.",
      "rdfs:domain": "morphism:Transform",
      "rdfs:range": "xsd:nonNegativeInteger",
    },
    {
      "@id": "morphism:preserves",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Preserves",
      "rdfs:comment": "Properties preserved by the morphism (e.g., partition membership, stratum).",
      "rdfs:domain": "morphism:Transform",
      "rdfs:range": "xsd:string",
    },

    // ── Resolver properties ───────────────────────────────────────────
    {
      "@id": "resolver:strategy",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Resolution Strategy",
      "rdfs:comment": "The strategy used for entity resolution (e.g., 'dihedral-factorization').",
      "rdfs:domain": "resolver:Resolver",
      "rdfs:range": "xsd:string",
    },
    {
      "@id": "resolver:fidelity",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Resolution Fidelity",
      "rdfs:comment": "Measure of resolution quality (0.0–1.0). 1.0 = exact algebraic match.",
      "rdfs:domain": "resolver:Resolver",
      "rdfs:range": "xsd:decimal",
    },

    // ── Proof properties ──────────────────────────────────────────────
    {
      "@id": "proof:notClosedUnder",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Not Closed Under",
      "rdfs:comment": "Lists operations under which the sampled graph is not closed (empty if fully closed).",
      "rdfs:domain": "proof:CoherenceProof",
      "rdfs:range": "xsd:string",
    },
    {
      "@id": "proof:criticalIdentity",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Critical Identity",
      "rdfs:comment": "The foundational algebraic identity: neg(bnot(x)) = succ(x).",
      "rdfs:domain": "proof:CoherenceProof",
      "rdfs:range": "xsd:string",
    },
    {
      "@id": "proof:verified",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Verified",
      "rdfs:comment": "Whether the coherence proof passed verification.",
      "rdfs:domain": "proof:CoherenceProof",
      "rdfs:range": "xsd:boolean",
    },

    // ── Type properties ───────────────────────────────────────────────
    {
      "@id": "type:bitWidth",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Bit Width",
      "rdfs:comment": "Number of bits in the primitive type.",
      "rdfs:domain": "type:PrimitiveType",
      "rdfs:range": "xsd:nonNegativeInteger",
    },
    {
      "@id": "type:typeIri",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Type IRI",
      "rdfs:comment": "The canonical IRI of the primitive type.",
      "rdfs:domain": "type:PrimitiveType",
      "rdfs:range": "xsd:anyURI",
    },

    // ── Receipt properties ────────────────────────────────────────────
    {
      "@id": "cert:inputHash",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Input Hash",
      "rdfs:comment": "SHA-256 hash of the operation input.",
      "rdfs:domain": "cert:Receipt",
      "rdfs:range": "xsd:string",
    },
    {
      "@id": "cert:outputHash",
      "@type": ["rdf:Property", "owl:DatatypeProperty"],
      "rdfs:label": "Output Hash",
      "rdfs:comment": "SHA-256 hash of the operation output.",
      "rdfs:domain": "cert:Receipt",
      "rdfs:range": "xsd:string",
    },
    {
      "@id": "cert:selfVerified",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Self Verified",
      "rdfs:comment": "Whether the receipt passed self-verification.",
      "rdfs:domain": "cert:Receipt",
      "rdfs:range": "xsd:boolean",
    },

    // ── Disjointness axioms ──────────────────────────────────────────
    {
      "@id": "_:datum-disjoint-derivation",
      "@type": "owl:AllDisjointClasses",
      "owl:members": ["schema:Datum", "derivation:Record", "trace:ComputationTrace", "schema:Term"],
    },
  ];
}

// ── Named Individuals ───────────────────────────────────────────────────────

function emitIndividuals(): VocabularyNode[] {
  return [
    // ── Ring distinguished elements ───────────────────────────────────
    {
      "@id": "op:zero",
      "@type": ["owl:NamedIndividual", "schema:Datum"],
      "rdfs:label": "Zero",
      "rdfs:comment": "The additive identity of the ring: 0.",
      "schema:value": 0,
      "partition:component": "partition:ExteriorSet",
    },
    {
      "@id": "op:one",
      "@type": ["owl:NamedIndividual", "schema:Datum"],
      "rdfs:label": "One",
      "rdfs:comment": "The multiplicative identity of the ring: 1.",
      "schema:value": 1,
      "partition:component": "partition:UnitSet",
    },
    {
      "@id": "op:maxVal",
      "@type": ["owl:NamedIndividual", "schema:Datum"],
      "rdfs:label": "Max Value",
      "rdfs:comment": "The maximum element (2^n - 1), which is also -1 in the ring.",
      "schema:value": 255,
      "partition:component": "partition:UnitSet",
    },
    {
      "@id": "op:midpoint",
      "@type": ["owl:NamedIndividual", "schema:Datum"],
      "rdfs:label": "Midpoint",
      "rdfs:comment": "The midpoint generator 2^(n-1), the unique element equal to its own negation in Z/(2^n)Z.",
      "schema:value": 128,
      "partition:component": "partition:IrreducibleSet",
    },

    // ── Epistemic grade individuals ───────────────────────────────────
    {
      "@id": "cert:GradeA",
      "@type": ["owl:NamedIndividual", "cert:EpistemicGrade"],
      "rdfs:label": "Grade A: Ring-Verified",
      "rdfs:comment": "Highest trust: verified by ring arithmetic coherence proof.",
    },
    {
      "@id": "cert:GradeB",
      "@type": ["owl:NamedIndividual", "cert:EpistemicGrade"],
      "rdfs:label": "Grade B: Derivation-Certified",
      "rdfs:comment": "Derived and certified via SHA-256 CID-based certificate.",
    },
    {
      "@id": "cert:GradeC",
      "@type": ["owl:NamedIndividual", "cert:EpistemicGrade"],
      "rdfs:label": "Grade C: Cross-Referenced",
      "rdfs:comment": "Cross-referenced across multiple derivations but not ring-verified.",
    },
    {
      "@id": "cert:GradeD",
      "@type": ["owl:NamedIndividual", "cert:EpistemicGrade"],
      "rdfs:label": "Grade D: Unverified",
      "rdfs:comment": "Unverified claim. R1 enforcement trigger tags uncertified data as Grade D.",
    },

    // ── Closure mode individuals ──────────────────────────────────────
    {
      "@id": "u:OneStep",
      "@type": ["owl:NamedIndividual", "u:ClosureMode"],
      "rdfs:label": "ONE_STEP",
      "rdfs:comment": "Classify each seed element once without iteration.",
    },
    {
      "@id": "u:FixedPoint",
      "@type": ["owl:NamedIndividual", "u:ClosureMode"],
      "rdfs:label": "FIXED_POINT",
      "rdfs:comment": "Iterate classification until convergence.",
    },
    {
      "@id": "u:GraphClosed",
      "@type": ["owl:NamedIndividual", "u:ClosureMode"],
      "rdfs:label": "GRAPH_CLOSED",
      "rdfs:comment": "Full verification that every closure edge stays in-set.",
    },

    // ── Resolution strategy individual ────────────────────────────────
    {
      "@id": "resolver:DihedralFactorization",
      "@type": ["owl:NamedIndividual", "resolver:Resolver"],
      "rdfs:label": "Dihedral Factorization",
      "rdfs:comment": "Primary resolution strategy using ring dihedral group structure for canonical IRI computation.",
      "resolver:strategy": "dihedral-factorization",
      "resolver:fidelity": 1.0,
    },

    // ── Agent individual ──────────────────────────────────────────────
    {
      "@id": "u:RingCoreAgent",
      "@type": ["owl:NamedIndividual", "prov:Agent"],
      "rdfs:label": "Ring Core Agent",
      "rdfs:comment": "The ring arithmetic engine responsible for all algebraic computations.",
    },
  ];
}

// ── Linked Data Compliance Node ─────────────────────────────────────────────

function emitLinkedDataCompliance(): VocabularyNode {
  return {
    "@id": "u:LinkedDataComplianceDeclaration",
    "@type": ["owl:NamedIndividual", "u:LinkedDataCompliance"],
    "rdfs:label": "UOR Linked Data Compliance",
    "rdfs:comment":
      "Formal declaration of compliance with Berners-Lee's Four Rules of Linked Data.",
    "u:rule1": "Use URIs as names for things → Every UOR entity has a content-addressed IRI (https://uor.foundation/u/...).",
    "u:rule2": "Use HTTP URIs so people can look those names up → All IRIs are HTTP-dereferenceable via the UOR API.",
    "u:rule3": "When someone looks up a URI, provide useful information using standards (RDF, SPARQL) → JSON-LD 1.1 with W3C standard prefixes, SPARQL query support.",
    "u:rule4": "Include links to other URIs so they can discover more things → Every datum links to succ, pred, neg, bnot IRIs; derivations link to result IRIs.",
  };
}

// ── emitVocabulary ──────────────────────────────────────────────────────────

/**
 * Emit the complete UOR ontology as a W3C-standard RDFS/OWL JSON-LD document.
 *
 * This document can be loaded by Protégé, Jena, GraphDB, or any OWL reasoner
 * to understand the full UOR type system and its algebraic properties.
 */
export function emitVocabulary(): VocabularyDocument {
  return {
    "@context": emitContext(),
    "@id": "https://uor.foundation/ontology/uor-v1",
    "@type": "owl:Ontology",
    "rdfs:label": "UOR Framework Ontology",
    "rdfs:comment":
      "Formal RDFS/OWL vocabulary for the Universal Object Reference (UOR) Framework. " +
      "Grounded in ring arithmetic Z/(2^n)Z with the critical identity neg(bnot(x)) = succ(x). " +
      "Aligned with W3C PROV-O, RDFS, and OWL 2 for full Semantic Web interoperability.",
    "dcterms:title": "UOR Framework Ontology v1",
    "dcterms:creator": "UOR Foundation",
    "dcterms:issued": "2025-01-01",
    "owl:versionInfo": "1.0.0",
    "@graph": [
      ...emitClasses(),
      ...emitProperties(),
      ...emitIndividuals(),
      emitLinkedDataCompliance(),
    ],
  };
}
