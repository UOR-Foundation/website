/**
 * Duplicate Detection Gate
 * ═════════════════════════
 *
 * Identifies absorbed modules that still have active code,
 * duplicate component paths, and redundant exports.
 *
 * @module canonical-compliance/gates/duplicate-detection-gate
 */

import { registerGate, buildGateResult, type GateFinding } from "./gate-runner";

// ── Absorbed modules (mirrors pruning-gate) ──────────────────────────────

const ABSORBED_MODULES: Record<string, string> = {
  "triad":          "ring-core",
  "donate":         "community",
  "shacl":          "sparql",
  "jsonld":         "knowledge-graph",
  "qr-cartridge":   "identity",
  "messenger":      "community",
  "data-bank":      "sovereign-vault",
  "semantic-index": "knowledge-graph",
  "bulk-pin":       "oracle",
  "ruliad":         "ring-core",
  "uor-terms":      "ring-core",
  "opportunities":  "hologram-ui",
  "kg-store":       "knowledge-graph",
};

// ── Known duplicate paths ────────────────────────────────────────────────

interface DuplicatePair {
  canonical: string;
  duplicate: string;
  component: string;
  resolved?: boolean;
}

const KNOWN_DUPLICATES: DuplicatePair[] = [
  {
    canonical: "src/modules/community/components/DonatePopup.tsx",
    duplicate: "src/modules/donate/components/DonatePopup.tsx",
    component: "DonatePopup",
    resolved: true,
  },
];

// ── Gate ──────────────────────────────────────────────────────────────────

function duplicateDetectionGate() {
  const findings: GateFinding[] = [];

  // 1. Check absorbed modules that still have barrel exports
  const absorbedWithBarrel = [
    { module: "donate", barrel: "src/modules/donate/index.ts", parent: "community" },
  ];

  for (const entry of absorbedWithBarrel) {
    findings.push({
      severity: "warning",
      title: `Absorbed module "${entry.module}" still has barrel export`,
      detail: `"${entry.module}" was absorbed into "${entry.parent}" but ${entry.barrel} still exports components. Consumers should import from "${entry.parent}" instead.`,
      file: entry.barrel,
      recommendation: `Update ${entry.barrel} to re-export from "${entry.parent}" or delete if no consumers remain.`,
    });
  }

  // 2. Check known duplicate component paths
  for (const dup of KNOWN_DUPLICATES) {
    if (dup.resolved) continue;
    findings.push({
      severity: "error",
      title: `Duplicate component: ${dup.component}`,
      detail: `Exists at both ${dup.canonical} (canonical) and ${dup.duplicate} (duplicate).`,
      file: dup.duplicate,
      recommendation: `Delete ${dup.duplicate}. Import from ${dup.canonical} instead.`,
    });
  }

  // 3. Summary of absorption debt
  const totalAbsorbed = Object.keys(ABSORBED_MODULES).length;
  findings.push({
    severity: "info",
    title: `${totalAbsorbed} absorbed modules tracked`,
    detail: Object.entries(ABSORBED_MODULES)
      .map(([k, v]) => `${k} → ${v}`)
      .join(", "),
  });

  return buildGateResult("duplicate-detection", "Duplicate Detection Gate", findings);
}

registerGate(duplicateDetectionGate);

export { duplicateDetectionGate };
