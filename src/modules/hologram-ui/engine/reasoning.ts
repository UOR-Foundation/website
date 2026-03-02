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

// ── Circuit Compiler ───────────────────────────────────────────────────
export {
  compileCircuit,
  executeCircuitSync,
  getCircuitEngine,
  CircuitEngine,
  type CircuitGraph,
  type CircuitGate,
  type CircuitResult,
  type CircuitProjection,
  type GateType,
  type GateState,
  type Wire,
  type GateResult,
} from "@/hologram/kernel/circuit-compiler";

// ── Multi-Kernel Compositor ───────────────────────────────────────────
export {
  getKernelSupervisor,
  KernelSupervisor,
  type ChildKernel,
  type ChildKernelFrame,
  type ChildKernelState,
  type KernelRole,
  type SupervisorProjection,
} from "@/hologram/kernel/kernel-supervisor";

export {
  getProjectionCompositor,
  ProjectionCompositor,
  type CompositeFrame,
  type CompositeLayer,
  type CompositorProjection,
} from "@/hologram/kernel/projection-compositor";

// ── Procedural Memory ─────────────────────────────────────────────
export {
  getProceduralMemory,
  ProceduralMemoryEngine,
  type Habit,
  type HabitResult,
  type ActionPattern,
  type ProceduralProjection,
  type HabitRingEntry,
} from "@/hologram/kernel/procedural-memory";

// ── Mirror Coherence Protocol ─────────────────────────────────────
export {
  getMirrorProtocol,
  MirrorProtocolEngine,
  type MirrorBond,
  type MirrorObservation,
  type SharedHabit,
  type MirrorProjection,
  type MirrorBondEntry,
} from "@/hologram/kernel/mirror-protocol";

// ── QSVG Spectral Verification ────────────────────────────────────────
export {
  completedZeta,
  runSpectralVerification,
  spectralGrade,
  coherenceCoupling,
  torsionCoupling,
  generateBridgeReport,
  verifyAlphaCrossFramework,
  selfVerifyGeometry,
  ALPHA_QSVG,
  DELTA_0_RAD,
  FRACTAL_DIMENSION,
  type SpectralTest,
  type QSVGAtlasBridgeReport,
} from "@/modules/qsvg";
