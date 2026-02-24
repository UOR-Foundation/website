/**
 * Stress Tests — Cross-Projection Identity Coherence
 * ═══════════════════════════════════════════════════
 *
 * Verifies that ALL 147+ projections can be simultaneously threaded
 * through every opportunity module without collision or identity drift.
 *
 * Properties tested:
 *   1. No two distinct hashes produce the same projection URI (collision-free)
 *   2. Same hash always produces identical results (deterministic)
 *   3. All 9 opportunities produce consistent threadHash (no drift)
 *   4. Every projection resolves without throwing (robustness)
 *   5. High-volume random hashes maintain all invariants (stress)
 */

import { describe, it, expect } from "vitest";
import { project, PROJECTIONS } from "../hologram/index";
import type { ProjectionInput } from "../hologram/index";
import { buildAgentLifecyclePipeline } from "../hologram/opportunities/pipeline";
import { buildUnifiedAgentCard } from "../hologram/opportunities/unified-agent-card";
import { buildMultiLedgerAnchor } from "../hologram/opportunities/multi-ledger-anchor";
import { buildSocialDiscoveryMesh } from "../hologram/opportunities/social-discovery-mesh";
import { buildUniversalNotarization } from "../hologram/opportunities/universal-notarization";
import { buildPolyglotSupplyChain } from "../hologram/opportunities/polyglot-supply-chain";
import { buildSmartContractIntegrity } from "../hologram/opportunities/smart-contract-integrity";
import { buildProofCertifiedSoftware } from "../hologram/opportunities/proof-certified-software";
import { buildSiliconToCloudProvenance } from "../hologram/opportunities/silicon-to-cloud";

// ── Helpers ──────────────────────────────────────────────────────────────

function makeInput(seed: number): ProjectionInput {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = (seed * 37 + i * 13) & 0xff;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return { hashBytes: bytes, cid: `bafyrei${hex.slice(0, 40)}`, hex };
}

const ALL_PROJECTION_NAMES = [...PROJECTIONS.keys()];

const ALL_OPPORTUNITY_BUILDERS = [
  { name: "AgentLifecyclePipeline", build: (i: ProjectionInput) => buildAgentLifecyclePipeline(i) },
  { name: "UnifiedAgentCard",       build: (i: ProjectionInput) => buildUnifiedAgentCard(i) },
  { name: "MultiLedgerAnchor",      build: (i: ProjectionInput) => buildMultiLedgerAnchor(i) },
  { name: "SocialDiscoveryMesh",    build: (i: ProjectionInput) => buildSocialDiscoveryMesh(i) },
  { name: "UniversalNotarization",  build: (i: ProjectionInput) => buildUniversalNotarization(i) },
  { name: "PolyglotSupplyChain",    build: (i: ProjectionInput) => buildPolyglotSupplyChain(i) },
  { name: "SmartContractIntegrity", build: (i: ProjectionInput) => buildSmartContractIntegrity(i) },
  { name: "ProofCertifiedSoftware", build: (i: ProjectionInput) => buildProofCertifiedSoftware(i) },
  { name: "SiliconToCloudProvenance", build: (i: ProjectionInput) => buildSiliconToCloudProvenance(i) },
] as const;

// ═════════════════════════════════════════════════════════════════════════
// STRESS TEST SUITE
// ═════════════════════════════════════════════════════════════════════════

describe("Stress — Projection Registry Integrity", () => {
  it("registry contains 147+ projections", () => {
    expect(ALL_PROJECTION_NAMES.length).toBeGreaterThanOrEqual(147);
  });

  it("every projection resolves without throwing for a canonical input", () => {
    const input = makeInput(42);
    for (const name of ALL_PROJECTION_NAMES) {
      expect(() => project(input, name)).not.toThrow();
    }
  });

  it("every projection returns a non-empty value", () => {
    const input = makeInput(99);
    for (const name of ALL_PROJECTION_NAMES) {
      const p = project(input, name);
      expect(p.value.length, `${name} returned empty value`).toBeGreaterThan(0);
    }
  });

  it("every projection returns lossless or lossy fidelity", () => {
    const input = makeInput(7);
    for (const name of ALL_PROJECTION_NAMES) {
      const p = project(input, name);
      expect(["lossless", "lossy"]).toContain(p.fidelity);
    }
  });
});

describe("Stress — Collision Freedom (no two hashes collide)", () => {
  const SAMPLE_SIZE = 50;
  const inputs = Array.from({ length: SAMPLE_SIZE }, (_, i) => makeInput(i));

  it("no two distinct hashes produce the same DID", () => {
    const dids = new Set(inputs.map(i => project(i, "did").value));
    expect(dids.size).toBe(SAMPLE_SIZE);
  });

  it("no two distinct hashes produce the same CID projection", () => {
    const cids = new Set(inputs.map(i => project(i, "cid").value));
    expect(cids.size).toBe(SAMPLE_SIZE);
  });

  it("no two distinct hashes collide on any projection", () => {
    // Spot-check 20 random projections across all inputs
    const sample = ALL_PROJECTION_NAMES.filter((_, i) => i % 7 === 0);
    for (const name of sample) {
      const values = new Set(inputs.map(i => project(i, name).value));
      expect(values.size, `collision on projection '${name}'`).toBe(SAMPLE_SIZE);
    }
  });
});

describe("Stress — Determinism (same hash → identical output)", () => {
  it("projecting the same input twice yields identical URIs for all projections", () => {
    const input = makeInput(123);
    for (const name of ALL_PROJECTION_NAMES) {
      const a = project(input, name).value;
      const b = project(input, name).value;
      expect(a, `non-deterministic: ${name}`).toBe(b);
    }
  });

  it("all 9 opportunities are deterministic", () => {
    const input = makeInput(456);
    for (const { name, build } of ALL_OPPORTUNITY_BUILDERS) {
      const a = JSON.stringify(build(input));
      const b = JSON.stringify(build(input));
      expect(a, `non-deterministic opportunity: ${name}`).toBe(b);
    }
  });
});

describe("Stress — Identity Drift (threadHash consistency)", () => {
  it("all 9 opportunities report the same threadHash", () => {
    const input = makeInput(789);
    const results = ALL_OPPORTUNITY_BUILDERS.map(({ name, build }) => {
      const result = build(input) as unknown as Record<string, unknown>;
      return { name, hash: result.threadHash as string };
    });
    for (const r of results) {
      expect(r.hash, `${r.name} has drifted threadHash`).toBe(input.hex);
    }
  });

  it("threadHash never drifts across 50 random identities", () => {
    for (let seed = 0; seed < 50; seed++) {
      const input = makeInput(seed);
      for (const { name, build } of ALL_OPPORTUNITY_BUILDERS) {
        const result = build(input) as unknown as Record<string, unknown>;
        expect(result.threadHash, `drift in ${name} at seed=${seed}`).toBe(input.hex);
      }
    }
  });
});

describe("Stress — Opportunity Robustness (no throws on any input)", () => {
  it("all 9 opportunities resolve without throwing for 100 random inputs", () => {
    for (let seed = 0; seed < 100; seed++) {
      const input = makeInput(seed);
      for (const { name, build } of ALL_OPPORTUNITY_BUILDERS) {
        expect(() => build(input), `${name} threw at seed=${seed}`).not.toThrow();
      }
    }
  });
});

describe("Stress — Cross-Opportunity Projection Coverage", () => {
  const input = makeInput(2025);

  it("Pipeline covers 10+ stages", () => {
    expect(buildAgentLifecyclePipeline(input).stages.length).toBeGreaterThanOrEqual(10);
  });

  it("Unified Card spans 5+ projections", () => {
    expect(buildUnifiedAgentCard(input).projectionCount).toBeGreaterThanOrEqual(5);
  });

  it("Multi-Ledger is triple-anchored", () => {
    expect(buildMultiLedgerAnchor(input).tripleAnchored).toBe(true);
  });

  it("Social Mesh has full coverage", () => {
    expect(buildSocialDiscoveryMesh(input).fullCoverage).toBe(true);
  });

  it("Notarization covers 100+ projections", () => {
    expect(buildUniversalNotarization(input).notarizationCount).toBeGreaterThanOrEqual(100);
  });

  it("Polyglot covers 50+ languages", () => {
    expect(buildPolyglotSupplyChain(input).languageCount).toBeGreaterThanOrEqual(50);
  });

  it("Smart Contract covers 4 languages", () => {
    expect(buildSmartContractIntegrity(input).languagesCovered.length).toBe(4);
  });

  it("Proof-Certified has full prover coverage", () => {
    expect(buildProofCertifiedSoftware(input).fullCoverage).toBe(true);
  });

  it("Silicon-to-Cloud is full stack", () => {
    expect(buildSiliconToCloudProvenance(input).fullStack).toBe(true);
  });
});

describe("Stress — High-Volume Simultaneous Threading", () => {
  it("1000 identities × 9 opportunities = 9000 builds with zero failures", () => {
    let builds = 0;
    for (let seed = 0; seed < 1000; seed++) {
      const input = makeInput(seed);
      for (const { build } of ALL_OPPORTUNITY_BUILDERS) {
        const result = build(input) as unknown as Record<string, unknown>;
        expect(result.threadHash).toBe(input.hex);
        builds++;
      }
    }
    expect(builds).toBe(9000);
  });
});
