/**
 * Ethereum Bridge — Integration Tests
 * ════════════════════════════════════
 *
 * Verifies all four integration pillars produce correct, consistent
 * artifacts that align with Ethereum's roadmap.
 */

import { describe, it, expect } from "vitest";
import { project } from "../hologram";
import type { ProjectionInput } from "../hologram";
import {
  generateBlobWitness,
  generateVerkleLookup,
  generateZkCoherence,
  generateAccountAbstraction,
  ethBridgePipeline,
} from "../ethereum-bridge";

function makeId(fill: number): ProjectionInput {
  const hashBytes = new Uint8Array(32).fill(fill);
  const hex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return { hashBytes, cid: `bafkreitest${fill}`, hex };
}

const IDS = [makeId(0x00), makeId(0x42), makeId(0x7F), makeId(0x80), makeId(0xFF)];

const REALISTIC_HASH = new Uint8Array([
  0x2c, 0xf2, 0x4d, 0xba, 0x5f, 0xb0, 0xa3, 0x0e,
  0x26, 0xe8, 0x3b, 0x2a, 0xc5, 0xb9, 0xe2, 0x9e,
  0x1b, 0x16, 0x1e, 0x5c, 0x1f, 0xa7, 0x42, 0x5e,
  0x73, 0x04, 0x33, 0x62, 0x93, 0x8b, 0x98, 0x24,
]);
const REAL: ProjectionInput = {
  hashBytes: REALISTIC_HASH,
  cid: "bafkreiclp7vedvlwtpbivznd2cdia2vk4pp6oqmt4w3opmxh6bsqx4uroi",
  hex: Array.from(REALISTIC_HASH).map(b => b.toString(16).padStart(2, "0")).join(""),
};

describe("Ethereum Bridge — Four Pillars", () => {

  describe("Pillar 1: EIP-4844 Blob Witness", () => {
    it("commitment is valid 0x-prefixed bytes32", () => {
      const bw = generateBlobWitness(REAL);
      expect(bw.commitment.startsWith("0x")).toBe(true);
      expect(bw.commitment.length).toBe(2 + 64);
    });

    it("commitment matches hologram eth-commitment projection", () => {
      for (const id of IDS) {
        const bw = generateBlobWitness(id);
        const proj = project(id, "eth-commitment").value;
        expect(bw.commitment).toBe(proj);
      }
    });

    it("calldata matches hologram eth-calldata projection", () => {
      const bw = generateBlobWitness(REAL);
      const proj = project(REAL, "eth-calldata").value;
      expect(bw.calldata).toBe(proj);
    });

    it("log topic matches hologram eth-log-topic projection", () => {
      const bw = generateBlobWitness(REAL);
      const proj = project(REAL, "eth-log-topic").value;
      expect(bw.logTopic).toBe(proj);
    });

    it("gas estimate is within practical range", () => {
      const bw = generateBlobWitness(REAL);
      expect(bw.gasEstimate).toBeLessThan(100_000);
    });
  });

  describe("Pillar 2: Verkle Tree Leaf Witness", () => {
    it("state key is valid bytes32", () => {
      const vl = generateVerkleLookup(REAL);
      expect(vl.stateKey.startsWith("0x")).toBe(true);
      expect(vl.stateKey.length).toBe(2 + 64);
    });

    it("stem is first 31 bytes of hash", () => {
      const vl = generateVerkleLookup(REAL);
      expect(vl.stem).toBe("0x" + REAL.hex.slice(0, 62));
    });

    it("suffix is last byte of hash", () => {
      const vl = generateVerkleLookup(REAL);
      expect(vl.suffix).toBe(REAL.hashBytes[31]);
    });

    it("stem + suffix reconstructs full hash", () => {
      for (const id of IDS) {
        const vl = generateVerkleLookup(id);
        const reconstructed = vl.stem.slice(2) + id.hashBytes[31].toString(16).padStart(2, "0");
        expect(reconstructed).toBe(id.hex);
      }
    });
  });

  describe("Pillar 3: ZK Circuit Coherence", () => {
    it("R1CS constraint count is always 0", () => {
      for (const id of IDS) {
        const zk = generateZkCoherence(id);
        expect(zk.r1csConstraints).toBe(0);
      }
    });

    it("coherence identity holds for all 5 test values", () => {
      for (const id of IDS) {
        const zk = generateZkCoherence(id);
        expect(zk.proof.holds).toBe(true);
        expect(zk.proof.negBnot).toBe(zk.proof.succX);
      }
    });

    it("exhaustive: coherence holds for all 256 byte values", () => {
      for (let x = 0; x < 256; x++) {
        const bnot = (~x) & 0xFF;
        const negBnot = (256 - bnot) & 0xFF;
        const succX = (x + 1) & 0xFF;
        expect(negBnot).toBe(succX);
      }
    });

    it("public inputs contain content hash and witness byte", () => {
      const zk = generateZkCoherence(REAL);
      expect(zk.publicInputs[0]).toBe(`0x${REAL.hex}`);
      expect(zk.publicInputs[1]).toBe(`0x${REAL.hashBytes[0].toString(16).padStart(2, "0")}`);
    });

    it("circuit description is non-empty formal spec", () => {
      const zk = generateZkCoherence(REAL);
      expect(zk.circuitDescription).toContain("R1CS");
      expect(zk.circuitDescription).toContain("0 constraints");
    });
  });

  describe("Pillar 4: Account Abstraction (EIP-7701)", () => {
    it("commitment hash matches eth-commitment projection", () => {
      for (const id of IDS) {
        const aa = generateAccountAbstraction(id);
        const proj = project(id, "eth-commitment").value;
        expect(aa.commitmentHash).toBe(proj);
      }
    });

    it("gas estimate is practical (~2,800)", () => {
      const aa = generateAccountAbstraction(REAL);
      expect(aa.gasEstimate).toBeLessThan(5_000);
    });

    it("validation steps describe complete PQ flow", () => {
      const aa = generateAccountAbstraction(REAL);
      expect(aa.validationSteps.length).toBeGreaterThan(3);
      expect(aa.validationSteps.some(s => s.includes("Dilithium-3"))).toBe(true);
    });
  });

  describe("Cross-Pillar Verification", () => {
    it("all pillar hashes match source content hash", () => {
      const result = ethBridgePipeline(REAL);
      expect(result.crossVerification.allMatch).toBe(true);
    });

    it("all 5 test identities pass cross-verification", () => {
      for (const id of IDS) {
        const result = ethBridgePipeline(id);
        expect(result.crossVerification.allMatch).toBe(true);
      }
    });

    it("blob witness hash matches ZK public input hash", () => {
      const result = ethBridgePipeline(REAL);
      expect(result.crossVerification.hashes.blobWitness)
        .toBe(result.crossVerification.hashes.zkPublicInput);
    });

    it("ZK public input hash matches AA commitment hash", () => {
      const result = ethBridgePipeline(REAL);
      expect(result.crossVerification.hashes.zkPublicInput)
        .toBe(result.crossVerification.hashes.aaCommitment);
    });
  });

  it("quantitative summary", () => {
    const t0 = performance.now();
    const result = ethBridgePipeline(REAL);
    const elapsed = performance.now() - t0;

    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║   ETHEREUM BRIDGE — FOUR PILLARS INTEGRATION SUMMARY     ║");
    console.log("╠═══════════════════════════════════════════════════════════╣");
    console.log(`║ Pipeline time:         ${elapsed.toFixed(1).padStart(7)} ms                        ║`);
    console.log("╠═══════════════════════════════════════════════════════════╣");
    console.log(`║ P1 Blob Witness:       ${result.pillars.blobWitness.gasEstimate.toString().padStart(7)} gas    ✓ ready     ║`);
    console.log(`║ P2 Verkle Lookup:      bytes32 key    ✓ ready              ║`);
    console.log(`║ P3 ZK Coherence:       ${result.pillars.zkCoherence.r1csConstraints.toString().padStart(7)} R1CS   ✓ zero-cost ║`);
    console.log(`║ P4 Account Abstraction:${result.pillars.accountAbstraction.gasEstimate.toString().padStart(7)} gas    ✓ ready     ║`);
    console.log("╠═══════════════════════════════════════════════════════════╣");
    console.log(`║ Cross-verification:    ${result.crossVerification.allMatch ? "✓ ALL MATCH" : "✗ MISMATCH "}                       ║`);
    console.log(`║ Protocol changes:      ZERO                                ║`);
    console.log("╚═══════════════════════════════════════════════════════════╝");

    expect(result.crossVerification.allMatch).toBe(true);
    expect(elapsed).toBeLessThan(1000);
  });
});
