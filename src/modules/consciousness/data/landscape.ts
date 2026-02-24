/**
 * Landscape of Consciousness — Complete Data Model
 * ══════════════════════════════════════════════════
 *
 * Maps the Closer to Truth "Landscape of Consciousness" taxonomy
 * into UOR-native data structures. Each theory is a content-addressable
 * datum; each category is a UOR context; each connection factor is a
 * morphism dimension.
 *
 * Source: https://loc.closertotruth.com
 * Copyright: The Kuhn Foundation, 2025-2026. Data used for academic mapping only.
 *
 * @module consciousness/data/landscape
 */

// ── Types ─────────────────────────────────────────────────────────────────

/** The 10 master categories from LoC */
export type LocCategory =
  | "materialism"
  | "non-reductive-physicalism"
  | "quantum-dimensions"
  | "information"
  | "panpsychisms"
  | "monisms"
  | "dualisms"
  | "idealisms"
  | "anomalous-altered"
  | "challenge";

/** Order of magnitude — the x-axis of the LoC scatter plot */
export type OrderOfMagnitude =
  | "quantum"
  | "cellular"
  | "neuronal"
  | "neural-network"
  | "whole-brain"
  | "whole-body"
  | "extended-mind"
  | "universe";

/** The 5 connection factors that define morphism dimensions between theories */
export interface ConnectionFactors {
  /** (i) Metaphysical assumptions (0–1 scale: 0 = strict physicalism, 1 = idealism) */
  readonly metaphysicalAssumptions: number;
  /** (ii) Locus/level of key driver (0–1 scale: 0 = micro, 1 = macro/cosmic) */
  readonly locusLevel: number;
  /** (iii) Methods of study (0–1 scale: 0 = empirical/neuroscience, 1 = philosophical/introspective) */
  readonly methodsOfStudy: number;
  /** (iv) Confidence in achieving discernment (0–1 scale) */
  readonly confidenceInDiscernment: number;
  /** (v) Implications openness (0–1: 0 = conservative/no AI consciousness, 1 = expansive/all implications) */
  readonly implicationsOpenness: number;
}

/** The 4 implications from LoC */
export type LocImplication =
  | "ai-consciousness"
  | "meaning-purpose"
  | "virtual-immortality"
  | "life-after-death";

/** A single theory of consciousness */
export interface ConsciousnessTheory {
  readonly id: string;
  readonly name: string;
  readonly category: LocCategory;
  readonly subcategory: string;
  /** Brief description for content-addressing */
  readonly description: string;
  /** Order of magnitude (x-axis) */
  readonly scale: OrderOfMagnitude;
  /** Position on Materialism-Idealism axis (0 = materialism, 1 = idealism) */
  readonly materialismIdealismAxis: number;
  /** The 5 connection factor scores */
  readonly connectionFactors: ConnectionFactors;
  /** Which implications this theory supports */
  readonly implications: readonly LocImplication[];
  /** Relative scholarly interest (1-10) */
  readonly scholarlyInterest: number;
  /** Complexity rating (1-10) */
  readonly complexity: number;
  /** Connected theory IDs */
  readonly connections: readonly string[];
  /** Source URL on loc.closertotruth.com */
  readonly sourceUrl: string;
  /** UOR quantum level mapping (derived from scale) */
  readonly quantumLevel: number;
}

/** A category with its UOR context mapping */
export interface LocCategoryMeta {
  readonly id: LocCategory;
  readonly name: string;
  readonly color: string;
  readonly subcategories: readonly string[];
  /** UOR context description */
  readonly uorContextDescription: string;
  /** Ring partition analogy */
  readonly ringPartitionAnalogy: string;
  /** Position on materialism-idealism spectrum (0-1) */
  readonly spectrumPosition: number;
}

// ── Category Definitions ─────────────────────────────────────────────────

export const LOC_CATEGORIES: readonly LocCategoryMeta[] = [
  {
    id: "materialism",
    name: "Materialism",
    color: "hsl(210, 60%, 50%)",
    subcategories: [
      "Philosophical", "Eliminative/Illusionism", "Neurobiological",
      "Electromagnetic Field", "Computational & Functionalism",
      "Homeostatic & Affective", "Embodied & Enactive", "Relational",
      "First-Order", "Higher-Order", "Language Relationships",
      "Phylogenetic/Evolutionary",
    ],
    uorContextDescription: "Context of strict physical substrate theories — consciousness arises from and is reducible to physical processes",
    ringPartitionAnalogy: "Unit elements — fully invertible within the physical domain (every mental state maps to a physical state and back)",
    spectrumPosition: 0.05,
  },
  {
    id: "non-reductive-physicalism",
    name: "Non-Reductive Physicalism",
    color: "hsl(190, 50%, 50%)",
    subcategories: ["Strong Emergence", "Top-Down Causation", "Post-Physicalism"],
    uorContextDescription: "Context of emergent physical theories — consciousness is physical but not reducible to lower levels",
    ringPartitionAnalogy: "Irreducible elements — exist in the physical ring but cannot be factored into simpler physical components",
    spectrumPosition: 0.2,
  },
  {
    id: "quantum-dimensions",
    name: "Quantum & Dimensions",
    color: "hsl(260, 55%, 55%)",
    subcategories: ["Quantum Collapse", "Quantum Information", "Higher Dimensions", "Quantum Fields"],
    uorContextDescription: "Context of quantum-mechanical theories — consciousness emerges from or is identical to quantum processes",
    ringPartitionAnalogy: "Cross-quantum morphisms — theories that bridge between quantum levels, like ProjectionHomomorphisms between Q-levels",
    spectrumPosition: 0.35,
  },
  {
    id: "information",
    name: "Information",
    color: "hsl(45, 70%, 50%)",
    subcategories: ["Integrated Information", "Causal Emergence", "Information Fields"],
    uorContextDescription: "Context of information-theoretic theories — consciousness IS integrated information (Φ)",
    ringPartitionAnalogy: "The ring structure itself — information IS the algebraic structure, just as UOR's ring Z/(2^n)Z IS the computational substrate",
    spectrumPosition: 0.45,
  },
  {
    id: "panpsychisms",
    name: "Panpsychisms",
    color: "hsl(152, 44%, 50%)",
    subcategories: ["Micropsychism", "Panprotopsychism", "Cosmopsychism", "Qualia Theories"],
    uorContextDescription: "Context of universal experience theories — consciousness is a fundamental feature of all matter",
    ringPartitionAnalogy: "The modular arithmetic itself — every element in Z/(2^n)Z participates in the ring structure, just as every entity has some form of experience",
    spectrumPosition: 0.55,
  },
  {
    id: "monisms",
    name: "Monisms",
    color: "hsl(30, 60%, 50%)",
    subcategories: ["Russellian Monism", "Dual-Aspect Monism", "Neutral Monism"],
    uorContextDescription: "Context of single-substance theories — mind and matter are two aspects of one underlying reality",
    ringPartitionAnalogy: "Isomorphisms — the dual-aspect structure mirrors UOR's lossless projections, where one hash IS both the CID and the DID simultaneously",
    spectrumPosition: 0.5,
  },
  {
    id: "dualisms",
    name: "Dualisms",
    color: "hsl(340, 55%, 55%)",
    subcategories: [
      "Property Dualism", "Substance Dualism", "Interactive Dualism",
      "Emergent Dualism", "Religious/Soul Traditions",
    ],
    uorContextDescription: "Context of two-substance theories — mind and matter are fundamentally distinct substances",
    ringPartitionAnalogy: "Direct product rings — Z/(2^n)Z × Z/(2^m)Z, two independent algebraic structures that interact at specific interface points",
    spectrumPosition: 0.65,
  },
  {
    id: "idealisms",
    name: "Idealisms",
    color: "hsl(280, 50%, 55%)",
    subcategories: ["Analytic Idealism", "Cosmic Consciousness", "Non-Duality", "Religious Idealism"],
    uorContextDescription: "Context of consciousness-primary theories — consciousness is the fundamental reality, matter is derivative",
    ringPartitionAnalogy: "Exterior elements — the zero-divisors and nilpotents that dissolve the physical ring, revealing the algebraic ground beneath",
    spectrumPosition: 0.9,
  },
  {
    id: "anomalous-altered",
    name: "Anomalous & Altered States",
    color: "hsl(0, 55%, 55%)",
    subcategories: ["Psi Models", "Integral Theory", "Field Theories", "Near-Death/Survival"],
    uorContextDescription: "Context of non-standard phenomena theories — consciousness exhibits properties not predicted by conventional frameworks",
    ringPartitionAnalogy: "Extension rings — elements that appear when the ring is extended beyond its standard modulus, like embedding Z/(2^3)Z into Z/(2^5)Z",
    spectrumPosition: 0.75,
  },
  {
    id: "challenge",
    name: "Challenge",
    color: "hsl(220, 10%, 55%)",
    subcategories: ["Mysterianism", "Skepticism", "New Approaches"],
    uorContextDescription: "Context of meta-theories — theories about the limits of theorizing about consciousness",
    ringPartitionAnalogy: "Computational irreducibility — the claim that consciousness cannot be shortcut, mirroring SHA-256's one-wayness",
    spectrumPosition: 0.5,
  },
];

// ── Scale → Quantum Level Mapping ────────────────────────────────────────

export const SCALE_TO_QUANTUM: Record<OrderOfMagnitude, number> = {
  quantum: 0,
  cellular: 1,
  neuronal: 2,
  "neural-network": 3,
  "whole-brain": 4,
  "whole-body": 5,
  "extended-mind": 6,
  universe: 7,
};

// ── Representative Theories (comprehensive selection from all 10 categories) ──

export const THEORIES: readonly ConsciousnessTheory[] = [
  // ═══ MATERIALISM ═══
  {
    id: "gwt",
    name: "Global Workspace Theory",
    category: "materialism",
    subcategory: "Neurobiological",
    description: "Baars and Dehaene: consciousness arises when information is broadcast globally across a 'workspace' of competing neural processes",
    scale: "whole-brain",
    materialismIdealismAxis: 0.1,
    connectionFactors: { metaphysicalAssumptions: 0.1, locusLevel: 0.6, methodsOfStudy: 0.2, confidenceInDiscernment: 0.7, implicationsOpenness: 0.3 },
    implications: ["ai-consciousness"],
    scholarlyInterest: 9,
    complexity: 6,
    connections: ["iit", "rpt", "hott", "ast"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 4,
  },
  {
    id: "ast",
    name: "Attention Schema Theory",
    category: "materialism",
    subcategory: "Eliminative/Illusionism",
    description: "Graziano: the brain constructs a simplified model of its own attention processes, and this model IS consciousness",
    scale: "whole-brain",
    materialismIdealismAxis: 0.05,
    connectionFactors: { metaphysicalAssumptions: 0.05, locusLevel: 0.6, methodsOfStudy: 0.2, confidenceInDiscernment: 0.8, implicationsOpenness: 0.4 },
    implications: ["ai-consciousness"],
    scholarlyInterest: 7,
    complexity: 5,
    connections: ["gwt", "illusionism", "hott"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 4,
  },
  {
    id: "illusionism",
    name: "Dennett's Illusionism",
    category: "materialism",
    subcategory: "Eliminative/Illusionism",
    description: "Dennett: consciousness as we intuitively conceive it is an illusion — there is no 'hard problem', only easier problems to solve",
    scale: "whole-brain",
    materialismIdealismAxis: 0.02,
    connectionFactors: { metaphysicalAssumptions: 0.02, locusLevel: 0.6, methodsOfStudy: 0.3, confidenceInDiscernment: 0.9, implicationsOpenness: 0.5 },
    implications: ["ai-consciousness"],
    scholarlyInterest: 8,
    complexity: 4,
    connections: ["ast", "gwt", "eliminativism"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 4,
  },
  {
    id: "eliminativism",
    name: "Churchland's Eliminative Materialism",
    category: "materialism",
    subcategory: "Eliminative/Illusionism",
    description: "Churchland: folk-psychological concepts like 'belief' and 'consciousness' will be eliminated by a mature neuroscience",
    scale: "neuronal",
    materialismIdealismAxis: 0.01,
    connectionFactors: { metaphysicalAssumptions: 0.01, locusLevel: 0.4, methodsOfStudy: 0.15, confidenceInDiscernment: 0.85, implicationsOpenness: 0.3 },
    implications: ["ai-consciousness"],
    scholarlyInterest: 7,
    complexity: 5,
    connections: ["illusionism", "bio-naturalism"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 2,
  },
  {
    id: "bio-naturalism",
    name: "Searle's Biological Naturalism",
    category: "materialism",
    subcategory: "Neurobiological",
    description: "Searle: consciousness is a biological phenomenon caused by neuronal processes, like digestion is caused by stomach processes",
    scale: "neuronal",
    materialismIdealismAxis: 0.15,
    connectionFactors: { metaphysicalAssumptions: 0.15, locusLevel: 0.4, methodsOfStudy: 0.3, confidenceInDiscernment: 0.6, implicationsOpenness: 0.2 },
    implications: [],
    scholarlyInterest: 8,
    complexity: 4,
    connections: ["eliminativism", "gwt", "ncc"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 2,
  },
  {
    id: "ncc",
    name: "Neural Correlates of Consciousness",
    category: "materialism",
    subcategory: "Neurobiological",
    description: "Crick and Koch: find the minimal set of neuronal events sufficient for a specific conscious percept",
    scale: "neuronal",
    materialismIdealismAxis: 0.1,
    connectionFactors: { metaphysicalAssumptions: 0.1, locusLevel: 0.4, methodsOfStudy: 0.1, confidenceInDiscernment: 0.7, implicationsOpenness: 0.2 },
    implications: [],
    scholarlyInterest: 9,
    complexity: 5,
    connections: ["bio-naturalism", "gwt", "rpt"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 2,
  },
  {
    id: "emf",
    name: "McFadden's CEMI Theory",
    category: "materialism",
    subcategory: "Electromagnetic Field",
    description: "McFadden: consciousness is the brain's electromagnetic field, which integrates information from millions of neurons",
    scale: "whole-brain",
    materialismIdealismAxis: 0.15,
    connectionFactors: { metaphysicalAssumptions: 0.15, locusLevel: 0.6, methodsOfStudy: 0.2, confidenceInDiscernment: 0.5, implicationsOpenness: 0.3 },
    implications: ["ai-consciousness"],
    scholarlyInterest: 6,
    complexity: 7,
    connections: ["gwt", "resonance"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 4,
  },
  {
    id: "fep",
    name: "Friston's Free-Energy Principle",
    category: "materialism",
    subcategory: "Homeostatic & Affective",
    description: "Friston: all living systems minimize free energy (prediction error), and consciousness arises from active inference",
    scale: "whole-body",
    materialismIdealismAxis: 0.2,
    connectionFactors: { metaphysicalAssumptions: 0.15, locusLevel: 0.7, methodsOfStudy: 0.3, confidenceInDiscernment: 0.6, implicationsOpenness: 0.4 },
    implications: ["ai-consciousness"],
    scholarlyInterest: 9,
    complexity: 9,
    connections: ["iit", "gwt", "enactivism", "predictive"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 5,
  },
  {
    id: "predictive",
    name: "Seth's Beast Machine Theory",
    category: "materialism",
    subcategory: "Homeostatic & Affective",
    description: "Seth: consciousness is the brain's best guess about the causes of sensory signals, grounded in the body's need to stay alive",
    scale: "whole-body",
    materialismIdealismAxis: 0.15,
    connectionFactors: { metaphysicalAssumptions: 0.12, locusLevel: 0.7, methodsOfStudy: 0.25, confidenceInDiscernment: 0.65, implicationsOpenness: 0.35 },
    implications: ["ai-consciousness"],
    scholarlyInterest: 8,
    complexity: 7,
    connections: ["fep", "gwt", "enactivism"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 5,
  },
  {
    id: "enactivism",
    name: "Varela's Neurophenomenology",
    category: "materialism",
    subcategory: "Embodied & Enactive",
    description: "Varela: consciousness arises from the dynamic coupling between organism and environment — cognition is embodied action",
    scale: "whole-body",
    materialismIdealismAxis: 0.25,
    connectionFactors: { metaphysicalAssumptions: 0.25, locusLevel: 0.7, methodsOfStudy: 0.5, confidenceInDiscernment: 0.5, implicationsOpenness: 0.4 },
    implications: [],
    scholarlyInterest: 7,
    complexity: 7,
    connections: ["fep", "predictive", "extended-mind"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 5,
  },
  {
    id: "extended-mind",
    name: "Clark & Chalmers's Extended Mind",
    category: "materialism",
    subcategory: "Relational",
    description: "Clark and Chalmers: cognitive processes can extend beyond the brain into the body and environment",
    scale: "extended-mind",
    materialismIdealismAxis: 0.3,
    connectionFactors: { metaphysicalAssumptions: 0.3, locusLevel: 0.8, methodsOfStudy: 0.4, confidenceInDiscernment: 0.5, implicationsOpenness: 0.5 },
    implications: ["ai-consciousness"],
    scholarlyInterest: 8,
    complexity: 5,
    connections: ["enactivism", "strange-loops"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 6,
  },
  {
    id: "strange-loops",
    name: "Hofstadter's Strange Loops",
    category: "materialism",
    subcategory: "Relational",
    description: "Hofstadter: consciousness arises from self-referential strange loops in the brain's symbolic patterns",
    scale: "whole-brain",
    materialismIdealismAxis: 0.25,
    connectionFactors: { metaphysicalAssumptions: 0.2, locusLevel: 0.6, methodsOfStudy: 0.4, confidenceInDiscernment: 0.5, implicationsOpenness: 0.5 },
    implications: ["ai-consciousness"],
    scholarlyInterest: 7,
    complexity: 8,
    connections: ["extended-mind", "functionalism", "gwt"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 4,
  },
  {
    id: "functionalism",
    name: "Putnam's Machine Functionalism",
    category: "materialism",
    subcategory: "Computational & Functionalism",
    description: "Putnam: mental states are defined by their functional role, not their physical substrate — any system with the right functional organization is conscious",
    scale: "neural-network",
    materialismIdealismAxis: 0.15,
    connectionFactors: { metaphysicalAssumptions: 0.1, locusLevel: 0.5, methodsOfStudy: 0.3, confidenceInDiscernment: 0.6, implicationsOpenness: 0.7 },
    implications: ["ai-consciousness", "virtual-immortality"],
    scholarlyInterest: 9,
    complexity: 5,
    connections: ["strange-loops", "ctm", "gwt"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 3,
  },
  {
    id: "ctm",
    name: "Conscious Turing Machine",
    category: "materialism",
    subcategory: "Computational & Functionalism",
    description: "Blums: a mathematical model of a Turing machine augmented with consciousness — formalizing what it means for a computation to be conscious",
    scale: "neural-network",
    materialismIdealismAxis: 0.1,
    connectionFactors: { metaphysicalAssumptions: 0.08, locusLevel: 0.5, methodsOfStudy: 0.2, confidenceInDiscernment: 0.5, implicationsOpenness: 0.8 },
    implications: ["ai-consciousness", "virtual-immortality"],
    scholarlyInterest: 5,
    complexity: 9,
    connections: ["functionalism", "gwt"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 3,
  },
  {
    id: "rpt",
    name: "Lamme's Recurrent Processing Theory",
    category: "materialism",
    subcategory: "First-Order",
    description: "Lamme: consciousness requires recurrent processing in the cortex — feed-forward processing alone is unconscious",
    scale: "neuronal",
    materialismIdealismAxis: 0.1,
    connectionFactors: { metaphysicalAssumptions: 0.1, locusLevel: 0.4, methodsOfStudy: 0.15, confidenceInDiscernment: 0.7, implicationsOpenness: 0.2 },
    implications: [],
    scholarlyInterest: 7,
    complexity: 6,
    connections: ["gwt", "ncc", "hott"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 2,
  },
  {
    id: "hott",
    name: "Rosenthal's Higher-Order Thought",
    category: "materialism",
    subcategory: "Higher-Order",
    description: "Rosenthal: a mental state is conscious when it is the object of a higher-order thought — consciousness requires meta-cognition",
    scale: "whole-brain",
    materialismIdealismAxis: 0.15,
    connectionFactors: { metaphysicalAssumptions: 0.12, locusLevel: 0.6, methodsOfStudy: 0.35, confidenceInDiscernment: 0.6, implicationsOpenness: 0.3 },
    implications: [],
    scholarlyInterest: 7,
    complexity: 6,
    connections: ["gwt", "rpt", "ast"],
    sourceUrl: "https://loc.closertotruth.com/materialism",
    quantumLevel: 4,
  },

  // ═══ NON-REDUCTIVE PHYSICALISM ═══
  {
    id: "strong-emergence",
    name: "Ellis's Strong Emergence",
    category: "non-reductive-physicalism",
    subcategory: "Strong Emergence",
    description: "Ellis: consciousness is a strongly emergent property — it arises from physical processes but is not reducible to them, with genuine top-down causation",
    scale: "whole-brain",
    materialismIdealismAxis: 0.25,
    connectionFactors: { metaphysicalAssumptions: 0.25, locusLevel: 0.6, methodsOfStudy: 0.4, confidenceInDiscernment: 0.4, implicationsOpenness: 0.4 },
    implications: [],
    scholarlyInterest: 6,
    complexity: 6,
    connections: ["fep", "iit", "dual-aspect"],
    sourceUrl: "https://loc.closertotruth.com/non-reductive-physicalism",
    quantumLevel: 4,
  },

  // ═══ QUANTUM & DIMENSIONS ═══
  {
    id: "orch-or",
    name: "Penrose-Hameroff Orch-OR",
    category: "quantum-dimensions",
    subcategory: "Quantum Collapse",
    description: "Penrose-Hameroff: consciousness arises from quantum computations in microtubules that undergo objective reduction — connecting consciousness to fundamental physics",
    scale: "quantum",
    materialismIdealismAxis: 0.35,
    connectionFactors: { metaphysicalAssumptions: 0.35, locusLevel: 0.1, methodsOfStudy: 0.3, confidenceInDiscernment: 0.3, implicationsOpenness: 0.5 },
    implications: ["life-after-death"],
    scholarlyInterest: 8,
    complexity: 9,
    connections: ["quantum-info", "ruliad-consciousness", "iit"],
    sourceUrl: "https://loc.closertotruth.com/quantum-dimensions",
    quantumLevel: 0,
  },
  {
    id: "ruliad-consciousness",
    name: "Wolfram's Consciousness in the Ruliad",
    category: "quantum-dimensions",
    subcategory: "Quantum Collapse",
    description: "Wolfram: consciousness corresponds to a particular kind of sampling of the Ruliad — observers with computational boundedness perceive a coherent reality",
    scale: "universe",
    materialismIdealismAxis: 0.4,
    connectionFactors: { metaphysicalAssumptions: 0.4, locusLevel: 0.9, methodsOfStudy: 0.3, confidenceInDiscernment: 0.3, implicationsOpenness: 0.6 },
    implications: ["ai-consciousness"],
    scholarlyInterest: 6,
    complexity: 10,
    connections: ["orch-or", "iit", "panpsychism-chalmers", "causal-views"],
    sourceUrl: "https://loc.closertotruth.com/quantum-dimensions",
    quantumLevel: 7,
  },
  {
    id: "quantum-info",
    name: "Faggin's Quantum Information",
    category: "quantum-dimensions",
    subcategory: "Quantum Information",
    description: "Faggin: consciousness is a fundamental property of quantum information — it cannot be copied, only transformed",
    scale: "quantum",
    materialismIdealismAxis: 0.5,
    connectionFactors: { metaphysicalAssumptions: 0.5, locusLevel: 0.1, methodsOfStudy: 0.4, confidenceInDiscernment: 0.3, implicationsOpenness: 0.7 },
    implications: ["life-after-death", "meaning-purpose"],
    scholarlyInterest: 5,
    complexity: 8,
    connections: ["orch-or", "panpsychism-chalmers", "iit"],
    sourceUrl: "https://loc.closertotruth.com/quantum-dimensions",
    quantumLevel: 0,
  },
  {
    id: "causal-views",
    name: "Smolin's Causal Theory of Views",
    category: "quantum-dimensions",
    subcategory: "Higher Dimensions",
    description: "Smolin: consciousness is related to the causal structure of events — each event has a 'view' of the rest of the universe",
    scale: "universe",
    materialismIdealismAxis: 0.4,
    connectionFactors: { metaphysicalAssumptions: 0.4, locusLevel: 0.9, methodsOfStudy: 0.4, confidenceInDiscernment: 0.3, implicationsOpenness: 0.5 },
    implications: [],
    scholarlyInterest: 5,
    complexity: 9,
    connections: ["ruliad-consciousness", "relational-qm"],
    sourceUrl: "https://loc.closertotruth.com/quantum-dimensions",
    quantumLevel: 7,
  },
  {
    id: "relational-qm",
    name: "Rovelli's Relational Physics",
    category: "quantum-dimensions",
    subcategory: "Quantum Fields",
    description: "Rovelli: quantum mechanics is about relations between systems, not absolute states — consciousness may be an instance of this relational structure",
    scale: "quantum",
    materialismIdealismAxis: 0.35,
    connectionFactors: { metaphysicalAssumptions: 0.35, locusLevel: 0.1, methodsOfStudy: 0.4, confidenceInDiscernment: 0.3, implicationsOpenness: 0.4 },
    implications: [],
    scholarlyInterest: 6,
    complexity: 9,
    connections: ["causal-views", "orch-or"],
    sourceUrl: "https://loc.closertotruth.com/quantum-dimensions",
    quantumLevel: 0,
  },

  // ═══ INFORMATION ═══
  {
    id: "iit",
    name: "Tononi's Integrated Information Theory",
    category: "information",
    subcategory: "Integrated Information",
    description: "Tononi: consciousness IS integrated information (Φ) — any system with Φ > 0 is conscious to some degree",
    scale: "neural-network",
    materialismIdealismAxis: 0.45,
    connectionFactors: { metaphysicalAssumptions: 0.4, locusLevel: 0.5, methodsOfStudy: 0.3, confidenceInDiscernment: 0.5, implicationsOpenness: 0.6 },
    implications: ["ai-consciousness"],
    scholarlyInterest: 10,
    complexity: 9,
    connections: ["gwt", "panpsychism-chalmers", "orch-or", "fep", "causal-emergence"],
    sourceUrl: "https://loc.closertotruth.com/information",
    quantumLevel: 3,
  },
  {
    id: "causal-emergence",
    name: "Hoel's Causal Emergence",
    category: "information",
    subcategory: "Causal Emergence",
    description: "Hoel: higher-level causal models can have more causal power than their micro-level descriptions — emergence is real and quantifiable",
    scale: "neural-network",
    materialismIdealismAxis: 0.35,
    connectionFactors: { metaphysicalAssumptions: 0.3, locusLevel: 0.5, methodsOfStudy: 0.3, confidenceInDiscernment: 0.5, implicationsOpenness: 0.4 },
    implications: [],
    scholarlyInterest: 7,
    complexity: 8,
    connections: ["iit", "strong-emergence"],
    sourceUrl: "https://loc.closertotruth.com/information",
    quantumLevel: 3,
  },
  {
    id: "double-aspect-info",
    name: "Chalmers's Double-Aspect Theory",
    category: "information",
    subcategory: "Information Fields",
    description: "Chalmers: information has two aspects — physical and phenomenal — and consciousness is the intrinsic aspect of information",
    scale: "universe",
    materialismIdealismAxis: 0.55,
    connectionFactors: { metaphysicalAssumptions: 0.55, locusLevel: 0.9, methodsOfStudy: 0.5, confidenceInDiscernment: 0.4, implicationsOpenness: 0.7 },
    implications: ["ai-consciousness", "meaning-purpose"],
    scholarlyInterest: 8,
    complexity: 7,
    connections: ["iit", "panpsychism-chalmers", "russellian-monism"],
    sourceUrl: "https://loc.closertotruth.com/information",
    quantumLevel: 7,
  },

  // ═══ PANPSYCHISMS ═══
  {
    id: "panpsychism-chalmers",
    name: "Chalmers's Panpsychism",
    category: "panpsychisms",
    subcategory: "Micropsychism",
    description: "Chalmers: consciousness may be a fundamental feature of reality — even elementary particles have some form of proto-experience",
    scale: "quantum",
    materialismIdealismAxis: 0.6,
    connectionFactors: { metaphysicalAssumptions: 0.6, locusLevel: 0.1, methodsOfStudy: 0.5, confidenceInDiscernment: 0.3, implicationsOpenness: 0.7 },
    implications: ["ai-consciousness", "meaning-purpose"],
    scholarlyInterest: 9,
    complexity: 6,
    connections: ["iit", "double-aspect-info", "cosmopsychism", "russellian-monism"],
    sourceUrl: "https://loc.closertotruth.com/panpsychisms",
    quantumLevel: 0,
  },
  {
    id: "cosmopsychism",
    name: "Cosmopsychism",
    category: "panpsychisms",
    subcategory: "Cosmopsychism",
    description: "The universe as a whole is the fundamental conscious entity, and individual consciousnesses are derived from it",
    scale: "universe",
    materialismIdealismAxis: 0.7,
    connectionFactors: { metaphysicalAssumptions: 0.7, locusLevel: 1.0, methodsOfStudy: 0.6, confidenceInDiscernment: 0.2, implicationsOpenness: 0.9 },
    implications: ["meaning-purpose", "life-after-death"],
    scholarlyInterest: 6,
    complexity: 7,
    connections: ["panpsychism-chalmers", "analytic-idealism", "cosmic-consciousness"],
    sourceUrl: "https://loc.closertotruth.com/panpsychisms",
    quantumLevel: 7,
  },

  // ═══ MONISMS ═══
  {
    id: "russellian-monism",
    name: "Russellian Monism",
    category: "monisms",
    subcategory: "Russellian Monism",
    description: "The intrinsic nature of physical entities involves proto-conscious qualities — physics describes only structural/relational properties, not intrinsic nature",
    scale: "quantum",
    materialismIdealismAxis: 0.5,
    connectionFactors: { metaphysicalAssumptions: 0.5, locusLevel: 0.1, methodsOfStudy: 0.6, confidenceInDiscernment: 0.3, implicationsOpenness: 0.5 },
    implications: ["meaning-purpose"],
    scholarlyInterest: 7,
    complexity: 7,
    connections: ["panpsychism-chalmers", "double-aspect-info", "dual-aspect"],
    sourceUrl: "https://loc.closertotruth.com/monisms",
    quantumLevel: 0,
  },
  {
    id: "dual-aspect",
    name: "Atmanspacher's Dual-Aspect Monism",
    category: "monisms",
    subcategory: "Dual-Aspect Monism",
    description: "Atmanspacher: mind and matter are complementary aspects of one underlying psychophysically neutral reality",
    scale: "universe",
    materialismIdealismAxis: 0.5,
    connectionFactors: { metaphysicalAssumptions: 0.5, locusLevel: 0.9, methodsOfStudy: 0.5, confidenceInDiscernment: 0.3, implicationsOpenness: 0.5 },
    implications: ["meaning-purpose"],
    scholarlyInterest: 6,
    complexity: 8,
    connections: ["russellian-monism", "strong-emergence", "iit"],
    sourceUrl: "https://loc.closertotruth.com/monisms",
    quantumLevel: 7,
  },

  // ═══ DUALISMS ═══
  {
    id: "property-dualism",
    name: "Property Dualism",
    category: "dualisms",
    subcategory: "Property Dualism",
    description: "Mental properties are fundamentally different from physical properties, even though there is only one type of substance",
    scale: "whole-brain",
    materialismIdealismAxis: 0.6,
    connectionFactors: { metaphysicalAssumptions: 0.6, locusLevel: 0.6, methodsOfStudy: 0.6, confidenceInDiscernment: 0.3, implicationsOpenness: 0.5 },
    implications: [],
    scholarlyInterest: 7,
    complexity: 5,
    connections: ["naturalistic-dualism", "panpsychism-chalmers"],
    sourceUrl: "https://loc.closertotruth.com/dualisms",
    quantumLevel: 4,
  },
  {
    id: "naturalistic-dualism",
    name: "Chalmers's Naturalistic Dualism",
    category: "dualisms",
    subcategory: "Emergent Dualism",
    description: "Chalmers: consciousness is not logically entailed by the physical — there are psychophysical laws linking physical processes to conscious experience",
    scale: "whole-brain",
    materialismIdealismAxis: 0.6,
    connectionFactors: { metaphysicalAssumptions: 0.6, locusLevel: 0.6, methodsOfStudy: 0.5, confidenceInDiscernment: 0.3, implicationsOpenness: 0.6 },
    implications: ["ai-consciousness"],
    scholarlyInterest: 9,
    complexity: 7,
    connections: ["property-dualism", "panpsychism-chalmers", "iit"],
    sourceUrl: "https://loc.closertotruth.com/dualisms",
    quantumLevel: 4,
  },
  {
    id: "substance-dualism",
    name: "Swinburne's Substance Dualism",
    category: "dualisms",
    subcategory: "Substance Dualism",
    description: "Swinburne: the soul is a simple, non-physical substance that is the subject of conscious experiences — distinct from the body",
    scale: "extended-mind",
    materialismIdealismAxis: 0.8,
    connectionFactors: { metaphysicalAssumptions: 0.8, locusLevel: 0.8, methodsOfStudy: 0.7, confidenceInDiscernment: 0.3, implicationsOpenness: 0.9 },
    implications: ["life-after-death", "meaning-purpose"],
    scholarlyInterest: 6,
    complexity: 5,
    connections: ["property-dualism", "thomistic-dualism"],
    sourceUrl: "https://loc.closertotruth.com/dualisms",
    quantumLevel: 6,
  },
  {
    id: "thomistic-dualism",
    name: "Stump's Thomistic Dualism",
    category: "dualisms",
    subcategory: "Substance Dualism",
    description: "Stump: the soul is the form of the body (Aristotelian hylomorphism) — mind and body are unified but the soul can survive separation",
    scale: "whole-body",
    materialismIdealismAxis: 0.7,
    connectionFactors: { metaphysicalAssumptions: 0.7, locusLevel: 0.7, methodsOfStudy: 0.7, confidenceInDiscernment: 0.3, implicationsOpenness: 0.8 },
    implications: ["life-after-death", "meaning-purpose"],
    scholarlyInterest: 5,
    complexity: 7,
    connections: ["substance-dualism"],
    sourceUrl: "https://loc.closertotruth.com/dualisms",
    quantumLevel: 5,
  },

  // ═══ IDEALISMS ═══
  {
    id: "analytic-idealism",
    name: "Kastrup's Analytic Idealism",
    category: "idealisms",
    subcategory: "Analytic Idealism",
    description: "Kastrup: consciousness is the sole ontological primitive — all physical reality is an appearance within a transpersonal consciousness",
    scale: "universe",
    materialismIdealismAxis: 0.95,
    connectionFactors: { metaphysicalAssumptions: 0.95, locusLevel: 1.0, methodsOfStudy: 0.6, confidenceInDiscernment: 0.4, implicationsOpenness: 0.9 },
    implications: ["meaning-purpose", "life-after-death"],
    scholarlyInterest: 7,
    complexity: 7,
    connections: ["cosmopsychism", "conscious-realism", "cosmic-consciousness"],
    sourceUrl: "https://loc.closertotruth.com/idealisms",
    quantumLevel: 7,
  },
  {
    id: "conscious-realism",
    name: "Hoffman's Conscious Realism",
    category: "idealisms",
    subcategory: "Analytic Idealism",
    description: "Hoffman: spacetime and physical objects are not fundamental — they are a user interface constructed by conscious agents",
    scale: "universe",
    materialismIdealismAxis: 0.9,
    connectionFactors: { metaphysicalAssumptions: 0.9, locusLevel: 1.0, methodsOfStudy: 0.4, confidenceInDiscernment: 0.4, implicationsOpenness: 0.9 },
    implications: ["meaning-purpose", "life-after-death", "virtual-immortality"],
    scholarlyInterest: 7,
    complexity: 8,
    connections: ["analytic-idealism", "iit"],
    sourceUrl: "https://loc.closertotruth.com/idealisms",
    quantumLevel: 7,
  },
  {
    id: "cosmic-consciousness",
    name: "Indian Cosmic Consciousness",
    category: "idealisms",
    subcategory: "Cosmic Consciousness",
    description: "Vedantic and Buddhist traditions: universal consciousness (Brahman/Buddha-nature) is the ground of all reality",
    scale: "universe",
    materialismIdealismAxis: 1.0,
    connectionFactors: { metaphysicalAssumptions: 1.0, locusLevel: 1.0, methodsOfStudy: 0.8, confidenceInDiscernment: 0.5, implicationsOpenness: 1.0 },
    implications: ["meaning-purpose", "life-after-death"],
    scholarlyInterest: 7,
    complexity: 6,
    connections: ["analytic-idealism", "cosmopsychism", "non-duality"],
    sourceUrl: "https://loc.closertotruth.com/idealisms",
    quantumLevel: 7,
  },
  {
    id: "non-duality",
    name: "Spira's Non-Duality",
    category: "idealisms",
    subcategory: "Non-Duality",
    description: "Spira: consciousness is the only thing that knows itself — all experience is consciousness knowing itself",
    scale: "universe",
    materialismIdealismAxis: 0.98,
    connectionFactors: { metaphysicalAssumptions: 0.98, locusLevel: 1.0, methodsOfStudy: 0.9, confidenceInDiscernment: 0.6, implicationsOpenness: 1.0 },
    implications: ["meaning-purpose", "life-after-death"],
    scholarlyInterest: 5,
    complexity: 4,
    connections: ["cosmic-consciousness", "analytic-idealism"],
    sourceUrl: "https://loc.closertotruth.com/idealisms",
    quantumLevel: 7,
  },

  // ═══ ANOMALOUS & ALTERED STATES ═══
  {
    id: "morphic-fields",
    name: "Sheldrake's Morphic Fields",
    category: "anomalous-altered",
    subcategory: "Field Theories",
    description: "Sheldrake: self-organizing fields of information shape the development and behavior of all living systems across space and time",
    scale: "universe",
    materialismIdealismAxis: 0.75,
    connectionFactors: { metaphysicalAssumptions: 0.75, locusLevel: 0.9, methodsOfStudy: 0.5, confidenceInDiscernment: 0.2, implicationsOpenness: 0.9 },
    implications: ["life-after-death", "meaning-purpose"],
    scholarlyInterest: 5,
    complexity: 6,
    connections: ["cosmopsychism", "resonance"],
    sourceUrl: "https://loc.closertotruth.com/anomalous-and-altered-states",
    quantumLevel: 7,
  },
  {
    id: "resonance",
    name: "Hunt & Schooler's General Resonance",
    category: "anomalous-altered",
    subcategory: "Field Theories",
    description: "Hunt and Schooler: consciousness arises from shared resonance — when entities vibrate at the same frequency, they share information",
    scale: "universe",
    materialismIdealismAxis: 0.6,
    connectionFactors: { metaphysicalAssumptions: 0.6, locusLevel: 0.9, methodsOfStudy: 0.4, confidenceInDiscernment: 0.3, implicationsOpenness: 0.7 },
    implications: ["ai-consciousness"],
    scholarlyInterest: 5,
    complexity: 6,
    connections: ["emf", "morphic-fields", "iit"],
    sourceUrl: "https://loc.closertotruth.com/anomalous-and-altered-states",
    quantumLevel: 7,
  },
  {
    id: "integral-theory",
    name: "Wilber's Integral Theory",
    category: "anomalous-altered",
    subcategory: "Integral Theory",
    description: "Wilber: consciousness evolves through stages and can be mapped along multiple dimensions — interior/exterior, individual/collective",
    scale: "universe",
    materialismIdealismAxis: 0.65,
    connectionFactors: { metaphysicalAssumptions: 0.65, locusLevel: 0.9, methodsOfStudy: 0.6, confidenceInDiscernment: 0.4, implicationsOpenness: 0.8 },
    implications: ["meaning-purpose"],
    scholarlyInterest: 6,
    complexity: 8,
    connections: ["cosmopsychism", "teilhard"],
    sourceUrl: "https://loc.closertotruth.com/anomalous-and-altered-states",
    quantumLevel: 7,
  },
  {
    id: "teilhard",
    name: "Teilhard de Chardin's Evolving Consciousness",
    category: "monisms",
    subcategory: "Neutral Monism",
    description: "Teilhard: consciousness is an intrinsic property of matter that evolves toward an 'Omega Point' of maximum complexity and unity",
    scale: "universe",
    materialismIdealismAxis: 0.6,
    connectionFactors: { metaphysicalAssumptions: 0.6, locusLevel: 1.0, methodsOfStudy: 0.7, confidenceInDiscernment: 0.3, implicationsOpenness: 0.9 },
    implications: ["meaning-purpose", "life-after-death"],
    scholarlyInterest: 6,
    complexity: 6,
    connections: ["integral-theory", "cosmopsychism"],
    sourceUrl: "https://loc.closertotruth.com/monisms",
    quantumLevel: 7,
  },

  // ═══ CHALLENGE ═══
  {
    id: "mysterianism",
    name: "McGinn's Mysterianism",
    category: "challenge",
    subcategory: "Mysterianism",
    description: "McGinn: the human mind is constitutionally incapable of solving the mind-body problem — consciousness is a 'cognitive closure' for us",
    scale: "whole-brain",
    materialismIdealismAxis: 0.5,
    connectionFactors: { metaphysicalAssumptions: 0.5, locusLevel: 0.6, methodsOfStudy: 0.7, confidenceInDiscernment: 0.05, implicationsOpenness: 0.3 },
    implications: [],
    scholarlyInterest: 7,
    complexity: 4,
    connections: ["hard-problem", "nagel-cosmos"],
    sourceUrl: "https://loc.closertotruth.com/challenge",
    quantumLevel: 4,
  },
  {
    id: "hard-problem",
    name: "The Hard Problem",
    category: "challenge",
    subcategory: "New Approaches",
    description: "Chalmers's formulation: why is there something it is like to have conscious experience? Why doesn't all information processing happen 'in the dark'?",
    scale: "whole-brain",
    materialismIdealismAxis: 0.5,
    connectionFactors: { metaphysicalAssumptions: 0.5, locusLevel: 0.6, methodsOfStudy: 0.5, confidenceInDiscernment: 0.1, implicationsOpenness: 0.5 },
    implications: [],
    scholarlyInterest: 10,
    complexity: 3,
    connections: ["mysterianism", "naturalistic-dualism", "panpsychism-chalmers", "iit"],
    sourceUrl: "https://loc.closertotruth.com/challenge",
    quantumLevel: 4,
  },
  {
    id: "nagel-cosmos",
    name: "Nagel's Mind and Cosmos",
    category: "challenge",
    subcategory: "New Approaches",
    description: "Nagel: materialist neo-Darwinism is almost certainly false — a theory of everything must explain consciousness, not explain it away",
    scale: "universe",
    materialismIdealismAxis: 0.55,
    connectionFactors: { metaphysicalAssumptions: 0.55, locusLevel: 0.9, methodsOfStudy: 0.6, confidenceInDiscernment: 0.15, implicationsOpenness: 0.6 },
    implications: ["meaning-purpose"],
    scholarlyInterest: 8,
    complexity: 5,
    connections: ["mysterianism", "hard-problem", "panpsychism-chalmers"],
    sourceUrl: "https://loc.closertotruth.com/challenge",
    quantumLevel: 7,
  },
];

// ── Implication Metadata ─────────────────────────────────────────────────

export interface LocImplicationMeta {
  readonly id: LocImplication;
  readonly name: string;
  readonly description: string;
  readonly sourceUrl: string;
}

export const LOC_IMPLICATIONS: readonly LocImplicationMeta[] = [
  {
    id: "ai-consciousness",
    name: "AI Consciousness",
    description: "Could artificial intelligence become genuinely conscious?",
    sourceUrl: "https://loc.closertotruth.com/implications/ai-consciousness",
  },
  {
    id: "meaning-purpose",
    name: "Meaning / Purpose",
    description: "Does consciousness imply meaning or purpose in the universe?",
    sourceUrl: "https://loc.closertotruth.com/implications/meaning-purpose",
  },
  {
    id: "virtual-immortality",
    name: "Virtual Immortality",
    description: "Could consciousness be uploaded or preserved digitally?",
    sourceUrl: "https://loc.closertotruth.com/implications/virtual-immortality",
  },
  {
    id: "life-after-death",
    name: "Life after Death",
    description: "Does consciousness survive the death of the body?",
    sourceUrl: "https://loc.closertotruth.com/implications/life-after-death",
  },
];
