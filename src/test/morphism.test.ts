/**
 * Tests for UOR Morphism module — transform and cross-quantum operations.
 */
import { describe, it, expect } from "vitest";
import { applyTransform, type MappingRule } from "@/modules/morphism/transform";
import { UORRing, Q0, Q1 } from "@/modules/ring-core/ring";

describe("morphism/transform", () => {
  it("embed preserves value in larger ring", () => {
    const rules: MappingRule[] = [
      { label: "embed", operation: "embed", sourceQuantum: 0, targetQuantum: 1 },
    ];
    const result = applyTransform(Q0(), Q1(), 42, rules);
    expect(result).toBe(42);
  });

  it("project takes low byte", () => {
    const rules: MappingRule[] = [
      { label: "project", operation: "project", sourceQuantum: 1, targetQuantum: 0 },
    ];
    const result = applyTransform(Q1(), Q0(), 0x1234, rules);
    expect(result).toBe(0x34); // low 8 bits
  });

  it("identity returns same value", () => {
    const rules: MappingRule[] = [
      { label: "identity", operation: "identity", sourceQuantum: 0, targetQuantum: 0 },
    ];
    const result = applyTransform(Q0(), Q0(), 85, rules);
    expect(result).toBe(85);
  });

  it("embed then project is lossless for small values", () => {
    const embedRules: MappingRule[] = [
      { label: "embed", operation: "embed", sourceQuantum: 0, targetQuantum: 1 },
    ];
    const projectRules: MappingRule[] = [
      { label: "project", operation: "project", sourceQuantum: 1, targetQuantum: 0 },
    ];
    const embedded = applyTransform(Q0(), Q1(), 200, embedRules);
    const projected = applyTransform(Q1(), Q0(), embedded, projectRules);
    expect(projected).toBe(200);
  });

  it("throws on unknown operation", () => {
    const rules: MappingRule[] = [
      { label: "bad", operation: "unknown_op", sourceQuantum: 0, targetQuantum: 0 },
    ];
    expect(() => applyTransform(Q0(), Q0(), 42, rules)).toThrow("Unknown transform operation");
  });

  it("throws on empty rules", () => {
    expect(() => applyTransform(Q0(), Q0(), 42, [])).toThrow("At least one mapping rule");
  });
});
