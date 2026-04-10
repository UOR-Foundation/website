/**
 * Scheduling & Orchestration — Barrel Export.
 * @ontology uor:Scheduler
 * ═════════════════════════════════════════════════════════════════
 *
 * The Application Composition Engine for the UOR Virtual OS.
 *
 * Inspired by Docker (content-addressed layers), Unikraft (minimal
 * per-app kernels), and Kubernetes (declarative orchestration).
 *
 * v3.0.0 — Sovereign Reconciler: adds the three missing Kubernetes
 * primitives (desired-state store, reconciliation loop, rolling updates),
 * each canonically mapped to UOR Foundation kernel types.
 *
 *   import { orchestrator } from "@/modules/compose";
 *   await orchestrator.init(STATIC_BLUEPRINTS);
 *
 * @version 3.0.0
 */

// ── Types ─────────────────────────────────────────────────────────────────
export type {
  AppBlueprint,
  MorphismInterface,
  AppResources,
  AppHealthcheck,
  AppInstance,
  AppInstanceState,
  OrchestratorMetrics,
  OrchestratorState,
  ComposeEvent,
  ComposeEventType,
  // Sovereign Reconciler types (K8s equivalence)
  ScalingConfig,
  DesiredState,
  DriftKind,
  DriftRecord,
  CorrectionAction,
  Correction,
  ReconcilerEpoch,
  ReconcilerStatus,
  RollingUpdateState,
  ScalerDecision,
} from "./types";

// ── Blueprint Registry ────────────────────────────────────────────────────
export {
  registerBlueprint,
  getBlueprint,
  getBlueprintByCid,
  removeBlueprint,
  listBlueprints,
  allBlueprints,
  blueprintCount,
  verifyBlueprint,
} from "./blueprint-registry";

// ── AppKernel ─────────────────────────────────────────────────────────────
export { AppKernel, KernelPermissionError } from "./app-kernel";

// ── Orchestrator ──────────────────────────────────────────────────────────
export { orchestrator } from "./orchestrator";

// ── Sovereign Reconciler (K8s Control Plane) ──────────────────────────────
export { SovereignReconciler } from "./reconciler";
export { SovereignAutoScaler } from "./auto-scaler";
export { SovereignRollingUpdate } from "./rolling-update";

// ── Static Blueprints ─────────────────────────────────────────────────────
export { STATIC_BLUEPRINTS } from "./static-blueprints";

// ── React Hooks ───────────────────────────────────────────────────────────
export {
  useOrchestrator,
  useOrchestratorMetrics,
  useAppInstance,
  useAppKernel,
  useComposeEvents,
  useReconcilerStatus,
} from "./hooks";
