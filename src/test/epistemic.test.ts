import { describe, it, expect } from "vitest";
import { computeGrade, gradeToLabel, gradeToStyles, gradeInfo, ALL_GRADES } from "@/modules/epistemic/grading";

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
    expect(gradeToLabel("D")).toBe("Unverified");
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
