import { describe, it, expect } from "vitest";
import { buildCoQuantLut, coQuantMatVecCpu, quantize, MUL_TABLE } from "./hologram-matmul";

describe("Discovery 3 — Co-Quantized 2D LUT", () => {
  it("buildCoQuantLut(4) produces 16×16 = 256-byte table", () => {
    const lut = buildCoQuantLut(4);
    expect(lut.levels).toBe(16);
    expect(lut.sizeBytes).toBe(256);
    expect(lut.table.length).toBe(256);
  });

  it("buildCoQuantLut(2) produces 4×4 = 16-byte table", () => {
    const lut = buildCoQuantLut(2);
    expect(lut.levels).toBe(4);
    expect(lut.sizeBytes).toBe(16);
  });

  it("buildCoQuantLut(8) matches MUL_TABLE for all 65536 products", () => {
    const lut = buildCoQuantLut(8);
    expect(lut.sizeBytes).toBe(65536);
    let mismatches = 0;
    for (let a = 0; a < 256; a++) {
      for (let b = 0; b < 256; b++) {
        if (lut.lookup(a, b) !== MUL_TABLE[(a << 8) | b]) mismatches++;
      }
    }
    expect(mismatches).toBe(0);
  });

  it("Q4 lookup matches manual computation", () => {
    const lut = buildCoQuantLut(4);
    // 3 × 5 = 15, 7 × 2 = 14, 15 × 15 = 225
    expect(lut.lookup(3, 5)).toBe(15);
    expect(lut.lookup(7, 2)).toBe(14);
    expect(lut.lookup(15, 15)).toBe((15 * 15) & 0xff); // 225
  });

  it("quantize maps [0,255] → [0,15] for Q=4", () => {
    const data = new Uint8Array([0, 16, 128, 240, 255]);
    const q = quantize(data, 4);
    expect(q[0]).toBe(0);   // 0 >> 4
    expect(q[1]).toBe(1);   // 16 >> 4
    expect(q[2]).toBe(8);   // 128 >> 4
    expect(q[3]).toBe(15);  // 240 >> 4
    expect(q[4]).toBe(15);  // 255 >> 4
  });

  it("coQuantMatVecCpu produces correct dot products", () => {
    const lut = buildCoQuantLut(4);
    // W = [[1, 2], [3, 4]], x = [5, 6]
    // y[0] = 1*5 + 2*6 = 5 + 12 = 17
    // y[1] = 3*5 + 4*6 = 15 + 24 = 39
    const w = new Uint8Array([1, 2, 3, 4]);
    const x = new Uint8Array([5, 6]);
    const y = coQuantMatVecCpu(lut, w, x, 2, 2);
    expect(y[0]).toBe(17);
    expect(y[1]).toBe(39);
  });

  it("coQuantMatVecCpu handles larger dot product with mod 256", () => {
    const lut = buildCoQuantLut(4);
    // 15 * 15 = 225, four of them = 900 & 0xFF = 132
    const w = new Uint8Array([15, 15, 15, 15]);
    const x = new Uint8Array([15, 15, 15, 15]);
    const y = coQuantMatVecCpu(lut, w, x, 1, 4);
    expect(y[0]).toBe(900 & 0xff); // 132
  });
});
