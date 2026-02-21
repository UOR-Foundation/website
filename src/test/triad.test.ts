import { describe, it, expect } from "vitest";
import {
  computeTriad,
  popcount,
  basisElements,
  stratumLevel,
  stratumDensity,
} from "@/modules/triad";

// ═══════════════════════════════════════════════════════════════════════════
// popcount (re-exported bytePopcount)
// ═══════════════════════════════════════════════════════════════════════════

describe("popcount", () => {
  it("0x00 → 0", () => expect(popcount(0x00)).toBe(0));
  it("0xFF → 8", () => expect(popcount(0xff)).toBe(8));
  it("0b10101010 → 4", () => expect(popcount(0b10101010)).toBe(4));
  it("0x01 → 1", () => expect(popcount(0x01)).toBe(1));
});

// ═══════════════════════════════════════════════════════════════════════════
// basisElements (re-exported byteBasis)
// ═══════════════════════════════════════════════════════════════════════════

describe("basisElements", () => {
  it("0b1010 → [1, 3]", () => expect(basisElements(0b1010)).toEqual([1, 3]));
  it("0x00 → []", () => expect(basisElements(0x00)).toEqual([]));
  it("0xFF → [0..7]", () => expect(basisElements(0xff)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]));
});

// ═══════════════════════════════════════════════════════════════════════════
// computeTriad
// ═══════════════════════════════════════════════════════════════════════════

describe("computeTriad", () => {
  it("single byte: 0x55 = 01010101", () => {
    const t = computeTriad([0x55]);
    expect(t.datum).toEqual([0x55]);
    expect(t.stratum).toEqual([4]);
    expect(t.spectrum).toEqual([[0, 2, 4, 6]]);
    expect(t.totalStratum).toBe(4);
  });

  it("zero byte", () => {
    const t = computeTriad([0x00]);
    expect(t.stratum).toEqual([0]);
    expect(t.spectrum).toEqual([[]]);
    expect(t.totalStratum).toBe(0);
  });

  it("multi-byte Q1", () => {
    const t = computeTriad([0xff, 0x00]);
    expect(t.stratum).toEqual([8, 0]);
    expect(t.totalStratum).toBe(8);
  });

  it("preserves datum reference", () => {
    const bytes = [0x42];
    const t = computeTriad(bytes);
    expect(t.datum).toBe(bytes);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// stratumLevel — semantic classification
// ═══════════════════════════════════════════════════════════════════════════

describe("stratumLevel", () => {
  it("0/8 → low (broad concept)", () => expect(stratumLevel(0, 8)).toBe("low"));
  it("1/8 → low", () => expect(stratumLevel(1, 8)).toBe("low"));
  it("2/8 → low", () => expect(stratumLevel(2, 8)).toBe("low"));
  it("3/8 → medium", () => expect(stratumLevel(3, 8)).toBe("medium"));
  it("4/8 → medium", () => expect(stratumLevel(4, 8)).toBe("medium"));
  it("5/8 → medium", () => expect(stratumLevel(5, 8)).toBe("medium"));
  it("6/8 → high (specific)", () => expect(stratumLevel(6, 8)).toBe("high"));
  it("8/8 → high", () => expect(stratumLevel(8, 8)).toBe("high"));
  it("0 maxBits → low", () => expect(stratumLevel(0, 0)).toBe("low"));
});

// ═══════════════════════════════════════════════════════════════════════════
// stratumDensity
// ═══════════════════════════════════════════════════════════════════════════

describe("stratumDensity", () => {
  it("4/8 → 50%", () => expect(stratumDensity(4, 8)).toBe(50));
  it("8/8 → 100%", () => expect(stratumDensity(8, 8)).toBe(100));
  it("0/8 → 0%", () => expect(stratumDensity(0, 8)).toBe(0));
  it("0 maxBits → 0%", () => expect(stratumDensity(0, 0)).toBe(0));
});

// ═══════════════════════════════════════════════════════════════════════════
// Coherence: computeTriad matches ring-core stratum/spectrum
// ═══════════════════════════════════════════════════════════════════════════

describe("coherence with ring-core", () => {
  it("computeTriad matches UORRing.stratum and UORRing.spectrum for all Q0", () => {
    const { Q0 } = require("@/modules/ring-core");
    const ring = Q0();
    for (let x = 0; x < 256; x++) {
      const bytes = ring.toBytes(x);
      const triad = computeTriad(bytes);
      expect(triad.totalStratum).toBe(ring.stratum(bytes));
      expect(triad.spectrum).toEqual(ring.spectrum(bytes));
    }
  });
});
