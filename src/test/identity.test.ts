import { describe, it, expect } from "vitest";
import {
  bytesToCodepoint,
  bytesToGlyph,
  bytesToIRI,
  bytesToUPlus,
  iriToBytes,
  contentAddress,
  verifyDeterminism,
  verifyRoundTrip,
  datumApiUrl,
} from "@/modules/identity";
import { Q0, Q1 } from "@/modules/ring-core";

// ═══════════════════════════════════════════════════════════════════════════
// bytesToCodepoint
// ═══════════════════════════════════════════════════════════════════════════

describe("bytesToCodepoint", () => {
  it("maps 0x00 → 0x2800", () => {
    expect(bytesToCodepoint(0x00)).toBe(0x2800);
  });

  it("maps 0x55 → 0x2855", () => {
    expect(bytesToCodepoint(0x55)).toBe(0x2855);
  });

  it("maps 0xFF → 0x28FF", () => {
    expect(bytesToCodepoint(0xff)).toBe(0x28ff);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// bytesToGlyph
// ═══════════════════════════════════════════════════════════════════════════

describe("bytesToGlyph", () => {
  it("produces single Braille char for Q0", () => {
    const glyph = bytesToGlyph([0x55]);
    expect(glyph).toBe(String.fromCodePoint(0x2855));
    expect(glyph.length).toBe(1);
  });

  it("produces two Braille chars for Q1", () => {
    const glyph = bytesToGlyph([0x55, 0xaa]);
    expect(glyph.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// bytesToIRI — SPECIFICATION VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

describe("bytesToIRI", () => {
  it("Q0 [0x55] → https://uor.foundation/u/U2855", () => {
    expect(bytesToIRI([0x55])).toBe("https://uor.foundation/u/U2855");
  });

  it("Q0 [0x00] → https://uor.foundation/u/U2800", () => {
    expect(bytesToIRI([0x00])).toBe("https://uor.foundation/u/U2800");
  });

  it("Q1 [0x55, 0xAA] → https://uor.foundation/u/U2855U28AA", () => {
    expect(bytesToIRI([0x55, 0xaa])).toBe("https://uor.foundation/u/U2855U28AA");
  });

  it("Q0 [0xFF] → https://uor.foundation/u/U28FF", () => {
    expect(bytesToIRI([0xff])).toBe("https://uor.foundation/u/U28FF");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// bytesToUPlus
// ═══════════════════════════════════════════════════════════════════════════

describe("bytesToUPlus", () => {
  it("single byte", () => {
    expect(bytesToUPlus([0x55])).toBe("U+2855");
  });

  it("multi-byte", () => {
    expect(bytesToUPlus([0x55, 0xaa])).toBe("U+2855U+28AA");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// iriToBytes — reverse parsing
// ═══════════════════════════════════════════════════════════════════════════

describe("iriToBytes", () => {
  it("parses full IRI", () => {
    expect(iriToBytes("https://uor.foundation/u/U2855")).toEqual([0x55]);
  });

  it("parses multi-byte IRI", () => {
    expect(iriToBytes("https://uor.foundation/u/U2855U28AA")).toEqual([0x55, 0xaa]);
  });

  it("parses path-only", () => {
    expect(iriToBytes("U2800")).toEqual([0x00]);
  });

  it("throws on invalid codepoint", () => {
    expect(() => iriToBytes("U0041")).toThrow("Braille range");
  });

  it("throws on no segments", () => {
    expect(() => iriToBytes("garbage")).toThrow("No valid");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Round-trip verification
// ═══════════════════════════════════════════════════════════════════════════

describe("round-trip", () => {
  it("verifyRoundTrip for all Q0 values", () => {
    for (let b = 0; b < 256; b++) {
      expect(verifyRoundTrip([b])).toBe(true);
    }
  });

  it("verifyRoundTrip for multi-byte", () => {
    expect(verifyRoundTrip([0x00, 0xff])).toBe(true);
    expect(verifyRoundTrip([0x55, 0xaa, 0x33])).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// contentAddress — deterministic projection
// ═══════════════════════════════════════════════════════════════════════════

describe("contentAddress", () => {
  const ring = Q0();

  it("deterministic: same input → same output", () => {
    expect(verifyDeterminism(ring, 42)).toBe(true);
    expect(verifyDeterminism(ring, 0)).toBe(true);
    expect(verifyDeterminism(ring, 255)).toBe(true);
  });

  it("produces correct IRI for value 0x55", () => {
    expect(contentAddress(ring, 0x55)).toBe("https://uor.foundation/u/U2855");
  });

  it("produces correct IRI for value 0", () => {
    expect(contentAddress(ring, 0)).toBe("https://uor.foundation/u/U2800");
  });

  it("Q1 produces 2-segment IRI", () => {
    const r = Q1();
    const iri = contentAddress(r, 0x55aa);
    expect(iri).toBe("https://uor.foundation/u/U2855U28AA");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// datumApiUrl
// ═══════════════════════════════════════════════════════════════════════════

describe("datumApiUrl", () => {
  it("builds correct URL", () => {
    expect(datumApiUrl(42, 8)).toBe(
      "https://api.uor.foundation/v1/kernel/schema/datum?value=42&n=8"
    );
  });
});
