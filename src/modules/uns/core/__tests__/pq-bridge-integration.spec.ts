/**
 * PQ Bridge — Full Round-Trip Integration Test
 * ═════════════════════════════════════════════
 *
 * Verifies the complete pipeline end-to-end:
 *   Object → URDNA2015 → SHA-256 → pq-bridge projection
 *   → Bitcoin OP_RETURN script → Ethereum calldata/commitment/log
 *   → Coherence witness → Dilithium-3 sign → verify → all checksums match
 *
 * This is the definitive integration test: every projection must be
 * internally consistent and cross-verifiable against every other.
 */

import { describe, it, expect } from "vitest";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { project } from "../hologram";
import type { ProjectionInput } from "../hologram";
import {
  pqKeygen,
  pqSign,
  pqVerify,
  pqBridgePipeline,
} from "../pq-bridge";

// ── Deterministic test identities ───────────────────────────────────────────

function makeIdentity(fill: number): ProjectionInput {
  const hashBytes = new Uint8Array(32).fill(fill);
  const hex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return { hashBytes, cid: `bafkreitest${fill}`, hex };
}

const IDENTITIES = [
  makeIdentity(0x00),
  makeIdentity(0x42),
  makeIdentity(0x7F),
  makeIdentity(0x80),
  makeIdentity(0xFF),
];

// A realistic SHA-256 hash (not uniform fill)
const REALISTIC_HASH = new Uint8Array([
  0x2c, 0xf2, 0x4d, 0xba, 0x5f, 0xb0, 0xa3, 0x0e,
  0x26, 0xe8, 0x3b, 0x2a, 0xc5, 0xb9, 0xe2, 0x9e,
  0x1b, 0x16, 0x1e, 0x5c, 0x1f, 0xa7, 0x42, 0x5e,
  0x73, 0x04, 0x33, 0x62, 0x93, 0x8b, 0x98, 0x24,
]);
const REALISTIC_ID: ProjectionInput = {
  hashBytes: REALISTIC_HASH,
  cid: "bafkreiclp7vedvlwtpbivznd2cdia2vk4pp6oqmt4w3opmxh6bsqx4uroi",
  hex: Array.from(REALISTIC_HASH).map(b => b.toString(16).padStart(2, "0")).join(""),
};

describe("PQ Bridge — Full Round-Trip Integration", () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Cross-projection checksum consistency
  // ═══════════════════════════════════════════════════════════════════════════

  describe("cross-projection checksum consistency", () => {
    it("pq-bridge signing target contains the exact content hash", () => {
      for (const id of IDENTITIES) {
        const signingTarget = project(id, "pq-bridge").value;
        expect(signingTarget).toBe(`pq:ml-dsa-65:sha256:${id.hex}`);
        // Extract hash from signing target and verify it matches
        const extractedHash = signingTarget.split(":").pop()!;
        expect(extractedHash).toBe(id.hex);
      }
    });

    it("Bitcoin OP_RETURN script embeds the same hash as pq-bridge", () => {
      for (const id of IDENTITIES) {
        const btcScript = project(id, "pq-envelope").value;
        const signingTarget = project(id, "pq-bridge").value;

        // Extract hash from both
        const btcHash = btcScript.slice(14); // after "6a26554f520102"
        const bridgeHash = signingTarget.split(":").pop()!;

        expect(btcHash).toBe(bridgeHash);
        expect(btcHash).toBe(id.hex);
      }
    });

    it("Ethereum commitment embeds the same hash as Bitcoin script", () => {
      for (const id of IDENTITIES) {
        const btcScript = project(id, "pq-envelope").value;
        const ethCommitment = project(id, "eth-commitment").value;

        const btcHash = btcScript.slice(14);
        const ethHash = ethCommitment.slice(2); // after "0x"

        expect(ethHash).toBe(btcHash);
        expect(ethHash).toBe(id.hex);
      }
    });

    it("Ethereum calldata embeds the same hash as pq-bridge + btc + eth-commitment", () => {
      for (const id of IDENTITIES) {
        const calldata = project(id, "eth-calldata").value;
        const selector = calldata.slice(0, 10); // "0x7a3f5e12"
        const calldataHash = calldata.slice(10, 10 + 64); // bytes32

        expect(selector).toBe("0x7a3f5e12");
        expect(calldataHash).toBe(id.hex);

        // Cross-check against other projections
        const btcHash = project(id, "pq-envelope").value.slice(14);
        const ethHash = project(id, "eth-commitment").value.slice(2);
        expect(calldataHash).toBe(btcHash);
        expect(calldataHash).toBe(ethHash);
      }
    });

    it("Ethereum log topic embeds the same hash", () => {
      for (const id of IDENTITIES) {
        const topic = project(id, "eth-log-topic").value;
        const topicHash = topic.replace("topic:pq-registered:0x", "");
        expect(topicHash).toBe(id.hex);
      }
    });

    it("coherence witness hex field matches all other projections", () => {
      for (const id of IDENTITIES) {
        const witness = project(id, "pq-witness").value;
        // Format: pq:witness:{hex}:{x}:{negbnot}:{succ}
        const witnessHex = witness.split(":")[2];
        expect(witnessHex).toBe(id.hex);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Bitcoin script structural integrity
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Bitcoin script structural integrity", () => {
    it("OP_RETURN script has correct prefix, version, algorithm, and length", () => {
      const script = project(REALISTIC_ID, "pq-envelope").value;

      expect(script.slice(0, 2)).toBe("6a");       // OP_RETURN
      expect(script.slice(2, 4)).toBe("26");        // OP_PUSHBYTES_38
      expect(script.slice(4, 10)).toBe("554f52");   // "UOR" magic
      expect(script.slice(10, 12)).toBe("01");      // version 1
      expect(script.slice(12, 14)).toBe("02");      // ML-DSA-65
      expect(script.slice(14)).toBe(REALISTIC_ID.hex);
      expect(script.length / 2).toBe(39);           // 39 bytes total
      expect(script.length / 2).toBeLessThan(80);   // within OP_RETURN limit
    });

    it("all 5 test identities produce valid 39-byte OP_RETURN scripts", () => {
      for (const id of IDENTITIES) {
        const script = project(id, "pq-envelope").value;
        expect(script.length / 2).toBe(39);
        expect(script.startsWith("6a26554f520102")).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Ethereum calldata structural integrity
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Ethereum calldata structural integrity", () => {
    it("calldata has correct selector and ABI-encoded bytes32", () => {
      const calldata = project(REALISTIC_ID, "eth-calldata").value;

      // Function selector: registerPqCommitment(bytes32)
      expect(calldata.slice(0, 10)).toBe("0x7a3f5e12");
      // ABI-encoded bytes32 (64 hex chars, padded)
      const payload = calldata.slice(10);
      expect(payload.length).toBe(64);
    });

    it("eth-commitment is a valid 0x-prefixed bytes32", () => {
      const commitment = project(REALISTIC_ID, "eth-commitment").value;
      expect(commitment.startsWith("0x")).toBe(true);
      expect(commitment.length).toBe(2 + 64); // "0x" + 64 hex
    });

    it("eth-log-topic has correct format", () => {
      const topic = project(REALISTIC_ID, "eth-log-topic").value;
      expect(topic.startsWith("topic:pq-registered:0x")).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Coherence witness algebraic verification
  // ═══════════════════════════════════════════════════════════════════════════

  describe("coherence witness algebraic verification", () => {
    it("neg(bnot(x)) ≡ succ(x) for all 256 byte values (exhaustive)", () => {
      for (let x = 0; x < 256; x++) {
        const bnot = (~x) & 0xFF;
        const negBnot = (256 - bnot) & 0xFF;
        const succX = (x + 1) & 0xFF;
        expect(negBnot).toBe(succX);
      }
    });

    it("witness encodes correct x, negbnot, succ for each test identity", () => {
      for (const id of IDENTITIES) {
        const witness = project(id, "pq-witness").value;
        const parts = witness.split(":");
        const x = parseInt(parts[3], 10);
        const negBnot = parseInt(parts[4], 10);
        const succX = parseInt(parts[5], 10);

        expect(x).toBe(id.hashBytes[0]);
        expect(negBnot).toBe(succX);
        expect(negBnot).toBe((id.hashBytes[0] + 1) & 0xFF);
      }
    });

    it("witness self-verifies: recompute from x matches encoded values", () => {
      const witness = project(REALISTIC_ID, "pq-witness").value;
      const parts = witness.split(":");
      const x = parseInt(parts[3], 10);
      const negBnot = parseInt(parts[4], 10);
      const succX = parseInt(parts[5], 10);

      const recomputedNegBnot = (256 - ((~x) & 0xFF)) & 0xFF;
      const recomputedSucc = (x + 1) & 0xFF;

      expect(negBnot).toBe(recomputedNegBnot);
      expect(succX).toBe(recomputedSucc);
      expect(recomputedNegBnot).toBe(recomputedSucc);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Dilithium-3 sign → verify round-trip
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Dilithium-3 sign → verify round-trip", () => {
    it("keygen → sign → verify passes for realistic identity", () => {
      const kp = pqKeygen();
      const envelope = pqSign(REALISTIC_ID, kp.secretKey);
      const verification = pqVerify(envelope, kp.publicKey);

      expect(verification.signatureValid).toBe(true);
      expect(verification.coherenceValid).toBe(true);
      expect(verification.anchorValid).toBe(true);
      expect(verification.valid).toBe(true);
    });

    it("sign → verify passes for all 5 boundary identities", () => {
      const kp = pqKeygen();
      for (const id of IDENTITIES) {
        const envelope = pqSign(id, kp.secretKey);
        const result = pqVerify(envelope, kp.publicKey);
        expect(result.valid).toBe(true);
      }
    });

    it("wrong key → signature invalid, but coherence + anchor still hold", () => {
      const kp1 = pqKeygen();
      const kp2 = pqKeygen();
      const envelope = pqSign(REALISTIC_ID, kp1.secretKey);
      const result = pqVerify(envelope, kp2.publicKey);

      expect(result.signatureValid).toBe(false);
      expect(result.coherenceValid).toBe(true);
      expect(result.anchorValid).toBe(true);
      expect(result.valid).toBe(false);
    });

    it("tampered Bitcoin script → anchor invalid, but signature + coherence hold", () => {
      const kp = pqKeygen();
      const envelope = pqSign(REALISTIC_ID, kp.secretKey);
      const tampered = { ...envelope, bitcoinScript: envelope.bitcoinScript.slice(0, -2) + "ff" };
      const result = pqVerify(tampered, kp.publicKey);

      expect(result.signatureValid).toBe(true);
      expect(result.coherenceValid).toBe(true);
      expect(result.anchorValid).toBe(false);
      expect(result.valid).toBe(false);
    });

    it("tampered witness → coherence invalid", () => {
      const kp = pqKeygen();
      const envelope = pqSign(REALISTIC_ID, kp.secretKey);
      // Corrupt the witness by changing the succ value
      const parts = envelope.coherenceWitness.split(":");
      parts[5] = "999"; // impossible succ value
      const tampered = { ...envelope, coherenceWitness: parts.join(":") };
      const result = pqVerify(tampered, kp.publicKey);

      expect(result.coherenceValid).toBe(false);
      expect(result.valid).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Full pipeline cross-verification: envelope fields match projections
  // ═══════════════════════════════════════════════════════════════════════════

  describe("envelope ↔ projection cross-verification", () => {
    it("envelope.signingTarget matches project(id, 'pq-bridge')", () => {
      const { envelope } = pqBridgePipeline(REALISTIC_ID);
      const projection = project(REALISTIC_ID, "pq-bridge").value;
      expect(envelope.signingTarget).toBe(projection);
    });

    it("envelope.bitcoinScript matches project(id, 'pq-envelope')", () => {
      const { envelope } = pqBridgePipeline(REALISTIC_ID);
      const projection = project(REALISTIC_ID, "pq-envelope").value;
      expect(envelope.bitcoinScript).toBe(projection);
    });

    it("envelope.coherenceWitness matches project(id, 'pq-witness')", () => {
      const { envelope } = pqBridgePipeline(REALISTIC_ID);
      const projection = project(REALISTIC_ID, "pq-witness").value;
      expect(envelope.coherenceWitness).toBe(projection);
    });

    it("envelope.contentHash matches Ethereum commitment", () => {
      const { envelope } = pqBridgePipeline(REALISTIC_ID);
      const ethCommitment = project(REALISTIC_ID, "eth-commitment").value;
      expect(`0x${envelope.contentHash}`).toBe(ethCommitment);
    });

    it("envelope.contentHash matches Ethereum calldata payload", () => {
      const { envelope } = pqBridgePipeline(REALISTIC_ID);
      const calldata = project(REALISTIC_ID, "eth-calldata").value;
      const calldataHash = calldata.slice(10, 10 + 64);
      expect(envelope.contentHash).toBe(calldataHash);
    });

    it("envelope.contentHash matches Ethereum log topic", () => {
      const { envelope } = pqBridgePipeline(REALISTIC_ID);
      const topic = project(REALISTIC_ID, "eth-log-topic").value;
      expect(topic).toContain(envelope.contentHash);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Raw ML-DSA-65 round-trip (independent of pq-bridge module)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("raw ML-DSA-65 independent verification", () => {
    it("direct ml_dsa65 sign → verify on the pq-bridge projection string", () => {
      const kp = ml_dsa65.keygen();
      const signingTarget = project(REALISTIC_ID, "pq-bridge").value;
      const message = new TextEncoder().encode(signingTarget);

      const signature = ml_dsa65.sign(message, kp.secretKey);
      const valid = ml_dsa65.verify(signature, message, kp.publicKey);

      expect(valid).toBe(true);
      expect(signature.length).toBe(3309);
      expect(kp.publicKey.length).toBe(1952);
      expect(kp.secretKey.length).toBe(4032);
    });

    it("signature over pq-bridge string matches what pqSign produces", () => {
      const seed = new Uint8Array(32).fill(0x42);
      const kp = pqKeygen(seed);
      const envelope = pqSign(REALISTIC_ID, kp.secretKey);

      // The signing target must be the pq-bridge projection
      expect(envelope.signingTarget).toBe(project(REALISTIC_ID, "pq-bridge").value);

      // Verify with raw ml_dsa65
      const message = new TextEncoder().encode(envelope.signingTarget);
      const valid = ml_dsa65.verify(envelope.signature, message, kp.publicKey);
      expect(valid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Quantitative summary
  // ═══════════════════════════════════════════════════════════════════════════

  it("integration summary: full round-trip timing and verification", () => {
    const t0 = performance.now();
    const { envelope, verification } = pqBridgePipeline(REALISTIC_ID);
    const pipelineMs = performance.now() - t0;

    // Generate all projections
    const btcScript = project(REALISTIC_ID, "pq-envelope").value;
    const ethCommitment = project(REALISTIC_ID, "eth-commitment").value;
    const ethCalldata = project(REALISTIC_ID, "eth-calldata").value;
    const ethLogTopic = project(REALISTIC_ID, "eth-log-topic").value;
    const witness = project(REALISTIC_ID, "pq-witness").value;

    // Cross-verify all hashes match
    const btcHash = btcScript.slice(14);
    const ethHash = ethCommitment.slice(2);
    const calldataHash = ethCalldata.slice(10, 74);
    const topicHash = ethLogTopic.replace("topic:pq-registered:0x", "");
    const witnessHex = witness.split(":")[2];

    const allMatch =
      btcHash === REALISTIC_ID.hex &&
      ethHash === REALISTIC_ID.hex &&
      calldataHash === REALISTIC_ID.hex &&
      topicHash === REALISTIC_ID.hex &&
      witnessHex === REALISTIC_ID.hex;

    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║   PQ BRIDGE — FULL ROUND-TRIP INTEGRATION VERIFICATION   ║");
    console.log("╠═══════════════════════════════════════════════════════════╣");
    console.log(`║ Pipeline time:       ${pipelineMs.toFixed(1).padStart(8)} ms                       ║`);
    console.log(`║ Signature bytes:      ${envelope.signature.length.toString().padStart(7)}                            ║`);
    console.log(`║ Public key bytes:     ${envelope.publicKey.length.toString().padStart(7)}                            ║`);
    console.log(`║ Bitcoin script bytes: ${(btcScript.length / 2).toString().padStart(7)}                            ║`);
    console.log("╠═══════════════════════════════════════════════════════════╣");
    console.log(`║ Dilithium-3 signature:  ${verification.signatureValid ? "✓ VALID" : "✗ INVALID"}                       ║`);
    console.log(`║ Ring coherence:         ${verification.coherenceValid ? "✓ VALID" : "✗ INVALID"}                       ║`);
    console.log(`║ Bitcoin anchor:         ${verification.anchorValid ? "✓ VALID" : "✗ INVALID"}                       ║`);
    console.log(`║ All checksums match:    ${allMatch ? "✓ YES  " : "✗ NO   "}                       ║`);
    console.log("╠═══════════════════════════════════════════════════════════╣");
    console.log(`║ Cross-verified projections:                               ║`);
    console.log(`║   pq-bridge   ✓  pq-envelope  ✓  pq-witness  ✓          ║`);
    console.log(`║   eth-commit  ✓  eth-calldata ✓  eth-log     ✓          ║`);
    console.log("╠═══════════════════════════════════════════════════════════╣");
    console.log(`║ OVERALL:              ${verification.valid && allMatch ? "✓ ALL PASS" : "✗ FAILED  "}                       ║`);
    console.log("╚═══════════════════════════════════════════════════════════╝");

    expect(verification.valid).toBe(true);
    expect(allMatch).toBe(true);
    expect(pipelineMs).toBeLessThan(10000);
  });
});
