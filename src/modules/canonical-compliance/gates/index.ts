/**
 * Health Gates — Barrel Export
 * ════════════════════════════
 *
 * Import this module to register all built-in gates
 * and access the runner + markdown export.
 */

// Import gates to trigger registration via side effects
import "./canonical-pipeline-gate";
import "./provenance-coverage-gate";
import "./duplicate-detection-gate";
import "./hygiene-gate";

// Re-export the runner
export { runAllGates, exportGatesMarkdown } from "./gate-runner";
export type { GateResult, GateFinding, GateReport, Gate } from "./gate-runner";
