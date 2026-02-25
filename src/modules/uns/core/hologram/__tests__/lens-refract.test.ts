import { describe, it, expect } from "vitest";
import {
  dehydrate,
  rehydrate,
  refractLens,
  roundTrip,
  composeLens,
  element,
} from "../lens";
import type { RefractionModality } from "../lens";

const SAMPLE_OBJ = {
  "@context": {
    name: "https://schema.org/name",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    age: { "@id": "https://schema.org/age", "@type": "xsd:integer" },
  },
  "@type": "https://schema.org/Person",
  name: "Ada Lovelace",
  age: 36,
};

describe("Bidirectional Lens — dehydrate / rehydrate", () => {
  it("dehydrate produces valid SingleProofResult + hologram", async () => {
    const result = await dehydrate(SAMPLE_OBJ);

    expect(result.proof).toBeDefined();
    expect(result.proof.nquads).toBeTruthy();
    expect(result.proof.cid).toBeTruthy();
    expect(result.proof.hashHex).toHaveLength(64);
    expect(result.proof.derivationId).toMatch(/^urn:uor:derivation:sha256:/);
    expect(result.hologram).toBeDefined();
    expect(result.hologram.projections).toBeDefined();
    expect(result.original).toBe(SAMPLE_OBJ);
  });

  it("dehydrate is deterministic — same object always produces same hash", async () => {
    const a = await dehydrate(SAMPLE_OBJ);
    const b = await dehydrate(SAMPLE_OBJ);
    expect(a.proof.hashHex).toBe(b.proof.hashHex);
    expect(a.proof.cid).toBe(b.proof.cid);
  });

  const modalities: RefractionModality[] = [
    "nquads",
    "jsonld",
    "compact-json",
    "turtle",
    "hologram",
    "identity",
  ];

  for (const modality of modalities) {
    it(`rehydrate("${modality}") returns non-empty output`, async () => {
      const { proof } = await dehydrate(SAMPLE_OBJ);
      const output = await rehydrate(proof, modality);
      expect(output).toBeDefined();
      expect(output).not.toBe("");
      expect(output).not.toBeNull();
    });
  }

  it("nquads modality returns the canonical N-Quads string", async () => {
    const { proof } = await dehydrate(SAMPLE_OBJ);
    const nquads = (await rehydrate(proof, "nquads")) as string;
    expect(typeof nquads).toBe("string");
    expect(nquads).toContain("Ada Lovelace");
  });

  it("jsonld modality returns expanded JSON-LD array", async () => {
    const { proof } = await dehydrate(SAMPLE_OBJ);
    const jsonld = await rehydrate(proof, "jsonld");
    expect(Array.isArray(jsonld)).toBe(true);
    expect((jsonld as any[]).length).toBeGreaterThan(0);
  });

  it("turtle modality returns triple lines ending with ' .'", async () => {
    const { proof } = await dehydrate(SAMPLE_OBJ);
    const turtle = (await rehydrate(proof, "turtle")) as string;
    const lines = turtle.trim().split("\n");
    for (const line of lines) {
      expect(line.trimEnd()).toMatch(/\.$/);
    }
  });

  it("hologram modality returns a Hologram with projections", async () => {
    const { proof } = await dehydrate(SAMPLE_OBJ);
    const holo = (await rehydrate(proof, "hologram")) as any;
    expect(holo.projections).toBeDefined();
    expect(holo.projections.did).toBeDefined();
    expect(holo.projections.did.value).toMatch(/^did:uor:/);
  });

  it("identity modality returns the SingleProofResult itself", async () => {
    const { proof } = await dehydrate(SAMPLE_OBJ);
    const identity = (await rehydrate(proof, "identity")) as any;
    expect(identity.hashHex).toBe(proof.hashHex);
    expect(identity.cid).toBe(proof.cid);
  });
});

describe("refractLens — lens-guided rehydration", () => {
  it("refracts through a simple lens with default modality", async () => {
    const lens = composeLens("test-refract", [
      element("passthrough", async (x) => x),
    ], { morphism: "isometry" });

    const { proof } = await dehydrate(SAMPLE_OBJ);
    const result = await refractLens(lens, proof, "nquads");

    expect(result.output).toBeTruthy();
    expect(result.modality).toBe("nquads");
    expect(result.morphism).toBe("isometry");
    expect(result.lensCid).toBeTruthy();
    expect(result.trace).toContain("modality:nquads");
  });

  it("runs bidirectional elements in reverse", async () => {
    const log: string[] = [];

    const lens = composeLens("bidi-test", [
      element(
        "upper",
        async (s) => { log.push("focus"); return s; },
        "transform",
        async (s) => { log.push("refract"); return `[refracted]${s}`; },
      ),
    ]);

    const { proof } = await dehydrate(SAMPLE_OBJ);
    const result = await refractLens(lens, proof, "nquads");

    expect(log).toContain("refract");
    expect(log).not.toContain("focus"); // focus should NOT be called during refract
    expect((result.output as string)).toContain("[refracted]");
    expect(result.trace).toContain("refract:upper");
  });
});

describe("roundTrip — dehydrate + refract in one call", () => {
  it("performs a full round trip", async () => {
    const lens = composeLens("round-trip-lens", [
      element("id", async (x) => x),
    ], { morphism: "isometry" });

    const { dehydrated, refracted } = await roundTrip(lens, SAMPLE_OBJ, "nquads");

    expect(dehydrated.proof.hashHex).toHaveLength(64);
    expect(dehydrated.hologram.projections).toBeDefined();
    expect(refracted.output).toBe(dehydrated.proof.nquads);
    expect(refracted.modality).toBe("nquads");
  });

  it("round trip with hologram modality", async () => {
    const lens = composeLens("holo-trip", [
      element("id", async (x) => x),
    ]);

    const { refracted } = await roundTrip(lens, SAMPLE_OBJ, "hologram");
    const holo = refracted.output as any;
    expect(holo.projections.did.value).toMatch(/^did:uor:/);
  });
});
