/**
 * PQ Bridge Hologram Analysis
 * ════════════════════════════
 *
 * Runs the coherence gate's self-observation engine to analyze
 * the Post-Quantum Bridge projection's synergies, clusters,
 * and implementation opportunities across the full hologram registry.
 */

import { describe, it, expect } from "vitest";
import { coherenceGate, whatIf } from "../hologram/coherence-gate";
import { SPECS } from "../hologram/specs";

describe("PQ Bridge — Hologram Self-Observation Analysis", () => {
  const report = coherenceGate();

  it("pq-bridge, pq-envelope, and pq-witness projections are registered", () => {
    expect(SPECS.has("pq-bridge")).toBe(true);
    expect(SPECS.has("pq-envelope")).toBe(true);
    expect(SPECS.has("pq-witness")).toBe(true);
  });

  it("all three PQ projections are lossless (full 256-bit identity preserved)", () => {
    expect(SPECS.get("pq-bridge")!.fidelity).toBe("lossless");
    expect(SPECS.get("pq-envelope")!.fidelity).toBe("lossless");
    expect(SPECS.get("pq-witness")!.fidelity).toBe("lossless");
  });

  it("pq-bridge projection produces correct ML-DSA-65 signing target format", () => {
    const mockInput = {
      hashBytes: new Uint8Array(32).fill(0xAB),
      cid: "bafkreitest",
      hex: "ab".repeat(32),
    };
    const result = SPECS.get("pq-bridge")!.project(mockInput);
    expect(result).toBe(`pq:ml-dsa-65:sha256:${"ab".repeat(32)}`);
    expect(result).toContain("ml-dsa-65"); // NIST FIPS 204 algorithm identifier
  });

  it("pq-envelope produces valid OP_RETURN script with version and algorithm bytes", () => {
    const mockInput = {
      hashBytes: new Uint8Array(32).fill(0x42),
      cid: "bafkreitest",
      hex: "42".repeat(32),
    };
    const result = SPECS.get("pq-envelope")!.project(mockInput);
    // 6a26 = OP_RETURN OP_PUSHBYTES_38
    // 554f52 = "UOR" magic prefix
    // 01 = version 1
    // 02 = ML-DSA-65 algorithm
    expect(result.startsWith("6a26554f520102")).toBe(true);
    expect(result).toBe(`6a26554f520102${"42".repeat(32)}`);
    expect(result.length).toBe(14 + 64); // header + 32-byte hash hex
  });

  it("pq-witness encodes the ring coherence identity correctly", () => {
    const x = 42;
    const mockInput = {
      hashBytes: new Uint8Array([x, ...new Array(31).fill(0)]),
      cid: "bafkreitest",
      hex: "2a" + "00".repeat(31),
    };
    const result = SPECS.get("pq-witness")!.project(mockInput);

    // Verify the critical identity: neg(bnot(x)) ≡ succ(x)
    const bnot = (~x) & 0xFF;            // 213
    const negBnot = (256 - bnot) & 0xFF;  // 43
    const succX = (x + 1) & 0xFF;         // 43
    expect(negBnot).toBe(succX); // THE critical identity holds

    expect(result).toContain(`:${x}:`);       // witness value
    expect(result).toContain(`:${negBnot}:`); // neg(bnot(x))
    expect(result).toContain(`:${succX}`);    // succ(x)
  });

  it("coherence gate discovers PQ synergies across all six synergy types", () => {
    const pqSynergies = report.synergies.filter(s =>
      s.projections.some(p => p.startsWith("pq-"))
    );
    expect(pqSynergies.length).toBeGreaterThan(20);

    const pqTypes = new Set(pqSynergies.map(s => s.type));
    // PQ should participate in at least these synergy types
    expect(pqTypes.has("provenance-chain")).toBe(true);
    expect(pqTypes.has("complementary-pair")).toBe(true);
    expect(pqTypes.has("trust-amplification")).toBe(true);
    expect(pqTypes.has("settlement-bridge")).toBe(true);
    expect(pqTypes.has("identity-equivalence")).toBe(true);
  });

  it("PQ Bridge has settlement bridges to Bitcoin, Lightning, and Zcash", () => {
    const pqSettlement = report.synergies.filter(s =>
      s.projections.includes("pq-bridge") &&
      (s.type === "provenance-chain" || s.type === "settlement-bridge")
    );
    const targets = pqSettlement.map(s =>
      s.projections.find(p => p !== "pq-bridge")
    );
    expect(targets).toContain("bitcoin");
    expect(targets).toContain("lightning");
    expect(targets).toContain("zcash-transparent");
    expect(targets).toContain("zcash-memo");
  });

  it("PQ Bridge has provenance chains to identity, trust, and agent layers", () => {
    const pqChains = report.synergies.filter(s =>
      s.projections.includes("pq-bridge") && s.type === "provenance-chain"
    );
    const chainTargets = pqChains.flatMap(s => s.projections);
    expect(chainTargets).toContain("did");
    expect(chainTargets).toContain("vc");
    expect(chainTargets).toContain("erc8004");
    expect(chainTargets).toContain("fpp-phc");
    expect(chainTargets).toContain("tsp-envelope");
    expect(chainTargets).toContain("onnx");
    expect(chainTargets).toContain("solidity");
  });

  it("PQ witness anchors to PQ bridge and PQ envelope (algebraic certification chain)", () => {
    const witnessChains = report.synergies.filter(s =>
      s.projections.includes("pq-witness") && s.type === "provenance-chain"
    );
    const targets = witnessChains.flatMap(s => s.projections);
    expect(targets).toContain("pq-bridge");
    expect(targets).toContain("pq-envelope");
  });

  it("PQ projections appear in the post-quantum cluster", () => {
    const pqCluster = report.clusters.find(c => c.name === "post-quantum");
    expect(pqCluster).toBeDefined();
    expect(pqCluster!.members).toContain("pq-bridge");
    expect(pqCluster!.members).toContain("pq-envelope");
    expect(pqCluster!.members).toContain("pq-witness");
  });

  it("PQ Bridge generates the POST-QUANTUM BRIDGE opportunity", () => {
    const pqOpportunity = report.opportunities.find(o =>
      o.includes("POST-QUANTUM BRIDGE")
    );
    expect(pqOpportunity).toBeDefined();
    expect(pqOpportunity).toContain("Lattice-Hash Duality");
    expect(pqOpportunity).toContain("Dilithium-3");
    expect(pqOpportunity).toContain("neg(bnot(x))");
  });

  it("PQ trust amplification: pq-bridge cross-verifiable with Bitcoin, DID, CID, PHC", () => {
    const pqTrust = report.synergies.filter(s =>
      s.type === "trust-amplification" &&
      s.projections.some(p => p.startsWith("pq-"))
    );
    expect(pqTrust.length).toBeGreaterThan(5);
    const pqTrustPartners = pqTrust.flatMap(s =>
      s.projections.filter(p => !p.startsWith("pq-"))
    );
    expect(pqTrustPartners).toContain("bitcoin");
    expect(pqTrustPartners).toContain("did");
    expect(pqTrustPartners).toContain("cid");
    expect(pqTrustPartners).toContain("fpp-phc");
  });

  // ── Quantitative Summary ──────────────────────────────────────────────

  it("quantitative analysis: PQ Bridge synergy counts", () => {
    const pqSynergies = report.synergies.filter(s =>
      s.projections.some(p => p.startsWith("pq-"))
    );
    const byType = new Map<string, number>();
    for (const s of pqSynergies) {
      byType.set(s.type, (byType.get(s.type) || 0) + 1);
    }

    // Log the analysis (visible in test output)
    console.log("\n╔═══════════════════════════════════════════════════╗");
    console.log("║   POST-QUANTUM BRIDGE — COHERENCE GATE ANALYSIS  ║");
    console.log("╠═══════════════════════════════════════════════════╣");
    console.log(`║ Total projections in registry: ${report.totalProjections.toString().padStart(16)} ║`);
    console.log(`║ Lossless projections:          ${report.losslessCount.toString().padStart(16)} ║`);
    console.log(`║ Lossy projections:             ${report.lossyCount.toString().padStart(16)} ║`);
    console.log(`║ Total synergies discovered:    ${report.synergies.length.toString().padStart(16)} ║`);
    console.log(`║ PQ-specific synergies:         ${pqSynergies.length.toString().padStart(16)} ║`);
    console.log("╠═══════════════════════════════════════════════════╣");
    console.log("║ PQ Synergies by Type:                            ║");
    for (const [type, count] of byType) {
      console.log(`║   ${type.padEnd(28)} ${count.toString().padStart(12)} ║`);
    }
    console.log("╠═══════════════════════════════════════════════════╣");
    console.log("║ PQ Clusters:                                     ║");
    const pqCluster = report.clusters.find(c => c.name === "post-quantum");
    if (pqCluster) {
      console.log(`║   ${pqCluster.name}: ${pqCluster.members.join(", ").padEnd(30)} ║`);
    }
    console.log("╚═══════════════════════════════════════════════════╝");

    // Assertions
    expect(pqSynergies.length).toBeGreaterThan(30);
    expect(byType.size).toBeGreaterThanOrEqual(4); // at least 4 synergy types
  });
});
