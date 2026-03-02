/**
 * Semantic Feedback Loop — Self-Organizing Semantics via Coherence
 * ═══════════════════════════════════════════════════════════════
 *
 * Phase 4: Wires the Semantic Kernel, Holographic Ontology,
 * Coherence Reasoner, and Ontogenesis Engine into a unified
 * feedback loop that learns from its own generation.
 *
 * The key innovation: every token the decoder generates feeds back
 * into the ontology and reasoner, allowing the system to:
 *   1. Crystallize new concepts from generated text
 *   2. Strengthen ontological triples that lead to high-coherence output
 *   3. Weaken or evict knowledge that produces contradictions
 *   4. Self-generate new semantic categories without observer input
 *
 * This creates genuine neuroplasticity: the system's semantic
 * understanding evolves through usage, not training.
 *
 * Integration Architecture:
 *   ┌──────────────────────────────────────────────────┐
 *   │  CoherenceTokenDecoder (generation loop)          │
 *   │       ↓ activations         ↑ masks               │
 *   │  SemanticFeedbackLoop                              │
 *   │    ├─ SemanticKernel (word meaning)                │
 *   │    ├─ GrammarKernel (syntax)                       │
 *   │    ├─ HolographicOntology (knowledge graph)        │
 *   │    ├─ CoherenceReasoner (logical inference)        │
 *   │    └─ OntogenesisEngine (concept crystallization)  │
 *   └──────────────────────────────────────────────────┘
 *
 * Neuroscience analogy: Neuroplasticity / Hebbian learning
 *
 * @module semantic-feedback-loop
 */

import { AtlasSemanticKernel, type SemanticSignature } from "./atlas-semantic-kernel";
import { HolographicOntology, type OntologySnapshot } from "./holographic-ontology";
import { CoherenceReasoner, type ReasoningResult, type ReasonerSnapshot } from "./coherence-reasoner";
import { OntogenesisEngine, type ConceptCrystal, type OntogenesisSnapshot } from "./ontogenesis-engine";

// ══════════════════════════════════════════════════════════════
// §1  Types
// ══════════════════════════════════════════════════════════════

export interface FeedbackLoopConfig {
  /** Enable ontology grounding during generation (default: true) */
  readonly enableOntologyGrounding: boolean;
  /** Enable reasoning mask during generation (default: true) */
  readonly enableReasoningMask: boolean;
  /** Enable ontogenesis (concept crystallization) (default: true) */
  readonly enableOntogenesis: boolean;
  /** Weight of semantic mask vs raw activations (default: 0.3) */
  readonly semanticWeight: number;
  /** Weight of ontology grounding (default: 0.2) */
  readonly ontologyWeight: number;
  /** Weight of reasoning mask (default: 0.2) */
  readonly reasoningWeight: number;
  /** Weight of grammar mask (default: 0.15) */
  readonly grammarWeight: number;
  /** How often to run ontology inference (every N tokens, default: 20) */
  readonly inferenceInterval: number;
  /** How often to attempt ontogenesis propagation (default: 50) */
  readonly propagationInterval: number;
  /** How often to decay ontology confidence (default: 100) */
  readonly decayInterval: number;
}

export const DEFAULT_FEEDBACK_CONFIG: FeedbackLoopConfig = {
  enableOntologyGrounding: true,
  enableReasoningMask: true,
  enableOntogenesis: true,
  semanticWeight: 0.3,
  ontologyWeight: 0.2,
  reasoningWeight: 0.2,
  grammarWeight: 0.15,
  inferenceInterval: 20,
  propagationInterval: 50,
  decayInterval: 100,
};

/** Complete snapshot of the feedback loop state. */
export interface FeedbackLoopSnapshot {
  readonly tokenCount: number;
  readonly semantic: {
    readonly lexiconSize: number;
    readonly contextDepth: number;
    readonly currentCoherence: number;
  };
  readonly ontology: OntologySnapshot;
  readonly reasoner: ReasonerSnapshot;
  readonly ontogenesis: OntogenesisSnapshot;
  readonly feedbackCycles: number;
  readonly meanSemanticScore: number;
}

/** Per-token feedback result. */
export interface TokenFeedback {
  /** Semantic score for this token (0-1) */
  readonly semanticScore: number;
  /** Whether this token was ontology-grounded */
  readonly grounded: boolean;
  /** Whether reasoning influenced this token */
  readonly reasoningInfluenced: boolean;
  /** Number of relevant ontology triples */
  readonly relevantTriples: number;
  /** Concepts crystallized by this observation */
  readonly newConcepts: number;
}

// ══════════════════════════════════════════════════════════════
// §2  Semantic Feedback Loop
// ══════════════════════════════════════════════════════════════

export class SemanticFeedbackLoop {
  readonly kernel: AtlasSemanticKernel;
  readonly ontology: HolographicOntology;
  readonly reasoner: CoherenceReasoner;
  readonly ontogenesis: OntogenesisEngine;
  private readonly config: FeedbackLoopConfig;

  private tokenCount = 0;
  private feedbackCycles = 0;
  private totalSemanticScore = 0;
  private contextWords: string[] = [];

  constructor(config: Partial<FeedbackLoopConfig> = {}) {
    this.config = { ...DEFAULT_FEEDBACK_CONFIG, ...config };

    // Initialize the semantic stack
    this.kernel = new AtlasSemanticKernel();
    this.ontology = new HolographicOntology(this.kernel);
    this.reasoner = new CoherenceReasoner(this.kernel, this.ontology);
    this.ontogenesis = new OntogenesisEngine();

    // Wire ontogenesis events → ontology
    this.ontogenesis.onConceptCrystallized((crystal) => {
      // When a concept crystallizes, assert it into the ontology
      if (crystal.origin === "crystallized" || crystal.origin === "interpolated") {
        this.ontology.assert(crystal.label, "is-a", crystal.domain, "crystallized");
      }
    });

    // Seed ontology with foundational knowledge
    this.seedFoundationalKnowledge();
  }

  // ── Generation Integration ──────────────────────────────

  /**
   * Generate a combined semantic mask for the decoder.
   *
   * This is the primary integration point: called before each
   * token emission, it combines:
   *   1. Semantic kernel context (word meaning)
   *   2. Ontology grounding (factual knowledge)
   *   3. Reasoning direction (logical coherence)
   *
   * The resulting 96-dim mask biases the decoder toward tokens
   * that are semantically meaningful, factually grounded, and
   * logically coherent — all without transformers.
   */
  getCombinedMask(currentActivations: Float32Array): Float32Array {
    const mask = new Float32Array(96).fill(0.5);

    // 1. Semantic context mask
    const semanticMask = this.kernel.getSemanticMask();
    const semW = this.config.semanticWeight;

    // 2. Ontology grounding mask
    let ontoMask: Float32Array | null = null;
    if (this.config.enableOntologyGrounding && this.contextWords.length > 0) {
      ontoMask = this.ontology.getGroundingMask(this.contextWords);
    }
    const ontoW = ontoMask ? this.config.ontologyWeight : 0;

    // 3. Reasoning mask
    let reasonMask: Float32Array | null = null;
    if (this.config.enableReasoningMask && this.contextWords.length > 2) {
      reasonMask = this.reasoner.getReasoningMask(this.contextWords.slice(-5));
    }
    const reasonW = reasonMask ? this.config.reasoningWeight : 0;

    // Combine with normalized weights
    const totalW = semW + ontoW + reasonW + 0.01; // +0.01 for base

    for (let i = 0; i < 96; i++) {
      let combined = 0;
      combined += semanticMask[i] * semW;
      if (ontoMask) combined += ontoMask[i] * ontoW;
      if (reasonMask) combined += reasonMask[i] * reasonW;
      combined += currentActivations[i] * 0.01; // Tiny raw activation input

      mask[i] = combined / totalW;
    }

    return mask;
  }

  /**
   * Process a generated token: update all subsystems with feedback.
   *
   * Called AFTER each token is emitted. This is where neuroplasticity
   * happens — the system learns from its own output.
   */
  onTokenGenerated(
    word: string,
    activations: Float32Array,
    hScore: number,
  ): TokenFeedback {
    this.tokenCount++;
    this.feedbackCycles++;

    // 1. Update semantic context
    const semanticScore = this.kernel.scoreToken(word);
    this.kernel.infer(word); // Ensures it's in lexicon
    this.totalSemanticScore += semanticScore;

    // Push to context window
    this.contextWords.push(word);
    if (this.contextWords.length > 32) this.contextWords.shift();

    // 2. Feed activation to ontogenesis (concept crystallization)
    let newConcepts = 0;
    if (this.config.enableOntogenesis) {
      this.ontogenesis.observe(activations, hScore, word);

      // Periodic propagation: promote hypotheses to real concepts
      if (this.tokenCount % this.config.propagationInterval === 0) {
        const crystal = this.ontogenesis.propagate();
        if (crystal) newConcepts++;
      }
    }

    // 3. Learn contextual relations from word co-occurrence
    let relevantTriples = 0;
    if (this.contextWords.length >= 3) {
      const recent = this.contextWords.slice(-3);
      // Assert co-occurrence as weak "relates-to" triple
      this.ontology.assert(recent[0], "relates-to", recent[2], "crystallized");
      relevantTriples = this.ontology.query(word, undefined, undefined, 5).length;
    }

    // 4. Periodic ontology inference
    if (this.tokenCount % this.config.inferenceInterval === 0) {
      this.ontology.infer(5);
    }

    // 5. Periodic confidence decay (keeps ontology fresh)
    if (this.tokenCount % this.config.decayInterval === 0) {
      this.ontology.decay();
    }

    return {
      semanticScore,
      grounded: relevantTriples > 0,
      reasoningInfluenced: this.config.enableReasoningMask,
      relevantTriples,
      newConcepts,
    };
  }

  // ── Reasoning Interface ─────────────────────────────────

  /**
   * Reason about a question given the current context.
   * Uses all accumulated knowledge (ontology + crystallized concepts).
   */
  reason(question: string, additionalPremises: string[] = []): ReasoningResult {
    const premises = [...this.contextWords.slice(-10), ...additionalPremises];
    return this.reasoner.reason(premises, question);
  }

  /**
   * Assert a fact into the knowledge base.
   * Observer-driven knowledge input.
   */
  assertKnowledge(subject: string, predicate: string, object: string): void {
    this.ontology.assert(subject, predicate, object, "asserted");
  }

  // ── Context Management ──────────────────────────────────

  /** Reset context for a new generation. */
  resetContext(): void {
    this.contextWords = [];
    this.kernel.resetContext();
  }

  /** Set the reasoning context from a prompt. */
  setPromptContext(prompt: string): void {
    this.resetContext();
    const words = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    for (const word of words) {
      this.kernel.infer(word);
      this.contextWords.push(word);
    }
  }

  // ── Diagnostics ─────────────────────────────────────────

  getSnapshot(): FeedbackLoopSnapshot {
    const kSnap = this.kernel.getSnapshot();
    return {
      tokenCount: this.tokenCount,
      semantic: {
        lexiconSize: kSnap.lexiconSize,
        contextDepth: kSnap.contextDepth,
        currentCoherence: kSnap.currentCoherence,
      },
      ontology: this.ontology.getSnapshot(),
      reasoner: this.reasoner.getSnapshot(),
      ontogenesis: this.ontogenesis.getSnapshot(),
      feedbackCycles: this.feedbackCycles,
      meanSemanticScore: this.tokenCount > 0 ? this.totalSemanticScore / this.tokenCount : 0,
    };
  }

  // ── Private ─────────────────────────────────────────────

  private seedFoundationalKnowledge(): void {
    // Seed the ontology with basic world knowledge
    // These are the "axioms" of common sense
    const foundational = [
      { s: "person", p: "is-a", o: "entity" },
      { s: "animal", p: "is-a", o: "entity" },
      { s: "thing", p: "is-a", o: "entity" },
      { s: "action", p: "causes", o: "change" },
      { s: "thinking", p: "is-a", o: "action" },
      { s: "knowing", p: "requires", o: "thinking" },
      { s: "truth", p: "is-a", o: "property" },
      { s: "reality", p: "contains", o: "thing" },
      { s: "consciousness", p: "experiences", o: "reality" },
      { s: "language", p: "enables", o: "thinking" },
      { s: "coherence", p: "is-a", o: "property" },
      { s: "meaning", p: "requires", o: "coherence" },
      { s: "reason", p: "produces", o: "knowledge" },
      { s: "knowledge", p: "is-a", o: "truth" },
      { s: "cause", p: "precedes", o: "effect" },
      { s: "part", p: "is-a", o: "thing" },
      { s: "whole", p: "contains", o: "part" },
      { s: "good", p: "opposes", o: "bad" },
      { s: "true", p: "opposes", o: "false" },
      { s: "begin", p: "precedes", o: "end" },
      { s: "question", p: "requires", o: "answer" },
      { s: "mathematics", p: "is-a", o: "language" },
      { s: "nature", p: "contains", o: "coherence" },
      { s: "observation", p: "produces", o: "knowledge" },
    ];

    this.ontology.assertAll(foundational);
  }
}
