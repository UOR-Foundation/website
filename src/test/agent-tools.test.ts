import { describe, it, expect } from "vitest";
import { parseTerm } from "@/modules/agent-tools/parser";
import { serializeTerm } from "@/modules/ring-core/canonicalization";

describe("agent-tools parser", () => {
  it("parses decimal constant", () => {
    const t = parseTerm("42");
    expect(t).toEqual({ kind: "const", value: 42 });
  });

  it("parses hex constant", () => {
    const t = parseTerm("0x55");
    expect(t).toEqual({ kind: "const", value: 85 });
  });

  it("parses unary neg", () => {
    const t = parseTerm("neg(42)");
    expect(t.kind).toBe("unary");
    if (t.kind === "unary") {
      expect(t.op).toBe("neg");
      expect(t.arg).toEqual({ kind: "const", value: 42 });
    }
  });

  it("parses nested neg(bnot(42))", () => {
    const t = parseTerm("neg(bnot(42))");
    expect(serializeTerm(t)).toBe("neg(bnot(C(42)))");
  });

  it("parses binary xor(0x55, 0xAA)", () => {
    const t = parseTerm("xor(0x55, 0xAA)");
    expect(t.kind).toBe("binary");
    if (t.kind === "binary") {
      expect(t.op).toBe("xor");
      expect(t.args.length).toBe(2);
    }
  });

  it("parses deeply nested term", () => {
    const t = parseTerm("xor(neg(42), bnot(0xFF))");
    expect(t.kind).toBe("binary");
    expect(serializeTerm(t)).toBe("xor(neg(C(42)),bnot(C(255)))");
  });

  it("throws on invalid input", () => {
    expect(() => parseTerm("")).toThrow();
    expect(() => parseTerm("unknown(42)")).toThrow();
  });

  it("parses succ and pred", () => {
    expect(parseTerm("succ(0)").kind).toBe("unary");
    expect(parseTerm("pred(255)").kind).toBe("unary");
  });
});
