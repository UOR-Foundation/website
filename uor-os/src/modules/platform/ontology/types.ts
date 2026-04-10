/**
 * Canonical Ontology — W3C SKOS Type Definitions
 * ═════════════════════════════════════════════════════════════════
 *
 * W3C SKOS (Simple Knowledge Organization System) types extended
 * with UOR and CNCF mappings. Each concept in the vocabulary is a
 * valid JSON-LD node that can be serialized to the knowledge graph.
 *
 * References:
 *   - https://www.w3.org/TR/skos-reference/
 *   - https://www.w3.org/TR/skos-primer/
 *
 * @module ontology/types
 */

// ── Audience profiles ────────────────────────────────────────────────────

/** Audience personas that determine which label surface is shown. */
export type OntologyProfile = "developer" | "user" | "scientist";

/** Per-profile label override. */
export interface ProfileLabels {
  readonly developer: string;
  readonly user: string;
  readonly scientist: string;
}

// ── SKOS Concept ─────────────────────────────────────────────────────────

/**
 * A W3C SKOS Concept with UOR and CNCF extensions.
 *
 * Each concept declares ONE canonical term and multiple audience-specific
 * labels. The `@id` is a stable URI that never changes even when labels do.
 */
export interface SkosConcept {
  /** Stable concept URI, e.g. "uor:ServiceMesh" */
  readonly "@id": string;
  readonly "@type": "skos:Concept";

  /** Canonical (developer-facing) label */
  readonly "skos:prefLabel": string;
  /** Known synonyms including internal system terms */
  readonly "skos:altLabel": readonly string[];
  /** Labels for typo-matching / search indexing (§6.5.3) — never displayed */
  readonly "skos:hiddenLabel"?: readonly string[];
  /** One-sentence definition */
  readonly "skos:definition": string;
  /** When / where to use this term */
  readonly "skos:scopeNote"?: string;
  /** Machine-readable code for this concept (§6.5.4) */
  readonly "skos:notation"?: string;
  /** Parent concept scheme */
  readonly "skos:inScheme": "uor:SystemOntology";
  /** Root concept of a scheme (§4.6.1 — inverse of hasTopConcept) */
  readonly "skos:topConceptOf"?: string;

  // ── Documentation properties (§7) ─────────────────────────────────────
  readonly "skos:changeNote"?: string;
  readonly "skos:editorialNote"?: string;
  readonly "skos:historyNote"?: string;
  readonly "skos:example"?: string;

  /** Broader (parent) concept @id */
  readonly "skos:broader"?: string;
  /** Narrower (child) concept @ids */
  readonly "skos:narrower"?: readonly string[];
  /** Related concept @ids */
  readonly "skos:related"?: readonly string[];

  // ── Mapping properties (§10) ──────────────────────────────────────────
  /** Exact external match URIs (K8s docs, CNCF landscape) */
  readonly "skos:exactMatch"?: readonly string[];
  /** Near-equivalent in another scheme */
  readonly "skos:closeMatch"?: readonly string[];
  /** Broader concept in another scheme */
  readonly "skos:broadMatch"?: readonly string[];
  /** Narrower concept in another scheme */
  readonly "skos:narrowMatch"?: readonly string[];
  /** Associative mapping to another scheme */
  readonly "skos:relatedMatch"?: readonly string[];

  // ── UOR / CNCF extensions ──────────────────────────────────────────

  /** UOR namespace prefix (e.g. "bus/", "compose/") */
  readonly "uor:namespace"?: string;
  /** CNCF Landscape category */
  readonly "uor:cncfCategory"?: string;
  /** Kubernetes resource equivalent */
  readonly "uor:k8sEquivalent"?: string;
  /** CNCF project name(s) */
  readonly "uor:cncfProject"?: string;

  /** Audience-specific labels */
  readonly "uor:profileLabels": ProfileLabels;
}

// ── Concept Scheme ───────────────────────────────────────────────────────

/** The top-level SKOS ConceptScheme containing all system concepts. */
export interface SkosConceptScheme {
  readonly "@id": "uor:SystemOntology";
  readonly "@type": "skos:ConceptScheme";
  readonly "skos:prefLabel": string;
  readonly "skos:definition": string;
  /** Top concepts of this scheme (§4.6.1) */
  readonly "skos:hasTopConcept"?: readonly string[];
  readonly "dcterms:created": string;
  readonly "dcterms:modified": string;
  readonly version: string;
  readonly concepts: readonly SkosConcept[];
}

// ── Lookup result ────────────────────────────────────────────────────────

/** Result of resolving a term against the ontology. */
export interface ResolvedTerm {
  readonly concept: SkosConcept;
  readonly label: string;
  readonly matchedVia: "prefLabel" | "altLabel" | "id";
}
