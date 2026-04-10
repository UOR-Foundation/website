/**
 * Provenance Coverage Gate
 * ═════════════════════════
 *
 * Cross-references active modules against the PROVENANCE_REGISTRY
 * to identify modules that cannot be traced back to UOR atoms.
 *
 * @module canonical-compliance/gates/provenance-coverage-gate
 */

import { registerGate, buildGateResult, type GateFinding } from "./gate-runner";
import { PROVENANCE_REGISTRY } from "../provenance-map";

// ── Canonical active module list (mirrors pruning-gate) ──────────────────

const ACTIVE_MODULES = [
  "core", "landing", "desktop", "boot",
  "engine", "ring-core", "identity", "morphism",
  "knowledge-graph", "derivation", "epistemic", "sparql",
  "resolver", "observable", "state", "trace",
  "verify", "agent-tools", "code-kg", "uns",
  "atlas", "audio", "bitcoin", "certificate", "community",
  "console", "datum", "hologram-ui", "interoperability",
  "mcp", "oracle", "projects", "quantum", "qsvg",
  "sovereign-vault", "trust-graph", "uor-sdk",
] as const;

// ── Gate ──────────────────────────────────────────────────────────────────

function provenanceCoverageGate() {
  const findings: GateFinding[] = [];

  const registeredModules = new Set<string>();
  for (const entry of PROVENANCE_REGISTRY) {
    registeredModules.add(entry.module);
    // Also match by last segment (e.g. "uns/build/container" → "uns")
    const parts = entry.module.split("/");
    registeredModules.add(parts[0]);
  }

  const untraced: string[] = [];
  for (const mod of ACTIVE_MODULES) {
    if (!registeredModules.has(mod)) {
      untraced.push(mod);
    }
  }

  if (untraced.length > 0) {
    // Group into chunks for readability
    for (const mod of untraced) {
      findings.push({
        severity: "warning",
        title: `Module "${mod}" has no provenance entry`,
        detail: `Cannot trace ${mod} back to UOR atoms. Add an entry to PROVENANCE_REGISTRY in provenance-map.ts.`,
        file: `src/modules/${mod}/`,
        recommendation: `Add a ModuleProvenance entry for "${mod}" mapping its key exports to UOR atoms.`,
      });
    }

    findings.push({
      severity: "info",
      title: `${ACTIVE_MODULES.length - untraced.length}/${ACTIVE_MODULES.length} modules have provenance`,
      detail: `${untraced.length} modules are untraced: ${untraced.slice(0, 10).join(", ")}${untraced.length > 10 ? ` (+${untraced.length - 10} more)` : ""}.`,
    });
  }

  return buildGateResult(
    "provenance-coverage",
    "Provenance Coverage Gate",
    findings,
    { error: 8, warning: 2, info: 0 },
  );
}

registerGate(provenanceCoverageGate);

export { provenanceCoverageGate };
