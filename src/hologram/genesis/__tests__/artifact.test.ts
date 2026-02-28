import { describe, it, expect } from "vitest";
import {
  buildArtifact,
  serializeArtifact,
  deserializeArtifact,
  stringifyArtifact,
  verifyArtifact,
  toBlob,
} from "../artifact";

describe("UOR Artifact (.uor format)", () => {
  const artifact = buildArtifact();

  it("builds with correct @type and version", () => {
    expect(artifact["@type"]).toBe("uor:Artifact");
    expect(artifact.version).toBe("1.0.0");
    expect(artifact["@context"]).toBe("https://uor.foundation/contexts/uor-v1.jsonld");
  });

  it("contains valid genesis seed", () => {
    expect(artifact.genesis.cid).toBeTruthy();
    expect(artifact.genesis.iri).toMatch(/^urn:uor:sha256:/);
    expect(artifact.genesis.glyph.length).toBe(8);
    expect(artifact.genesis.checks).toHaveLength(7);
    expect(artifact.genesis.checks.every(c => c.passed)).toBe(true);
    expect(artifact.genesis.ringSize).toBe(256);
  });

  it("contains derivation tree with all kernel modules", () => {
    expect(artifact.derivationTree.root).toBe("genesis");
    expect(artifact.derivationTree.moduleCount).toBeGreaterThanOrEqual(16);
    expect(artifact.derivationTree.merkleCid).toBeTruthy();
    const paths = Object.keys(artifact.derivationTree.nodes);
    expect(paths).toContain("genesis");
    expect(paths).toContain("kernel/q-mmu");
    expect(paths).toContain("kernel/q-fs");
    expect(paths).toContain("kernel/q-sched");
  });

  it("each derivation node has digestHex + cid", () => {
    for (const node of Object.values(artifact.derivationTree.nodes)) {
      expect(node.digestHex).toHaveLength(64);
      expect(node.cid).toMatch(/^b/);
      expect(node.path).toBeTruthy();
    }
  });

  it("has a valid envelope CID", () => {
    expect(artifact.envelopeCid).toMatch(/^b/);
    expect(artifact.envelopeIri).toMatch(/^urn:uor:sha256:/);
    expect(artifact.envelopeGlyph.length).toBe(8);
  });

  it("round-trips through serialize → deserialize", () => {
    const bytes = serializeArtifact(artifact);
    const restored = deserializeArtifact(bytes);
    expect(restored["@type"]).toBe("uor:Artifact");
    expect(restored.genesis.cid).toBe(artifact.genesis.cid);
    expect(restored.derivationTree.merkleCid).toBe(artifact.derivationTree.merkleCid);
  });

  it("stringifies to deterministic JSON", () => {
    const json1 = stringifyArtifact(artifact);
    const json2 = stringifyArtifact(artifact);
    expect(json1).toBe(json2);
    expect(json1.startsWith("{")).toBe(true);
  });

  it("passes three-layer verification", () => {
    const v = verifyArtifact(artifact);
    expect(v.genesisValid).toBe(true);
    expect(v.treeValid).toBe(true);
    expect(v.envelopeValid).toBe(true);
    expect(v.valid).toBe(true);
    expect(v.moduleCount).toBeGreaterThanOrEqual(16);
  });

  it("produces a downloadable blob", () => {
    const blob = toBlob(artifact);
    expect(blob.type).toBe("application/uor+json");
    expect(blob.size).toBeGreaterThan(100);
  });
});
