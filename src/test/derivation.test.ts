import { describe, it, expect } from "vitest";
import { derive, verifyDerivation } from "@/modules/derivation/derivation";
import { issueCertificate, verifyCertificate } from "@/modules/derivation/certificate";
import { generateReceipt } from "@/modules/derivation/receipt";
import { Q0 } from "@/modules/ring-core/ring";
import type { Term } from "@/modules/ring-core/canonicalization";

describe("derive", () => {
  const ring = Q0();

  it("produces deterministic derivation ID", async () => {
    const term: Term = { kind: "unary", op: "neg", arg: { kind: "const", value: 42 } };
    const d1 = await derive(ring, term);
    const d2 = await derive(ring, term);
    expect(d1.derivationId).toBe(d2.derivationId);
  });

  it("derivation ID starts with urn:uor:derivation:sha256:", async () => {
    const term: Term = { kind: "unary", op: "neg", arg: { kind: "const", value: 42 } };
    const d = await derive(ring, term);
    expect(d.derivationId).toMatch(/^urn:uor:derivation:sha256:[0-9a-f]{16}$/);
  });

  it("evaluates neg(42) = 214 in Q0", async () => {
    const term: Term = { kind: "unary", op: "neg", arg: { kind: "const", value: 42 } };
    const d = await derive(ring, term);
    expect(d.resultValue).toBe(214);
  });

  it("CRITICAL: xor(0x55, 0xAA) and xor(0xAA, 0x55) produce SAME derivation ID", async () => {
    const t1: Term = {
      kind: "binary", op: "xor",
      args: [{ kind: "const", value: 0x55 }, { kind: "const", value: 0xaa }],
    };
    const t2: Term = {
      kind: "binary", op: "xor",
      args: [{ kind: "const", value: 0xaa }, { kind: "const", value: 0x55 }],
    };
    const d1 = await derive(ring, t1);
    const d2 = await derive(ring, t2);
    expect(d1.derivationId).toBe(d2.derivationId);
    expect(d1.resultValue).toBe(d2.resultValue);
    expect(d1.resultValue).toBe(0xff);
  });

  it("epistemic grade is A", async () => {
    const term: Term = { kind: "unary", op: "bnot", arg: { kind: "const", value: 0 } };
    const d = await derive(ring, term);
    expect(d.epistemicGrade).toBe("A");
  });

  it("tracks metrics", async () => {
    // succ(x) expands to neg(bnot(x)) then reduces to constant
    const term: Term = { kind: "unary", op: "succ", arg: { kind: "const", value: 10 } };
    const d = await derive(ring, term);
    expect(d.resultValue).toBe(11);
    expect(d.metrics.originalComplexity).toBeGreaterThanOrEqual(2);
  });
});

describe("verifyDerivation", () => {
  const ring = Q0();

  it("returns true for valid derivation", async () => {
    const term: Term = { kind: "unary", op: "neg", arg: { kind: "const", value: 42 } };
    const d = await derive(ring, term);
    expect(await verifyDerivation(ring, d, term)).toBe(true);
  });
});

describe("issueCertificate", () => {
  const ring = Q0();

  it("issues valid certificate", async () => {
    const term: Term = { kind: "unary", op: "neg", arg: { kind: "const", value: 42 } };
    const d = await derive(ring, term);
    const cert = await issueCertificate(d, ring, term);
    expect(cert.valid).toBe(true);
    expect(cert.derivationId).toBe(d.derivationId);
    expect(cert.certificateId).toMatch(/^urn:uor:cert:/);
    expect(cert.certChain).toContain(d.derivationId);
  });
});

describe("verifyCertificate", () => {
  const ring = Q0();

  it("verifies valid certificate", async () => {
    const term: Term = { kind: "unary", op: "neg", arg: { kind: "const", value: 42 } };
    const d = await derive(ring, term);
    const cert = await issueCertificate(d, ring, term);
    expect(await verifyCertificate(cert, ring, term, d)).toBe(true);
  });
});

describe("generateReceipt", () => {
  const ring = Q0();

  it("generates self-verified receipt", async () => {
    ring.verify(); // ensure coherence
    const term: Term = { kind: "unary", op: "neg", arg: { kind: "const", value: 42 } };
    const { receipt } = await generateReceipt("test-module", ring, term);
    expect(receipt.selfVerified).toBe(true);
    expect(receipt.coherenceVerified).toBe(true);
    expect(receipt.outputHash).toBe(receipt.recomputeHash);
    expect(receipt.receiptId).toMatch(/^urn:uor:receipt:/);
  });

  it("CRITICAL: commutative receipt — swapped operands match", async () => {
    ring.verify();
    const t1: Term = {
      kind: "binary", op: "and",
      args: [{ kind: "const", value: 0xf0 }, { kind: "const", value: 0x0f }],
    };
    const t2: Term = {
      kind: "binary", op: "and",
      args: [{ kind: "const", value: 0x0f }, { kind: "const", value: 0xf0 }],
    };
    const r1 = await generateReceipt("test", ring, t1);
    const r2 = await generateReceipt("test", ring, t2);
    expect(r1.receipt.outputHash).toBe(r2.receipt.outputHash);
  });
});
