/**
 * Tests for UOR Single Proof Hashing Standard (URDNA2015).
 *
 * Verifies THE fundamental contract:
 *   Same object → same nquads → same hash → same {derivation_id, cid, u:address, u:ipv6}.
 */
import { describe, it, expect } from "vitest";
import {
  singleProofHash,
  canonicalizeToNQuads,
  verifySingleProof,
} from "@/lib/uor-canonical";
import {
  computeIpv6Address,
  computeIpv6Full,
  ipv6ToContentBytes,
  verifyIpv6Address,
} from "@/lib/uor-address";

describe("uor-canonical — Single Proof Hashing Standard", () => {
  // ── Determinism ─────────────────────────────────────────────────────────

  it("same plain object produces identical proof on every call", async () => {
    const obj = { alpha: 1, beta: "hello", gamma: [1, 2, 3] };
    const proof1 = await singleProofHash(obj);
    const proof2 = await singleProofHash(obj);

    expect(proof1.hashHex).toBe(proof2.hashHex);
    expect(proof1.derivationId).toBe(proof2.derivationId);
    expect(proof1.cid).toBe(proof2.cid);
    expect(proof1.uorAddress["u:glyph"]).toBe(proof2.uorAddress["u:glyph"]);
    expect(proof1.ipv6Address["u:ipv6"]).toBe(proof2.ipv6Address["u:ipv6"]);
  });

  it("key order does not affect proof for plain objects", async () => {
    const a = { x: 1, y: 2 };
    const b = { y: 2, x: 1 };
    const pa = await singleProofHash(a);
    const pb = await singleProofHash(b);

    // Both are wrapped via canonicalJsonLd → same serialisation → same nquads
    expect(pa.hashHex).toBe(pb.hashHex);
    expect(pa.derivationId).toBe(pb.derivationId);
    expect(pa.ipv6Address["u:ipv6"]).toBe(pb.ipv6Address["u:ipv6"]);
  });

  // ── JSON-LD canonicalization ────────────────────────────────────────────

  it("canonicalizes JSON-LD with inline context", async () => {
    const doc = {
      "@context": { name: "http://xmlns.com/foaf/0.1/name" },
      "@type": "http://xmlns.com/foaf/0.1/Person",
      name: "Alice",
    };
    const nquads = await canonicalizeToNQuads(doc);

    expect(nquads).toContain("http://xmlns.com/foaf/0.1/name");
    expect(nquads).toContain('"Alice"');
    expect(nquads.length).toBeGreaterThan(0);
  });

  it("JSON-LD key order does not affect nquads", async () => {
    const ctx = { name: "http://xmlns.com/foaf/0.1/name" };
    const a = { "@context": ctx, name: "Bob", "@type": "http://xmlns.com/foaf/0.1/Person" };
    const b = { "@type": "http://xmlns.com/foaf/0.1/Person", "@context": ctx, name: "Bob" };

    const nqA = await canonicalizeToNQuads(a);
    const nqB = await canonicalizeToNQuads(b);

    expect(nqA).toBe(nqB);
  });

  // ── Four derived forms consistency ─────────────────────────────────────

  it("derivation_id, cid, u:address, and u:ipv6 all derive from one hash", async () => {
    const obj = { value: 42, quantum: 0 };
    const proof = await singleProofHash(obj);

    // derivation_id format
    expect(proof.derivationId).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/
    );

    // CID is non-empty base32lower
    expect(proof.cid).toMatch(/^b[a-z2-7]+$/);

    // u:address has Braille glyphs (U+2800..U+28FF range)
    const glyphCodes = [...proof.uorAddress["u:glyph"]].map(
      (c) => c.codePointAt(0) ?? 0
    );
    for (const cp of glyphCodes) {
      expect(cp).toBeGreaterThanOrEqual(0x2800);
      expect(cp).toBeLessThanOrEqual(0x28ff);
    }

    // Hash length is 32 bytes (SHA-256)
    expect(proof.hashBytes.length).toBe(32);
    expect(proof.uorAddress["u:length"]).toBe(32);

    // IPv6 address is valid UOR ULA format
    expect(proof.ipv6Address["u:ipv6"]).toMatch(
      /^fd00:0075:6f72:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}$/
    );
    expect(proof.ipv6Address["u:ipv6Prefix"]).toBe("fd00:0075:6f72::/48");
    expect(proof.ipv6Address["u:ipv6PrefixLength"]).toBe(48);
    expect(proof.ipv6Address["u:contentBits"]).toBe(80);
  });

  // ── Verification ────────────────────────────────────────────────────────

  it("verifySingleProof returns true for matching object", async () => {
    const obj = { test: "verification" };
    const proof = await singleProofHash(obj);
    const valid = await verifySingleProof(obj, proof.derivationId);
    expect(valid).toBe(true);
  });

  it("verifySingleProof returns false for different object", async () => {
    const obj = { test: "verification" };
    const proof = await singleProofHash(obj);
    const valid = await verifySingleProof(
      { test: "different" },
      proof.derivationId
    );
    expect(valid).toBe(false);
  });

  // ── Different objects produce different proofs ──────────────────────────

  it("different content produces different identities including IPv6", async () => {
    const a = await singleProofHash({ value: 1 });
    const b = await singleProofHash({ value: 2 });

    expect(a.derivationId).not.toBe(b.derivationId);
    expect(a.cid).not.toBe(b.cid);
    expect(a.uorAddress["u:glyph"]).not.toBe(b.uorAddress["u:glyph"]);
    expect(a.ipv6Address["u:ipv6"]).not.toBe(b.ipv6Address["u:ipv6"]);
  });

  // ── Non-JSON-LD wrapping ──────────────────────────────────────────────

  it("wraps non-JSON-LD objects and produces valid nquads", async () => {
    const obj = { operation: "neg", value: 42 };
    const nquads = await canonicalizeToNQuads(obj);

    // Should contain the store namespace
    expect(nquads).toContain("https://uor.foundation/store/");
    // Should contain the serialized payload
    expect(nquads.length).toBeGreaterThan(0);
  });

  // ── UOR context resolution ────────────────────────────────────────────

  it("resolves UOR v1 context without network access", async () => {
    const doc = {
      "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
      "@type": "store:StoredObject",
      "store:cid": "bafytest123",
    };
    const nquads = await canonicalizeToNQuads(doc);
    expect(nquads).toContain("https://uor.foundation/store/");
  });
});

// ── IPv6 Address Tests ──────────────────────────────────────────────────────

describe("uor-address — IPv6 Content Addressing", () => {
  it("computes valid UOR ULA IPv6 from hash bytes", () => {
    // Known 32-byte hash
    const hash = new Uint8Array(32);
    hash[0] = 0xab; hash[1] = 0xcd; hash[2] = 0x12; hash[3] = 0x34;
    hash[4] = 0x56; hash[5] = 0x78; hash[6] = 0x9a; hash[7] = 0xbc;
    hash[8] = 0xde; hash[9] = 0xf0;

    const result = computeIpv6Address(hash);
    expect(result["u:ipv6"]).toBe("fd00:0075:6f72:abcd:1234:5678:9abc:def0");
    expect(result["u:ipv6PrefixLength"]).toBe(48);
    expect(result["u:contentBits"]).toBe(80);
  });

  it("computes full-entropy IPv6 with /8 prefix", () => {
    const hash = new Uint8Array(32);
    for (let i = 0; i < 32; i++) hash[i] = i;

    const ipv6 = computeIpv6Full(hash);
    // fd prefix + first 15 bytes of hash
    expect(ipv6).toMatch(/^fd00:/);
    expect(ipv6.split(":").length).toBe(8);
  });

  it("round-trips /48 IPv6 to content bytes", () => {
    const hash = new Uint8Array(32);
    hash[0] = 0xff; hash[1] = 0xee; hash[2] = 0xdd; hash[3] = 0xcc;
    hash[4] = 0xbb; hash[5] = 0xaa; hash[6] = 0x99; hash[7] = 0x88;
    hash[8] = 0x77; hash[9] = 0x66;

    const result = computeIpv6Address(hash);
    const contentBytes = ipv6ToContentBytes(result["u:ipv6"]);

    // Content bytes should match first 10 bytes of hash
    expect(contentBytes.length).toBe(10);
    for (let i = 0; i < 10; i++) {
      expect(contentBytes[i]).toBe(hash[i]);
    }
  });

  it("verifyIpv6Address confirms correct derivation", () => {
    const hash = new Uint8Array(32);
    for (let i = 0; i < 32; i++) hash[i] = i * 7;

    const result = computeIpv6Address(hash);
    expect(verifyIpv6Address(result["u:ipv6"], hash)).toBe(true);

    // Tampered hash should fail
    const tampered = new Uint8Array(32);
    expect(verifyIpv6Address(result["u:ipv6"], tampered)).toBe(false);
  });

  it("rejects non-UOR IPv6 addresses", () => {
    expect(() => ipv6ToContentBytes("2001:db8::1")).toThrow();
    expect(() => ipv6ToContentBytes("not-an-ipv6")).toThrow();
  });

  it("IPv6 is deterministic — same content always produces same address", async () => {
    const obj = { schema: "AcceptAction", type: "Action" };
    const p1 = await singleProofHash(obj);
    const p2 = await singleProofHash(obj);

    expect(p1.ipv6Address["u:ipv6"]).toBe(p2.ipv6Address["u:ipv6"]);
    expect(verifyIpv6Address(p1.ipv6Address["u:ipv6"], p1.hashBytes)).toBe(true);
  });
});
