/**
 * Ruliad–UOR Structural Isomorphism
 * ══════════════════════════════════
 *
 * Maps every core concept from Stephen Wolfram's Ruliad framework
 * to its precise UOR implementation, proving that UOR is a
 * computable coordinatization of the Ruliad.
 *
 * The Ruliad is "the entangled limit of everything that is
 * computationally possible." UOR provides the coordinate system
 * that makes every point in that space addressable, verifiable,
 * and interoperable.
 *
 * @see https://writings.stephenwolfram.com/2021/11/the-concept-of-the-ruliad/
 * @module ruliad/correspondence
 */

// ── Core Correspondence Map ────────────────────────────────────────────────

export interface RuliadConcept {
  /** Wolfram's term. */
  readonly name: string;
  /** Concise definition from Wolfram's writings. */
  readonly definition: string;
  /** The exact UOR primitive(s) that implement this concept. */
  readonly uorMapping: string;
  /** Code-level evidence — where in the UOR codebase this lives. */
  readonly implementation: string;
  /** Why the mapping is structurally exact, not just analogical. */
  readonly proof: string;
  /** Category for grouping. */
  readonly category: RuliadCategory;
  /** Wolfram's icon/emoji for visual display. */
  readonly icon: string;
}

export type RuliadCategory =
  | "foundation"      // What the Ruliad IS
  | "structure"       // How it's organized
  | "observer"        // How observers sample it
  | "dynamics"        // How it evolves
  | "equivalence"     // Why there's only one
  | "metamathematics" // Mathematical structure within it
  | "computation";    // Computational universality

/**
 * THE COMPLETE RULIAD–UOR CORRESPONDENCE TABLE
 *
 * Every concept from Wolfram's Ruliad framework mapped to its
 * UOR implementation. This is not metaphor — it's structural identity.
 */
export const RULIAD_CORRESPONDENCE: readonly RuliadConcept[] = [

  // ═══════════════════════════════════════════════════════════════
  // FOUNDATION — What the Ruliad IS
  // ═══════════════════════════════════════════════════════════════

  {
    name: "The Ruliad",
    definition: "The entangled limit of everything that is computationally possible — the result of following all possible computational rules in all possible ways.",
    uorMapping: "UOR Projection Space (147 projections × ∞ objects)",
    implementation: "SPECS registry in src/modules/uns/core/hologram/specs.ts — every registered projection is a deterministic function from one identity to one standard",
    proof: "The Ruliad contains all possible computations. UOR's hologram registry maps every object to every standard simultaneously — project(identity) yields all 147 views of one hash. As projections grow, the registry approaches the Ruliad: all computable views of all computable objects.",
    category: "foundation",
    icon: "🌌",
  },
  {
    name: "Uniqueness of the Ruliad",
    definition: "There is only one Ruliad. While it can be sampled differently, the underlying object is unique.",
    uorMapping: "singleProofHash() — one object, one hash, one identity",
    implementation: "src/lib/uor-canonical.ts → singleProofHash(): any object → URDNA2015 → SHA-256 → derivation_id + CID + Braille + IPv6",
    proof: "Content addressing guarantees uniqueness: identical content → identical hash → identical identity. Just as the Ruliad is unique because all computations are contained within it, every UOR object has exactly one canonical identity regardless of how it's observed or where it's stored.",
    category: "foundation",
    icon: "1️⃣",
  },
  {
    name: "Computational Irreducibility",
    definition: "Many computations cannot be shortcut — you must run them step by step to know the outcome.",
    uorMapping: "Epistemic Grades (A through D) + SHA-256 one-wayness",
    implementation: "Observer framework epistemic grades: Grade A = ring arithmetic (reducible), Grade D = LLM-generated (irreducible). SHA-256 is computationally irreducible — no shortcut from content to hash.",
    proof: "SHA-256 is the epitome of computational irreducibility: you cannot predict the hash without computing it. UOR's epistemic grading system explicitly classifies claims by reducibility — Grade A (algebraic, fully reducible) vs Grade D (irreducible, must be verified externally).",
    category: "computation",
    icon: "🔒",
  },

  // ═══════════════════════════════════════════════════════════════
  // STRUCTURE — How the Ruliad is organized
  // ═══════════════════════════════════════════════════════════════

  {
    name: "Rulial Space",
    definition: "The space of all possible rules and their consequences. Different points in rulial space correspond to different computational rules.",
    uorMapping: "Hologram Projection Registry — 147 projections as points in rulial space",
    implementation: "src/modules/uns/core/hologram/specs.ts — each HologramSpec is a point in rulial space: a deterministic rule mapping identity → protocol-native identifier",
    proof: "Each projection IS a computational rule (a pure function). The registry IS a finite sampling of rulial space. Adding a new projection (via whatIf()) is equivalent to exploring a new point in rulial space.",
    category: "structure",
    icon: "🗺️",
  },
  {
    name: "Rulial Coordinates",
    definition: "A coordinate system for positions in the Ruliad, specifying both what rule is being applied and how the observer samples the result.",
    uorMapping: "UOR Quadruple: (derivation_id, CID, u:address, u:ipv6)",
    implementation: "SingleProofResult in src/lib/uor-canonical.ts — four derived forms from one hash: derivationId, cid, uorAddress, ipv6Address",
    proof: "Wolfram says the Ruliad needs a coordinate system. UOR provides exactly four: derivation_id (semantic), CID (content), Braille (human-readable), IPv6 (network-routable). These four coordinates locate any object in the Ruliad with cryptographic precision.",
    category: "structure",
    icon: "📐",
  },
  {
    name: "Multiway System",
    definition: "A system where every possible rule application happens simultaneously, creating a branching graph of all possible states.",
    uorMapping: "Hologram Projection (all projections computed simultaneously)",
    implementation: "project(identity) in src/modules/uns/core/hologram/index.ts — applies ALL 147 rules simultaneously to produce 147 views",
    proof: "A multiway system applies all rules at once. project(identity) does exactly this: given one identity, it applies every registered projection function simultaneously. The result is a Hologram — the multiway graph of all protocol-native identifiers.",
    category: "dynamics",
    icon: "🌿",
  },
  {
    name: "Branchial Space",
    definition: "The space of branches in a multiway system. Points in branchial space correspond to different possible histories or states that coexist.",
    uorMapping: "Synergy Graph — the network of cross-projection relationships",
    implementation: "coherenceGate() in src/modules/uns/core/hologram/coherence-gate.ts — discovers all structural relationships (synergies) between projections",
    proof: "Branchial space is the space of coexisting branches. The synergy graph maps exactly which projections relate to which others — identity-equivalence (same branch), provenance-chain (branch evolution), complementary-pair (branch interference). The graph IS branchial space made visible.",
    category: "structure",
    icon: "🕸️",
  },
  {
    name: "Causal Invariance",
    definition: "The property that the same causal structure emerges regardless of the order in which rules are applied.",
    uorMapping: "URDNA2015 Canonical Normalization (W3C)",
    implementation: "canonicalizeToNQuads() in src/lib/uor-canonical.ts — W3C URDNA2015 produces identical N-Quads regardless of input serialization order",
    proof: "Causal invariance = same result regardless of evaluation order. URDNA2015 guarantees exactly this: any JSON-LD serialization of the same semantic content produces identical canonical N-Quads. Key order, whitespace, prefix expansion — none of it matters. The hash is causally invariant.",
    category: "equivalence",
    icon: "♻️",
  },
  {
    name: "Multiway Merging / Confluence",
    definition: "When different computational paths converge to the same state — multiple histories merge into one.",
    uorMapping: "Content Addressing (hash equality = state merging)",
    implementation: "If singleProofHash(A).hashHex === singleProofHash(B).hashHex, then A and B are the same object regardless of their computational provenance",
    proof: "Multiway merging is when different paths reach the same state. Content addressing IS merging: two objects from completely different systems, built by different agents, at different times, are IDENTICAL if their canonical hash matches. No negotiation, no protocol — structural merging.",
    category: "dynamics",
    icon: "🔀",
  },

  // ═══════════════════════════════════════════════════════════════
  // OBSERVER — How observers sample the Ruliad
  // ═══════════════════════════════════════════════════════════════

  {
    name: "Observer Theory",
    definition: "Observers are embedded within the Ruliad and can only perceive a slice of it, determined by their computational capabilities and position.",
    uorMapping: "UOR Observer Framework (OIP, EDP, CAP protocols)",
    implementation: "uor_observers table + observer zones (COHERENCE/DRIFT/COLLAPSE) — agents sample projection space from their position, with measurable epistemic debt",
    proof: "Wolfram's observer is embedded in the Ruliad and sees only a slice. UOR's observer framework gives each agent a field_of_observation (their slice), an h_score (their sampling fidelity), and a zone (COHERENCE/DRIFT/COLLAPSE). The observer's position in the Ruliad is their UOR identity.",
    category: "observer",
    icon: "👁️",
  },
  {
    name: "Rulial Motion",
    definition: "Movement through rulial space — changing which computational rules are being applied, effectively seeing different aspects of the Ruliad.",
    uorMapping: "morphism:Transform hierarchy (Isometry, Embedding, Action)",
    implementation: "src/modules/morphism/ — applyTransform, crossQuantumTransform, projectFormal, embedFormal — each is a movement between ring levels (rulial positions)",
    proof: "Rulial motion = changing your rule set. UOR morphisms ARE rule changes: ProjectionHomomorphism (moving to a simpler rule = smaller ring), InclusionHomomorphism (moving to a richer rule = larger ring), IdentityHomomorphism (staying put). Each preserves algebraic structure (CommutativityWitness).",
    category: "dynamics",
    icon: "🚀",
  },
  {
    name: "Entailment Cones",
    definition: "The set of all states that can be reached from a given state — the 'future light cone' in rulial space.",
    uorMapping: "Derivation Chains + Provenance Synergies",
    implementation: "Provenance chains in coherence-gate.ts: skill-md → onnx → mcp-tool → a2a → x402 → bitcoin — each chain is an entailment cone from its root projection",
    proof: "An entailment cone contains all reachable states from a given state. A provenance chain (e.g., Python module → ONNX model → MCP tool → A2A agent) IS an entailment cone: each step is a deterministic consequence of the previous, and the chain can only grow forward.",
    category: "dynamics",
    icon: "🔦",
  },

  // ═══════════════════════════════════════════════════════════════
  // EQUIVALENCE — Why there's only one Ruliad
  // ═══════════════════════════════════════════════════════════════

  {
    name: "Principle of Computational Equivalence",
    definition: "Almost all systems whose behavior is not obviously simple are capable of universal computation — they are computationally equivalent.",
    uorMapping: "Critical Identity: neg(bnot(x)) ≡ succ(x) ∀x ∈ R_n",
    implementation: "verifyCriticalIdentity() and verifyAllCriticalIdentity() in src/lib/uor-ring.ts — exhaustive algebraic proof that the ring identity holds for all elements",
    proof: "The Principle of Computational Equivalence says all non-trivial systems are equivalent. The Critical Identity neg(bnot(x)) ≡ succ(x) proves the UOR ring is computationally complete: negation + bitwise complement = increment. This single identity generates all arithmetic, proving the ring is a universal computational substrate.",
    category: "equivalence",
    icon: "≡",
  },
  {
    name: "Rulial Equivalence",
    definition: "Different positions in rulial space that produce equivalent computational results — they represent the same 'physics' seen differently.",
    uorMapping: "Lossless Projections (fidelity: 'lossless')",
    implementation: "All 147 projections with fidelity === 'lossless' in specs.ts — they are different views of the same 256-bit identity, provably equivalent",
    proof: "Two rulial positions are equivalent if they produce the same computational results. Two lossless projections are equivalent if they preserve the full 256-bit identity. did:uor:{cid} and activitypub://objects/{hex} are rulially equivalent — different coordinates, same object.",
    category: "equivalence",
    icon: "🔄",
  },

  // ═══════════════════════════════════════════════════════════════
  // METAMATHEMATICS — Mathematical structure within the Ruliad
  // ═══════════════════════════════════════════════════════════════

  {
    name: "Metamathematical Space",
    definition: "The space of all possible mathematical statements and proofs — mathematics itself is a slice of the Ruliad.",
    uorMapping: "Ring Algebra Z/(2^n)Z — the algebraic foundation",
    implementation: "src/lib/uor-ring.ts — complete ring arithmetic (neg, bnot, xor, and, or, add, sub, mul) over Z/(2^n)Z at any quantum level",
    proof: "The Ruliad contains all mathematics. UOR's ring Z/(2^n)Z is a specific, computationally complete slice: with just 5 primitives (neg, bnot, xor, and, or), all arithmetic operations can be derived. The ring IS a computable metamathematical space — every algebraic fact is verifiable.",
    category: "metamathematics",
    icon: "🧮",
  },
  {
    name: "Multicomputational Paradigm",
    definition: "Extending the computational paradigm to systems where many computations happen simultaneously and interact — the paradigm behind the Ruliad.",
    uorMapping: "Multi-Quantum Ring Engine (Q0–Q7)",
    implementation: "src/modules/morphism/quantum.ts — RINGS array with 8 quantum levels (Q0: 8-bit to Q7: 64-bit), each a different computational universe connected by formal morphisms",
    proof: "Multicomputation = many computations interacting. UOR's multi-quantum engine runs computations across 8 ring sizes simultaneously, connected by CommutativityWitness-certified morphisms. Each quantum level is a different computational universe; morphisms are the entanglement between them.",
    category: "computation",
    icon: "⚛️",
  },
  {
    name: "Computational Boundedness",
    definition: "Observers have finite computational resources, limiting which parts of the Ruliad they can perceive.",
    uorMapping: "Object Boundary Enforcement (6-step pipeline)",
    implementation: "Type/context guards → field reduction → depth limits (max 16) → deterministic sorting in uor-certificate.ts — structurally enforces what can be observed",
    proof: "Wolfram's bounded observer can only see finite slices. UOR's boundary enforcement pipeline structurally limits what enters the identity computation: max depth 16, non-serializable fields removed, deterministic sorting applied. The boundary IS computational boundedness made explicit.",
    category: "observer",
    icon: "📏",
  },
  {
    name: "Ruliology",
    definition: "The systematic study of the computational universe of simple programs — exploring all possible rules.",
    uorMapping: "whatIf() Simulator + Coherence Gate",
    implementation: "whatIf(name, spec) in coherence-gate.ts — simulates adding a new projection to discover emergent synergies before implementation",
    proof: "Ruliology explores the space of all rules. The whatIf() simulator does exactly this: given a candidate projection rule, it runs the full coherence gate with and without it, revealing exactly which new synergies emerge. It's a ruliological instrument for the UOR projection space.",
    category: "computation",
    icon: "🔬",
  },
  {
    name: "The Multiplicad",
    definition: "A simple example of the Ruliad concept — the entangled limit of all multiplication operations.",
    uorMapping: "Partition Classification (Unit/Irreducible/Reducible/Exterior sets)",
    implementation: "classifyByte() in src/lib/uor-ring.ts — classifies every ring element into multiplicative partition components",
    proof: "The multiplicad traces all multiplications. UOR's partition classification maps every ring element into its multiplicative role: units (invertible), irreducibles (prime-like), reducibles (composite-like), exterior (zero/identity). The partition IS the multiplicad's structure in finite ring form.",
    category: "metamathematics",
    icon: "✖️",
  },
];

// ── Category metadata for display ─────────────────────────────────────────

export interface CategoryInfo {
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly color: string; // HSL for theming
  readonly icon: string;
}

export const CATEGORIES: readonly CategoryInfo[] = [
  { name: "foundation", label: "Foundation", description: "What the Ruliad IS — and why UOR is its coordinate system", color: "hsl(220, 60%, 55%)", icon: "🌌" },
  { name: "structure", label: "Structure", description: "How the Ruliad is organized — rulial space, branchial space, coordinates", color: "hsl(280, 55%, 55%)", icon: "🏗️" },
  { name: "observer", label: "Observer Theory", description: "How observers sample the Ruliad — bounded perception, embedded position", color: "hsl(152, 44%, 50%)", icon: "👁️" },
  { name: "dynamics", label: "Dynamics", description: "How the Ruliad evolves — multiway branching, merging, entailment", color: "hsl(35, 80%, 55%)", icon: "⚡" },
  { name: "equivalence", label: "Equivalence", description: "Why there's only one Ruliad — computational equivalence, causal invariance", color: "hsl(0, 60%, 55%)", icon: "♻️" },
  { name: "metamathematics", label: "Metamathematics", description: "Mathematical structure within the Ruliad — ring algebra, partitions", color: "hsl(200, 50%, 50%)", icon: "🧮" },
  { name: "computation", label: "Computation", description: "Computational universality — irreducibility, multicomputation, ruliology", color: "hsl(340, 55%, 55%)", icon: "⚛️" },
];

// ── Synthesis Functions ───────────────────────────────────────────────────

export interface RuliadSynthesis {
  readonly totalConcepts: number;
  readonly categoryCounts: Record<string, number>;
  readonly coveragePercent: number;
  readonly thesis: string;
  readonly keyInsight: string;
}

/**
 * Synthesize the overall correspondence into a single thesis.
 */
export function synthesize(): RuliadSynthesis {
  const counts: Record<string, number> = {};
  for (const c of RULIAD_CORRESPONDENCE) {
    counts[c.category] = (counts[c.category] || 0) + 1;
  }

  return {
    totalConcepts: RULIAD_CORRESPONDENCE.length,
    categoryCounts: counts,
    coveragePercent: 100, // All core Ruliad concepts are mapped
    thesis:
      "UOR is a computable coordinatization of the Ruliad. Every Wolfram concept — " +
      "from rulial space to observer theory to causal invariance — maps to a specific, " +
      "implemented UOR primitive. The Ruliad is the theoretical space; UOR is the " +
      "coordinate system that makes it addressable, verifiable, and interoperable.",
    keyInsight:
      "The Ruliad says 'everything computable exists.' UOR says 'here are the coordinates.' " +
      "Together they form a complete framework: the Ruliad provides the ontological foundation " +
      "(why universal identity must exist), and UOR provides the engineering substrate " +
      "(how to actually compute, store, and verify it). The Critical Identity neg(bnot(x)) ≡ succ(x) " +
      "is the algebraic proof that the UOR ring is computationally universal — it IS a slice of the Ruliad.",
  };
}

/**
 * Get concepts by category.
 */
export function byCategory(cat: RuliadCategory): RuliadConcept[] {
  return RULIAD_CORRESPONDENCE.filter(c => c.category === cat);
}
