/**
 * Genesis Axiom Seed — Self-verification tests.
 * 
 * These tests verify that the seed crystal is internally
 * coherent with zero external dependencies.
 */
import { describe, it, expect } from "vitest";
import {
  N, verifyRingCoherence, verifyCriticalIdentity, neg, bnot, succ,
  toHex, fromHex, encodeUtf8, bytesEqual,
} from "../axiom-ring";
import { sha256, sha256hex } from "../axiom-hash";
import { createCid, verifyCid, cidToIri, cidToIpv6, cidToGlyph } from "../axiom-cid";
import { canonicalEncode, canonicalStringify } from "../axiom-codec";
import { verifyTauInvolution, verifyMirrorCoherence, MIRROR_PAIRS, FANO_LINES, tau } from "../axiom-mirror";
import { post } from "../axiom-post";
import { bootGenesis } from "../genesis";

describe("Axiom Ring", () => {
  it("verifies critical identity for all 256 elements", () => {
    expect(verifyRingCoherence()).toBe(true);
  });

  it("neg(bnot(42)) === succ(42) === 43", () => {
    expect(neg(bnot(42))).toBe(43);
    expect(succ(42)).toBe(43);
    expect(neg(bnot(42))).toBe(succ(42));
  });

  it("hex round-trips", () => {
    const bytes = new Uint8Array([0, 127, 255]);
    expect(bytesEqual(fromHex(toHex(bytes)), bytes)).toBe(true);
  });
});

describe("Axiom Hash", () => {
  it("SHA-256('abc') matches NIST vector", () => {
    const hex = sha256hex(encodeUtf8("abc"));
    expect(hex).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("SHA-256('') matches empty-string vector", () => {
    const hex = sha256hex(new Uint8Array(0));
    expect(hex).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});

describe("Axiom CID", () => {
  it("creates and verifies a CID", () => {
    const content = encodeUtf8("hologram");
    const cid = createCid(content);
    expect(verifyCid(cid, content)).toBe(true);
    expect(cid.string.startsWith("b")).toBe(true);
  });

  it("CID produces valid IRI, IPv6, glyph", () => {
    const cid = createCid(encodeUtf8("test"));
    expect(cidToIri(cid)).toMatch(/^urn:uor:sha256:[0-9a-f]{64}$/);
    expect(cidToIpv6(cid)).toMatch(/^fd/);
    expect(cidToGlyph(cid).length).toBe(8);
  });
});

describe("Axiom Codec", () => {
  it("canonical encoding is key-order independent", () => {
    const a = canonicalStringify({ z: 1, a: 2 });
    const b = canonicalStringify({ a: 2, z: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"z":1}');
  });
});

describe("Axiom Mirror", () => {
  it("τ is an involution", () => {
    expect(verifyTauInvolution()).toBe(true);
  });

  it("mirror coherence holds", () => {
    expect(verifyMirrorCoherence()).toBe(true);
  });

  it("has 48 mirror pairs", () => {
    expect(MIRROR_PAIRS.length).toBe(48);
  });

  it("Fano plane has 7 lines of 3 points", () => {
    expect(FANO_LINES.length).toBe(7);
    for (const line of FANO_LINES) {
      expect(line.length).toBe(3);
    }
  });
});

describe("POST", () => {
  it("all 7 checks pass", () => {
    const result = post();
    expect(result.passed).toBe(true);
    expect(result.checks.length).toBe(7);
    for (const check of result.checks) {
      expect(check.passed).toBe(true);
    }
    expect(result.genesisCid).not.toBeNull();
  });
});

describe("Genesis Boot", () => {
  it("boots alive with a valid genesis CID", () => {
    const genesis = bootGenesis();
    expect(genesis.alive).toBe(true);
    expect(genesis.genesisCid).toBeDefined();
    expect(genesis.genesisIri).toMatch(/^urn:uor:sha256:/);
    expect(genesis.genesisGlyph.length).toBe(8);
    expect(genesis.post.durationMs).toBeLessThan(100); // should be fast
  });
});
