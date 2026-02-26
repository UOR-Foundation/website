/**
 * UOR v2.0.0 — Symbolica-Inspired Enhancements
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Five key insights extracted from Symbolica AI's architecture and applied
 * to HODMA's neuro-symbolic pipeline for faster, leaner, more accurate inference.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  INSIGHT 1: Factored Reasoning & Recall                               │
 * │  Symbolica separates reasoning (structural) from recall (episodic).   │
 * │  → HODMA: Scaffold = reasoning trace; L0/L2 = episodic recall.       │
 * │  Enhancement: Explicit episode indexing by scaffold structure hash,   │
 * │  so structurally-equivalent queries share recall regardless of        │
 * │  surface form. "What is X?" and "Define X" share the same episode.   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  INSIGHT 2: Continuous Validator Interaction                           │
 * │  Symbolica models interact with validators during inference, not      │
 * │  just post-hoc. Our D→I→A loop already does this, but we can make    │
 * │  it tighter: validate per-sentence as tokens stream in, not after.    │
 * │  → Streaming Curvature Monitor: grade claims in real-time.           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  INSIGHT 3: Typed Composition (Categorical Morphisms)                 │
 * │  Symbolica uses category theory for composable, typed agent outputs.  │
 * │  → HODMA: Type each PGI claim slot with a morphism signature so      │
 * │  tensor product composition is algebraically sound. Mismatched        │
 * │  types trigger re-derivation rather than silent degradation.          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  INSIGHT 4: Recursive Delegation (RLM Pattern)                        │
 * │  Symbolica agents autonomously spawn sub-agents for sub-tasks.        │
 * │  → HODMA: When a scaffold has >4 constraints, decompose into         │
 * │  sub-scaffolds and resolve independently. Compose via tensor          │
 * │  product. Avoids context rot on complex queries.                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  INSIGHT 5: Scope-Evolved Discovery                                   │
 * │  Symbolica's REPL scope grows as agents discover new objects.         │
 * │  → HODMA: As the user converses, grow the scaffold's term map        │
 * │  with discovered entities — each answer enriches future scaffolds.   │
 * │  This is "conversational term evolution."                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @module ring-core/symbolica-enhancements
 */

import type { SymbolicScaffold, ScaffoldConstraint, AnnotatedClaim, EpistemicGrade } from "./neuro-symbolic";

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT 1: Structure-Hashed Episode Index
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute a "structural fingerprint" of a scaffold — independent of surface
 * phrasing. Two queries with the same constraint types and term ring values
 * produce the same structural hash, enabling cross-phrasing recall.
 *
 * "What is the holographic principle?" and "Explain holographic principle"
 * both decompose to the same structural hash because they share:
 *   - constraint types: ["factual", "logical:interrogative"]
 *   - term ring values: [hash("holographic"), hash("principle")]
 *
 * This is the categorical "skeleton functor" — mapping queries to their
 * abstract shape while forgetting surface morphology.
 */
export function structuralFingerprint(scaffold: SymbolicScaffold): string {
  // Sort constraints by type + ringValue for canonical ordering
  const constraintSig = scaffold.constraints
    .map(c => `${c.type}:${c.ringValue}`)
    .sort()
    .join("|");

  // Sort terms by ringValue (surface form doesn't matter)
  const termSig = scaffold.termMap
    .map(t => t.ringValue)
    .sort((a, b) => a - b)
    .join(",");

  // FNV-1a of the structural signature
  const sig = `S[${constraintSig}]T[${termSig}]Q${scaffold.quantum}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < sig.length; i++) {
    hash ^= sig.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `struct:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT 2: Streaming Curvature Monitor
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Real-time curvature tracking as tokens stream in. Instead of waiting
 * for the full response to measure curvature, we maintain a running
 * estimate that triggers early termination when divergence is detected.
 *
 * This is Symbolica's "continuous validator interaction" applied to
 * our D→I→A loop: the symbolic engine watches the neural output in
 * real-time and can intervene mid-stream.
 */
export class StreamingCurvatureMonitor {
  private sentenceBuffer = "";
  private sentenceCount = 0;
  private cumulativeCurvature = 0;
  private gradeDistribution = { A: 0, B: 0, C: 0, D: 0 };
  private readonly scaffold: SymbolicScaffold;
  private readonly onAlert: (msg: string, curvature: number) => void;
  private readonly earlyTerminationThreshold: number;

  constructor(
    scaffold: SymbolicScaffold,
    onAlert: (msg: string, curvature: number) => void,
    earlyTerminationThreshold = 0.85,
  ) {
    this.scaffold = scaffold;
    this.onAlert = onAlert;
    this.earlyTerminationThreshold = earlyTerminationThreshold;
  }

  /**
   * Feed incoming tokens. Returns true if inference should continue,
   * false if early termination is recommended (catastrophic divergence).
   */
  onToken(token: string): boolean {
    this.sentenceBuffer += token;

    // Check for sentence boundary
    const match = this.sentenceBuffer.match(/^(.+?[.!?])\s*(.*)/s);
    if (!match) return true; // No complete sentence yet

    const sentence = match[1];
    this.sentenceBuffer = match[2];
    this.sentenceCount++;

    // Quick-grade this sentence
    const grade = this.quickGrade(sentence);
    this.gradeDistribution[grade]++;

    // Compute running curvature
    const sentenceCurv = grade === "A" ? 0.1 : grade === "B" ? 0.3 : grade === "C" ? 0.6 : 0.9;
    this.cumulativeCurvature = (this.cumulativeCurvature * (this.sentenceCount - 1) + sentenceCurv) / this.sentenceCount;

    // Check for catastrophic divergence
    if (this.cumulativeCurvature > this.earlyTerminationThreshold && this.sentenceCount >= 3) {
      this.onAlert(
        `Curvature ${(this.cumulativeCurvature * 100).toFixed(0)}% after ${this.sentenceCount} sentences — response is diverging from scaffold`,
        this.cumulativeCurvature,
      );
      return false; // Recommend early termination
    }

    return true;
  }

  /**
   * Fast sentence grading (O(1) per scaffold term).
   * Uses term coverage + source marker detection.
   */
  private quickGrade(sentence: string): EpistemicGrade {
    const lower = sentence.toLowerCase();
    const hasSource = /\{source:\s*"[^"]+"\}/.test(sentence);
    const termHits = this.scaffold.termMap.filter(t => lower.includes(t.term)).length;
    const coverage = this.scaffold.termMap.length > 0
      ? termHits / this.scaffold.termMap.length
      : 0;

    if (hasSource && coverage > 0.3) return "A";
    if (hasSource || coverage > 0.2) return "B";
    if (coverage > 0.1) return "C";
    return "D";
  }

  /** Current running curvature [0, 1]. */
  get currentCurvature(): number { return this.cumulativeCurvature; }

  /** Current grade distribution. */
  get grades(): Readonly<Record<EpistemicGrade, number>> { return { ...this.gradeDistribution }; }

  /** Estimated overall grade so far. */
  get estimatedGrade(): EpistemicGrade {
    const total = this.sentenceCount || 1;
    if (this.gradeDistribution.A / total >= 0.5) return "A";
    if ((this.gradeDistribution.A + this.gradeDistribution.B) / total >= 0.5) return "B";
    if ((this.gradeDistribution.A + this.gradeDistribution.B + this.gradeDistribution.C) / total >= 0.5) return "C";
    return "D";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT 3: Typed Claim Morphisms
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Morphism types for claim composition (from Symbolica's categorical framework).
 * Each claim slot is typed with a morphism signature that determines how it
 * composes with adjacent claims during tensor product assembly.
 *
 * Isometry: preserves structure (factual claims — can be freely reordered)
 * Transform: changes representation (causal chains — must preserve order)
 * Embedding: adds context (definitional — must precede dependent claims)
 */
export type ClaimMorphismType = "isometry" | "transform" | "embedding";

export interface TypedClaimSlot {
  readonly constraintId: string;
  readonly morphismType: ClaimMorphismType;
  readonly dependsOn: string[];  // IDs of claims this depends on (for ordering)
}

/**
 * Infer the morphism type from a scaffold constraint.
 * Factual → isometry (freely composable)
 * Causal → transform (order-preserving)
 * Definitional → embedding (must precede dependents)
 * Logical → transform (order-preserving)
 */
export function inferMorphismType(constraint: ScaffoldConstraint): ClaimMorphismType {
  switch (constraint.type) {
    case "factual": return "isometry";
    case "causal": return "transform";
    case "definitional": return "embedding";
    case "logical": return "transform";
    default: return "isometry";
  }
}

/**
 * Build a typed composition plan from scaffold constraints.
 * Returns claims in topologically-sorted order respecting morphism dependencies.
 */
export function buildCompositionPlan(scaffold: SymbolicScaffold): TypedClaimSlot[] {
  const slots: TypedClaimSlot[] = scaffold.constraints.map(c => ({
    constraintId: c.id,
    morphismType: inferMorphismType(c),
    dependsOn: [],
  }));

  // Embeddings must precede transforms that reference the same term
  const embeddings = slots.filter(s => s.morphismType === "embedding");
  for (const slot of slots) {
    if (slot.morphismType === "transform") {
      // Transform depends on any embedding of terms it references
      for (const emb of embeddings) {
        if (emb.constraintId !== slot.constraintId) {
          (slot.dependsOn as string[]).push(emb.constraintId);
        }
      }
    }
  }

  // Topological sort: embeddings first, then isometries, then transforms
  const order: ClaimMorphismType[] = ["embedding", "isometry", "transform"];
  return [...slots].sort((a, b) =>
    order.indexOf(a.morphismType) - order.indexOf(b.morphismType)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT 4: Recursive Sub-Scaffold Decomposition
// ═══════════════════════════════════════════════════════════════════════════

/**
 * When a scaffold has too many constraints (>threshold), decompose into
 * independent sub-scaffolds that can be resolved in parallel.
 *
 * This is Symbolica's Recursive Language Model (RLM) pattern:
 * "An agent can spawn sub-agents for specific subtasks and pass only
 * the relevant state... This distributes context across sub-agents,
 * avoiding context rot."
 *
 * For HODMA: instead of sending a massive 12-constraint scaffold to
 * the LLM, split into 3-4 focused sub-scaffolds. Each gets a leaner
 * context window → better per-claim accuracy.
 */
export interface SubScaffoldPlan {
  /** Sub-scaffolds ready for independent resolution. */
  readonly subScaffolds: Array<{
    readonly constraints: ScaffoldConstraint[];
    readonly termSubset: Array<{ term: string; ringValue: number }>;
    readonly focusDescription: string;
  }>;
  /** Whether decomposition was applied (false if scaffold is small enough). */
  readonly wasDecomposed: boolean;
}

export function decomposeScaffold(
  scaffold: SymbolicScaffold,
  maxConstraintsPerSub = 4,
): SubScaffoldPlan {
  if (scaffold.constraints.length <= maxConstraintsPerSub) {
    return {
      subScaffolds: [{
        constraints: scaffold.constraints,
        termSubset: [...scaffold.termMap],
        focusDescription: "Full query",
      }],
      wasDecomposed: false,
    };
  }

  // Group constraints by type for coherent sub-scaffolds
  const groups: Record<string, ScaffoldConstraint[]> = {};
  for (const c of scaffold.constraints) {
    const key = c.type;
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  }

  const subScaffolds: SubScaffoldPlan["subScaffolds"][number][] = [];

  for (const [type, constraints] of Object.entries(groups)) {
    // Further chunk if a single type has too many
    for (let i = 0; i < constraints.length; i += maxConstraintsPerSub) {
      const chunk = constraints.slice(i, i + maxConstraintsPerSub);
      // Find terms referenced by these constraints
      const termKeys = new Set(chunk.map(c => {
        const match = c.description.match(/"([^"]+)"/);
        return match?.[1]?.toLowerCase();
      }).filter(Boolean));

      const termSubset = scaffold.termMap.filter(t =>
        termKeys.has(t.term) || termKeys.size === 0
      );

      subScaffolds.push({
        constraints: chunk,
        termSubset: termSubset.length > 0 ? termSubset : [...scaffold.termMap].slice(0, 3),
        focusDescription: `${type} claims (${chunk.length} constraints)`,
      });
    }
  }

  return { subScaffolds, wasDecomposed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT 5: Conversational Term Evolution
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Session-level term accumulator. As the conversation progresses,
 * we extract entities from responses and add them to future scaffolds.
 *
 * This implements Symbolica's "scope evolution" pattern: capabilities
 * grow as new objects are returned. In HODMA, "capabilities" = scaffold
 * terms that improve constraint coverage and grading accuracy.
 */
export class ConversationalTermEvolver {
  private discoveredTerms = new Map<string, { count: number; source: string; firstSeen: number }>();
  private readonly maxTerms: number;

  constructor(maxTerms = 64) {
    this.maxTerms = maxTerms;
  }

  /**
   * Extract and accumulate terms from a response.
   * Called after each successful inference.
   */
  ingestResponse(response: string, grade: EpistemicGrade): void {
    // Only learn from high-quality responses
    if (grade === "D") return;

    // Extract capitalized entities (proper nouns, technical terms)
    const entities = response.match(/\b[A-Z][a-z]{2,}\b/g) || [];
    // Extract quoted terms
    const quoted = response.match(/"([^"]{2,30})"/g)?.map(q => q.replace(/"/g, "")) || [];
    // Extract technical terms (camelCase, hyphenated)
    const technical = response.match(/\b[a-z]+[-][a-z]+\b/g) || [];

    const allTerms = [...new Set([...entities, ...quoted, ...technical])];

    for (const term of allTerms) {
      const lower = term.toLowerCase();
      const existing = this.discoveredTerms.get(lower);
      if (existing) {
        existing.count++;
      } else {
        if (this.discoveredTerms.size >= this.maxTerms) {
          // Evict least-referenced term
          let minKey = "";
          let minCount = Infinity;
          for (const [k, v] of this.discoveredTerms) {
            if (v.count < minCount) { minCount = v.count; minKey = k; }
          }
          if (minKey) this.discoveredTerms.delete(minKey);
        }
        this.discoveredTerms.set(lower, {
          count: 1,
          source: `grade:${grade}`,
          firstSeen: Date.now(),
        });
      }
    }
  }

  /**
   * Get evolved terms to augment a scaffold's term map.
   * Returns terms sorted by frequency (most-referenced first).
   */
  getEvolvedTerms(limit = 8): Array<{ term: string; ringValue: number; frequency: number }> {
    return Array.from(this.discoveredTerms.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([term, data]) => {
        let hash = 0;
        for (let i = 0; i < term.length; i++) hash = (hash * 31 + term.charCodeAt(i)) & 0xff;
        return { term, ringValue: hash, frequency: data.count };
      });
  }

  /**
   * Augment a scaffold with evolved terms.
   * Returns enhanced termMap with session-discovered entities.
   */
  augmentScaffold(scaffold: SymbolicScaffold): SymbolicScaffold {
    const evolved = this.getEvolvedTerms();
    const existingTerms = new Set(scaffold.termMap.map(t => t.term));

    const newTerms = evolved
      .filter(t => !existingTerms.has(t.term))
      .slice(0, 4) // Don't overwhelm — max 4 evolved terms per scaffold
      .map(t => ({ term: t.term, ringValue: t.ringValue }));

    if (newTerms.length === 0) return scaffold;

    return {
      ...scaffold,
      termMap: [...scaffold.termMap, ...newTerms],
    };
  }

  get size(): number { return this.discoveredTerms.size; }

  get topTerms(): string[] {
    return Array.from(this.discoveredTerms.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([term]) => term);
  }
}
