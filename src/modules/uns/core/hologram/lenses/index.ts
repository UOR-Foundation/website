/**
 * UOR Lens Library — Pre-built Lens Blueprints
 * ═════════════════════════════════════════════
 *
 * Curated collection of functional lens blueprints that solve real problems.
 * Each blueprint is a content-addressed, shareable, composable circuit.
 *
 * @module uns/core/hologram/lenses
 */

export {
  MEMORY_CRISIS_BLUEPRINT,
  createMemoryCrisisBlueprint,
} from "./memory-crisis";

export {
  PROMPT_INJECTION_SHIELD_BLUEPRINT,
  createPromptInjectionShieldBlueprint,
} from "./prompt-injection-shield";

export {
  SECURE_MEMORY_BLUEPRINT,
  createSecureMemoryBlueprint,
} from "./secure-memory";

export {
  LIMBIC_LENS_BLUEPRINT,
  createLimbicBlueprint,
  deriveVAD,
  classifyEmotion,
  emotionalIntensity,
  vadSimilarity,
  affectiveLinkScore,
  emotionAdjustedImportance,
} from "./limbic";

export type {
  VADVector,
  EmotionalMemory,
  AffectiveLinkScore,
} from "./limbic";
