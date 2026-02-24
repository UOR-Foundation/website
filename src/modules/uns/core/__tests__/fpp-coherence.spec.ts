import { describe, it, expect } from "vitest";
import { coherenceGate } from "../hologram/coherence-gate";
import { SPECS } from "../hologram/specs";

describe("FPP Coherence Verification", () => {
  const report = coherenceGate();

  // ── 9 FPP Projections ───────────────────────────────────────────────────
  const FPP_PROJECTIONS = [
    "fpp-phc", "fpp-vrc", "fpp-vec",
    "fpp-rdid", "fpp-mdid", "fpp-pdid",
    "fpp-rcard", "fpp-trustgraph", "trqp",
  ];

  it("all 9 FPP projections are registered in SPECS", () => {
    for (const name of FPP_PROJECTIONS) {
      expect(SPECS.has(name), `Missing projection: ${name}`).toBe(true);
    }
    const fppSpecs = FPP_PROJECTIONS.filter(n => SPECS.has(n));
    expect(fppSpecs).toHaveLength(9);
  });

  it("all 9 FPP projections appear in the coherence report", () => {
    // They should be counted in totalProjections
    for (const name of FPP_PROJECTIONS) {
      // Check that synergies reference these projections
      const mentioned = report.synergies.some(
        s => s.projections.includes(name)
      );
      expect(mentioned, `Projection "${name}" has no synergies`).toBe(true);
    }
  });

  // ── FPP Provenance Chains ───────────────────────────────────────────────
  const FPP_PROVENANCE_PAIRS = [
    ["fpp-phc", "fpp-vrc"],
    ["fpp-vrc", "fpp-vec"],
    ["fpp-phc", "fpp-trustgraph"],
    ["fpp-rdid", "tsp-vid"],
    ["fpp-mdid", "activitypub"],
    ["fpp-pdid", "did"],
    ["fpp-vrc", "tsp-envelope"],
    ["fpp-vec", "vc"],
    ["fpp-rcard", "webfinger"],
    ["fpp-trustgraph", "trqp"],
    ["trqp", "sparql"],
    ["fpp-phc", "fpp-rdid"],
    ["fpp-phc", "fpp-mdid"],
    ["fpp-phc", "fpp-pdid"],
    ["fpp-vec", "fpp-trustgraph"],
    ["fpp-rcard", "fpp-pdid"],
    ["trqp", "mcp-tool"],
  ];

  it("discovers at least 17 FPP provenance chains", () => {
    const chains = report.synergies.filter(s => s.type === "provenance-chain");
    let found = 0;
    for (const [a, b] of FPP_PROVENANCE_PAIRS) {
      const exists = chains.some(
        c =>
          (c.projections[0] === a && c.projections[1] === b) ||
          (c.projections[0] === b && c.projections[1] === a)
      );
      if (exists) found++;
      else console.warn(`Missing provenance chain: ${a} → ${b}`);
    }
    expect(found).toBeGreaterThanOrEqual(17);
  });

  // ── FPP Complementary Pairs ─────────────────────────────────────────────
  const FPP_COMPLEMENTARY_PAIRS = [
    ["fpp-phc", "vc"],
    ["fpp-vrc", "tsp-relationship"],
    ["fpp-rdid", "nostr"],
    ["fpp-mdid", "atproto"],
    ["fpp-pdid", "ens"],
    ["fpp-rcard", "vcard"],
    ["fpp-trustgraph", "schema-org"],
    ["fpp-vec", "skill-md"],
    ["trqp", "graphql"],
    ["fpp-phc", "erc8004"],
    ["fpp-rdid", "fpp-mdid"],
    ["fpp-vrc", "fpp-vec"],
    ["fpp-trustgraph", "onnx"],
  ];

  it("discovers at least 13 FPP complementary pairs", () => {
    const pairs = report.synergies.filter(s => s.type === "complementary-pair");
    let found = 0;
    for (const [a, b] of FPP_COMPLEMENTARY_PAIRS) {
      const exists = pairs.some(
        p =>
          (p.projections[0] === a && p.projections[1] === b) ||
          (p.projections[0] === b && p.projections[1] === a)
      );
      if (exists) found++;
      else console.warn(`Missing complementary pair: ${a} ↔ ${b}`);
    }
    expect(found).toBeGreaterThanOrEqual(13);
  });

  // ── FPP Cluster ─────────────────────────────────────────────────────────
  it("FPP projections form a trust-identity cluster", () => {
    const clusterNames = report.clusters.map(c => c.name);
    expect(clusterNames).toContain("first-person");
  });

  // ── Structural integrity ────────────────────────────────────────────────
  it("every FPP synergy has complete metadata", () => {
    const fppSynergies = report.synergies.filter(
      s => FPP_PROJECTIONS.some(p => s.projections.includes(p))
    );
    expect(fppSynergies.length).toBeGreaterThan(0);
    for (const s of fppSynergies) {
      expect(s.projections).toHaveLength(2);
      expect(s.insight.length).toBeGreaterThan(10);
      expect(s.useCase.length).toBeGreaterThan(10);
      expect(s.implementation.length).toBeGreaterThan(10);
    }
  });
});
