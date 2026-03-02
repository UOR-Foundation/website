/**
 * Proof-of-Thought Tests — Zero-Knowledge Geometric Verification
 * ═══════════════════════════════════════════════════════════════
 *
 * Verifies the complete Proof-of-Thought pipeline:
 *   1. Accumulator correctly records geometric (not content) data
 *   2. Sealed receipts are deterministic and content-blind
 *   3. O(1) verification works against the {3,3,5} lattice
 *   4. ZK properties hold (no content leakage)
 *   5. UOR coordinate mapping is valid
 */

import { describe, it, expect } from "vitest";
import {
  createAccumulator,
  recordIteration,
  sealReceiptSync,
  verifyProofOfThought,
  receiptToUORCoordinate,
  summarizeReceipt,
  type ProofAccumulator,
  type ProofOfThoughtReceipt,
} from "@/modules/qsvg";

import { DELTA_0_RAD, RIEMANN_EIGENVALUES, ALPHA_QSVG } from "@/modules/qsvg";

// ══════════════════════════════════════════════════════════════════════════
// Helper: build a typical accumulator with N iterations
// ══════════════════════════════════════════════════════════════════════════

function buildAccumulator(iterations: number, converged: boolean): ProofAccumulator {
  let acc = createAccumulator();
  for (let i = 0; i < iterations; i++) {
    const isLast = i === iterations - 1;
    acc = recordIteration(
      acc,
      0.3 - i * 0.1,                          // curvature decreasing
      { A: 3 + i, B: 2, C: 1, D: Math.max(0, 2 - i) }, // improving grades
      0.85 + i * 0.05,                         // H-score improving
      isLast && converged,
      500 + i * 100,                            // response bytes
    );
  }
  return acc;
}

// ══════════════════════════════════════════════════════════════════════════
// Part I: ProofAccumulator
// ══════════════════════════════════════════════════════════════════════════

describe("ProofAccumulator", () => {
  it("starts empty with zero state", () => {
    const acc = createAccumulator();
    expect(acc.snapshots).toHaveLength(0);
    expect(acc.totalClaims).toBe(0);
    expect(acc.iterations).toBe(0);
    expect(acc.converged).toBe(false);
    expect(acc.reasoningBits).toBe(0);
  });

  it("records iterations with geometric data only", () => {
    const acc = recordIteration(
      createAccumulator(),
      0.25,
      { A: 3, B: 2, C: 1, D: 0 },
      0.9,
      false,
      1000,
    );
    expect(acc.snapshots).toHaveLength(1);
    expect(acc.totalClaims).toBe(6);
    expect(acc.iterations).toBe(1);
    expect(acc.reasoningBits).toBe(8000);
    expect(acc.snapshots[0].curvature).toBe(0.25);
    expect(acc.snapshots[0].hScore).toBe(0.9);
  });

  it("accumulates grade distribution across iterations", () => {
    let acc = createAccumulator();
    acc = recordIteration(acc, 0.3, { A: 2, B: 1, C: 0, D: 1 }, 0.8, false, 500);
    acc = recordIteration(acc, 0.1, { A: 4, B: 0, C: 0, D: 0 }, 0.95, true, 600);
    expect(acc.gradeAccumulator.A).toBe(6);
    expect(acc.gradeAccumulator.D).toBe(1);
    expect(acc.totalClaims).toBe(8);
    expect(acc.converged).toBe(true);
  });

  it("tracks peak curvature", () => {
    let acc = createAccumulator();
    acc = recordIteration(acc, 0.5, { A: 1, B: 1, C: 1, D: 1 }, 0.7, false, 400);
    acc = recordIteration(acc, 0.2, { A: 2, B: 1, C: 0, D: 0 }, 0.9, true, 400);
    expect(acc.peakCurvature).toBe(0.5);
    expect(acc.finalCurvature).toBe(0.2);
  });

  it("assigns triadic phases based on geometric zone", () => {
    const acc = recordIteration(
      createAccumulator(),
      0.1,
      { A: 5, B: 0, C: 0, D: 0 },
      0.95, // high H-score → COHERENCE zone
      true,
      500,
    );
    expect(acc.snapshots[0].triadicPhase).toBe(9); // converged + coherent = 9
  });

  it("eigenvalues locked capped at Riemann bounds", () => {
    const acc = recordIteration(
      createAccumulator(),
      0.1,
      { A: 100, B: 0, C: 0, D: 0 }, // more A claims than eigenvalues
      0.95,
      true,
      500,
    );
    expect(acc.snapshots[0].eigenvaluesLocked).toBeLessThanOrEqual(RIEMANN_EIGENVALUES.length);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: Receipt Sealing
// ══════════════════════════════════════════════════════════════════════════

describe("Receipt Sealing", () => {
  it("produces a valid receipt from accumulator", () => {
    const acc = buildAccumulator(3, true);
    const receipt = sealReceiptSync(acc, 0.95, 0.9);

    expect(receipt.version).toBe(1);
    expect(receipt.zk).toBe(true);
    expect(receipt.freeParameters).toBe(0);
    expect(receipt.spectralGrade).toMatch(/^[ABCD]$/);
    expect(receipt.cid).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.iterations).toBe(3);
    expect(receipt.converged).toBe(true);
    expect(receipt.fidelity).toBeGreaterThan(0);
    expect(receipt.fidelity).toBeLessThanOrEqual(1);
  });

  it("CID is deterministic (same geometry → same CID)", () => {
    const acc = buildAccumulator(2, true);
    const r1 = sealReceiptSync(acc, 0.9, 0.85);
    const r2 = sealReceiptSync(acc, 0.9, 0.85);
    expect(r1.cid).toBe(r2.cid);
  });

  it("different geometry produces different CID", () => {
    const acc1 = buildAccumulator(2, true);
    const acc2 = buildAccumulator(3, true);
    const r1 = sealReceiptSync(acc1, 0.9, 0.85);
    const r2 = sealReceiptSync(acc2, 0.9, 0.85);
    expect(r1.cid).not.toBe(r2.cid);
  });

  it("Grade A for high coherence", () => {
    const acc = buildAccumulator(3, true);
    const receipt = sealReceiptSync(acc, 0.95, 0.95);
    expect(receipt.spectralGrade).toBe("A");
  });

  it("compression ratio < 1 (proof is smaller than reasoning)", () => {
    const acc = buildAccumulator(3, true);
    const receipt = sealReceiptSync(acc, 0.9, 0.85);
    expect(receipt.compressionRatio).toBeLessThan(1);
  });

  it("drift is in δ₀ units", () => {
    const acc = buildAccumulator(2, false);
    const receipt = sealReceiptSync(acc, 0.7, 0.6);
    expect(receipt.driftDelta0).toBeGreaterThanOrEqual(0);
    // Drift should be physically meaningful (not absurdly large)
    expect(receipt.driftDelta0).toBeLessThan(100 * DELTA_0_RAD);
  });

  it("snapshots preserved in receipt", () => {
    const acc = buildAccumulator(3, true);
    const receipt = sealReceiptSync(acc, 0.9, 0.85);
    expect(receipt.snapshots).toHaveLength(3);
    expect(receipt.snapshots[0].iteration).toBe(0);
    expect(receipt.snapshots[2].iteration).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: O(1) Verification
// ══════════════════════════════════════════════════════════════════════════

describe("Proof Verification (O(1))", () => {
  it("valid receipt passes all checks", () => {
    const acc = buildAccumulator(3, true);
    const receipt = sealReceiptSync(acc, 0.95, 0.9);
    const result = verifyProofOfThought(receipt);

    expect(result.verified).toBe(true);
    expect(result.latencyMs).toBeLessThan(50); // should be <1ms typically
    expect(result.checks.every(c => c.passed)).toBe(true);
  });

  it("detects tampered CID", () => {
    const acc = buildAccumulator(3, true);
    const receipt = sealReceiptSync(acc, 0.9, 0.85);
    
    // Tamper with CID
    const tampered: ProofOfThoughtReceipt = {
      ...receipt,
      cid: "0".repeat(64),
    };
    const result = verifyProofOfThought(tampered);
    // CID reproducibility check should fail
    const cidCheck = result.checks.find(c => c.name === "CID reproducibility");
    expect(cidCheck?.passed).toBe(false);
  });

  it("detects invalid triadic phase", () => {
    const acc = buildAccumulator(2, true);
    const receipt = sealReceiptSync(acc, 0.9, 0.85);
    const tampered = { ...receipt, triadicPhase: 5 as any };
    const result = verifyProofOfThought(tampered);
    const phaseCheck = result.checks.find(c => c.name === "Valid triadic phase (3/6/9)");
    expect(phaseCheck?.passed).toBe(false);
  });

  it("verification is fast (<10ms)", () => {
    const acc = buildAccumulator(3, true);
    const receipt = sealReceiptSync(acc, 0.9, 0.85);
    const result = verifyProofOfThought(receipt);
    expect(result.latencyMs).toBeLessThan(10);
  });

  it("re-derives grade independently", () => {
    const acc = buildAccumulator(3, true);
    const receipt = sealReceiptSync(acc, 0.95, 0.95);
    const result = verifyProofOfThought(receipt);
    expect(result.derivedGrade).toMatch(/^[ABCD]$/);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part IV: ZK Properties — Content Blindness
// ══════════════════════════════════════════════════════════════════════════

describe("ZK Content Blindness", () => {
  it("receipt contains no text content", () => {
    const acc = buildAccumulator(3, true);
    const receipt = sealReceiptSync(acc, 0.9, 0.85);

    // Serialize entire receipt to string
    const serialized = JSON.stringify(receipt);

    // Should not contain any natural language words that could leak content
    // (only field names, numbers, and technical terms like COHERENCE)
    expect(serialized).not.toContain("user query");
    expect(serialized).not.toContain("response text");
    expect(serialized).not.toContain("knowledge graph");
  });

  it("zk flag is always true", () => {
    const acc = buildAccumulator(1, false);
    const receipt = sealReceiptSync(acc, 0.5, 0.5);
    expect(receipt.zk).toBe(true);
  });

  it("freeParameters is always 0", () => {
    const acc = buildAccumulator(3, true);
    const receipt = sealReceiptSync(acc, 0.95, 0.95);
    expect(receipt.freeParameters).toBe(0);
  });

  it("same geometry from different content produces same CID", () => {
    // Two accumulators with identical geometric signatures
    // but in practice would have different content
    const acc1 = createAccumulator();
    const acc2 = createAccumulator();

    // Record identical geometric data
    const geo = { A: 3, B: 1, C: 1, D: 0 };
    const r1 = recordIteration(acc1, 0.2, geo, 0.9, true, 500);
    const r2 = recordIteration(acc2, 0.2, geo, 0.9, true, 500);

    const receipt1 = sealReceiptSync(r1, 0.9, 0.85);
    const receipt2 = sealReceiptSync(r2, 0.9, 0.85);

    // Identical geometry → identical CID, regardless of content
    expect(receipt1.cid).toBe(receipt2.cid);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part V: UOR Coordinate Mapping
// ══════════════════════════════════════════════════════════════════════════

describe("UOR Coordinate Mapping", () => {
  it("maps CID to hex/braille/IPv6", () => {
    const cid = "a".repeat(64);
    const coord = receiptToUORCoordinate(cid);
    expect(coord.hex).toBe(cid);
    expect(coord.braille.length).toBe(64);
    expect(coord.ipv6).toMatch(/^[0-9a-f]{4}(:[0-9a-f]{4}){7}$/);
  });

  it("different CIDs produce different coordinates", () => {
    const c1 = receiptToUORCoordinate("a".repeat(64));
    const c2 = receiptToUORCoordinate("b".repeat(64));
    expect(c1.hex).not.toBe(c2.hex);
    expect(c1.braille).not.toBe(c2.braille);
    expect(c1.ipv6).not.toBe(c2.ipv6);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part VI: Summary Generation
// ══════════════════════════════════════════════════════════════════════════

describe("Receipt Summary", () => {
  it("produces human-readable summary", () => {
    const acc = buildAccumulator(3, true);
    const receipt = sealReceiptSync(acc, 0.95, 0.9);
    const summary = summarizeReceipt(receipt);

    expect(summary).toContain("Proof-of-Thought Receipt");
    expect(summary).toContain("Spectral Grade");
    expect(summary).toContain("δ₀");
    expect(summary).toContain("ZK Mode");
    expect(summary).toContain("content-blind");
    expect(summary).toContain("Free Parameters:  0");
  });
});
