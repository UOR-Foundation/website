/**
 * Belt ↔ Fiber Bijection Test Suite
 * ═══════════════════════════════════
 * Verifies 48 pages × 256 bytes = 96 vertices × 128 exterior = 12,288.
 */
import { describe, it, expect } from "vitest";
import {
  beltToFiber,
  fiberToBelt,
  classifyByte,
  slotToBelt,
  beltToSlot,
  slotToFiber,
  fiberToSlot,
  buildBeltFiberBijection,
  runBeltFiberVerification,
  BELT_PAGES,
  BYTES_PER_PAGE,
  BELT_TOTAL,
  EXTERIOR_PER_VERTEX,
  FIBER_TOTAL,
} from "@/modules/atlas/belt-fiber";
import { ATLAS_VERTEX_COUNT } from "@/modules/atlas/atlas";

describe("Phase 4: Belt ↔ Fiber Bijection", () => {
  it("BELT_TOTAL = FIBER_TOTAL = 12,288", () => {
    expect(BELT_TOTAL).toBe(12288);
    expect(FIBER_TOTAL).toBe(12288);
    expect(BELT_TOTAL).toBe(FIBER_TOTAL);
  });

  it("48 pages × 256 bytes = 12,288", () => {
    expect(BELT_PAGES * BYTES_PER_PAGE).toBe(12288);
  });

  it("96 vertices × 128 exterior = 12,288", () => {
    expect(ATLAS_VERTEX_COUNT * EXTERIOR_PER_VERTEX).toBe(12288);
  });

  it("belt→fiber→belt round-trip for all 12,288 slots", () => {
    for (let slot = 0; slot < BELT_TOTAL; slot++) {
      const belt = slotToBelt(slot);
      const fiber = beltToFiber(belt);
      const rt = fiberToBelt(fiber);
      expect(rt.page).toBe(belt.page);
      expect(rt.byte).toBe(belt.byte);
    }
  });

  it("fiber→belt→fiber round-trip (sampled)", () => {
    // Sample every 8th vertex to keep test fast
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v += 8) {
      for (let e = 0; e < EXTERIOR_PER_VERTEX; e++) {
        const belt = fiberToBelt({ vertex: v, exterior: e });
        const rt = beltToFiber(belt);
        expect(rt.vertex).toBe(v);
        expect(rt.exterior).toBe(e);
      }
    }
  });

  it("literal backend (byte < 128) → primary vertex", () => {
    const fiber = beltToFiber({ page: 0, byte: 42 });
    const fiber2 = beltToFiber({ page: 0, byte: 0 });
    expect(fiber.vertex).toBe(fiber2.vertex); // same primary vertex
    expect(fiber.exterior).toBe(42);
  });

  it("operational backend (byte ≥ 128) → mirror vertex", () => {
    const primary = beltToFiber({ page: 0, byte: 0 });
    const mirror = beltToFiber({ page: 0, byte: 128 });
    expect(mirror.vertex).not.toBe(primary.vertex);
    expect(mirror.exterior).toBe(0);
  });

  it("dual semantics classify correctly", () => {
    expect(classifyByte(0).backend).toBe("literal");
    expect(classifyByte(127).backend).toBe("literal");
    expect(classifyByte(128).backend).toBe("operational");
    expect(classifyByte(255).backend).toBe("operational");
    expect(classifyByte(200).exteriorIndex).toBe(72);
  });

  it("all fiber addresses are unique (injection)", () => {
    const set = new Set<string>();
    for (let slot = 0; slot < BELT_TOTAL; slot++) {
      const f = beltToFiber(slotToBelt(slot));
      set.add(`${f.vertex}:${f.exterior}`);
    }
    expect(set.size).toBe(BELT_TOTAL);
  });

  it("buildBeltFiberBijection verifies", () => {
    const bij = buildBeltFiberBijection();
    expect(bij.bijectionVerified).toBe(true);
    expect(bij.totalSlots).toBe(12288);
    expect(bij.pageMirrorPairs.length).toBe(48);
  });

  describe("Full verification report", () => {
    it("all 12 tests pass", () => {
      const report = runBeltFiberVerification();
      for (const test of report.tests) {
        expect(test.holds, `"${test.name}": expected ${test.expected}, got ${test.actual}`).toBe(true);
      }
      expect(report.allPassed).toBe(true);
    });
  });
});
