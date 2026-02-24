import { describe, it, expect } from "vitest";
import { coherenceGate } from "../hologram/coherence-gate";

describe("Coherence Gate", () => {
  const report = coherenceGate();

  it("returns a valid report with timestamp", () => {
    expect(report.timestamp).toBeTruthy();
    expect(new Date(report.timestamp).getTime()).toBeGreaterThan(0);
  });

  it("counts all projections", () => {
    expect(report.totalProjections).toBeGreaterThanOrEqual(37);
    expect(report.losslessCount + report.lossyCount).toBe(report.totalProjections);
  });

  it("discovers clusters", () => {
    expect(report.clusters.length).toBeGreaterThan(0);
    const tierNames = report.clusters.map(c => c.name);
    expect(tierNames).toContain("agentic");
    expect(tierNames).toContain("lossless");
  });

  it("discovers synergies across all six types", () => {
    const types = new Set(report.synergies.map(s => s.type));
    expect(types.has("identity-equivalence")).toBe(true);
    expect(types.has("settlement-bridge")).toBe(true);
    expect(types.has("discovery-channel")).toBe(true);
    expect(types.has("provenance-chain")).toBe(true);
    expect(types.has("complementary-pair")).toBe(true);
    expect(types.has("trust-amplification")).toBe(true);
  });

  it("generates actionable opportunities", () => {
    expect(report.opportunities.length).toBeGreaterThanOrEqual(4);
    for (const opp of report.opportunities) {
      expect(opp.length).toBeGreaterThan(50); // substantive, not trivial
    }
  });

  it("every synergy has complete metadata", () => {
    for (const s of report.synergies) {
      expect(s.projections).toHaveLength(2);
      expect(s.insight.length).toBeGreaterThan(10);
      expect(s.useCase.length).toBeGreaterThan(10);
      expect(s.implementation.length).toBeGreaterThan(10);
    }
  });

  it("provenance chains include the full agent lifecycle", () => {
    const chains = report.synergies.filter(s => s.type === "provenance-chain");
    const pairs = chains.map(c => c.projections.join("→"));
    expect(pairs).toContain("skill-md→mcp-tool");
    expect(pairs).toContain("onnx→mcp-tool");
    expect(pairs).toContain("erc8004→x402");
    expect(pairs).toContain("skill-md→onnx");
  });

  it("is pure — calling twice returns identical structure", () => {
    const a = coherenceGate();
    const b = coherenceGate();
    expect(a.totalProjections).toBe(b.totalProjections);
    expect(a.synergies.length).toBe(b.synergies.length);
    expect(a.clusters.length).toBe(b.clusters.length);
  });
});
