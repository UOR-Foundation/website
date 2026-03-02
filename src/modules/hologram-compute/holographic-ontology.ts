/**
 * Holographic Ontology — Knowledge Graph on the Atlas Manifold
 * ═════════════════════════════════════════════════════════════
 *
 * Phase 2 of semantic coherence: stores relational triples
 * (subject-predicate-object) as interference patterns on the
 * 96-vertex boundary surface.
 *
 * Unlike traditional knowledge graphs (node-edge-node with string labels),
 * every triple IS a geometric object — its meaning is fully determined
 * by the activation pattern it produces on the manifold.
 *
 * Key insight: a triple (S, P, O) is stored as the composed signature
 *   sig(S) ∘ sig(P) ∘ sig(O)
 * which creates a unique interference pattern. Retrieval is then a
 * geometric nearest-neighbor search on the manifold, not string matching.
 *
 * This enables:
 *   1. Fuzzy retrieval — "What do I know about X?" finds related triples
 *      even if X was never explicitly stored
 *   2. Inference — missing edges can be interpolated from geometry
 *   3. Contradiction detection — conflicting triples create τ-mirror collisions
 *   4. Holographic compression — thousands of triples share the same 96-dim space
 *
 * Neuroscience analogy: Long-term semantic memory (temporal lobe)
 *
 * @module holographic-ontology
 */

import {
  AtlasSemanticKernel,
  type SemanticSignature,
  type SemanticDomain,
  type CompositionResult,
  compose,
  checkEntailment,
  detectContradiction,
} from "./atlas-semantic-kernel";

// ══════════════════════════════════════════════════════════════
// §1  Types
// ══════════════════════════════════════════════════════════════

/** A semantic triple stored as a manifold interference pattern. */
export interface SemanticTriple {
  readonly id: string;
  readonly subject: string;
  readonly predicate: string;
  readonly object: string;
  /** The composed interference pattern of the triple */
  readonly pattern: Float32Array;
  /** Coherence of the triple (how well S, P, O compose) */
  readonly coherence: number;
  /** When this triple was asserted */
  readonly assertedAt: number;
  /** How many times this triple has been reinforced */
  reinforcementCount: number;
  /** Confidence (0-1), decays if unreinforced */
  confidence: number;
  /** Origin: observer-asserted, inferred, or crystallized */
  readonly origin: "asserted" | "inferred" | "crystallized";
}

/** Predicate types with geometric interpretation. */
export const ONTOLOGY_PREDICATES = [
  "is-a",        // Hypernymy (cat is-a animal)
  "has-part",    // Meronymy (body has-part hand)
  "causes",      // Causation (fire causes heat)
  "requires",    // Precondition
  "enables",     // Capability
  "opposes",     // Contradiction / antonymy
  "resembles",   // Similarity
  "contains",    // Spatial/logical containment
  "precedes",    // Temporal ordering
  "produces",    // Creation / result
  "experiences", // Qualia / perception
  "believes",    // Epistemic attitude
] as const;

export type OntologyPredicate = typeof ONTOLOGY_PREDICATES[number];

/** Query result from the holographic knowledge graph. */
export interface TripleQueryResult {
  readonly triple: SemanticTriple;
  readonly similarity: number;
  readonly retrievalMethod: "exact" | "fuzzy" | "inferred";
}

/** Inference result: a new triple derived from existing knowledge. */
export interface InferredTriple {
  readonly subject: string;
  readonly predicate: string;
  readonly object: string;
  readonly confidence: number;
  readonly derivation: string;
  readonly supportingTriples: string[];
}

/** Snapshot of the ontology for diagnostics. */
export interface OntologySnapshot {
  readonly tripleCount: number;
  readonly predicateDistribution: Record<string, number>;
  readonly meanCoherence: number;
  readonly meanConfidence: number;
  readonly inferredCount: number;
  readonly domainCoverage: Record<string, number>;
  readonly contradictionCount: number;
}

export interface HolographicOntologyConfig {
  /** Max triples to store (default: 4096) */
  readonly maxTriples: number;
  /** Min confidence to keep a triple (default: 0.1) */
  readonly minConfidence: number;
  /** Confidence decay rate per tick (default: 0.999) */
  readonly confidenceDecay: number;
  /** Min similarity for fuzzy retrieval (default: 0.4) */
  readonly fuzzySimilarity: number;
  /** Min confidence for inferred triples (default: 0.3) */
  readonly inferenceThreshold: number;
}

export const DEFAULT_ONTOLOGY_CONFIG: HolographicOntologyConfig = {
  maxTriples: 4096,
  minConfidence: 0.1,
  confidenceDecay: 0.999,
  fuzzySimilarity: 0.4,
  inferenceThreshold: 0.3,
};

// ══════════════════════════════════════════════════════════════
// §2  Geometric Utilities
// ══════════════════════════════════════════════════════════════

function cosine96(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < 96; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d > 1e-12 ? dot / d : 0;
}

function l2Norm(a: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s);
}

let tripleCounter = 0;

// ══════════════════════════════════════════════════════════════
// §3  Predicate Signatures
// ══════════════════════════════════════════════════════════════

/**
 * Each predicate has a canonical geometric signature that modulates
 * how subject and object compose. These are hand-crafted from the
 * semantic domain × role geometry.
 *
 * The predicate acts as a "lens" that focuses the interference
 * between subject and object through a specific semantic channel.
 */
function buildPredicateSignature(
  predicate: string,
  kernel: AtlasSemanticKernel,
): SemanticSignature {
  // Try to look up the predicate verb in the lexicon
  const parts = predicate.split("-");
  const verb = parts[parts.length - 1]; // "is-a" → "a", but try full predicate first

  const existing = kernel.lookup(predicate) || kernel.lookup(verb);
  if (existing) return existing;

  // Fall back to inferred signature
  return kernel.infer(predicate);
}

// ══════════════════════════════════════════════════════════════
// §4  Holographic Ontology
// ══════════════════════════════════════════════════════════════

export class HolographicOntology {
  private readonly config: HolographicOntologyConfig;
  private readonly kernel: AtlasSemanticKernel;
  private readonly triples = new Map<string, SemanticTriple>();
  private tick = 0;
  private contradictions = 0;

  constructor(
    kernel: AtlasSemanticKernel,
    config: Partial<HolographicOntologyConfig> = {},
  ) {
    this.config = { ...DEFAULT_ONTOLOGY_CONFIG, ...config };
    this.kernel = kernel;
  }

  // ── Assert (Store) ──────────────────────────────────────

  /**
   * Assert a triple into the knowledge graph.
   *
   * The triple is stored as the composed interference pattern:
   *   pattern = sig(subject) ∘ sig(predicate) ∘ sig(object)
   *
   * If a matching triple already exists, it's reinforced instead.
   */
  assert(
    subject: string,
    predicate: string,
    object: string,
    origin: "asserted" | "inferred" | "crystallized" = "asserted",
  ): SemanticTriple {
    this.tick++;

    // Check for existing identical triple
    const key = `${subject}|${predicate}|${object}`.toLowerCase();
    const existing = this.triples.get(key);
    if (existing) {
      existing.reinforcementCount++;
      existing.confidence = Math.min(1, existing.confidence + 0.1);
      return existing;
    }

    // Compose the triple's interference pattern
    const sigS = this.kernel.infer(subject);
    const sigP = buildPredicateSignature(predicate, this.kernel);
    const sigO = this.kernel.infer(object);

    // S ∘ P first, then (S∘P) ∘ O
    const sp = compose(sigS, sigP);
    const spo = compose(sp.signature, sigO);

    // Check for contradictions with existing knowledge
    this.checkContradictions(spo.signature, key);

    const triple: SemanticTriple = {
      id: `t_${(++tripleCounter).toString(36)}`,
      subject,
      predicate,
      object,
      pattern: new Float32Array(spo.signature.activations),
      coherence: spo.coherence,
      assertedAt: this.tick,
      reinforcementCount: 1,
      confidence: Math.max(0.3, spo.coherence),
      origin,
    };

    // Enforce capacity limit (evict lowest confidence)
    if (this.triples.size >= this.config.maxTriples) {
      this.evictLowest();
    }

    this.triples.set(key, triple);
    return triple;
  }

  /**
   * Assert multiple triples at once (batch knowledge insertion).
   */
  assertAll(triples: { s: string; p: string; o: string }[]): SemanticTriple[] {
    return triples.map(t => this.assert(t.s, t.p, t.o));
  }

  // ── Query ───────────────────────────────────────────────

  /**
   * Query the knowledge graph by subject, predicate, and/or object.
   * Any parameter can be undefined (wildcard).
   *
   * Uses geometric similarity, not string matching — so querying
   * for "cat" will also find triples about "kitten" or "feline"
   * if their signatures are geometrically close.
   */
  query(
    subject?: string,
    predicate?: string,
    object?: string,
    topK: number = 10,
  ): TripleQueryResult[] {
    // Build a query signature by composing available terms
    let querySig: SemanticSignature | null = null;

    if (subject) {
      querySig = this.kernel.infer(subject);
    }
    if (predicate) {
      const pSig = buildPredicateSignature(predicate, this.kernel);
      querySig = querySig ? compose(querySig, pSig).signature : pSig;
    }
    if (object) {
      const oSig = this.kernel.infer(object);
      querySig = querySig ? compose(querySig, oSig).signature : oSig;
    }

    if (!querySig) {
      // No query terms — return highest-confidence triples
      return [...this.triples.values()]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, topK)
        .map(t => ({ triple: t, similarity: 1, retrievalMethod: "exact" as const }));
    }

    // Score all triples by geometric similarity to query
    const scored: TripleQueryResult[] = [];
    for (const triple of this.triples.values()) {
      const sim = cosine96(querySig.activations, triple.pattern);

      if (sim > this.config.fuzzySimilarity) {
        scored.push({
          triple,
          similarity: sim,
          retrievalMethod: sim > 0.85 ? "exact" : "fuzzy",
        });
      }
    }

    // Sort by similarity × confidence
    scored.sort((a, b) =>
      (b.similarity * b.triple.confidence) - (a.similarity * a.triple.confidence)
    );

    return scored.slice(0, topK);
  }

  /**
   * Retrieve everything known about a concept.
   * Returns all triples where the concept appears as subject or object.
   */
  about(concept: string, topK: number = 20): TripleQueryResult[] {
    const sig = this.kernel.infer(concept);
    const results: TripleQueryResult[] = [];

    for (const triple of this.triples.values()) {
      // Check subject similarity
      const sSig = this.kernel.infer(triple.subject);
      const simS = cosine96(sig.activations, sSig.activations);

      // Check object similarity
      const oSig = this.kernel.infer(triple.object);
      const simO = cosine96(sig.activations, oSig.activations);

      const maxSim = Math.max(simS, simO);
      if (maxSim > this.config.fuzzySimilarity) {
        results.push({
          triple,
          similarity: maxSim,
          retrievalMethod: maxSim > 0.85 ? "exact" : "fuzzy",
        });
      }
    }

    results.sort((a, b) =>
      (b.similarity * b.triple.confidence) - (a.similarity * a.triple.confidence)
    );

    return results.slice(0, topK);
  }

  // ── Inference ───────────────────────────────────────────

  /**
   * Infer new triples from existing knowledge using geometric reasoning.
   *
   * Three inference modes:
   *   1. Transitive: (A is-a B) ∧ (B is-a C) → (A is-a C)
   *   2. Symmetric: (A resembles B) → (B resembles A)
   *   3. Compositional: (A causes B) ∧ (B causes C) → (A causes C)
   *
   * All done via geometric composition and coherence checking.
   */
  infer(maxInferences: number = 10): InferredTriple[] {
    const inferred: InferredTriple[] = [];
    const tripleList = [...this.triples.values()];

    for (let i = 0; i < tripleList.length && inferred.length < maxInferences; i++) {
      for (let j = i + 1; j < tripleList.length && inferred.length < maxInferences; j++) {
        const a = tripleList[i];
        const b = tripleList[j];

        // Transitive chain: a.object ≈ b.subject
        const aObjSig = this.kernel.infer(a.object);
        const bSubSig = this.kernel.infer(b.subject);
        const chainSim = cosine96(aObjSig.activations, bSubSig.activations);

        if (chainSim > 0.6 && a.predicate === b.predicate) {
          // Transitive inference
          const key = `${a.subject}|${a.predicate}|${b.object}`.toLowerCase();
          if (!this.triples.has(key)) {
            const confidence = a.confidence * b.confidence * chainSim;
            if (confidence > this.config.inferenceThreshold) {
              inferred.push({
                subject: a.subject,
                predicate: a.predicate,
                object: b.object,
                confidence,
                derivation: `transitive: (${a.subject} ${a.predicate} ${a.object}) ∧ (${b.subject} ${b.predicate} ${b.object})`,
                supportingTriples: [a.id, b.id],
              });
            }
          }
        }

        // Compositional: different predicates, same subject
        if (a.subject === b.subject && a.predicate !== b.predicate) {
          // The composition of two facts about the same subject
          // can reveal a new relationship between the objects
          const compResult = compose(
            this.kernel.infer(a.object),
            this.kernel.infer(b.object),
          );

          if (compResult.constructive) {
            const key = `${a.object}|resembles|${b.object}`.toLowerCase();
            if (!this.triples.has(key)) {
              inferred.push({
                subject: a.object,
                predicate: "resembles",
                object: b.object,
                confidence: compResult.coherence * a.confidence * b.confidence,
                derivation: `compositional: both related to ${a.subject}`,
                supportingTriples: [a.id, b.id],
              });
            }
          }
        }
      }
    }

    // Assert inferred triples
    for (const inf of inferred) {
      this.assert(inf.subject, inf.predicate, inf.object, "inferred");
    }

    return inferred;
  }

  // ── Semantic Grounding for Decoder ──────────────────────

  /**
   * Generate a semantic bias mask for the decoder.
   *
   * Given the current generation context, retrieves relevant knowledge
   * and produces a 96-dim mask that biases generation toward
   * semantically grounded tokens.
   */
  getGroundingMask(contextWords: string[]): Float32Array {
    const mask = new Float32Array(96).fill(0.5);

    // Retrieve relevant triples for each context word
    for (const word of contextWords.slice(-5)) {
      const results = this.about(word, 5);
      for (const r of results) {
        // Blend triple pattern into mask, weighted by confidence × similarity
        const weight = r.similarity * r.triple.confidence * 0.3;
        for (let i = 0; i < 96; i++) {
          mask[i] += r.triple.pattern[i] * weight;
        }
      }
    }

    // Normalize to [0, 1]
    let max = 0;
    for (let i = 0; i < 96; i++) {
      if (mask[i] > max) max = mask[i];
    }
    if (max > 1e-12) {
      for (let i = 0; i < 96; i++) mask[i] /= max;
    }

    return mask;
  }

  // ── Maintenance ─────────────────────────────────────────

  /** Apply confidence decay and evict expired triples */
  decay(): void {
    for (const [key, triple] of this.triples) {
      triple.confidence *= this.config.confidenceDecay;
      if (triple.confidence < this.config.minConfidence) {
        this.triples.delete(key);
      }
    }
  }

  // ── Diagnostics ─────────────────────────────────────────

  getSnapshot(): OntologySnapshot {
    const predDist: Record<string, number> = {};
    const domCoverage: Record<string, number> = {};
    let totalCoherence = 0;
    let totalConfidence = 0;
    let inferredCount = 0;

    for (const t of this.triples.values()) {
      predDist[t.predicate] = (predDist[t.predicate] || 0) + 1;
      totalCoherence += t.coherence;
      totalConfidence += t.confidence;
      if (t.origin === "inferred") inferredCount++;

      // Domain from pattern peak
      let maxE = 0, maxD = 0;
      for (let d = 0; d < 12; d++) {
        let e = 0;
        for (let r = 0; r < 8; r++) e += Math.abs(t.pattern[d * 8 + r]);
        if (e > maxE) { maxE = e; maxD = d; }
      }
      const domName = ["entity", "action", "property", "relation", "quantity", "time", "space", "cause", "modal", "epistemic", "social", "abstract"][maxD];
      domCoverage[domName] = (domCoverage[domName] || 0) + 1;
    }

    const n = this.triples.size || 1;
    return {
      tripleCount: this.triples.size,
      predicateDistribution: predDist,
      meanCoherence: totalCoherence / n,
      meanConfidence: totalConfidence / n,
      inferredCount,
      domainCoverage: domCoverage,
      contradictionCount: this.contradictions,
    };
  }

  getAllTriples(): SemanticTriple[] {
    return [...this.triples.values()];
  }

  getTripleCount(): number {
    return this.triples.size;
  }

  // ── Private ─────────────────────────────────────────────

  private checkContradictions(newSig: SemanticSignature, newKey: string): void {
    for (const [key, triple] of this.triples) {
      if (key === newKey) continue;
      const contradiction = detectContradiction(newSig, {
        label: key,
        activations: triple.pattern,
        domain: "abstract",
        defaultRole: "theme",
        primes: new Set(),
        norm: l2Norm(triple.pattern),
      });
      if (contradiction.contradicts) {
        this.contradictions++;
        // Reduce confidence of the weaker triple
        if (triple.confidence < 0.5) {
          triple.confidence *= 0.5;
        }
      }
    }
  }

  private evictLowest(): void {
    let lowestKey = "";
    let lowestConf = Infinity;
    for (const [key, triple] of this.triples) {
      if (triple.confidence < lowestConf) {
        lowestConf = triple.confidence;
        lowestKey = key;
      }
    }
    if (lowestKey) this.triples.delete(lowestKey);
  }
}
