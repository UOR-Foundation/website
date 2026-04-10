/**
 * Sovereign Compose — Barrel Export.
 * ═════════════════════════════════════════════════════════════════
 *
 * The Application Composition Engine for the UOR Virtual OS.
 *
 * Inspired by Docker (content-addressed layers), Unikraft (minimal
 * per-app kernels), and Kubernetes (declarative orchestration).
 *
 *   import { orchestrator } from "@/modules/compose";
 *   await orchestrator.init(STATIC_BLUEPRINTS);
 *
 * @version 1.0.0
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

// ── Static Blueprints ─────────────────────────────────────────────────────
export { STATIC_BLUEPRINTS } from "./static-blueprints";

// ── React Hooks ───────────────────────────────────────────────────────────
export {
  useOrchestrator,
  useOrchestratorMetrics,
  useAppInstance,
  useAppKernel,
  useComposeEvents,
} from "./hooks";
