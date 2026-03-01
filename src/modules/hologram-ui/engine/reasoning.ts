/**
 * Hologram Engine — Reasoning Facade
 * ════════════════════════════════════
 *
 * Single internal boundary for all ring-core reasoning capabilities.
 * Components within hologram-ui import from here — never from ring-core directly.
 *
 * @module hologram-ui/engine/reasoning
 */

// ── Neuro-Symbolic Co-Reasoning ────────────────────────────────────────────
export {
  buildScaffold,
  processResponse,
  DEFAULT_CONFIG,
  type NeuroSymbolicResult,
  type AnnotatedClaim,
  type EpistemicGrade,
} from "@/modules/ring-core/neuro-symbolic";

// ── Proof Persistence ──────────────────────────────────────────────────────
export {
  saveReasoningProof,
  loadReasoningProofs,
} from "@/modules/ring-core/proof-persistence";

// ── Proof-Gated Inference ──────────────────────────────────────────────────
export {
  planPGI,
  composeFragments,
  storeClaims,
  type PGIResult,
} from "@/modules/ring-core/proof-gated-inference";

// ── Inference Accelerator ──────────────────────────────────────────────────
export {
  getAccelerator,
  streamOptimized,
} from "@/modules/ring-core/inference-accelerator";

// ── Symbolica Enhancements ─────────────────────────────────────────────────
export {
  StreamingCurvatureMonitor,
} from "@/modules/ring-core/symbolica-enhancements";

// ── Reward Circuit ─────────────────────────────────────────────────────────
export {
  computeReward,
  type RewardSignal,
} from "@/modules/ring-core/reward-circuit";
