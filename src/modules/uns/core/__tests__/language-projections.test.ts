import { describe, it, expect } from "vitest";
import { project, PROJECTIONS } from "../hologram";
import { coherenceGate } from "../hologram/coherence-gate";

const MOCK_INPUT = {
  hashBytes: new Uint8Array(32).fill(0xcd),
  cid: "bafylangtest5678",
  hex: "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
};

const LANGUAGE_PROJECTIONS = [
  { name: "python-module", urn: `urn:uor:lang:python:${MOCK_INPUT.hex}` },
  { name: "js-module",     urn: `urn:uor:lang:js:${MOCK_INPUT.hex}` },
  { name: "java-class",    urn: `urn:uor:lang:java:${MOCK_INPUT.hex}` },
  { name: "csharp-assembly", urn: `urn:uor:lang:csharp:${MOCK_INPUT.hex}` },
  { name: "cpp-unit",      urn: `urn:uor:lang:cpp:${MOCK_INPUT.hex}` },
  { name: "c-unit",        urn: `urn:uor:lang:c:${MOCK_INPUT.hex}` },
  { name: "go-module",     urn: `urn:uor:lang:go:${MOCK_INPUT.hex}` },
  { name: "rust-crate",    urn: `urn:uor:lang:rust:${MOCK_INPUT.hex}` },
  { name: "ts-module",     urn: `urn:uor:lang:ts:${MOCK_INPUT.hex}` },
  { name: "sql-schema",    urn: `urn:uor:lang:sql:${MOCK_INPUT.hex}` },
] as const;

describe("Language Hologram Projections", () => {
  // ── Registration ──────────────────────────────────────────────────────

  it("all 10 language projections are registered", () => {
    for (const { name } of LANGUAGE_PROJECTIONS) {
      expect(PROJECTIONS.has(name)).toBe(true);
    }
  });

  // ── URN correctness ───────────────────────────────────────────────────

  for (const { name, urn } of LANGUAGE_PROJECTIONS) {
    it(`${name} produces correct URN`, () => {
      const p = project(MOCK_INPUT, name);
      expect(p.value).toBe(urn);
      expect(p.fidelity).toBe("lossless");
    });
  }

  // ── All lossless ──────────────────────────────────────────────────────

  it("all language projections are lossless (full 256-bit identity)", () => {
    for (const { name } of LANGUAGE_PROJECTIONS) {
      const p = project(MOCK_INPUT, name);
      expect(p.fidelity).toBe("lossless");
    }
  });

  // ── Full hex embedded ─────────────────────────────────────────────────

  it("all language projections embed the full hex hash", () => {
    for (const { name } of LANGUAGE_PROJECTIONS) {
      const p = project(MOCK_INPUT, name);
      expect(p.value).toContain(MOCK_INPUT.hex);
    }
  });

  // ── Tier classification ───────────────────────────────────────────────

  it("all language projections classified in language tier", () => {
    const report = coherenceGate();
    const languageCluster = report.clusters.find(c => c.name === "language");
    expect(languageCluster).toBeDefined();
    for (const { name } of LANGUAGE_PROJECTIONS) {
      expect(languageCluster!.members).toContain(name);
    }
  });

  // ── Synergy discovery ─────────────────────────────────────────────────

  it("coherence gate discovers language synergies", () => {
    const report = coherenceGate();
    const langNames = LANGUAGE_PROJECTIONS.map(l => l.name);
    const langSynergies = report.synergies.filter(
      s => langNames.some(n => s.projections.includes(n)),
    );
    // Should have many synergies: provenance chains + complementary pairs + settlement bridges
    expect(langSynergies.length).toBeGreaterThan(30);
  });

  it("discovers provenance chains for language projections", () => {
    const report = coherenceGate();
    const langChains = report.synergies.filter(
      s => s.type === "provenance-chain" &&
        ["python-module", "js-module", "ts-module", "go-module", "rust-crate"]
          .some(n => s.projections.includes(n)),
    );
    expect(langChains.length).toBeGreaterThan(10);
  });

  it("discovers complementary pairs for language projections", () => {
    const report = coherenceGate();
    const langPairs = report.synergies.filter(
      s => s.type === "complementary-pair" &&
        ["python-module", "java-class", "csharp-assembly", "c-unit", "sql-schema"]
          .some(n => s.projections.includes(n)),
    );
    expect(langPairs.length).toBeGreaterThan(5);
  });

  // ── Key provenance chain verification ─────────────────────────────────

  it("python → onnx provenance chain exists (ML pipeline)", () => {
    const report = coherenceGate();
    const chain = report.synergies.find(
      s => s.type === "provenance-chain" &&
        s.projections[0] === "python-module" && s.projections[1] === "onnx",
    );
    expect(chain).toBeDefined();
  });

  it("ts-module → js-module provenance chain exists (compilation)", () => {
    const report = coherenceGate();
    const chain = report.synergies.find(
      s => s.type === "provenance-chain" &&
        s.projections[0] === "ts-module" && s.projections[1] === "js-module",
    );
    expect(chain).toBeDefined();
  });

  it("go-module → oci provenance chain exists (cloud-native)", () => {
    const report = coherenceGate();
    const chain = report.synergies.find(
      s => s.type === "provenance-chain" &&
        s.projections[0] === "go-module" && s.projections[1] === "oci",
    );
    expect(chain).toBeDefined();
  });

  // ── Cross-language interoperability ───────────────────────────────────

  it("all language projections share identity with each other (same hex)", () => {
    const values = LANGUAGE_PROJECTIONS.map(
      ({ name }) => project(MOCK_INPUT, name).value,
    );
    // All contain the same hex → same canonical identity
    for (const v of values) {
      expect(v).toContain(MOCK_INPUT.hex);
    }
  });

  it("language projections interoperate with settlement layer", () => {
    const report = coherenceGate();
    const langSettlement = report.synergies.filter(
      s => s.type === "settlement-bridge" &&
        LANGUAGE_PROJECTIONS.some(l => s.projections.includes(l.name)),
    );
    // Every lossless language projection should have a settlement bridge
    expect(langSettlement.length).toBe(10);
  });

  // ── Opportunity synthesis ─────────────────────────────────────────────

  it("generates POLYGLOT SUPPLY CHAIN opportunity", () => {
    const report = coherenceGate();
    const polyglot = report.opportunities.find(o => o.includes("POLYGLOT"));
    expect(polyglot).toBeDefined();
  });

  // ── Total projection count ────────────────────────────────────────────

  it("total projections now includes all 10 languages", () => {
    const report = coherenceGate();
    expect(report.totalProjections).toBeGreaterThanOrEqual(52);
  });
});
