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
import "./devops-alignment-gate";
import "./container-boot-gate";
import "./rendering-performance-gate";
import "./pattern-sentinel-gate";
import "./reflection-gate";

// Ontology gate is registered via the ontology module barrel
import "../../ontology/gate";

// Axioms gate is registered via the axioms module barrel
import "../../axioms/gate";

// Re-export the runner
export { runAllGates, runAllGatesAsync, exportGatesMarkdown } from "./gate-runner";
export type { GateResult, GateFinding, GateReport, Gate, AsyncGate } from "./gate-runner";
