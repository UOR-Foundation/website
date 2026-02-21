import { describe, it, expect } from "vitest";
import { Q0 } from "@/modules/ring-core/ring";
import { contentAddress, bytesToGlyph } from "@/modules/identity";
import { exactLookup, findSimilar } from "@/modules/semantic-index/index-builder";
import { resolveEntity } from "@/modules/semantic-index/entity-linker";
import type { SemanticIndex, IndexEntry } from "@/modules/semantic-index/index-builder";

// Build a small in-memory index for testing (no Supabase needed)
function buildTestIndex(): SemanticIndex {
  const ring = Q0();
  const entries: IndexEntry[] = [];
  const byIri = new Map<string, IndexEntry>();
  const byGlyph = new Map<string, IndexEntry>();
  const byValue = new Map<string, IndexEntry>();
  const byHex = new Map<string, IndexEntry>();

  for (let v = 0; v < 256; v++) {
    const bytes = ring.toBytes(v);
    const hex = v.toString(16).toUpperCase().padStart(2, "0");
    const entry: IndexEntry = {
      iri: contentAddress(ring, v),
      value: v,
      quantum: 0,
      glyph: bytesToGlyph(bytes),
      hex,
      totalStratum: bytes.reduce((s, b) => {
        let n = b, c = 0;
        while (n) { c += n & 1; n >>= 1; }
        return s + c;
      }, 0),
    };
    entries.push(entry);
    byIri.set(entry.iri, entry);
    byGlyph.set(entry.glyph, entry);
    byValue.set(String(v), entry);
    byHex.set(hex, entry);
    byHex.set("0x" + hex, entry);
    byHex.set("0x" + hex.toLowerCase(), entry);
  }

  return { entries, byIri, byGlyph, byValue, byHex, builtAt: new Date().toISOString() };
}

describe("exactLookup", () => {
  const index = buildTestIndex();

  it("finds by value string", () => {
    const r = exactLookup(index, "42");
    expect(r).toBeDefined();
    expect(r!.value).toBe(42);
  });

  it("finds by IRI", () => {
    const iri = contentAddress(Q0(), 42);
    const r = exactLookup(index, iri);
    expect(r).toBeDefined();
    expect(r!.value).toBe(42);
  });

  it("finds by hex", () => {
    const r = exactLookup(index, "0x2A");
    expect(r).toBeDefined();
    expect(r!.value).toBe(42);
  });

  it("returns undefined for unknown", () => {
    expect(exactLookup(index, "nonexistent")).toBeUndefined();
  });
});

describe("findSimilar", () => {
  const index = buildTestIndex();

  it("finds similar values to 42", () => {
    const results = findSimilar(index, 42, 0.6, 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].fidelity).toBeGreaterThanOrEqual(0.6);
  });

  it("results are sorted by fidelity descending", () => {
    const results = findSimilar(index, 42, 0.5, 10);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].fidelity).toBeLessThanOrEqual(results[i - 1].fidelity);
    }
  });
});

describe("resolveEntity", () => {
  const index = buildTestIndex();

  it("resolves exact numeric match", () => {
    const r = resolveEntity("42", index);
    expect(r.matchType).toBe("exact");
    expect(r.confidence).toBe(1.0);
    expect(r.grade).toBe("B");
    expect(r.iri).toBe(contentAddress(Q0(), 42));
  });

  it("resolves hex match", () => {
    const r = resolveEntity("0x2A", index);
    expect(r.matchType).toBe("exact");
    expect(r.grade).toBe("B");
  });

  it("returns none for unknown text", () => {
    const r = resolveEntity("banana", index);
    expect(r.matchType).toBe("none");
    expect(r.grade).toBe("D");
  });
});
