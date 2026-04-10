import { describe, it, expect } from "vitest";
import {
  neg, bnot, succ, pred, add, sub, mul, xor, and, or,
  compute, verifyCriticalIdentity, verifyAllCriticalIdentity,
  toBytesTuple, bytePopcount, byteBasis, makeDatum, classifyByte,
  ringConfig,
} from "@/lib/uor-ring";

describe("uor-ring: Z/(2^n)Z operations", () => {
  // ── Unary ops ───────────────────────────────────────────────
  it("neg(42) = 214 in R_8", () => expect(neg(42)).toBe(214));
  it("bnot(42) = 213 in R_8", () => expect(bnot(42)).toBe(213));
  it("succ(255) = 0 in R_8", () => expect(succ(255)).toBe(0));
  it("pred(0) = 255 in R_8", () => expect(pred(0)).toBe(255));

  // ── Binary ops ──────────────────────────────────────────────
  it("add(200, 100) = 44 in R_8", () => expect(add(200, 100)).toBe(44));
  it("sub(10, 20) = 246 in R_8", () => expect(sub(10, 20)).toBe(246));
  it("mul(16, 16) = 0 in R_8", () => expect(mul(16, 16)).toBe(0));
  it("xor(0b1010, 0b1100) = 0b0110", () => expect(xor(0b1010, 0b1100)).toBe(0b0110));
  it("and(0b1010, 0b1100) = 0b1000", () => expect(and(0b1010, 0b1100)).toBe(0b1000));
  it("or(0b1010, 0b1100) = 0b1110", () => expect(or(0b1010, 0b1100)).toBe(0b1110));

  // ── Critical identity ───────────────────────────────────────
  it("neg(bnot(x)) = succ(x) for x=42", () => {
    expect(verifyCriticalIdentity(42)).toBe(true);
  });

  it("critical identity holds for all elements of R_8", () => {
    const result = verifyAllCriticalIdentity(8);
    expect(result.verified).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.ringSize).toBe(256);
  });

  // ── Dispatch ────────────────────────────────────────────────
  it("compute dispatches neg correctly", () => {
    expect(compute("neg", 42, undefined)).toBe(214);
  });
  it("compute dispatches add correctly", () => {
    expect(compute("add", 200, 100)).toBe(44);
  });

  // ── Byte helpers ────────────────────────────────────────────
  it("toBytesTuple(258, 16) = [1, 2]", () => {
    expect(toBytesTuple(258, 16)).toEqual([1, 2]);
  });
  it("bytePopcount(0b10101010) = 4", () => {
    expect(bytePopcount(0b10101010)).toBe(4);
  });
  it("byteBasis(0b1010) = [1, 3]", () => {
    expect(byteBasis(0b1010)).toEqual([1, 3]);
  });

  // ── Datum construction ──────────────────────────────────────
  it("makeDatum produces valid schema:Datum", () => {
    const d = makeDatum(42, 8);
    expect(d["@type"]).toBe("schema:Datum");
    expect(d["schema:value"]).toBe(42);
    expect(d["schema:bytes"]).toEqual([42]);
    expect(d["schema:triad"]["@type"]).toBe("schema:Triad");
  });

  // ── Partition classification ────────────────────────────────
  it("classifies 0 as ExteriorSet", () => {
    expect(classifyByte(0, 8).component).toBe("partition:ExteriorSet");
  });
  it("classifies 1 as UnitSet", () => {
    expect(classifyByte(1, 8).component).toBe("partition:UnitSet");
  });
  it("classifies 3 as IrreducibleSet", () => {
    expect(classifyByte(3, 8).component).toBe("partition:IrreducibleSet");
  });
  it("classifies 4 as ReducibleSet", () => {
    expect(classifyByte(4, 8).component).toBe("partition:ReducibleSet");
  });

  // ── RingConfig ──────────────────────────────────────────────
  it("ringConfig(0) produces 8-bit config", () => {
    const cfg = ringConfig(0);
    expect(cfg.bits).toBe(8);
    expect(cfg.width).toBe(1);
    expect(cfg.cycle).toBe(256n);
    expect(cfg.mask).toBe(255n);
  });
});
