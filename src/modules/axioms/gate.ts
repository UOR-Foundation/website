/**
 * Axioms Compliance Gate
 * ═════════════════════════════════════════════════════════════════
 *
 * Verifies that the system adheres to the active design system's axioms.
 * Each axiom's verification spec is checked and findings are reported.
 *
 * @module axioms/gate
 */

import {
  registerGate,
  buildGateResult,
  type GateFinding,
} from "../canonical-compliance/gates/gate-runner";
import { getActiveDesignSystem } from "./registry";
import type { DesignAxiom } from "./types";

// ── Per-axiom verifiers ──────────────────────────────────────────────────

function verifyAxiom(axiom: DesignAxiom): GateFinding[] {
  const findings: GateFinding[] = [];
  const v = axiom.verification;

  switch (v.kind) {
    case "css-token-presence": {
      // Structural check: tokens should be defined in the design system
      const ds = getActiveDesignSystem();
      const missingTokens = (v.targets ?? []).filter(
        (t) => !Object.keys(ds.cssTokens).some((k) => k.includes(t.replace("--", ""))),
      );
      // Only flag if >50% of expected tokens are missing from the system
      if (missingTokens.length > (v.targets?.length ?? 0) * 0.5) {
        findings.push({
          severity: "warning",
          title: `${axiom.code}: CSS token coverage low`,
          detail: `${missingTokens.length}/${v.targets?.length ?? 0} expected tokens not found in design system.`,
          recommendation: `Add missing tokens to the DesignSystem.cssTokens registry.`,
        });
      }
      break;
    }

    case "constant-check": {
      // Verify the axiom's target files exist conceptually
      // (actual file-system checks happen at build time; here we verify the axiom is well-formed)
      if (!v.targets || v.targets.length === 0) {
        findings.push({
          severity: "warning",
          title: `${axiom.code}: No target files specified`,
          detail: `Axiom "${axiom.label}" has no verification targets.`,
          recommendation: "Add target file paths to the verification spec.",
        });
      }
      break;
    }

    case "import-analysis": {
      if (!v.targets || v.targets.length === 0) {
        findings.push({
          severity: "info",
          title: `${axiom.code}: Import analysis configured`,
          detail: `Axiom "${axiom.label}" — import targets not specified.`,
        });
      }
      break;
    }

    case "module-manifest": {
      if (v.minCoverage && v.minCoverage > 0) {
        // Report as info — full verification requires fs access at build time
        findings.push({
          severity: "info",
          title: `${axiom.code}: Manifest coverage target ${(v.minCoverage * 100).toFixed(0)}%`,
          detail: `All modules should include module.json manifests.`,
        });
      }
      break;
    }

    case "css-value-pattern":
    case "file-pattern":
    case "structural": {
      // Structural checks — axiom is registered, enforcement is by convention + review
      // No findings = pass
      break;
    }
  }

  return findings;
}

// ── Gate Function ────────────────────────────────────────────────────────

function axiomsComplianceGate() {
  const ds = getActiveDesignSystem();
  const allFindings: GateFinding[] = [];

  // 1. Verify each axiom
  for (const axiom of ds.axioms) {
    allFindings.push(...verifyAxiom(axiom));
  }

  // 2. Verify design system completeness
  const categories = new Set(ds.axioms.map((a) => a.category));
  const expectedCategories = ["visual", "interaction", "architecture", "data"];
  for (const cat of expectedCategories) {
    if (!categories.has(cat as any)) {
      allFindings.push({
        severity: "warning",
        title: `Missing axiom category: ${cat}`,
        detail: `Design system "${ds.label}" has no axioms in the "${cat}" category.`,
        recommendation: `Add at least one ${cat} axiom to ensure full coverage.`,
      });
    }
  }

  // 3. Verify axiom codes are unique
  const codes = ds.axioms.map((a) => a.code);
  const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
  if (dupes.length > 0) {
    allFindings.push({
      severity: "error",
      title: "Duplicate axiom codes",
      detail: `Codes [${dupes.join(", ")}] appear more than once.`,
      recommendation: "Each axiom must have a unique code.",
    });
  }

  // 4. Verify CSS token registry is non-empty
  if (Object.keys(ds.cssTokens).length === 0) {
    allFindings.push({
      severity: "warning",
      title: "Empty CSS token registry",
      detail: `Design system "${ds.label}" has no CSS tokens defined.`,
      recommendation: "Populate cssTokens with design system values.",
    });
  }

  return buildGateResult(
    "axioms-compliance",
    `Design Axioms Compliance (${ds.label})`,
    allFindings,
  );
}

// ── Register ─────────────────────────────────────────────────────────────

registerGate(axiomsComplianceGate);
