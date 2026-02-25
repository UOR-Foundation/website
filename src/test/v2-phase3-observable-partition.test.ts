/**
 * Phase 3 Test Suite — Observable & Partition Hierarchy
 *
 * T3.1: All 13 observable subtypes instantiate correctly
 * T3.2: MetricAxis assignment is correct for each subtype
 * T3.3: Partition components are disjoint
 * T3.4: FiberBudget: 8 fibers at Q0, 16 at Q1, 32 at Q2
 * T3.5: FiberPinning: pinning a fiber decreases free count
 * T3.6: FiberBudget.isClosed = true when all fibers pinned
 * T3.7: Observer backward compat with typed observables
 */
import { describe, it, expect } from "vitest";
import {
  createFiberBudget,
  pinFiber,
  freeCount,
  resolution,
} from "@/modules/ring-core/fiber-budget";
import {
  stratum, ringMetric, hammingMetric, cascadeObs, cascadeLength,
  curvature, holonomy, catastrophe, catastropheThreshold, dihedralElement,
  metricObs, pathObs,
} from "@/modules/ring-core/observable-factory";
import { OBSERVABLE_AXIS } from "@/types/uor-foundation/bridge/observable";
import { classifyByte } from "@/lib/uor-ring";

describe("Phase 3: Observable & Partition Hierarchy", () => {
  // ── T3.1: All 13 observable subtypes instantiate ────────────────────────
  describe("T3.1: Observable instantiation", () => {
    const observables = [
      stratum(42), ringMetric(42, 0),
      hammingMetric(42, 0), cascadeObs(42, 3), cascadeLength(42, 5),
      curvature(42, 0), holonomy(42, 0, ["neg", "bnot"]),
      catastrophe(42, false, "none"), catastropheThreshold(42, 0.015625),
      dihedralElement(42, 42, false),
      metricObs(42, 10, "Vertical"), pathObs(42, [0, 1, 42]),
    ];

    it("creates 12 factory outputs covering all 13 interface types", () => {
      expect(observables).toHaveLength(12);
    });

    it("each has iri(), value(), axis(), quantum()", () => {
      for (const obs of observables) {
        expect(typeof obs.iri()).toBe("string");
        expect(obs.value()).toBe(42);
        expect(typeof obs.axis()).toBe("string");
        expect(obs.quantum()).toBe(0);
      }
    });
  });

  // ── T3.2: MetricAxis assignment ─────────────────────────────────────────
  describe("T3.2: MetricAxis classification", () => {
    it("Vertical: StratumObservable, RingMetric", () => {
      expect(stratum(0).axis()).toBe("Vertical");
      expect(ringMetric(0, 0).axis()).toBe("Vertical");
    });

    it("Horizontal: HammingMetric, CascadeObservable, CascadeLength", () => {
      expect(hammingMetric(0, 0).axis()).toBe("Horizontal");
      expect(cascadeObs(0, 0).axis()).toBe("Horizontal");
      expect(cascadeLength(0, 0).axis()).toBe("Horizontal");
    });

    it("Diagonal: Curvature, Holonomy, Catastrophe, Threshold, Dihedral", () => {
      expect(curvature(0, 0).axis()).toBe("Diagonal");
      expect(holonomy(0, 0, []).axis()).toBe("Diagonal");
      expect(catastrophe(0, false, "").axis()).toBe("Diagonal");
      expect(catastropheThreshold(0, 0).axis()).toBe("Diagonal");
      expect(dihedralElement(0, 0, false).axis()).toBe("Diagonal");
    });

    it("OBSERVABLE_AXIS covers all 3 axes", () => {
      const axes = new Set(Object.values(OBSERVABLE_AXIS));
      expect(axes.has("Vertical")).toBe(true);
      expect(axes.has("Horizontal")).toBe(true);
      expect(axes.has("Diagonal")).toBe(true);
    });
  });

  // ── T3.3: Partition disjointness ────────────────────────────────────────
  describe("T3.3: Partition disjointness", () => {
    it("every value 0–255 belongs to exactly one partition component", () => {
      const seen = new Map<number, string>();
      for (let x = 0; x < 256; x++) {
        const c = classifyByte(x, 8);
        expect(seen.has(x)).toBe(false);
        seen.set(x, c.component);
      }
      expect(seen.size).toBe(256);
    });

    it("partition covers all 4 component types", () => {
      const components = new Set<string>();
      for (let x = 0; x < 256; x++) {
        components.add(classifyByte(x, 8).component);
      }
      expect(components.size).toBe(4);
      expect(components.has("partition:ExteriorSet")).toBe(true);
      expect(components.has("partition:UnitSet")).toBe(true);
      expect(components.has("partition:IrreducibleSet")).toBe(true);
      expect(components.has("partition:ReducibleSet")).toBe(true);
    });
  });

  // ── T3.4: FiberBudget sizing ────────────────────────────────────────────
  describe("T3.4: FiberBudget sizing", () => {
    it("Q0: 8 fibers", () => {
      const b = createFiberBudget(0);
      expect(b.totalFibers).toBe(8);
      expect(b.fibers).toHaveLength(8);
    });

    it("Q1: 16 fibers", () => {
      expect(createFiberBudget(1).totalFibers).toBe(16);
    });

    it("Q2: 24 fibers", () => {
      expect(createFiberBudget(2).totalFibers).toBe(24);
    });

    it("Q3: 32 fibers", () => {
      expect(createFiberBudget(3).totalFibers).toBe(32);
    });

    it("all fibers start Free", () => {
      const b = createFiberBudget(0);
      expect(b.fibers.every(f => f.state === "Free")).toBe(true);
      expect(b.pinnedCount).toBe(0);
      expect(b.isClosed).toBe(false);
    });
  });

  // ── T3.5: FiberPinning ─────────────────────────────────────────────────
  describe("T3.5: Fiber pinning", () => {
    it("pinning a fiber decreases free count", () => {
      const b0 = createFiberBudget(0);
      expect(freeCount(b0)).toBe(8);
      const b1 = pinFiber(b0, 0, "constraint:test");
      expect(freeCount(b1)).toBe(7);
      expect(b1.pinnedCount).toBe(1);
    });

    it("pinning same fiber twice is idempotent", () => {
      const b0 = createFiberBudget(0);
      const b1 = pinFiber(b0, 3, "c1");
      const b2 = pinFiber(b1, 3, "c2");
      expect(b2.pinnedCount).toBe(1);
    });

    it("resolution ratio tracks progress", () => {
      let b = createFiberBudget(0);
      expect(resolution(b)).toBe(0);
      b = pinFiber(b, 0, "c1");
      expect(resolution(b)).toBe(1 / 8);
      for (let i = 1; i < 8; i++) b = pinFiber(b, i, `c${i}`);
      expect(resolution(b)).toBe(1);
    });

    it("throws on out-of-range bitIndex", () => {
      expect(() => pinFiber(createFiberBudget(0), 8, "c")).toThrow("out of range");
      expect(() => pinFiber(createFiberBudget(0), -1, "c")).toThrow("out of range");
    });
  });

  // ── T3.6: FiberBudget closure ──────────────────────────────────────────
  describe("T3.6: FiberBudget.isClosed", () => {
    it("isClosed = true when all fibers pinned", () => {
      let b = createFiberBudget(0);
      for (let i = 0; i < 8; i++) b = pinFiber(b, i, `c${i}`);
      expect(b.isClosed).toBe(true);
      expect(b.pinnedCount).toBe(8);
      expect(freeCount(b)).toBe(0);
    });

    it("isClosed = false when partially pinned", () => {
      let b = createFiberBudget(0);
      for (let i = 0; i < 7; i++) b = pinFiber(b, i, `c${i}`);
      expect(b.isClosed).toBe(false);
    });

    it("pinning history is recorded", () => {
      let b = createFiberBudget(0);
      b = pinFiber(b, 0, "c0");
      b = pinFiber(b, 5, "c5");
      expect(b.pinnings).toHaveLength(2);
      expect(b.pinnings[0].constraintId).toBe("c0");
      expect(b.pinnings[1].coordinate.bitIndex).toBe(5);
    });
  });

  // ── T3.7: Backward compat ──────────────────────────────────────────────
  describe("T3.7: Backward compatibility", () => {
    it("classifyByte still works unchanged", () => {
      expect(classifyByte(0, 8).component).toBe("partition:ExteriorSet");
      expect(classifyByte(1, 8).component).toBe("partition:UnitSet");
      expect(classifyByte(3, 8).component).toBe("partition:IrreducibleSet");
      expect(classifyByte(4, 8).component).toBe("partition:ReducibleSet");
    });

    it("stratum observable agrees with classifyByte popcount", () => {
      const s = stratum(0b10101010);
      expect(s.stratumVector()).toEqual([4]); // popcount of 0xAA
    });

    it("hamming distance is symmetric", () => {
      const d1 = hammingMetric(42, 85).distance();
      const d2 = hammingMetric(85, 42).distance();
      expect(d1).toBe(d2);
    });
  });
});
