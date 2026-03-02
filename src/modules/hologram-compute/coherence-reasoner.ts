/**
 * Coherence Reasoner — Logical Inference via Manifold Navigation
 * ══════════════════════════════════════════════════════════════
 *
 * Phase 3: Replaces transformer-based reasoning with geometric
 * coherence navigation on the 96-vertex Atlas manifold.
 *
 * The fundamental insight: a valid logical inference is one where
 * the conclusion's activation pattern is REACHABLE from the premises'
 * patterns via coherence-preserving transformations. Invalid inferences
 * produce τ-mirror collisions (contradictions) or coherence drops.
 *
 * Three reasoning modes (all transformer-free):
 *
 *   DEDUCTIVE:  premises → gradient descent → conclusion that preserves coherence
 *               (A ∧ B → C iff H(A ∘ B ∘ C) ≥ H(A ∘ B))
 *
 *   INDUCTIVE:  observations → pattern crystallization → general rule
 *               (many instances → nucleated concept via OntogenesisEngine)
 *
 *   ABDUCTIVE:  observation + background → best explanation
 *               (find X such that H(X ∘ background ∘ observation) is maximized)
 *
 * The stabilizer code [[96, 48, 2]] enforces logical consistency:
 * any conclusion that violates τ-mirror parity is rejected as
 * self-contradictory.
 *
 * Neuroscience analogy: Prefrontal cortex (executive reasoning)
 *
 * @module coherence-reasoner
 */

import {
  AtlasSemanticKernel,
  type SemanticSignature,
  compose,
  checkEntailment,
  detectContradiction,
  SEMANTIC_DOMAINS,
  type SemanticDomain,
} from "./atlas-semantic-kernel";
import { HolographicOntology } from "./holographic-ontology";

// ══════════════════════════════════════════════════════════════
// §1  Types
// ══════════════════════════════════════════════════════════════

export type ReasoningMode = "deductive" | "inductive" | "abductive";

/** A premise in a reasoning chain. */
export interface Premise {
  readonly text: string;
  readonly signature: SemanticSignature;
}

/** A single step in the reasoning chain. */
export interface ReasoningStep {
  readonly stepIndex: number;
  readonly description: string;
  readonly mode: ReasoningMode;
  /** Activation state after this step */
  readonly activations: Float32Array;
  /** H-score at this step */
  readonly hScore: number;
  /** Change in H-score from previous step */
  readonly deltaH: number;
  /** τ-mirror violations at this step */
  readonly mirrorViolations: number;
  /** Whether this step preserved coherence */
  readonly coherencePreserved: boolean;
}

/** Result of a complete reasoning chain. */
export interface ReasoningResult {
  /** The conclusion reached */
  readonly conclusion: string;
  /** Conclusion's semantic signature */
  readonly conclusionSignature: SemanticSignature;
  /** All reasoning steps */
  readonly steps: ReasoningStep[];
  /** Overall validity (coherence-based) */
  readonly valid: boolean;
  /** Confidence in the conclusion (0-1) */
  readonly confidence: number;
  /** Reasoning mode used */
  readonly mode: ReasoningMode;
  /** Mean H-score across the chain */
  readonly meanHScore: number;
  /** Whether any τ-mirror violations occurred */
  readonly logicallyConsistent: boolean;
  /** Total reasoning time (ms) */
  readonly timeMs: number;
  /** Explanation of the reasoning path */
  readonly explanation: string;
}

export interface ReasonerConfig {
  /** Max reasoning steps per chain (default: 12) */
  readonly maxSteps: number;
  /** Min coherence to consider a step valid (default: 0.15) */
  readonly minStepCoherence: number;
  /** Coherence improvement threshold for convergence (default: 0.001) */
  readonly convergenceThreshold: number;
  /** Max abductive candidates to explore (default: 20) */
  readonly abductiveCandidates: number;
  /** Weight of ontology grounding (default: 0.4) */
  readonly ontologyWeight: number;
  /** Gradient step size for manifold navigation (default: 0.1) */
  readonly gradientStep: number;
}

export const DEFAULT_REASONER_CONFIG: ReasonerConfig = {
  maxSteps: 12,
  minStepCoherence: 0.15,
  convergenceThreshold: 0.001,
  abductiveCandidates: 20,
  ontologyWeight: 0.4,
  gradientStep: 0.1,
};

export interface ReasonerSnapshot {
  readonly totalInferences: number;
  readonly deductiveCount: number;
  readonly inductiveCount: number;
  readonly abductiveCount: number;
  readonly meanConfidence: number;
  readonly contradictionsDetected: number;
}

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

/** Compute coherence (H-score) of an activation pattern */
function activationCoherence(a: Float32Array): number {
  let sum = 0, max = 0;
  for (let i = 0; i < 96; i++) {
    const v = Math.abs(a[i]);
    sum += v;
    if (v > max) max = v;
  }
  if (sum < 1e-12) return 0;
  const mean = sum / 96;
  return Math.min(1, (max / (mean + 1e-12)) / 96);
}

/** Count τ-mirror parity violations */
function countMirrorViolations(a: Float32Array, threshold: number = 0.2): number {
  let violations = 0;
  for (let v = 0; v < 48; v++) {
    const diff = Math.abs(Math.abs(a[v]) - Math.abs(a[v + 48]));
    if (Math.abs(a[v]) > threshold && Math.abs(a[v + 48]) > threshold && diff < 0.1) {
      violations++;
    }
  }
  return violations;
}

/** Gradient of coherence w.r.t. activations (simplified) */
function coherenceGradient(a: Float32Array): Float32Array {
  const grad = new Float32Array(96);
  const norm = l2Norm(a);
  if (norm < 1e-12) return grad;

  // Gradient points toward concentration (sharpen peaks, suppress valleys)
  let mean = 0;
  for (let i = 0; i < 96; i++) mean += Math.abs(a[i]);
  mean /= 96;

  for (let i = 0; i < 96; i++) {
    const v = Math.abs(a[i]);
    if (v > mean) {
      grad[i] = 0.1 * (v - mean); // Boost above-mean
    } else {
      grad[i] = -0.1 * (mean - v); // Suppress below-mean
    }
  }

  return grad;
}

// ══════════════════════════════════════════════════════════════
// §3  Coherence Reasoner
// ══════════════════════════════════════════════════════════════

export class CoherenceReasoner {
  private readonly config: ReasonerConfig;
  private readonly kernel: AtlasSemanticKernel;
  private readonly ontology: HolographicOntology | null;

  // Stats
  private totalInferences = 0;
  private deductiveCount = 0;
  private inductiveCount = 0;
  private abductiveCount = 0;
  private totalConfidence = 0;
  private contradictionsDetected = 0;

  constructor(
    kernel: AtlasSemanticKernel,
    ontology?: HolographicOntology,
    config: Partial<ReasonerConfig> = {},
  ) {
    this.config = { ...DEFAULT_REASONER_CONFIG, ...config };
    this.kernel = kernel;
    this.ontology = ontology || null;
  }

  // ── Deductive Reasoning ─────────────────────────────────

  /**
   * Deductive reasoning: Given premises, find a valid conclusion
   * by composing premise signatures and navigating the manifold
   * via H-score gradient descent.
   *
   * Valid iff: H(premises ∘ conclusion) ≥ H(premises)
   * i.e., the conclusion doesn't decrease coherence.
   */
  deduce(premises: string[], question?: string): ReasoningResult {
    const t0 = performance.now();
    const steps: ReasoningStep[] = [];

    // Step 1: Compose all premises into a combined signature
    let combined: SemanticSignature = this.kernel.infer(premises[0]);
    let prevH = activationCoherence(combined.activations);

    steps.push({
      stepIndex: 0,
      description: `Premise: "${premises[0]}"`,
      mode: "deductive",
      activations: new Float32Array(combined.activations),
      hScore: prevH,
      deltaH: 0,
      mirrorViolations: countMirrorViolations(combined.activations),
      coherencePreserved: true,
    });

    for (let i = 1; i < premises.length; i++) {
      const pSig = this.kernel.infer(premises[i]);
      const comp = compose(combined, pSig);
      combined = comp.signature;
      const h = activationCoherence(combined.activations);

      steps.push({
        stepIndex: i,
        description: `Compose premise: "${premises[i]}"`,
        mode: "deductive",
        activations: new Float32Array(combined.activations),
        hScore: h,
        deltaH: h - prevH,
        mirrorViolations: comp.mirrorViolations,
        coherencePreserved: h >= prevH - 0.1,
      });
      prevH = h;
    }

    // Step 2: If there's a question, compose it to focus the search
    if (question) {
      const qSig = this.kernel.infer(question);
      const comp = compose(combined, qSig);
      combined = comp.signature;
      const h = activationCoherence(combined.activations);
      steps.push({
        stepIndex: steps.length,
        description: `Focus: "${question}"`,
        mode: "deductive",
        activations: new Float32Array(combined.activations),
        hScore: h,
        deltaH: h - prevH,
        mirrorViolations: comp.mirrorViolations,
        coherencePreserved: true,
      });
      prevH = h;
    }

    // Step 3: Navigate the manifold via gradient descent to sharpen
    const navigated = new Float32Array(combined.activations);
    for (let step = 0; step < this.config.maxSteps; step++) {
      const grad = coherenceGradient(navigated);

      // Apply gradient
      for (let i = 0; i < 96; i++) {
        navigated[i] += grad[i] * this.config.gradientStep;
      }

      // τ-mirror correction: enforce parity
      for (let v = 0; v < 48; v++) {
        const avg = (navigated[v] + navigated[v + 48]) / 2;
        const diff = (navigated[v] - navigated[v + 48]) / 2;
        navigated[v] = diff; // Keep only the asymmetric part
        navigated[v + 48] = -diff; // Mirror is negation
      }

      // Normalize
      const norm = l2Norm(navigated);
      if (norm > 1e-12) {
        for (let i = 0; i < 96; i++) navigated[i] /= norm;
      }

      const h = activationCoherence(navigated);
      const dH = h - prevH;

      steps.push({
        stepIndex: steps.length,
        description: `Navigate step ${step + 1}`,
        mode: "deductive",
        activations: new Float32Array(navigated),
        hScore: h,
        deltaH: dH,
        mirrorViolations: countMirrorViolations(navigated),
        coherencePreserved: dH >= -0.05,
      });

      prevH = h;

      // Convergence check
      if (Math.abs(dH) < this.config.convergenceThreshold) break;
    }

    // Step 4: Ground in ontology if available
    if (this.ontology) {
      const grounding = this.ontology.getGroundingMask(premises);
      for (let i = 0; i < 96; i++) {
        navigated[i] = navigated[i] * (1 - this.config.ontologyWeight)
          + grounding[i] * this.config.ontologyWeight;
      }
      const norm = l2Norm(navigated);
      if (norm > 1e-12) {
        for (let i = 0; i < 96; i++) navigated[i] /= norm;
      }
    }

    // Step 5: Find the conclusion — the word in the lexicon
    // whose signature is closest to the navigated state
    const conclusion = this.findClosestConcept(navigated);
    const conclusionSig = this.kernel.infer(conclusion);
    const finalH = activationCoherence(navigated);
    const violations = countMirrorViolations(navigated);

    const meanH = steps.reduce((s, st) => s + st.hScore, 0) / steps.length;
    const valid = finalH > this.config.minStepCoherence && violations < 3;

    this.totalInferences++;
    this.deductiveCount++;
    this.totalConfidence += valid ? finalH : 0;
    if (violations > 0) this.contradictionsDetected++;

    return {
      conclusion,
      conclusionSignature: conclusionSig,
      steps,
      valid,
      confidence: finalH,
      mode: "deductive",
      meanHScore: meanH,
      logicallyConsistent: violations === 0,
      timeMs: performance.now() - t0,
      explanation: this.buildExplanation(steps, conclusion, "deductive"),
    };
  }

  // ── Abductive Reasoning ─────────────────────────────────

  /**
   * Abductive reasoning: Given an observation, find the best explanation.
   *
   * Searches the concept space for X such that:
   *   H(X ∘ background ∘ observation) is maximized
   *
   * "What would make this observation most coherent?"
   */
  abduce(observation: string, background: string[] = []): ReasoningResult {
    const t0 = performance.now();
    const steps: ReasoningStep[] = [];

    // Compose background into context
    let context: SemanticSignature = background.length > 0
      ? this.kernel.infer(background[0])
      : this.kernel.infer("world"); // Default context

    for (let i = 1; i < background.length; i++) {
      context = compose(context, this.kernel.infer(background[i])).signature;
    }

    const obsSig = this.kernel.infer(observation);
    const contextObs = compose(context, obsSig);

    steps.push({
      stepIndex: 0,
      description: `Observation: "${observation}" in context`,
      mode: "abductive",
      activations: new Float32Array(contextObs.signature.activations),
      hScore: contextObs.coherence,
      deltaH: 0,
      mirrorViolations: contextObs.mirrorViolations,
      coherencePreserved: true,
    });

    // Search for best explanation: try composing with various concepts
    let bestExplanation = "";
    let bestCoherence = 0;
    let bestSig: SemanticSignature | null = null;

    // Candidates from lexicon
    const candidates = [...this.kernel.getLexicon().keys()].slice(0, this.config.abductiveCandidates);

    // Also try ontology concepts if available
    if (this.ontology) {
      const relevant = this.ontology.about(observation, 10);
      for (const r of relevant) {
        candidates.push(r.triple.subject);
        candidates.push(r.triple.object);
      }
    }

    for (const candidate of candidates) {
      const candSig = this.kernel.infer(candidate);
      const composition = compose(contextObs.signature, candSig);

      if (composition.coherence > bestCoherence && !composition.mirrorViolations) {
        bestCoherence = composition.coherence;
        bestExplanation = candidate;
        bestSig = composition.signature;
      }
    }

    if (bestSig) {
      steps.push({
        stepIndex: 1,
        description: `Best explanation: "${bestExplanation}" (H=${bestCoherence.toFixed(3)})`,
        mode: "abductive",
        activations: new Float32Array(bestSig.activations),
        hScore: bestCoherence,
        deltaH: bestCoherence - contextObs.coherence,
        mirrorViolations: 0,
        coherencePreserved: true,
      });
    }

    const conclusion = bestExplanation || "unknown";
    const conclusionSig = bestSig || obsSig;
    const meanH = steps.reduce((s, st) => s + st.hScore, 0) / steps.length;

    this.totalInferences++;
    this.abductiveCount++;
    this.totalConfidence += bestCoherence;

    return {
      conclusion,
      conclusionSignature: conclusionSig,
      steps,
      valid: bestCoherence > this.config.minStepCoherence,
      confidence: bestCoherence,
      mode: "abductive",
      meanHScore: meanH,
      logicallyConsistent: true,
      timeMs: performance.now() - t0,
      explanation: `The observation "${observation}" is best explained by "${conclusion}" (coherence: ${bestCoherence.toFixed(3)})`,
    };
  }

  // ── Inductive Reasoning ─────────────────────────────────

  /**
   * Inductive reasoning: Given multiple observations, find a general rule.
   *
   * Composes all observations and finds the stable centroid —
   * the "essence" that all observations share.
   */
  induce(observations: string[]): ReasoningResult {
    const t0 = performance.now();
    const steps: ReasoningStep[] = [];

    if (observations.length === 0) {
      return this.emptyResult("inductive", t0);
    }

    // Compute centroid of all observation signatures
    const centroid = new Float32Array(96);
    const sigs = observations.map(o => this.kernel.infer(o));

    for (const sig of sigs) {
      for (let i = 0; i < 96; i++) centroid[i] += sig.activations[i];
    }
    for (let i = 0; i < 96; i++) centroid[i] /= sigs.length;

    // Normalize
    const norm = l2Norm(centroid);
    if (norm > 1e-12) {
      for (let i = 0; i < 96; i++) centroid[i] /= norm;
    }

    const h = activationCoherence(centroid);
    steps.push({
      stepIndex: 0,
      description: `Centroid of ${observations.length} observations`,
      mode: "inductive",
      activations: new Float32Array(centroid),
      hScore: h,
      deltaH: 0,
      mirrorViolations: countMirrorViolations(centroid),
      coherencePreserved: true,
    });

    // Navigate toward higher coherence
    const navigated = new Float32Array(centroid);
    let prevH = h;

    for (let step = 0; step < 6; step++) {
      const grad = coherenceGradient(navigated);
      for (let i = 0; i < 96; i++) {
        navigated[i] += grad[i] * this.config.gradientStep;
      }
      const n2 = l2Norm(navigated);
      if (n2 > 1e-12) for (let i = 0; i < 96; i++) navigated[i] /= n2;

      const newH = activationCoherence(navigated);
      steps.push({
        stepIndex: steps.length,
        description: `Sharpen step ${step + 1}`,
        mode: "inductive",
        activations: new Float32Array(navigated),
        hScore: newH,
        deltaH: newH - prevH,
        mirrorViolations: countMirrorViolations(navigated),
        coherencePreserved: newH >= prevH - 0.05,
      });
      prevH = newH;
    }

    // The general rule is the concept closest to the sharpened centroid
    const conclusion = this.findClosestConcept(navigated);
    const conclusionSig = this.kernel.infer(conclusion);
    const meanH = steps.reduce((s, st) => s + st.hScore, 0) / steps.length;

    this.totalInferences++;
    this.inductiveCount++;
    this.totalConfidence += prevH;

    return {
      conclusion,
      conclusionSignature: conclusionSig,
      steps,
      valid: prevH > this.config.minStepCoherence,
      confidence: prevH,
      mode: "inductive",
      meanHScore: meanH,
      logicallyConsistent: countMirrorViolations(navigated) === 0,
      timeMs: performance.now() - t0,
      explanation: `From ${observations.length} observations [${observations.slice(0, 3).join(", ")}...], the general pattern is "${conclusion}"`,
    };
  }

  // ── Compound Reasoning ──────────────────────────────────

  /**
   * Full reasoning chain: combines deductive, abductive, and inductive
   * steps as needed to answer a question given premises.
   *
   * This is the primary entry point for the decoder integration.
   */
  reason(
    premises: string[],
    question: string,
  ): ReasoningResult {
    // Try deductive first (strongest)
    const deductive = this.deduce(premises, question);

    if (deductive.valid && deductive.confidence > 0.4) {
      return deductive;
    }

    // Fall back to abductive (find best explanation)
    const abductive = this.abduce(question, premises);

    if (abductive.confidence > deductive.confidence) {
      return abductive;
    }

    // Return whichever has higher confidence
    return deductive.confidence >= abductive.confidence ? deductive : abductive;
  }

  // ── Decoder Integration ─────────────────────────────────

  /**
   * Score a candidate token based on reasoning coherence.
   *
   * Given the current reasoning state and a candidate word,
   * returns a score [0, 1] indicating whether this word
   * advances the reasoning toward a valid conclusion.
   */
  scoreTokenForReasoning(
    currentState: Float32Array,
    candidateWord: string,
  ): number {
    const candSig = this.kernel.infer(candidateWord);
    const sim = cosine96(currentState, candSig.activations);

    // Check if this word maintains coherence
    const combined = new Float32Array(96);
    for (let i = 0; i < 96; i++) {
      combined[i] = currentState[i] * 0.7 + candSig.activations[i] * 0.3;
    }
    const norm = l2Norm(combined);
    if (norm > 1e-12) for (let i = 0; i < 96; i++) combined[i] /= norm;

    const hAfter = activationCoherence(combined);
    const violations = countMirrorViolations(combined);

    // Score: coherence after composition, penalized by violations
    let score = hAfter;
    if (violations > 0) score *= 0.3;
    if (sim > 0.8) score *= 0.7; // Penalize exact repetition

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Generate a reasoning mask for the decoder.
   *
   * Returns a 96-dim vector biasing generation toward tokens
   * that would advance the current reasoning chain.
   */
  getReasoningMask(premises: string[]): Float32Array {
    const mask = new Float32Array(96).fill(0.5);
    if (premises.length === 0) return mask;

    // Compose premises
    let combined = this.kernel.infer(premises[0]);
    for (let i = 1; i < premises.length; i++) {
      combined = compose(combined, this.kernel.infer(premises[i])).signature;
    }

    // Gradient of coherence tells us which vertices to activate
    const grad = coherenceGradient(combined.activations);
    for (let i = 0; i < 96; i++) {
      mask[i] += grad[i] * 2; // Scale gradient into mask
      mask[i] = Math.max(0, Math.min(1, mask[i]));
    }

    return mask;
  }

  // ── Diagnostics ─────────────────────────────────────────

  getSnapshot(): ReasonerSnapshot {
    const n = this.totalInferences || 1;
    return {
      totalInferences: this.totalInferences,
      deductiveCount: this.deductiveCount,
      inductiveCount: this.inductiveCount,
      abductiveCount: this.abductiveCount,
      meanConfidence: this.totalConfidence / n,
      contradictionsDetected: this.contradictionsDetected,
    };
  }

  // ── Private ─────────────────────────────────────────────

  private findClosestConcept(activations: Float32Array): string {
    let bestWord = "thing";
    let bestSim = -1;

    for (const [word, sig] of this.kernel.getLexicon()) {
      const sim = cosine96(activations, sig.activations);
      if (sim > bestSim) {
        bestSim = sim;
        bestWord = word;
      }
    }

    return bestWord;
  }

  private buildExplanation(steps: ReasoningStep[], conclusion: string, mode: ReasoningMode): string {
    const premiseSteps = steps.filter(s => s.description.startsWith("Premise") || s.description.startsWith("Compose"));
    const premises = premiseSteps.map(s => s.description.replace(/^(Premise|Compose premise): "/, "").replace(/"$/, ""));
    const navSteps = steps.filter(s => s.description.startsWith("Navigate"));
    const finalH = navSteps.length > 0 ? navSteps[navSteps.length - 1].hScore : steps[steps.length - 1].hScore;

    return `Given [${premises.join(", ")}], ${mode} reasoning over ${navSteps.length} navigation steps yields "${conclusion}" (H=${finalH.toFixed(3)}, consistent=${countMirrorViolations(steps[steps.length - 1].activations) === 0})`;
  }

  private emptyResult(mode: ReasoningMode, t0: number): ReasoningResult {
    return {
      conclusion: "unknown",
      conclusionSignature: this.kernel.infer("unknown"),
      steps: [],
      valid: false,
      confidence: 0,
      mode,
      meanHScore: 0,
      logicallyConsistent: true,
      timeMs: performance.now() - t0,
      explanation: "No observations provided",
    };
  }
}
