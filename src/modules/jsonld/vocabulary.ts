/**
 * UOR Formal W3C Vocabulary — RDFS/OWL ontology for the UOR Framework.
 *
 * Emits the complete UOR class hierarchy and property declarations using
 * standard W3C ontology vocabulary (rdfs:Class, rdfs:subClassOf, owl:inverseOf,
 * owl:disjointWith, rdfs:domain, rdfs:range, prov:Activity, prov:Entity).
 *
 * This enables any W3C-compliant tool (Protégé, Jena, GraphDB, Oxigraph)
 * to load, reason over, and validate UOR data without custom configuration.
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

    // ── Computation Trace (maps to prov:Activity) ─────────────────────
    {
      "@id": "trace:ComputationTrace",
      "@type": ["rdfs:Class", "owl:Class"],
      "rdfs:subClassOf": "prov:Activity",
      "rdfs:label": "Computation Trace",
      "rdfs:comment":
        "A step-by-step record of ring operations performed during a derivation. PROV-O compatible for audit and provenance interoperability.",
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
      "@id": "derivation:epistemicGrade",
      "@type": ["rdf:Property", "owl:DatatypeProperty", "owl:FunctionalProperty"],
      "rdfs:label": "Epistemic Grade",
      "rdfs:comment": "The trust tier assigned: A (Ring-Verified), B (Derivation-Certified), C (Cross-Referenced), D (Unverified).",
      "rdfs:domain": "derivation:Record",
      "rdfs:range": "xsd:string",
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

    // ── Trace properties ──────────────────────────────────────────────
    {
      "@id": "trace:certifiedBy",
      "@type": ["rdf:Property", "owl:ObjectProperty"],
      "rdfs:label": "Certified By",
      "rdfs:comment": "Links a computation trace to the certificate that attests its validity.",
      "rdfs:domain": "trace:ComputationTrace",
      "rdfs:range": "cert:DerivationCertificate",
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

    // ── Disjointness axiom: Datum ≠ Derivation ───────────────────────
    {
      "@id": "_:datum-disjoint-derivation",
      "@type": "owl:AllDisjointClasses",
      "owl:members": ["schema:Datum", "derivation:Record", "trace:ComputationTrace"],
    },
  ];
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
    "@graph": [...emitClasses(), ...emitProperties()],
  };
}
