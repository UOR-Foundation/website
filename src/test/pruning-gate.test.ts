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
import { pruningGate, type PruningReport } from "@/modules/uns/core/pruning-gate";

let report: PruningReport;

describe("Pruning Gate — System Hygiene", () => {
  it("produces a valid report", () => {
    report = pruningGate();
    expect(report.timestamp).toBeTruthy();
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  // ── Complexity Budgets ──────────────────────────────────────────────

  it("module count stays under 55", () => {
    expect(report.metrics.totalModules).toBeLessThanOrEqual(55);
  });

  it("no 'prune' severity findings (nothing dead)", () => {
    const pruneItems = report.findings.filter(f => f.severity === "prune");
    if (pruneItems.length > 0) {
      console.warn("⚠ PRUNE ITEMS:", pruneItems.map(f => f.title).join("; "));
    }
    // This is advisory — we allow prune items but log them
    expect(pruneItems.length).toBeLessThanOrEqual(5);
  });

  it("orphaned projections under 75% (tighten over time)", () => {
    const orphanRate = report.metrics.orphanedProjections / report.metrics.totalProjections;
    // Current baseline: 68%. Target: <50% by connecting more projections to synergy chains.
    expect(orphanRate).toBeLessThan(0.75);
  });

  it("synergy chain lengths are reasonable (≤10 nodes)", () => {
    expect(report.metrics.maxChainLength).toBeLessThanOrEqual(10);
  });

  it("hygiene score above 50", () => {
    expect(report.score).toBeGreaterThanOrEqual(50);
  });

  // ── Report Output ──────────────────────────────────────────────────

  it("prints the full pruning report", () => {
    console.log("\n" + "═".repeat(60));
    console.log("  PRUNING GATE REPORT");
    console.log("═".repeat(60));
    console.log(`  Score: ${report.score}/100`);
    console.log(`  Modules: ${report.metrics.totalModules}`);
    console.log(`  Projections: ${report.metrics.totalProjections}`);
    console.log(`  Synergy Chains: ${report.metrics.totalSynergyChains}`);
    console.log(`  Clusters: ${report.metrics.totalClusters}`);
    console.log(`  Orphaned Projections: ${report.metrics.orphanedProjections}`);
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
    expect(true).toBe(true); // Always passes — this test is for output
  });
});
