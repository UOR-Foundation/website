/**
 * ZK Three-Layer Separation — Test Suite
 * ═══════════════════════════════════════
 *
 * Verifies that the three-layer architecture maintains isolation:
 *   - L1 (Substrate) self-consistency
 *   - L2 (Geometry) envelope creation & verification
 *   - L3 (Content) hashing produces irreversible output
 *   - Cross-layer isolation is maintained
 */

import { describe, it, expect } from "vitest";

import {
  // L1
  S_DELTA_0,
  S_FRACTAL_DIM,
  S_ALPHA,
  S_ALPHA_INV,
  S_EIGENVALUE_COUNT,
  verifySubstrateIntegrity,
  // L2
  createGeometricEnvelope,
  verifyEnvelope,
  envelopeToRaw,
  // L3
  content,
  contentToHashSync,
} from "@/modules/qsvg/zk-layers";

// ═══════════════════════════════════════════════════════════════════════════
// Layer 1: Substrate Integrity
// ═══════════════════════════════════════════════════════════════════════════

describe("Layer 1: Substrate", () => {
  it("passes self-consistency check", () => {
    const result = verifySubstrateIntegrity();
    expect(result.intact).toBe(true);
    expect(result.checks.length).toBeGreaterThanOrEqual(4);
    result.checks.forEach(c => expect(c.passed).toBe(true));
  });

  it("constants are non-zero", () => {
    expect(S_DELTA_0 as number).toBeGreaterThan(0);
    expect(S_FRACTAL_DIM as number).toBeGreaterThan(1);
    expect(S_ALPHA as number).toBeGreaterThan(0);
    expect(S_ALPHA_INV as number).toBeGreaterThan(100);
    expect(S_EIGENVALUE_COUNT as number).toBe(5);
  });

  it("α × α⁻¹ = 1", () => {
    expect(Math.abs((S_ALPHA as number) * (S_ALPHA_INV as number) - 1)).toBeLessThan(1e-10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Layer 2: Geometry Envelope
// ═══════════════════════════════════════════════════════════════════════════

describe("Layer 2: Geometry Envelope", () => {
  const validEnvelope = createGeometricEnvelope({
    cid: "a".repeat(64),
    spectralGrade: "A",
    driftDelta0: 0.1,
    triadicPhase: 9,
    fidelity: 0.95,
    eigenvaluesLocked: 3,
    coupling: 0.007,
    zone: "COHERENCE",
    iterations: 5,
    converged: true,
    compressionRatio: 0.001,
    sealedAt: new Date().toISOString(),
  });

  it("creates valid envelope", () => {
    expect(validEnvelope.version).toBe(1);
    expect(validEnvelope.zk).toBeTruthy();
    expect(validEnvelope.freeParameters).toBeFalsy();
  });

  it("passes verification", () => {
    const result = verifyEnvelope(validEnvelope);
    expect(result.verified).toBe(true);
    expect(result.latencyMs).toBeLessThan(10);
    result.checks.forEach(c => expect(c.passed).toBe(true));
  });

  it("detects invalid fidelity", () => {
    const bad = createGeometricEnvelope({
      cid: "b".repeat(64),
      spectralGrade: "A",
      driftDelta0: 0.1,
      triadicPhase: 9,
      fidelity: 1.5, // invalid
      eigenvaluesLocked: 3,
      coupling: 0.007,
      zone: "COHERENCE",
      iterations: 5,
      converged: true,
      compressionRatio: 0.001,
      sealedAt: new Date().toISOString(),
    });
    const result = verifyEnvelope(bad);
    expect(result.verified).toBe(false);
  });

  it("detects grade-drift inconsistency", () => {
    const bad = createGeometricEnvelope({
      cid: "c".repeat(64),
      spectralGrade: "A",
      driftDelta0: 10, // too high for A
      triadicPhase: 9,
      fidelity: 0.95,
      eigenvaluesLocked: 3,
      coupling: 0.007,
      zone: "COHERENCE",
      iterations: 5,
      converged: true,
      compressionRatio: 0.001,
      sealedAt: new Date().toISOString(),
    });
    const result = verifyEnvelope(bad);
    expect(result.verified).toBe(false);
  });

  it("round-trips through envelopeToRaw", () => {
    const raw = envelopeToRaw(validEnvelope);
    expect(raw.cid).toBe("a".repeat(64));
    expect(raw.spectralGrade).toBe("A");
    expect(raw.zk).toBe(true);
    expect(raw.freeParameters).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Layer 3: Content Isolation
// ═══════════════════════════════════════════════════════════════════════════

describe("Layer 3: Content Isolation", () => {
  it("content hashing is deterministic", () => {
    const c = content("Hello, world!");
    const h1 = contentToHashSync(c);
    const h2 = contentToHashSync(c);
    expect(h1).toBe(h2);
    expect(h1.length).toBe(64); // 256-bit hex
  });

  it("different content produces different hashes", () => {
    const h1 = contentToHashSync(content("Alice"));
    const h2 = contentToHashSync(content("Bob"));
    expect(h1).not.toBe(h2);
  });

  it("hash carries no recoverable content", () => {
    const hash = contentToHashSync(content("sensitive data"));
    // Hash should be pure hex with no readable text
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    expect(hash).not.toContain("sensitive");
    expect(hash).not.toContain("data");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Cross-Layer Isolation
// ═══════════════════════════════════════════════════════════════════════════

describe("Cross-Layer Isolation", () => {
  it("geometry envelope contains zero content references", () => {
    const envelope = createGeometricEnvelope({
      cid: "d".repeat(64),
      spectralGrade: "B",
      driftDelta0: 1.0,
      triadicPhase: 6,
      fidelity: 0.7,
      eigenvaluesLocked: 2,
      coupling: 0.005,
      zone: "DRIFT",
      iterations: 3,
      converged: false,
      compressionRatio: 0.01,
      sealedAt: new Date().toISOString(),
    });

    // Serialize to JSON — should contain ZERO user content
    const json = JSON.stringify(envelopeToRaw(envelope));
    // Only geometric terms should appear
    expect(json).not.toContain("query");
    expect(json).not.toContain("response");
    expect(json).not.toContain("triple");
    expect(json).toContain("spectralGrade");
    expect(json).toContain("driftDelta0");
  });
});
