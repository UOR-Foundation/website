import { describe, it, expect } from "vitest";
import { Q0, Q1 } from "@/modules/ring-core/ring";
import { resolve, classifyElement } from "@/modules/resolver/resolver";
import { computePartition } from "@/modules/resolver/partition";
import { correlate } from "@/modules/resolver/correlation";

describe("resolve", () => {
  const ring = Q0();

  it("resolves value 42 to correct IRI", () => {
    const r = resolve(ring, 42);
    expect(r.canonicalIri).toBe("https://uor.foundation/u/U282A");
    expect(r.strategy).toBe("dihedral-factorization");
    expect(r.trace.length).toBeGreaterThan(0);
  });

  it("resolves 0 as ExteriorSet", () => {
    const r = resolve(ring, 0);
    expect(r.partition.component).toBe("partition:ExteriorSet");
  });

  it("resolves 1 as UnitSet", () => {
    const r = resolve(ring, 1);
    expect(r.partition.component).toBe("partition:UnitSet");
  });

  it("resolves 3 as IrreducibleSet (odd, not unit)", () => {
    const r = resolve(ring, 3);
    expect(r.partition.component).toBe("partition:IrreducibleSet");
  });

  it("resolves 4 as ReducibleSet (even, not zero/midpoint)", () => {
    const r = resolve(ring, 4);
    expect(r.partition.component).toBe("partition:ReducibleSet");
  });
});

describe("computePartition", () => {
  const ring = Q0();

  it("partitions Q0 into 256 elements total", () => {
    const p = computePartition(ring);
    const total = p.units.length + p.exterior.length + p.irreducible.length + p.reducible.length;
    expect(total).toBe(256);
  });

  it("has correct unit count (odd numbers: 1 and 255 are units)", () => {
    const p = computePartition(ring);
    expect(p.units.includes(1)).toBe(true);
    expect(p.units.includes(255)).toBe(true);
  });

  it("exterior includes 0 and 128", () => {
    const p = computePartition(ring);
    expect(p.exterior.includes(0)).toBe(true);
    expect(p.exterior.includes(128)).toBe(true);
  });

  it("graphClosed mode verifies all closure edges", () => {
    const p = computePartition(ring, undefined, "graphClosed");
    expect(p.closureVerified).toBe(true);
    expect(p.closureErrors).toEqual([]);
  });

  it("sets are disjoint", () => {
    const p = computePartition(ring);
    const all = [...p.units, ...p.exterior, ...p.irreducible, ...p.reducible];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("correlate", () => {
  const ring = Q0();

  it("identical values have fidelity 1.0", () => {
    const c = correlate(ring, 42, 42);
    expect(c.fidelity).toBe(1.0);
    expect(c.totalDifference).toBe(0);
  });

  it("complementary values have fidelity 0.0", () => {
    // 0x00 vs 0xFF — all bits differ
    const c = correlate(ring, 0x00, 0xff);
    expect(c.fidelity).toBe(0.0);
    expect(c.totalDifference).toBe(8);
  });

  it("0x55 vs 0xAA differ by 8 bits (complementary)", () => {
    const c = correlate(ring, 0x55, 0xaa);
    expect(c.fidelity).toBe(0.0);
    expect(c.totalDifference).toBe(8);
  });

  it("adjacent values have high fidelity", () => {
    const c = correlate(ring, 42, 43);
    expect(c.fidelity).toBeGreaterThan(0.8);
  });

  it("fidelity is symmetric", () => {
    const c1 = correlate(ring, 100, 200);
    const c2 = correlate(ring, 200, 100);
    expect(c1.fidelity).toBe(c2.fidelity);
  });
});
