import { describe, it, expect } from "vitest";
import { MUL_TABLE, BIT_TABLE, BIT_TABLE_Q4_BYTES } from "./hologram-matmul";

describe("BIT_TABLE", () => {
  it("has 8 planes of 256 entries each", () => {
    expect(BIT_TABLE.planes.length).toBe(8);
    for (const plane of BIT_TABLE.planes) {
      expect(plane.length).toBe(256);
    }
  });

  it("totalBytes is 2048 (2KB)", () => {
    expect(BIT_TABLE.totalBytes).toBe(2048);
  });

  it("Q4 bytes is 1024 (<1KB)", () => {
    expect(BIT_TABLE_Q4_BYTES).toBe(1024);
  });

  it("multiply matches MUL_TABLE for all 65,536 products", () => {
    const result = BIT_TABLE.verify();
    expect(result.ok).toBe(true);
    expect(result.mismatches).toBe(0);
    expect(result.checked).toBe(65536);
  });

  it("quantizedMultiply matches for 4-bit weights (0-15)", () => {
    let mismatches = 0;
    for (let a = 0; a < 256; a++) {
      for (let w = 0; w < 16; w++) {
        const expected = MUL_TABLE[(a << 8) | w];
        const got = BIT_TABLE.quantizedMultiply(a, w, 4);
        if (got !== expected) mismatches++;
      }
    }
    expect(mismatches).toBe(0);
  });

  it("quantizedMatVec produces correct results", () => {
    const rows = 4, cols = 4;
    const weights = new Uint8Array([1, 2, 3, 0, 0, 1, 0, 2, 3, 3, 1, 1, 2, 0, 2, 1]);
    const activations = new Uint8Array([10, 20, 30, 40]);
    const result = BIT_TABLE.quantizedMatVec(weights, activations, rows, cols, 4);

    // Manual: row0 = 1*10 + 2*20 + 3*30 + 0*40 = 10+40+90 = 140
    expect(result[0]).toBe(140 & 0xff);
  });

  it("plane values are correct: plane_i[a] = (a * 2^i) mod 256", () => {
    for (let i = 0; i < 8; i++) {
      const shift = 1 << i;
      for (let a = 0; a < 256; a++) {
        expect(BIT_TABLE.planes[i][a]).toBe((a * shift) & 0xff);
      }
    }
  });
});
