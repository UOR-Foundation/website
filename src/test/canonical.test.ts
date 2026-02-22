/**
 * Tests for UOR Single Proof Hashing Standard (URDNA2015).
 *
 * Verifies THE fundamental contract:
 *   Same object → same nquads → same hash → same {derivation_id, cid, u:address}.
 */
import { describe, it, expect } from "vitest";
import {
  singleProofHash,
  canonicalizeToNQuads,
  verifySingleProof,
} from "@/lib/uor-canonical";

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
  });

  it("key order does not affect proof for plain objects", async () => {
    const a = { x: 1, y: 2 };
    const b = { y: 2, x: 1 };
    const pa = await singleProofHash(a);
    const pb = await singleProofHash(b);

    // Both are wrapped via canonicalJsonLd → same serialisation → same nquads
    expect(pa.hashHex).toBe(pb.hashHex);
    expect(pa.derivationId).toBe(pb.derivationId);
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

  // ── Three derived forms consistency ─────────────────────────────────────

  it("derivation_id, cid, and u:address all derive from one hash", async () => {
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

  it("different content produces different derivation_ids", async () => {
    const a = await singleProofHash({ value: 1 });
    const b = await singleProofHash({ value: 2 });

    expect(a.derivationId).not.toBe(b.derivationId);
    expect(a.cid).not.toBe(b.cid);
    expect(a.uorAddress["u:glyph"]).not.toBe(b.uorAddress["u:glyph"]);
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
