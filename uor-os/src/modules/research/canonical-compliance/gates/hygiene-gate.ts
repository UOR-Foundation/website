/**
 * Module Hygiene Gate
 * ════════════════════
 *
 * Wraps the existing pruningGate() into the standard Gate interface
 * for unified reporting in the Health Gates dashboard.
 *
 * @module canonical-compliance/gates/hygiene-gate
 */

import { registerGate, scoreToStatus, type GateResult, type GateFinding } from "./gate-runner";
import { pruningGate } from "@/modules/identity/uns/core/pruning-gate";

function hygieneGate(): GateResult {
  const report = pruningGate();

  const findings: GateFinding[] = report.findings.map((f) => ({
    severity: f.severity === "prune" ? "error" as const : f.severity === "simplify" ? "warning" as const : "info" as const,
    title: f.title,
    detail: f.detail,
    recommendation: f.estimatedSavings ? `~${f.estimatedSavings} lines saveable` : undefined,
  }));

  // Add summary metrics
  findings.push({
    severity: "info",
    title: `${report.metrics.activeModules} active, ${report.metrics.absorbedModules} absorbed`,
    detail: `Projections: ${report.metrics.totalProjections} | Chains: ${report.metrics.totalSynergyChains} | Orphaned: ${report.metrics.orphanedProjections}`,
  });

  return {
    id: "module-hygiene",
    name: "Hygiene Gate",
    status: scoreToStatus(report.score),
    score: report.score,
    findings,
    timestamp: report.timestamp,
  };
}

registerGate(hygieneGate);

export { hygieneGate };
