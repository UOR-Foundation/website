import { describe, it, expect } from "vitest";
import {
  computeGrade,
  gradeToLabel,
  gradeToStyles,
  gradeInfo,
  ALL_GRADES,
} from "@/modules/epistemic/grading";
import {
  assignGrade,
  graded,
  deriveGradeA,
  GRADE_DEFINITIONS,
} from "@/modules/epistemic/grade-engine";
import type { Graded } from "@/modules/epistemic/grade-engine";

// ── Existing grading tests ──────────────────────────────────────────────────

describe("epistemic grading", () => {
  it("computeGrade returns A for derivation", () => {
    expect(computeGrade({ hasDerivation: true })).toBe("A");
  });

  it("computeGrade returns B for certificate only", () => {
    expect(computeGrade({ hasCertificate: true })).toBe("B");
  });

  it("computeGrade returns C for source only", () => {
    expect(computeGrade({ hasSource: true })).toBe("C");
  });

  it("computeGrade returns D for nothing", () => {
    expect(computeGrade({})).toBe("D");
  });

  it("derivation takes precedence over certificate", () => {
    expect(computeGrade({ hasDerivation: true, hasCertificate: true })).toBe("A");
  });

  it("gradeToLabel returns human labels", () => {
    expect(gradeToLabel("A")).toBe("Algebraically Proven");
    expect(gradeToLabel("D")).toBe("LLM-Generated / Unverified");
  });

  it("gradeToStyles returns class strings", () => {
    const s = gradeToStyles("A");
    expect(s).toContain("bg-green");
    expect(s).toContain("text-green");
  });

  it("gradeInfo returns full metadata", () => {
    const info = gradeInfo("B");
    expect(info.label).toBe("Graph-Certified");
    expect(info.description).toBeTruthy();
    expect(info.agentBehavior).toBeTruthy();
  });

  it("ALL_GRADES has 4 entries", () => {
    expect(ALL_GRADES).toEqual(["A", "B", "C", "D"]);
  });
});

// ── P22: Grade Engine Tests ─────────────────────────────────────────────────

describe("P22 — Grade Engine", () => {
  // Test 1: assignGrade with derivationId → A
  it("1. assignGrade({ derivationId }) === 'A'", () => {
    expect(assignGrade({ derivationId: "urn:uor:derivation:sha256:abc123" })).toBe("A");
  });

  // Test 2: assignGrade with certificateId → B
  it("2. assignGrade({ certificateId }) === 'B'", () => {
    expect(assignGrade({ certificateId: "cert:xyz" })).toBe("B");
  });

  // Test 3: assignGrade with graphPresent → C
  it("3. assignGrade({ graphPresent: true }) === 'C'", () => {
    expect(assignGrade({ graphPresent: true })).toBe("C");
  });

  // Test 4: assignGrade({}) → D
  it("4. assignGrade({}) === 'D'", () => {
    expect(assignGrade({})).toBe("D");
  });

  // Test 5: graded() wraps correctly
  it("5. graded(42, { derivationId }) → epistemic_grade === 'A'", () => {
    const result = graded(42, { derivationId: "urn:uor:derivation:sha256:abc123" });
    expect(result.epistemic_grade).toBe("A");
    expect(result.data).toBe(42);
    expect(result["derivation:derivationId"]).toBe("urn:uor:derivation:sha256:abc123");
    expect(result.epistemic_grade_label).toBe(GRADE_DEFINITIONS["A"]);
  });

  // Test 6: deriveGradeA returns Grade A with derivationId
  it("6. deriveGradeA('neg(bnot(42))', 43) → grade 'A' with derivationId", async () => {
    const { derivationId, grade } = await deriveGradeA("neg(bnot(42))", 43);
    expect(grade.epistemic_grade).toBe("A");
    expect(grade.data).toBe(43);
    expect(derivationId).toBeTruthy();
    expect(grade["derivation:derivationId"]).toBe(derivationId);
  });

  // Test 7: derivationId matches URN pattern
  it("7. deriveGradeA derivationId matches /^urn:uor:derivation:sha256:[0-9a-f]{64}$/", async () => {
    const { derivationId } = await deriveGradeA("neg(bnot(42))", 43);
    expect(derivationId).toMatch(/^urn:uor:derivation:sha256:[0-9a-f]{64}$/);
  });

  // Test 8: Grade D includes reason
  it("12. Grade D object includes epistemic_grade_reason", () => {
    const result = graded("unverified claim", {});
    expect(result.epistemic_grade).toBe("D");
    expect(result.epistemic_grade_reason).toContain("No derivation ID");
  });

  // Test: Graded<T> preserves data type
  it("Graded<T> preserves arbitrary data types", () => {
    const obj = { name: "test", value: 42 };
    const result: Graded<typeof obj> = graded(obj, { certificateId: "cert:123" });
    expect(result.data.name).toBe("test");
    expect(result.data.value).toBe(42);
    expect(result.epistemic_grade).toBe("B");
    expect(result["cert:certificateId"]).toBe("cert:123");
  });

  // Test: GRADE_DEFINITIONS match .well-known/uor.json verbatim
  it("GRADE_DEFINITIONS match spec", () => {
    expect(GRADE_DEFINITIONS.A).toContain("Algebraically Proven");
    expect(GRADE_DEFINITIONS.A).toContain("derivation:derivationId");
    expect(GRADE_DEFINITIONS.B).toContain("Graph-Certified");
    expect(GRADE_DEFINITIONS.B).toContain("cert:Certificate");
    expect(GRADE_DEFINITIONS.C).toContain("Graph-Present");
    expect(GRADE_DEFINITIONS.D).toContain("LLM-Generated");
  });

  // Test: deriveGradeA is deterministic
  it("deriveGradeA is deterministic (same input → same derivationId)", async () => {
    const r1 = await deriveGradeA("succ(0)", 1);
    const r2 = await deriveGradeA("succ(0)", 1);
    expect(r1.derivationId).toBe(r2.derivationId);
  });

  // Test: Priority — derivationId beats certificateId
  it("derivationId takes precedence over certificateId", () => {
    const r = graded("x", { derivationId: "urn:...", certificateId: "cert:..." });
    expect(r.epistemic_grade).toBe("A");
  });
});
