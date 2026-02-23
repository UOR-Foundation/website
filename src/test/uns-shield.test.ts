import { describe, it, expect } from "vitest";
import {
  classifyByte,
  analyzePayload,
  analyzePayloadFast,
  buildDerivationTrace,
  detectInjection,
} from "@/modules/uns/shield";

// ═══════════════════════════════════════════════════════════════════════════
// Phase 2-A Tests — 12/12
// ═══════════════════════════════════════════════════════════════════════════

describe("UNS Shield — Phase 2-A: Partition Analysis", () => {
  // Test 1
  it("1. classifyByte(0) === 'EXTERIOR'", () => {
    expect(classifyByte(0)).toBe("EXTERIOR");
  });

  // Test 2
  it("2. classifyByte(1) === 'UNIT', classifyByte(255) === 'UNIT'", () => {
    expect(classifyByte(1)).toBe("UNIT");
    expect(classifyByte(255)).toBe("UNIT");
  });

  // Test 3
  it("3. classifyByte(3) === 'IRREDUCIBLE' (odd, not 1 or 255)", () => {
    expect(classifyByte(3)).toBe("IRREDUCIBLE");
    expect(classifyByte(5)).toBe("IRREDUCIBLE");
    expect(classifyByte(127)).toBe("IRREDUCIBLE");
    expect(classifyByte(253)).toBe("IRREDUCIBLE");
  });

  // Test 4 — 128 is EXTERIOR (spec/src/namespaces/partition.rs — ExteriorSet = {0, m/2})
  it("4. classifyByte(4) === 'REDUCIBLE' (even, not 0 or 128)", () => {
    expect(classifyByte(4)).toBe("REDUCIBLE");
    expect(classifyByte(2)).toBe("REDUCIBLE");
    expect(classifyByte(128)).toBe("EXTERIOR"); // P21: 128 is exterior (maximal zero divisor)
    expect(classifyByte(254)).toBe("REDUCIBLE");
  });

  // Test 5
  it("5. Sum of all four partition counts === payload.length", () => {
    const payload = new Uint8Array([0, 1, 2, 3, 4, 5, 128, 255]);
    const result = analyzePayload(payload);
    const sum = result.irreducible + result.reducible + result.unit + result.exterior;
    expect(sum).toBe(payload.length);
    expect(result.total).toBe(payload.length);
  });

  // Test 6
  it("6. Uniform 0x00 payload → action === 'BLOCK' (density=0)", () => {
    const payload = new Uint8Array(100).fill(0x00);
    const result = analyzePayload(payload);
    expect(result.density).toBe(0);
    expect(result.action).toBe("BLOCK");
  });

  // Test 7
  it("7. Uniform 0xFF payload → action not PASS (only UNIT bytes, density=0)", () => {
    const payload = new Uint8Array(100).fill(0xff);
    const result = analyzePayload(payload);
    expect(result.density).toBe(0);
    // 0xFF = 255 = UNIT, so density (irreducible/total) = 0
    expect(result.action).toBe("BLOCK");
  });

  // Test 8
  it("8. Random bytes payload → density typically 0.45-0.55 → action === 'PASS'", () => {
    // Construct a payload with known distribution matching random bytes
    // In Z/256Z: 126/256 ≈ 0.492 are irreducible
    const payload = new Uint8Array(256);
    for (let i = 0; i < 256; i++) payload[i] = i;
    const result = analyzePayload(payload);
    expect(result.density).toBeCloseTo(126 / 256, 2);
    expect(result.action).toBe("PASS");
  });

  // Test 9
  it("9. detectInjection returns false for uniform trace", () => {
    // All same byte → all same outputs per op → drift is constant (no spikes)
    const bytes = new Uint8Array(20).fill(42);
    const trace = buildDerivationTrace(bytes, ["neg", "bnot"]);
    // For uniform input, drift is constant so no value exceeds 3× mean
    expect(detectInjection(trace, trace.meanDrift)).toBe(false);
  });

  // Test 10
  it("10. detectInjection returns true when one step has 5× mean drift", () => {
    // Smooth sequence with one injected outlier
    const bytes = new Uint8Array(20);
    for (let i = 0; i < 20; i++) bytes[i] = 42;
    // Inject a maximally different byte
    bytes[10] = 42 ^ 0xff; // all bits flipped → max Hamming distance
    const trace = buildDerivationTrace(bytes, ["neg", "bnot"]);
    // Baseline from a clean trace
    const cleanBytes = new Uint8Array(20).fill(42);
    const cleanTrace = buildDerivationTrace(cleanBytes, ["neg", "bnot"]);
    expect(detectInjection(trace, cleanTrace.meanDrift || 1)).toBe(true);
  });

  // Test 11
  it("11. analyzePayloadFast produces same density as analyzePayload", () => {
    const payload = new Uint8Array(256);
    for (let i = 0; i < 256; i++) payload[i] = i;
    const full = analyzePayload(payload);
    const fast = analyzePayloadFast(payload);
    expect(fast.density).toBe(full.density);
    expect(fast.action).toBe(full.action);
    expect(fast.irreducible).toBe(full.irreducible);
    expect(fast.total).toBe(full.total);
  });

  // Test 12
  // P21: Canonical cardinalities (spec/src/namespaces/partition.rs)
  it("12. Partition cardinality: 126 irreducible + 126 reducible + 2 unit + 2 exterior = 256", () => {
    let irr = 0, red = 0, uni = 0, ext = 0;
    for (let b = 0; b < 256; b++) {
      switch (classifyByte(b)) {
        case "IRREDUCIBLE": irr++; break;
        case "REDUCIBLE":   red++; break;
        case "UNIT":        uni++; break;
        case "EXTERIOR":    ext++; break;
      }
    }
    expect(irr).toBe(126);
    expect(red).toBe(126);  // P21: 128 moved from reducible to exterior
    expect(uni).toBe(2);
    expect(ext).toBe(2);    // P21: ExteriorSet = {0, 128}
    expect(irr + red + uni + ext).toBe(256);
  });
});
