import { describe, it, expect } from "vitest";
import { project, PROJECTIONS } from "../hologram";
import { whatIf } from "../hologram/coherence-gate";

const MOCK_INPUT = {
  hashBytes: new Uint8Array(32).fill(0xab),
  cid: "bafytest1234",
  hex: "abababababababababababababababababababababababababababababababab",
};

describe("NANDA Hologram Projections", () => {
  it("nanda-index produces correct format", () => {
    const p = project(MOCK_INPUT, "nanda-index");
    expect(p.value).toBe(`nanda:index:${MOCK_INPUT.hex}`);
    expect(p.fidelity).toBe("lossless");
  });

  it("nanda-agentfacts produces correct URL", () => {
    const p = project(MOCK_INPUT, "nanda-agentfacts");
    expect(p.value).toBe(`https://index.projectnanda.org/agentfacts/${MOCK_INPUT.hex}`);
    expect(p.fidelity).toBe("lossless");
  });

  it("nanda-resolver uses 16-char prefix", () => {
    const p = project(MOCK_INPUT, "nanda-resolver");
    expect(p.value).toBe(`nanda:resolve:${MOCK_INPUT.hex.slice(0, 16)}`);
    expect(p.fidelity).toBe("lossy");
  });

  it("all three NANDA projections are registered", () => {
    expect(PROJECTIONS.has("nanda-index")).toBe(true);
    expect(PROJECTIONS.has("nanda-agentfacts")).toBe(true);
    expect(PROJECTIONS.has("nanda-resolver")).toBe(true);
  });

  it("NANDA projections share same hash as all others", () => {
    const idx = project(MOCK_INPUT, "nanda-index").value.split(":").pop()!;
    const did = project(MOCK_INPUT, "did").value.split(":").pop()!;
    // nanda-index embeds full hex, did embeds CID — both from same source
    expect(idx).toBe(MOCK_INPUT.hex);
    expect(did).toBe(MOCK_INPUT.cid);
  });

  // ── Coherence Gate: What-If for NANDA ─────────────────────────────────

  it("coherence gate discovers NANDA synergies with existing projections", () => {
    // NANDA is already registered, so run full gate and check
    const { coherenceGate } = require("../hologram/coherence-gate");
    const report = coherenceGate();
    const nandaSynergies = report.synergies.filter(
      (s: any) => s.projections.includes("nanda-index") ||
                   s.projections.includes("nanda-agentfacts") ||
                   s.projections.includes("nanda-resolver"),
    );
    expect(nandaSynergies.length).toBeGreaterThan(0);
  });
});
