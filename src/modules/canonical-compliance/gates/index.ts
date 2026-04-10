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
import "./blueprint-conformance-gate";

// Ontology gate is registered via the ontology module barrel
import "../../ontology/gate";

// SKOS W3C Conformance gate
import "./skos-conformance-gate";

// Schema.org Conformance gate
import "./schema-org-conformance-gate";

// Axioms gate is registered via the axioms module barrel
import "../../axioms/gate";

// Master gate
import "./master-gate";

// Re-export the runner
export { runAllGates, runAllGatesAsync, exportGatesMarkdown } from "./gate-runner";
export { runMasterGate, exportMasterGateMarkdown } from "./master-gate";
export type {
  GateResult, GateFinding, GateReport, Gate, AsyncGate,
  MasterGateReport, CoherenceAnalysis, OverlapPair, Contradiction,
  ConsolidationProposal, HotspotCluster, SelfImprovementProposal,
} from "./gate-runner";
