import { describe, it, expect } from "vitest";
import { project, PROJECTIONS } from "../hologram";
import { coherenceGate } from "../hologram/coherence-gate";

const MOCK_INPUT = {
  hashBytes: new Uint8Array(32).fill(0xab),
  cid: "bafytest1234",
  hex: "abababababababababababababababababababababababababababababababab",
};

describe("COBOL Hologram Projections", () => {
  it("cobol-copybook produces correct URN", () => {
    const p = project(MOCK_INPUT, "cobol-copybook");
    expect(p.value).toBe(`urn:uor:cobol:copybook:${MOCK_INPUT.hex}`);
    expect(p.fidelity).toBe("lossless");
  });

  it("cobol-program produces correct URN", () => {
    const p = project(MOCK_INPUT, "cobol-program");
    expect(p.value).toBe(`urn:uor:cobol:program:${MOCK_INPUT.hex}`);
    expect(p.fidelity).toBe("lossless");
  });

  it("both COBOL projections are registered", () => {
    expect(PROJECTIONS.has("cobol-copybook")).toBe(true);
    expect(PROJECTIONS.has("cobol-program")).toBe(true);
  });

  it("COBOL projections classified in industry tier", () => {
    const report = coherenceGate();
    const industry = report.clusters.find(c => c.name === "industry");
    expect(industry).toBeDefined();
    expect(industry!.members).toContain("cobol-copybook");
    expect(industry!.members).toContain("cobol-program");
  });

  it("coherence gate discovers COBOL synergies", () => {
    const report = coherenceGate();
    const cobolSynergies = report.synergies.filter(
      s => s.projections.includes("cobol-copybook") ||
           s.projections.includes("cobol-program"),
    );
    // Should have provenance chains + complementary pairs + settlement bridges
    expect(cobolSynergies.length).toBeGreaterThan(5);

    // Verify specific key synergies
    const types = new Set(cobolSynergies.map(s => s.type));
    expect(types.has("provenance-chain")).toBe(true);
    expect(types.has("complementary-pair")).toBe(true);
    expect(types.has("settlement-bridge")).toBe(true);
  });

  it("COBOL shares identity with all other lossless projections", () => {
    const copybook = project(MOCK_INPUT, "cobol-copybook").value;
    const program = project(MOCK_INPUT, "cobol-program").value;
    // Both embed the full hex — same canonical identity
    expect(copybook).toContain(MOCK_INPUT.hex);
    expect(program).toContain(MOCK_INPUT.hex);
  });
});
