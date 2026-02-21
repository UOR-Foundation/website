import { describe, it, expect } from "vitest";
import { UORRing, Q0, Q1, Q2, Q3, Q, fromBytes, toBytes } from "@/modules/ring-core/ring";
import { verifyQ0Exhaustive, CoherenceError } from "@/modules/ring-core/coherence";
import { canonicalize, serializeTerm } from "@/modules/ring-core/canonicalization";
import type { Term } from "@/modules/ring-core/canonicalization";
import { ringConfig } from "@/lib/uor-ring";

// ═══════════════════════════════════════════════════════════════════════════
// UORRing class tests
// ═══════════════════════════════════════════════════════════════════════════

describe("UORRing class", () => {
  const ring = Q0();

  // ── Construction ──────────────────────────────────────────────────────
  it("Q0 has correct config", () => {
    expect(ring.quantum).toBe(0);
    expect(ring.width).toBe(1);
    expect(ring.bits).toBe(8);
    expect(ring.cycle).toBe(256n);
    expect(ring.mask).toBe(255n);
  });

  it("Q1 has correct config", () => {
    const r = Q1();
    expect(r.quantum).toBe(1);
    expect(r.bits).toBe(16);
    expect(r.cycle).toBe(65536n);
  });

  // ── Conversion ────────────────────────────────────────────────────────
  it("toBytes/fromBytes roundtrip", () => {
    expect(fromBytes(ring.toBytes(42))).toBe(42);
    expect(fromBytes(ring.toBytes(0))).toBe(0);
    expect(fromBytes(ring.toBytes(255))).toBe(255);
  });

  it("toBytes produces big-endian byte tuple", () => {
    const r = Q1();
    expect(r.toBytes(258)).toEqual([1, 2]); // 0x0102
  });

  // ── Unary operations ──────────────────────────────────────────────────
  it("neg(42) = 214", () => {
    expect(fromBytes(ring.neg([42]))).toBe(214);
  });

  it("bnot(42) = 213 (per-byte XOR 0xFF)", () => {
    expect(fromBytes(ring.bnot([42]))).toBe(213);
  });

  it("succ(x) = neg(bnot(x)), not independently computed", () => {
    for (const x of [0, 1, 42, 127, 255]) {
      const bx = ring.toBytes(x);
      const succVal = fromBytes(ring.succ(bx));
      const negBnotVal = fromBytes(ring.neg(ring.bnot(bx)));
      expect(succVal).toBe(negBnotVal);
      expect(succVal).toBe((x + 1) % 256);
    }
  });

  it("pred(x) = bnot(neg(x))", () => {
    for (const x of [0, 1, 42, 127, 255]) {
      const bx = ring.toBytes(x);
      const predVal = fromBytes(ring.pred(bx));
      const bnotNegVal = fromBytes(ring.bnot(ring.neg(bx)));
      expect(predVal).toBe(bnotNegVal);
      expect(predVal).toBe((x - 1 + 256) % 256);
    }
  });

  // ── Binary operations ─────────────────────────────────────────────────
  it("xor is per-byte", () => {
    expect(fromBytes(ring.xor([0b10101010], [0b11001100]))).toBe(0b01100110);
  });

  it("band is per-byte", () => {
    expect(fromBytes(ring.band([0b10101010], [0b11001100]))).toBe(0b10001000);
  });

  it("bor is per-byte", () => {
    expect(fromBytes(ring.bor([0b10101010], [0b11001100]))).toBe(0b11101110);
  });

  it("add wraps modularly", () => {
    expect(fromBytes(ring.add([200], [100]))).toBe(44);
  });

  // ── Analysis ──────────────────────────────────────────────────────────
  it("stratum counts set bits", () => {
    expect(ring.stratum([0b10101010])).toBe(4);
    expect(ring.stratum([0])).toBe(0);
    expect(ring.stratum([255])).toBe(8);
  });

  it("spectrum returns active bit positions", () => {
    expect(ring.spectrum([0b1010])).toEqual([[1, 3]]);
  });

  // ── Verify ────────────────────────────────────────────────────────────
  it("verify() passes at Q0", () => {
    const result = ring.verify();
    expect(result.verified).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(ring.coherenceVerified).toBe(true);
  });

  it("verify() passes at Q1 (sampled)", () => {
    const r = Q1();
    const result = r.verify();
    expect(result.verified).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Factory functions
// ═══════════════════════════════════════════════════════════════════════════

describe("Factory functions", () => {
  it("Q(n) produces correct quantum", () => {
    expect(Q(0).quantum).toBe(0);
    expect(Q(3).quantum).toBe(3);
    expect(Q(3).bits).toBe(32);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Coherence verification
// ═══════════════════════════════════════════════════════════════════════════

describe("verifyQ0Exhaustive", () => {
  it("passes all 8 laws across 256 values", () => {
    const result = verifyQ0Exhaustive();
    expect(result.verified).toBe(true);
    expect(result.lawsChecked).toBe(8);
    // 9 checks per value × 256 + 1 cycle check = 2305
    expect(result.totalChecks).toBe(2305);
    expect(result.failures).toHaveLength(0);
    expect(result.fullCycleVerified).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Canonicalization
// ═══════════════════════════════════════════════════════════════════════════

describe("canonicalization", () => {
  const config = ringConfig(0); // Q0, 8-bit

  it("(a) involution cancellation: neg(neg(x)) → x", () => {
    const term: Term = { kind: "unary", op: "neg", arg: { kind: "unary", op: "neg", arg: { kind: "var", name: "x" } } };
    const result = canonicalize(term, config);
    expect(serializeTerm(result)).toBe("V(x)");
  });

  it("(a) involution cancellation: bnot(bnot(x)) → x", () => {
    const term: Term = { kind: "unary", op: "bnot", arg: { kind: "unary", op: "bnot", arg: { kind: "var", name: "x" } } };
    const result = canonicalize(term, config);
    expect(serializeTerm(result)).toBe("V(x)");
  });

  it("(b) derived expansion: succ(x) → neg(bnot(x))", () => {
    const term: Term = { kind: "unary", op: "succ", arg: { kind: "var", name: "x" } };
    const result = canonicalize(term, config);
    expect(serializeTerm(result)).toBe("neg(bnot(V(x)))");
  });

  it("(b) derived expansion: pred(x) → bnot(neg(x))", () => {
    const term: Term = { kind: "unary", op: "pred", arg: { kind: "var", name: "x" } };
    const result = canonicalize(term, config);
    expect(serializeTerm(result)).toBe("bnot(neg(V(x)))");
  });

  it("(c) constant reduction: neg(42) → 214 in Q0", () => {
    const term: Term = { kind: "unary", op: "neg", arg: { kind: "const", value: 42 } };
    const result = canonicalize(term, config);
    expect(result).toEqual({ kind: "const", value: 214 });
  });

  it("(c) constant reduction: 300 → 44 in Q0", () => {
    const term: Term = { kind: "const", value: 300 };
    const result = canonicalize(term, config);
    expect(result).toEqual({ kind: "const", value: 44 });
  });

  it("(d) associative flattening: xor(a, xor(b, c)) → xor(a, b, c)", () => {
    const term: Term = {
      kind: "binary", op: "xor",
      args: [
        { kind: "var", name: "a" },
        { kind: "binary", op: "xor", args: [{ kind: "var", name: "b" }, { kind: "var", name: "c" }] },
      ],
    };
    const result = canonicalize(term, config);
    expect(result.kind).toBe("binary");
    if (result.kind === "binary") {
      expect(result.args).toHaveLength(3);
    }
  });

  it("(e) commutative sorting: constants first", () => {
    const term: Term = {
      kind: "binary", op: "xor",
      args: [{ kind: "var", name: "x" }, { kind: "const", value: 5 }],
    };
    const result = canonicalize(term, config);
    if (result.kind === "binary") {
      expect(result.args[0].kind).toBe("const");
    }
  });

  it("(f) identity elimination: x xor 0 → x", () => {
    const term: Term = {
      kind: "binary", op: "xor",
      args: [{ kind: "var", name: "x" }, { kind: "const", value: 0 }],
    };
    const result = canonicalize(term, config);
    expect(serializeTerm(result)).toBe("V(x)");
  });

  it("(f) identity elimination: x and 0xFF → x in Q0", () => {
    const term: Term = {
      kind: "binary", op: "and",
      args: [{ kind: "var", name: "x" }, { kind: "const", value: 255 }],
    };
    const result = canonicalize(term, config);
    expect(serializeTerm(result)).toBe("V(x)");
  });

  it("(g) self-cancellation: x xor x → 0", () => {
    const term: Term = {
      kind: "binary", op: "xor",
      args: [{ kind: "var", name: "x" }, { kind: "var", name: "x" }],
    };
    const result = canonicalize(term, config);
    expect(result).toEqual({ kind: "const", value: 0 });
  });

  it("(g) idempotence: x and x → x", () => {
    const term: Term = {
      kind: "binary", op: "and",
      args: [{ kind: "var", name: "x" }, { kind: "var", name: "x" }],
    };
    const result = canonicalize(term, config);
    expect(serializeTerm(result)).toBe("V(x)");
  });

  it("(g) idempotence: x or x → x", () => {
    const term: Term = {
      kind: "binary", op: "or",
      args: [{ kind: "var", name: "x" }, { kind: "var", name: "x" }],
    };
    const result = canonicalize(term, config);
    expect(serializeTerm(result)).toBe("V(x)");
  });
});
