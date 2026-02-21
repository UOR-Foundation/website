/**
 * Tests for UOR Self-Verification module.
 */
import { describe, it, expect } from "vitest";
import { verifyReceiptChain } from "@/modules/self-verify/audit-trail";
import type { DerivationReceipt } from "@/modules/derivation/receipt";

function makeReceipt(overrides: Partial<DerivationReceipt> = {}): DerivationReceipt {
  return {
    "@type": "receipt:CanonicalReceipt",
    receiptId: "urn:uor:receipt:test123",
    moduleId: "test",
    operation: "neg(42)",
    inputHash: "abc123",
    outputHash: "def456",
    recomputeHash: "def456",
    selfVerified: true,
    coherenceVerified: true,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("self-verify/audit-trail", () => {
  it("verifyReceiptChain passes for valid receipts", () => {
    const receipts = [makeReceipt(), makeReceipt({ receiptId: "urn:uor:receipt:test456" })];
    const result = verifyReceiptChain(receipts);
    expect(result.allValid).toBe(true);
    expect(result.results).toHaveLength(2);
  });

  it("verifyReceiptChain fails if selfVerified is false", () => {
    const receipts = [makeReceipt({ selfVerified: false })];
    const result = verifyReceiptChain(receipts);
    expect(result.allValid).toBe(false);
    expect(result.results[0].reason).toContain("Self-verification");
  });

  it("verifyReceiptChain fails if coherenceVerified is false", () => {
    const receipts = [makeReceipt({ coherenceVerified: false })];
    const result = verifyReceiptChain(receipts);
    expect(result.allValid).toBe(false);
    expect(result.results[0].reason).toContain("coherence");
  });

  it("verifyReceiptChain handles empty array", () => {
    const result = verifyReceiptChain([]);
    expect(result.allValid).toBe(true);
    expect(result.results).toHaveLength(0);
  });
});
