/**
 * Limbic Lens — Emotional Memory Through Coherence
 * ═══════════════════════════════════════════════════
 *
 * The limbic system of the hologram: every memory is tagged with
 * an emotional fingerprint derived from the coherence field at
 * write time. Retrieval weights memories by emotional resonance —
 * not just semantic similarity.
 *
 * The key mathematical insight:
 *
 *   Emotion_VAD ≅ Coherence_{H-score} × Phase_{zone} × Intensity_{φ}
 *
 *   Valence   ↔  ∂H/∂t  (positive = joy, negative = distress)
 *   Arousal   ↔  φ       (observer attention intensity)
 *   Dominance ↔  zone    (convergent = agency, divergent = submission)
 *
 * We don't bolt on a separate emotion system — the Holographic Surface
 * already computes an emotional state as a natural byproduct of
 * coherence tracking. Emotion IS the curvature of the coherence field.
 *
 * Pipeline:
 *   Content → [Read H/φ/zone from Surface] → [Compute VAD] →
 *   [Tag memory with emotional CID] → [Store with provenance]
 *
 * @module uns/core/hologram/lenses/limbic
 */

import {
  createBlueprint,
  registerElementFactory,
  type LensBlueprint,
  type ElementSpec,
} from "../lens-blueprint";
import { element } from "../lens";
import { forkBlueprint } from "../lens-blueprint";

// ── VAD Types ──────────────────────────────────────────────────────────

/**
 * Valence-Arousal-Dominance vector.
 * The emotional fingerprint of any memory or experience.
 */
export interface VADVector {
  /** Emotional polarity: -1 (negative) to +1 (positive) */
  readonly valence: number;
  /** Activation level: 0 (calm) to 1 (excited) */
  readonly arousal: number;
  /** Agency/control: 0 (submissive/divergent) to 1 (dominant/convergent) */
  readonly dominance: number;
}

/**
 * An emotionally-tagged memory with its full provenance.
 */
export interface EmotionalMemory {
  readonly memoryCid: string;
  readonly vad: VADVector;
  readonly importance: number;
  readonly emotionalIntensity: number;
  readonly timestamp: number;
}

/**
 * Affective Link Score result — emotion-weighted similarity.
 */
export interface AffectiveLinkScore {
  readonly memoryCid: string;
  readonly semanticScore: number;
  readonly emotionalSimilarity: number;
  readonly recencyScore: number;
  readonly compositeScore: number;
  readonly vad: VADVector;
}

// ── Zone → Dominance Mapping ───────────────────────────────────────────

const ZONE_DOMINANCE: Record<string, number> = {
  COHERENCE: 0.85,
  CONVERGENT: 0.9,
  EXPLORING: 0.5,
  STABLE: 0.6,
  DIVERGENT: 0.15,
  CRITICAL: 0.05,
};

// ── Core Functions ─────────────────────────────────────────────────────

/**
 * Derive a VAD vector from the Holographic Surface state.
 *
 * This is the fundamental mapping:
 *   - Valence = tanh(∂H/∂t × 5) → scales gradient to [-1, +1]
 *   - Arousal = clamp(φ, 0, 1)
 *   - Dominance = zone lookup
 *
 * The tanh scaling ensures that small gradients map near zero (neutral)
 * while strong gradients saturate toward ±1 (strong emotion).
 */
export function deriveVAD(
  gradient: number,
  observerPhi: number,
  zone: string,
): VADVector {
  // Valence: tanh maps gradient → (-1, +1), amplified by 5x for sensitivity
  const valence = Math.tanh(gradient * 5);

  // Arousal: observer phi is already 0-1, but clamp for safety
  const arousal = Math.max(0, Math.min(1, observerPhi));

  // Dominance: map zone to control dimension
  const dominance = ZONE_DOMINANCE[zone] ?? 0.5;

  return { valence, arousal, dominance };
}

/**
 * Compute emotional intensity from a VAD vector.
 * This is the "magnitude" of the emotion — how strongly felt.
 * 
 * intensity = √(valence² + (arousal - 0.5)² + (dominance - 0.5)²)
 * 
 * Centered at the neutral point (0, 0.5, 0.5).
 */
export function emotionalIntensity(vad: VADVector): number {
  const v = vad.valence;
  const a = vad.arousal - 0.5;
  const d = vad.dominance - 0.5;
  return Math.sqrt(v * v + a * a + d * d);
}

/**
 * Compute the cosine similarity between two VAD vectors.
 * Range: [-1, 1] where 1 = identical emotional state.
 */
export function vadSimilarity(a: VADVector, b: VADVector): number {
  const dotProduct = a.valence * b.valence + a.arousal * b.arousal + a.dominance * b.dominance;
  const magA = Math.sqrt(a.valence ** 2 + a.arousal ** 2 + a.dominance ** 2);
  const magB = Math.sqrt(b.valence ** 2 + b.arousal ** 2 + b.dominance ** 2);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}

/**
 * Compute the Affective Link Score between a query emotional state
 * and a stored memory. This replaces pure semantic retrieval with
 * emotion-weighted retrieval.
 *
 * ALS = α·semantic + β·emotional_similarity + γ·recency
 *
 * Where:
 *   - semantic: raw importance score (proxy for semantic relevance)
 *   - emotional_similarity: cosine similarity of VAD vectors
 *   - recency: exponential decay based on age
 *
 * Default weights: α=0.4, β=0.4, γ=0.2
 * This gives equal weight to "what it means" and "how it felt".
 */
export function affectiveLinkScore(
  queryVAD: VADVector,
  memory: EmotionalMemory,
  nowMs: number = Date.now(),
  weights = { semantic: 0.4, emotional: 0.4, recency: 0.2 },
): AffectiveLinkScore {
  // Semantic score: normalized importance
  const semanticScore = Math.max(0, Math.min(1, memory.importance));

  // Emotional similarity: cosine of VAD vectors, rescaled to [0, 1]
  const rawSim = vadSimilarity(queryVAD, memory.vad);
  const emotionalSimilarity = (rawSim + 1) / 2; // [-1,1] → [0,1]

  // Recency: exponential decay with half-life of 7 days
  const ageMs = nowMs - memory.timestamp;
  const halfLifeMs = 7 * 24 * 60 * 60 * 1000;
  const recencyScore = Math.exp(-0.693 * ageMs / halfLifeMs);

  // Composite score
  const compositeScore =
    weights.semantic * semanticScore +
    weights.emotional * emotionalSimilarity +
    weights.recency * recencyScore;

  return {
    memoryCid: memory.memoryCid,
    semanticScore,
    emotionalSimilarity,
    recencyScore,
    compositeScore,
    vad: memory.vad,
  };
}

/**
 * Compute emotion-adjusted importance.
 * Memories formed under high emotional intensity persist longer.
 *
 * adjusted_importance = base × (1 + |valence| × arousal)
 */
export function emotionAdjustedImportance(
  baseImportance: number,
  vad: VADVector,
): number {
  return baseImportance * (1 + Math.abs(vad.valence) * vad.arousal);
}

/**
 * Classify the emotional "color" of a VAD vector into one of
 * Plutchik's 8 primary emotions. This provides a human-readable
 * label for the emotional state.
 *
 * The mapping uses octant analysis in VAD space:
 *   V+A+D+ = Joy       V-A+D+ = Anger
 *   V+A+D- = Trust     V-A+D- = Fear
 *   V+A-D+ = Serenity  V-A-D+ = Disgust
 *   V+A-D- = Acceptance V-A-D- = Sadness
 */
export function classifyEmotion(vad: VADVector): string {
  const v = vad.valence >= 0;
  const a = vad.arousal >= 0.5;
  const d = vad.dominance >= 0.5;

  if (v && a && d) return "joy";
  if (v && a && !d) return "trust";
  if (v && !a && d) return "serenity";
  if (v && !a && !d) return "acceptance";
  if (!v && a && d) return "anger";
  if (!v && a && !d) return "fear";
  if (!v && !a && d) return "disgust";
  return "sadness";
}

// ── Element Factories ──────────────────────────────────────────────────

function registerLimbicFactories(): void {
  // vad-extractor: derive VAD from coherence state
  registerElementFactory("vad-extractor", (spec) => {
    const amplification = (spec.config?.amplification as number) ?? 5;
    return element(spec.id, async (input: unknown) => {
      const ctx = input as Record<string, unknown>;
      const gradient = (ctx.gradient as number) ?? 0;
      const phi = (ctx.observerPhi as number) ?? 0.5;
      const zone = (ctx.zone as string) ?? "STABLE";
      const vad = deriveVAD(gradient * (amplification / 5), phi, zone);
      return { ...ctx, vad, emotionalIntensity: emotionalIntensity(vad) };
    });
  });

  // emotion-classifier: add human-readable label
  registerElementFactory("emotion-classifier", () => {
    return element("emotion-classifier", async (input: unknown) => {
      const ctx = input as Record<string, unknown>;
      const vad = ctx.vad as VADVector;
      if (!vad) return ctx;
      return { ...ctx, emotionLabel: classifyEmotion(vad) };
    });
  });

  // importance-adjuster: scale importance by emotional intensity
  registerElementFactory("importance-adjuster", () => {
    return element("importance-adjuster", async (input: unknown) => {
      const ctx = input as Record<string, unknown>;
      const vad = ctx.vad as VADVector;
      const baseImportance = (ctx.importance as number) ?? 0.5;
      if (!vad) return ctx;
      return {
        ...ctx,
        importance: emotionAdjustedImportance(baseImportance, vad),
      };
    });
  });

  // affective-retriever: rank memories by emotional resonance
  registerElementFactory("affective-retriever", (spec) => {
    const weights = (spec.config?.weights as { semantic: number; emotional: number; recency: number }) ?? {
      semantic: 0.4,
      emotional: 0.4,
      recency: 0.2,
    };
    return element(spec.id, async (input: unknown) => {
      const ctx = input as Record<string, unknown>;
      const queryVAD = ctx.queryVAD as VADVector;
      const memories = ctx.memories as EmotionalMemory[];
      if (!queryVAD || !memories) return ctx;

      const scored = memories
        .map((m) => affectiveLinkScore(queryVAD, m, Date.now(), weights))
        .sort((a, b) => b.compositeScore - a.compositeScore);

      return { ...ctx, rankedMemories: scored };
    });
  });
}

// ── Blueprint ──────────────────────────────────────────────────────────

// Register factories on module load
registerLimbicFactories();

/** Element specs for the Limbic Lens pipeline */
const LIMBIC_ELEMENTS: ElementSpec[] = [
  {
    id: "vad-extract",
    kind: "vad-extractor",
    description: "Derive VAD emotional vector from Holographic Surface coherence state",
    config: { amplification: 5 },
  },
  {
    id: "classify",
    kind: "emotion-classifier",
    description: "Map VAD vector to Plutchik primary emotion label",
  },
  {
    id: "adjust-importance",
    kind: "importance-adjuster",
    description: "Scale memory importance by emotional intensity — vivid memories persist",
  },
  {
    id: "affective-rank",
    kind: "affective-retriever",
    description: "Rank memories by Affective Link Score (semantic × emotional × recency)",
    config: {
      weights: { semantic: 0.4, emotional: 0.4, recency: 0.2 },
    },
  },
];

/**
 * The Limbic Lens Blueprint — emotional memory through coherence.
 *
 * Pipeline: Content → VAD Extraction → Classification → Importance Adjustment → Affective Retrieval
 */
export const LIMBIC_LENS_BLUEPRINT: LensBlueprint = createBlueprint({
  name: "Limbic Lens",
  version: "1.0.0",
  description:
    "Emotional memory system that derives VAD (Valence-Arousal-Dominance) vectors " +
    "from the Holographic Surface coherence state and uses Affective Link Scores " +
    "for emotion-weighted memory retrieval. Emotion IS the curvature of coherence.",
  morphism: "isometry",
  elements: LIMBIC_ELEMENTS,
  wires: [
    { from: "vad-extract", to: "classify" },
    { from: "classify", to: "adjust-importance" },
    { from: "adjust-importance", to: "affective-rank" },
  ],
  metadata: {
    domain: "limbic",
    emotionModel: "VAD (Valence-Arousal-Dominance)",
    coherenceMapping: "∂H/∂t → valence, φ → arousal, zone → dominance",
    primaryEmotions: "joy, trust, serenity, acceptance, anger, fear, disgust, sadness",
  },
});

/**
 * Create a customized Limbic Lens with adjusted parameters.
 */
export function createLimbicBlueprint(options?: {
  amplification?: number;
  weights?: { semantic: number; emotional: number; recency: number };
  agentId?: string;
}): LensBlueprint {
  return forkBlueprint(LIMBIC_LENS_BLUEPRINT, {
    name: "Limbic Lens",
    version: "1.0.0-custom",
    description:
      "Customized Limbic Lens with adjusted emotional sensitivity " +
      "and retrieval weighting for agent-specific personality profiles.",
    metadata: {
      ...LIMBIC_LENS_BLUEPRINT.metadata,
      agentId: options?.agentId,
      customAmplification: options?.amplification,
      customWeights: options?.weights,
    },
  });
}
