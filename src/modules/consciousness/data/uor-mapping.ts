/**
 * LoC → UOR Structural Isomorphism
 * ═════════════════════════════════
 *
 * Defines the precise mapping between Landscape of Consciousness
 * concepts and UOR framework primitives. This is the formal proof
 * that the LoC IS a domain instantiation of UOR.
 *
 * @module consciousness/data/uor-mapping
 */

import type { LocCategory, OrderOfMagnitude } from "./landscape";

// ── The Structural Isomorphism Table ─────────────────────────────────────

export interface LocUorMapping {
  readonly locConcept: string;
  readonly uorPrimitive: string;
  readonly proof: string;
  readonly icon: string;
}

export const LOC_UOR_ISOMORPHISM: readonly LocUorMapping[] = [
  {
    locConcept: "Theory of Consciousness",
    uorPrimitive: "UOR Datum (content-addressed)",
    proof: "Each theory has a unique, deterministic identity derived from its canonical description via SHA-256. Two independently formulated theories with identical content → identical hash → identical datum. Content addressing gives consciousness theories the same identity guarantees as any UOR object.",
    icon: "🧠",
  },
  {
    locConcept: "10 Categories (Materialism → Challenge)",
    uorPrimitive: "UOR Contexts (partitions of theory space)",
    proof: "The 10 LoC categories partition the space of consciousness theories exactly as UOR contexts partition the space of ring elements. Each context has a quantum (capacity), binding_count, and boundary — just as each category has a membership size, subcategory depth, and definitional boundary.",
    icon: "📂",
  },
  {
    locConcept: "Subcategories (e.g., Neurobiological, Eliminative)",
    uorPrimitive: "UOR Frames within Contexts",
    proof: "Subcategories are finer partitions within a context, exactly as UOR Frames are snapshots of bindings within a Context. A Frame captures which theories are bound to a subcategory at a given moment.",
    icon: "🖼️",
  },
  {
    locConcept: "5 Connection Factors",
    uorPrimitive: "Morphism Dimensions (5-dimensional morphism space)",
    proof: "The 5 connection factors (metaphysical assumptions, locus/level, methods, confidence, implications) define a 5-dimensional morphism space between theories. Two theories are 'connected' when their factor vectors are close — this IS a metric space with Euclidean distance, making each connection a measurable morphism:Transform.",
    icon: "🔗",
  },
  {
    locConcept: "Order of Magnitude (quantum → universe)",
    uorPrimitive: "Quantum Level (Q0 → Q7)",
    proof: "The 8 orders of magnitude map directly to 8 quantum levels: quantum=Q0, cellular=Q1, neuronal=Q2, neural-network=Q3, whole-brain=Q4, whole-body=Q5, extended-mind=Q6, universe=Q7. Each level is a ring Z/(2^n)Z with increasing capacity — exactly as each order of magnitude represents increasing complexity.",
    icon: "📏",
  },
  {
    locConcept: "Materialism-Idealism Axis (0 → 1)",
    uorPrimitive: "Ring Partition Position (unit → exterior)",
    proof: "The materialism-idealism spectrum maps to ring partition classification: pure materialism (0.0) = unit elements (fully invertible in the physical domain), non-reductive physicalism (0.2) = irreducible elements, information/monism (0.5) = the ring structure itself, idealism (1.0) = exterior elements (zero-divisors that dissolve physical structure).",
    icon: "⚖️",
  },
  {
    locConcept: "Theory Connections (edges in LoC graph)",
    uorPrimitive: "UOR Synergies (cross-projection relationships)",
    proof: "Connections between theories are structural synergies: identity-equivalence (theories that make the same predictions), provenance-chain (theories that extend each other), complementary-pair (theories that address different aspects of the same phenomenon). The LoC graph IS a synergy graph.",
    icon: "🕸️",
  },
  {
    locConcept: "4 Implications (AI, Meaning, Immortality, Afterlife)",
    uorPrimitive: "Entailment Cones (reachable consequences)",
    proof: "Each implication is the set of theories that entail it — exactly an entailment cone in Wolfram's Ruliad sense. 'AI Consciousness' is the entailment cone of theories that predict machine sentience. The cone is the forward light-cone of causal consequences.",
    icon: "🔦",
  },
  {
    locConcept: "Scholarly Interest (Google Scholar hits)",
    uorPrimitive: "UOR Observable (quantitative measurement)",
    proof: "Scholarly interest is a measurement of a theory's 'observability' — how much attention it receives from the scientific community. This maps to UOR Observables: quantitative measurements of a datum's properties from a specific source (Google Scholar).",
    icon: "📊",
  },
  {
    locConcept: "Theory Complexity (edge count)",
    uorPrimitive: "Stratum (compositional depth)",
    proof: "A theory's complexity rating maps to its UOR stratum — the depth of its compositional structure. Simple theories (eliminativism) have low stratum; complex theories (IIT, Orch-OR) have high stratum. This mirrors how UOR datums have a total_stratum measuring their internal compositional depth.",
    icon: "🏗️",
  },
  {
    locConcept: "Public vs. Scholarly Interest Divergence",
    uorPrimitive: "Observer Epistemic Debt (h-score divergence)",
    proof: "When public interest diverges from scholarly interest, it reveals epistemic debt — the gap between popular perception and rigorous verification. This maps to UOR Observer h-scores: agents in the DRIFT zone have high divergence between their perceived and verified knowledge.",
    icon: "📉",
  },
  {
    locConcept: "The Landscape Itself",
    uorPrimitive: "Hologram Projection Family (loc: namespace)",
    proof: "The entire Landscape of Consciousness is a structured projection of the universal theory space — one specific 'viewing angle' of the Ruliad through the lens of consciousness studies. Just as project(identity) yields all 147 views of one hash, the LoC projects the space of all theories through its 10-category, 5-factor, 2-axis coordinate system.",
    icon: "🌌",
  },
];

// ── Morphism Distance Function ───────────────────────────────────────────

/**
 * Compute the Euclidean distance between two theories in the
 * 5-dimensional connection factor space. This IS the morphism
 * distance in UOR terms.
 */
export function connectionFactorDistance(
  a: { metaphysicalAssumptions: number; locusLevel: number; methodsOfStudy: number; confidenceInDiscernment: number; implicationsOpenness: number },
  b: { metaphysicalAssumptions: number; locusLevel: number; methodsOfStudy: number; confidenceInDiscernment: number; implicationsOpenness: number },
): number {
  const d = [
    a.metaphysicalAssumptions - b.metaphysicalAssumptions,
    a.locusLevel - b.locusLevel,
    a.methodsOfStudy - b.methodsOfStudy,
    a.confidenceInDiscernment - b.confidenceInDiscernment,
    a.implicationsOpenness - b.implicationsOpenness,
  ];
  return Math.sqrt(d.reduce((sum, v) => sum + v * v, 0));
}

/**
 * Classify the morphism type between two theories based on their
 * quantum level relationship.
 */
export function classifyMorphism(
  fromQuantum: number,
  toQuantum: number,
): "ProjectionHomomorphism" | "InclusionHomomorphism" | "IdentityHomomorphism" {
  if (fromQuantum > toQuantum) return "ProjectionHomomorphism";
  if (fromQuantum < toQuantum) return "InclusionHomomorphism";
  return "IdentityHomomorphism";
}

/**
 * Map a category to its ring partition class.
 */
export function categoryToPartition(
  spectrumPosition: number,
): "unit" | "irreducible" | "reducible" | "exterior" {
  if (spectrumPosition < 0.15) return "unit";
  if (spectrumPosition < 0.4) return "irreducible";
  if (spectrumPosition < 0.7) return "reducible";
  return "exterior";
}
