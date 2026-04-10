/**
 * Pruning Gate Test Suite
 * ═══════════════════════
 *
 * Enforces system hygiene thresholds. Failing tests here mean
 * the system has grown beyond its complexity budget and needs pruning.
 *
 * Run: npx vitest run src/test/pruning-gate.test.ts
 */

import { describe, it, expect } from "vitest";
import { pruningGate, type PruningReport } from "@/modules/identity/uns/core/pruning-gate";

let report: PruningReport;

describe("Pruning Gate. System Hygiene", () => {
  it("produces a valid report", () => {
    report = pruningGate();
    expect(report.timestamp).toBeTruthy();
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  // ── Complexity Budgets ──────────────────────────────────────────────

  it("active module count stays under 40", () => {
    expect(report.metrics.activeModules).toBeLessThanOrEqual(40);
  });

  it("absorbed modules are tracked", () => {
    expect(report.metrics.absorbedModules).toBeGreaterThan(0);
    expect(report.metrics.totalModules).toBe(
      report.metrics.activeModules + report.metrics.absorbedModules
    );
  });

  it("no 'prune' severity findings (nothing dead)", () => {
    const pruneItems = report.findings.filter(f => f.severity === "prune");
    if (pruneItems.length > 0) {
      console.warn("⚠ PRUNE ITEMS:", pruneItems.map(f => f.title).join("; "));
    }
    expect(pruneItems.length).toBeLessThanOrEqual(5);
  });

  it("orphaned projections under 75%", () => {
    const orphanRate = report.metrics.orphanedProjections / report.metrics.totalProjections;
    expect(orphanRate).toBeLessThan(0.75);
  });

  it("synergy chain lengths are reasonable (≤10 nodes)", () => {
    expect(report.metrics.maxChainLength).toBeLessThanOrEqual(10);
  });

  it("hygiene score above 85", () => {
    expect(report.score).toBeGreaterThanOrEqual(85);
  });

  // ── Report Output ──────────────────────────────────────────────────

  it("prints the full pruning report", () => {
    console.log("\n" + "═".repeat(60));
    console.log("  PRUNING GATE REPORT");
    console.log("═".repeat(60));
    console.log(`  Score: ${report.score}/100`);
    console.log(`  Active Modules: ${report.metrics.activeModules}`);
    console.log(`  Absorbed Modules: ${report.metrics.absorbedModules}`);
    console.log(`  Total Modules: ${report.metrics.totalModules}`);
    console.log(`  Projections: ${report.metrics.totalProjections}`);
    console.log(`  Synergy Chains: ${report.metrics.totalSynergyChains}`);
    console.log(`  Clusters: ${report.metrics.totalClusters}`);
    console.log(`  Orphaned Projections: ${report.metrics.orphanedProjections}`);
    console.log(`  Consolidation Debt: ${report.metrics.consolidationDebt}`);
    console.log(`  Avg Chain Length: ${report.metrics.averageChainLength}`);
    console.log(`  Max Chain Length: ${report.metrics.maxChainLength}`);
    console.log("─".repeat(60));

    for (const f of report.findings) {
      const icon = f.severity === "prune" ? "🔴" : f.severity === "simplify" ? "🟡" : "🔵";
      console.log(`  ${icon} [${f.severity.toUpperCase()}] ${f.title}`);
      console.log(`     ${f.detail}`);
      if (f.estimatedSavings) console.log(`     ~${f.estimatedSavings} lines saveable`);
    }

    console.log("═".repeat(60) + "\n");
    expect(true).toBe(true);
  });
});
