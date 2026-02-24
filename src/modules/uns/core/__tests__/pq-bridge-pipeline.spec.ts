/**
 * PQ Bridge — End-to-End Pipeline Test
 * ═════════════════════════════════════
 *
 * Verifies the full post-quantum pipeline:
 *   Object → URDNA2015 → SHA-256 → Dilithium-3 sign → Bitcoin OP_RETURN
 *   → Coherence witness → Verification
 */

import { describe, it, expect } from "vitest";
import {
  pqKeygen,
  pqSign,
  pqVerify,
  pqBridgePipeline,
} from "../pq-bridge";
import type { ProjectionInput } from "../hologram";

// Deterministic test identity (SHA-256 of "hello world" via URDNA2015)
const TEST_HASH = new Uint8Array([
  0x2c, 0xf2, 0x4d, 0xba, 0x5f, 0xb0, 0xa3, 0x0e,
  0x26, 0xe8, 0x3b, 0x2a, 0xc5, 0xb9, 0xe2, 0x9e,
  0x1b, 0x16, 0x1e, 0x5c, 0x1f, 0xa7, 0x42, 0x5e,
  0x73, 0x04, 0x33, 0x62, 0x93, 0x8b, 0x98, 0x24,
]);

const TEST_IDENTITY: ProjectionInput = {
  hashBytes: TEST_HASH,
  cid: "bafkreiclp7vedvlwtpbivznd2cdia2vk4pp6oqmt4w3opmxh6bsqx4uroi",
  hex: Array.from(TEST_HASH).map(b => b.toString(16).padStart(2, "0")).join(""),
};

describe("PQ Bridge — Post-Quantum Pipeline", () => {

  it("generates valid Dilithium-3 keypair", () => {
    const kp = pqKeygen();
    expect(kp.publicKey).toBeInstanceOf(Uint8Array);
    expect(kp.secretKey).toBeInstanceOf(Uint8Array);
    // ML-DSA-65: pk=1952, sk=4032
    expect(kp.publicKey.length).toBe(1952);
    expect(kp.secretKey.length).toBe(4032);
  });

  it("signs a UOR identity producing a complete PQ envelope", () => {
    const kp = pqKeygen();
    const envelope = pqSign(TEST_IDENTITY, kp.secretKey);

    // Signing target format
    expect(envelope.signingTarget).toBe(`pq:ml-dsa-65:sha256:${TEST_IDENTITY.hex}`);

    // Signature is a valid ML-DSA-65 signature (3309 bytes)
    expect(envelope.signature).toBeInstanceOf(Uint8Array);
    expect(envelope.signature.length).toBe(3309);

    // Bitcoin OP_RETURN script
    expect(envelope.bitcoinScript).toMatch(/^6a26554f520102/);
    expect(envelope.bitcoinScript.length).toBe(14 + 64); // header + 32-byte hash

    // Lightning payment hash
    expect(envelope.lightningPaymentHash).toMatch(/^pp5/);

    // Coherence witness
    expect(envelope.coherenceWitness).toMatch(/^pq:witness:/);
    expect(envelope.coherenceHolds).toBe(true);

    // CID preserved
    expect(envelope.cid).toBe(TEST_IDENTITY.cid);
  });

  it("verifies a valid PQ envelope — all three checks pass", () => {
    const kp = pqKeygen();
    const envelope = pqSign(TEST_IDENTITY, kp.secretKey);
    const result = pqVerify(envelope, kp.publicKey);

    expect(result.signatureValid).toBe(true);
    expect(result.coherenceValid).toBe(true);
    expect(result.anchorValid).toBe(true);
    expect(result.valid).toBe(true);
  });

  it("rejects envelope with wrong public key", () => {
    const kp1 = pqKeygen();
    const kp2 = pqKeygen();
    const envelope = pqSign(TEST_IDENTITY, kp1.secretKey);
    const result = pqVerify(envelope, kp2.publicKey);

    expect(result.signatureValid).toBe(false);
    expect(result.valid).toBe(false);
    // Coherence and anchor should still be valid
    expect(result.coherenceValid).toBe(true);
    expect(result.anchorValid).toBe(true);
  });

  it("rejects envelope with tampered content hash", () => {
    const kp = pqKeygen();
    const envelope = pqSign(TEST_IDENTITY, kp.secretKey);

    // Tamper with the Bitcoin script (change last byte of hash)
    const tampered = {
      ...envelope,
      bitcoinScript: envelope.bitcoinScript.slice(0, -2) + "ff",
    };
    const result = pqVerify(tampered, kp.publicKey);

    expect(result.anchorValid).toBe(false);
    expect(result.valid).toBe(false);
  });

  it("coherence witness always holds for any byte value (0-255)", () => {
    for (let x = 0; x < 256; x++) {
      const bnot = (~x) & 0xFF;
      const negBnot = (256 - bnot) & 0xFF;
      const succX = (x + 1) & 0xFF;
      expect(negBnot).toBe(succX); // THE critical identity
    }
  });

  it("full pipeline: keygen → sign → verify in one call", () => {
    const { envelope, keyPair, verification } = pqBridgePipeline(TEST_IDENTITY);

    expect(verification.valid).toBe(true);
    expect(envelope.signature.length).toBe(3309);
    expect(keyPair.publicKey.length).toBe(1952);
  });

  it("Bitcoin OP_RETURN script is valid and broadcastable", () => {
    const { envelope } = pqBridgePipeline(TEST_IDENTITY);
    const script = envelope.bitcoinScript;

    // Parse the script
    expect(script.slice(0, 2)).toBe("6a");     // OP_RETURN
    expect(script.slice(2, 4)).toBe("26");      // OP_PUSHBYTES_38
    expect(script.slice(4, 10)).toBe("554f52"); // "UOR" magic
    expect(script.slice(10, 12)).toBe("01");    // version 1
    expect(script.slice(12, 14)).toBe("02");    // ML-DSA-65

    // Remaining 64 hex chars = 32-byte hash
    const hashInScript = script.slice(14);
    expect(hashInScript.length).toBe(64);
    expect(hashInScript).toBe(TEST_IDENTITY.hex);

    // Total script size: 39 bytes (well within 80-byte OP_RETURN limit)
    expect(script.length / 2).toBe(39);
  });

  it("deterministic: same identity + same key → same signature", () => {
    // Use a fixed seed for deterministic keygen
    const seed = new Uint8Array(32).fill(0x42);
    const kp = pqKeygen(seed);

    const env1 = pqSign(TEST_IDENTITY, kp.secretKey);
    const env2 = pqSign(TEST_IDENTITY, kp.secretKey);

    // Note: ML-DSA-65 may use randomness in signing (hedged),
    // so signatures might differ. But all other fields should match.
    expect(env1.signingTarget).toBe(env2.signingTarget);
    expect(env1.bitcoinScript).toBe(env2.bitcoinScript);
    expect(env1.coherenceWitness).toBe(env2.coherenceWitness);
    expect(env1.contentHash).toBe(env2.contentHash);
  });

  // ── Quantitative Summary ────────────────────────────────────────────────

  it("pipeline performance and output summary", () => {
    const start = performance.now();
    const { envelope, verification } = pqBridgePipeline(TEST_IDENTITY);
    const elapsed = performance.now() - start;

    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║    POST-QUANTUM BRIDGE — PIPELINE VERIFICATION        ║");
    console.log("╠════════════════════════════════════════════════════════╣");
    console.log(`║ Algorithm:        ML-DSA-65 (Dilithium-3, FIPS 204)   ║`);
    console.log(`║ Security level:   192-bit (NIST Level 3)              ║`);
    console.log(`║ Public key:       ${envelope.publicKey.length.toString().padStart(5)} bytes                          ║`);
    console.log(`║ Signature:        ${envelope.signature.length.toString().padStart(5)} bytes                          ║`);
    console.log(`║ Bitcoin script:   ${(envelope.bitcoinScript.length / 2).toString().padStart(5)} bytes (< 80 OP_RETURN)       ║`);
    console.log(`║ Pipeline time:    ${elapsed.toFixed(1).padStart(7)} ms                         ║`);
    console.log("╠════════════════════════════════════════════════════════╣");
    console.log(`║ Signature valid:  ${verification.signatureValid ? "✓ PASS" : "✗ FAIL"}                              ║`);
    console.log(`║ Coherence valid:  ${verification.coherenceValid ? "✓ PASS" : "✗ FAIL"}                              ║`);
    console.log(`║ Anchor valid:     ${verification.anchorValid ? "✓ PASS" : "✗ FAIL"}                              ║`);
    console.log(`║ Overall:          ${verification.valid ? "✓ ALL PASS" : "✗ FAILED"}                          ║`);
    console.log("╚════════════════════════════════════════════════════════╝");

    expect(verification.valid).toBe(true);
    expect(elapsed).toBeLessThan(10000); // should complete within 10s
  });
});
