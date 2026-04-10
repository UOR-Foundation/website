/**
 * W3C Semantic Web Tower layers.
 * Based on Tim Berners-Lee's "Semantic Web Tower" architecture.
 * Reference: https://www.w3.org/RDF/Metalog/docs/sw-easy
 */

export interface SemanticWebLayerData {
  number: number;
  title: string;
  shortTitle: string;
  color: string;
  textDark: boolean;
  what: string;
  why: string;
  uor: string;
}

export const semanticWebLayers: SemanticWebLayerData[] = [
  {
    number: 0,
    title: "Unicode + URI",
    shortTitle: "Unicode + URI",
    color: "hsl(0, 0%, 20%)",
    textDark: false,
    what:
      "Unicode encodes every human language and symbol into a single character set. URIs (Uniform Resource Identifiers) assign a unique name to every resource on the web.",
    why:
      "Without a shared alphabet and a shared naming scheme, no layer above can function. These two standards are the foundation of all web interoperability.",
    uor:
      "UOR replaces location-based URIs with content-derived addresses. Identity comes from what the data is, not where it lives. Same content, same address, on every system, with no coordination required.",
  },
  {
    number: 1,
    title: "XML + Namespaces + XML Schema",
    shortTitle: "XML + Schema",
    color: "hsl(15, 90%, 50%)",
    textDark: false,
    what:
      "XML provides a machine-readable syntax for structured documents. Namespaces prevent naming collisions across vocabularies. XML Schema defines validation rules: required fields, data types, and relationships.",
    why:
      "This layer ensures data can be written, exchanged, and validated consistently across systems and organizations.",
    uor:
      "UOR outputs W3C JSON-LD 1.1: a modern, lightweight alternative to XML, natively compatible with the Semantic Web stack. Every document carries a full @context mapping 14 algebraic namespaces to standard IRIs. The schema is embedded, not referenced separately.",
  },
  {
    number: 2,
    title: "RDF + RDF Schema",
    shortTitle: "RDF + RDFS",
    color: "hsl(45, 100%, 50%)",
    textDark: true,
    what:
      "RDF (Resource Description Framework) represents all information as subject-predicate-object triples. RDF Schema adds vocabulary for organizing triples into classes and hierarchies.",
    why:
      "This is where raw data becomes structured knowledge: instead of isolated records, you get a connected graph of meaning that any system can traverse.",
    uor:
      "Every UOR datum is emitted as RDF triples with full RDFS annotations, organized into SKOS hierarchies by algebraic stratum. Unlike traditional RDF (authored manually or extracted heuristically), UOR triples are computed deterministically from content.",
  },
  {
    number: 3,
    title: "Ontology Vocabulary",
    shortTitle: "Ontology",
    color: "hsl(90, 60%, 50%)",
    textDark: true,
    what:
      "Ontologies define formal models of a domain: what classes exist, what properties they have, and what logical constraints govern them. OWL (Web Ontology Language) is the W3C standard.",
    why:
      "Machines can reason about structure: inferring new facts, detecting contradictions, and classifying entities automatically.",
    uor:
      "UOR provides a complete algebraic ontology where every concept has a computable definition. Properties like involution are declared as OWL axioms. Entity deduplication is not an assertion (owl:sameAs) but a mathematical proof: same derivation ID means provably identical.",
  },
  {
    number: 4,
    title: "Logic",
    shortTitle: "Logic",
    color: "hsl(200, 70%, 50%)",
    textDark: false,
    what:
      "The logic layer enables automated reasoning. Given facts and rules, a logic engine derives new conclusions not explicitly stated.",
    why:
      "This makes the Semantic Web intelligent: it answers questions by combining information from multiple sources and applying formal rules.",
    uor:
      "UOR implements logic through algebraic canonicalization. Seven deterministic rules reduce any expression to its simplest canonical form. This replaces open-ended inference (computationally expensive, may not terminate) with closed, verifiable computation that always terminates.",
  },
  {
    number: 5,
    title: "Proof",
    shortTitle: "Proof",
    color: "hsl(240, 50%, 65%)",
    textDark: false,
    what:
      "Every inference and derivation is accompanied by a machine-checkable proof showing exactly how the conclusion was reached.",
    why:
      "Anyone can verify a proof independently, without trusting the system that produced it. Automated reasoning becomes auditable reasoning.",
    uor:
      "Every UOR operation produces a cryptographic derivation record: input, canonical output, epistemic grade, and computation steps. Records align with W3C PROV-O for interoperability. Proofs are a structural requirement, not optional.",
  },
  {
    number: 6,
    title: "Trust",
    shortTitle: "Trust",
    color: "hsl(300, 60%, 80%)",
    textDark: true,
    what:
      "Trust answers the question: should I believe this? The original proposal relies on digital signatures, institutional reputation, and chains of authority.",
    why:
      "Trust is the most complex layer because it is inherently a human judgment supported by technical mechanisms.",
    uor:
      "UOR redefines trust as a mathematical property. The foundation rests on one verifiable identity: neg(bnot(x)) = succ(x). Any machine can verify this in under a second, with no prior agreement. A four-tier epistemic grading system (A through D) provides transparent, auditable confidence scoring.",
  },
  {
    number: 7,
    title: "Digital Signature",
    shortTitle: "Signature",
    color: "hsl(30, 80%, 30%)",
    textDark: false,
    what:
      "Digital signatures provide cryptographic assurance that data has not been tampered with and that its author is verified. They span all layers as a cross-cutting concern.",
    why:
      "Signatures bind identity to content, enabling authentication and non-repudiation across every layer of the stack.",
    uor:
      "UOR certificates (CIDv1 content-addressed hashes) are built-in digital signatures for every object. Because the address is derived from content, any modification changes the address, making tampering self-evident. No external certificate authorities required.",
  },
];
