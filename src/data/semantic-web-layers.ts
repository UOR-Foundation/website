/**
 * W3C Semantic Web Tower layers — data for the Semantic Web page.
 * Based on Tim Berners-Lee's original "Semantic Web Tower" architecture.
 * Reference: https://www.w3.org/RDF/Metalog/docs/sw-easy
 */

export interface SemanticWebLayerData {
  number: number;
  title: string;
  color: string;
  summary: string;
  description: string;
  uorContribution: string;
}

export const semanticWebLayers: SemanticWebLayerData[] = [
  {
    number: 0,
    title: "Unicode + URI",
    color: "hsl(0, 0%, 20%)",
    summary: "The character set and naming system that everything else builds on.",
    description:
      "Unicode provides a universal character encoding so every language and symbol can be represented digitally. URIs (Uniform Resource Identifiers) give every resource on the web a unique name. Together, they form the bedrock: without a shared alphabet and a shared naming scheme, nothing above can work.",
    uorContribution:
      "UOR replaces location-based URIs with content-derived addresses. Instead of naming things by where they live (a URL on a server), UOR names things by what they are. Two systems holding the same data automatically arrive at the same identifier, with no coordination needed. This eliminates broken links, duplicate identifiers, and dependency on any single authority.",
  },
  {
    number: 1,
    title: "XML + Namespaces + XML Schema",
    color: "hsl(15, 90%, 50%)",
    summary: "A standard syntax for structuring and validating data.",
    description:
      "XML provides a machine-readable, self-describing syntax for documents. Namespaces prevent naming collisions when combining vocabularies from different sources. XML Schema defines the rules for what valid data looks like: which fields are required, what types they must be, and how they relate. This layer ensures data can be written, shared, and validated consistently.",
    uorContribution:
      "UOR outputs all data as W3C JSON-LD 1.1, a modern, lightweight alternative to XML that is natively compatible with the Semantic Web stack. Every UOR document carries a full @context that maps 14 algebraic namespaces to standard IRIs, ensuring zero ambiguity when data crosses system boundaries. The schema is not described separately — it is embedded in every document.",
  },
  {
    number: 2,
    title: "RDF + RDF Schema",
    color: "hsl(45, 100%, 50%)",
    summary: "A universal model for describing relationships between things.",
    description:
      "RDF (Resource Description Framework) represents all information as simple three-part statements: subject–predicate–object triples. RDF Schema adds basic vocabulary for organizing these statements into classes and hierarchies. This is the layer where raw data becomes structured knowledge: instead of isolated records, you get a connected graph of meaning.",
    uorContribution:
      "Every UOR datum is emitted as a set of RDF triples with full RDFS annotations. Classes like schema:Datum are formally labeled, commented, and organized into SKOS hierarchies based on algebraic stratum (complexity). Unlike traditional RDF, where triples are authored manually or extracted heuristically, UOR triples are computed deterministically from content. The graph is not curated — it is derived.",
  },
  {
    number: 3,
    title: "Ontology Vocabulary",
    color: "hsl(90, 60%, 50%)",
    summary: "Formal definitions of concepts, categories, and their relationships.",
    description:
      "Ontologies go beyond basic schemas to define rich, formal models of a domain. They specify what classes of things exist, what properties they have, and what logical constraints govern them. OWL (Web Ontology Language) is the standard here, enabling machines to reason about the structure of knowledge: inferring new facts, detecting contradictions, and classifying entities automatically.",
    uorContribution:
      "UOR provides a complete algebraic ontology where every concept has a computable definition. Properties like involution (applying an operation twice returns the original) are declared as OWL axioms, not just human documentation. Entity deduplication — determining that two things are the same — is not an assertion (owl:sameAs) but a mathematical proof: two entities sharing the same derivation ID are provably identical.",
  },
  {
    number: 4,
    title: "Logic",
    color: "hsl(200, 70%, 50%)",
    summary: "Rules and inference engines that derive new knowledge from existing facts.",
    description:
      "The logic layer enables automated reasoning. Given a set of facts and rules, a logic engine can derive new conclusions that were not explicitly stated. This is what makes the Semantic Web 'smart': instead of just storing and retrieving data, it can answer questions that require combining information from multiple sources and applying formal rules.",
    uorContribution:
      "UOR implements logic through algebraic canonicalization. Seven deterministic rules reduce any input expression to its simplest canonical form, guaranteeing that equivalent expressions always produce the same result. This replaces open-ended logical inference — which can be computationally expensive and unpredictable — with a closed, verifiable computation that terminates in bounded time.",
  },
  {
    number: 5,
    title: "Proof",
    color: "hsl(240, 50%, 65%)",
    summary: "Verifiable evidence that a conclusion follows from its premises.",
    description:
      "The proof layer provides the receipts. Every inference, every derivation, every claim is accompanied by a machine-checkable proof that shows exactly how the conclusion was reached. Anyone can verify a proof independently, without trusting the system that produced it. This is what turns automated reasoning into auditable reasoning.",
    uorContribution:
      "Every UOR operation produces a cryptographic derivation record: a verifiable receipt that captures the original input, the canonical output, the epistemic grade (how trustworthy the result is), and the exact computation steps. These records are aligned with W3C PROV-O, making them interoperable with any provenance-aware system. Proofs are not optional — they are a structural requirement of the framework.",
  },
  {
    number: 6,
    title: "Trust",
    color: "hsl(300, 60%, 80%)",
    summary: "The ability to evaluate whether information and its sources are reliable.",
    description:
      "Trust is the top of the tower. It answers the question: should I believe this? Trust in the original proposal depends on digital signatures, institutional reputation, and chains of authority. It is the most complex and least standardized layer, because trust is inherently a human judgment supported by technical mechanisms.",
    uorContribution:
      "UOR redefines trust as a mathematical property rather than a social one. The foundation rests on a single, verifiable identity: neg(bnot(x)) = succ(x). Any two systems can independently verify this rule on any machine, in under a second, without prior contact or agreement. Trust is not delegated to an authority — it is computed from content. The four-tier epistemic grading system (A through D) provides a transparent, auditable measure of how much confidence any result deserves.",
  },
  {
    number: 7,
    title: "Digital Signature",
    color: "hsl(30, 80%, 30%)",
    summary: "Cryptographic proof of authorship and integrity, spanning all layers.",
    description:
      "Digital signatures run alongside the tower as a cross-cutting concern. They provide cryptographic assurance that data has not been tampered with and that its author is who they claim to be. Signatures bind identity to content, enabling authentication and non-repudiation across every layer of the stack.",
    uorContribution:
      "UOR certificates (CIDv1 content-addressed hashes) serve as built-in digital signatures for every object in the system. Because the address is derived from the content, any modification to the data changes the address, making tampering self-evident. This eliminates the need for external certificate authorities or PKI infrastructure — the data signs itself.",
  },
];
