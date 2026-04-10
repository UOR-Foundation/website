import { describe, it, expect } from "vitest";
import { Q0 } from "@/modules/ring-core/ring";
import { DatumShape, PartitionShape } from "@/modules/shacl/shapes";
import { validateOnWrite } from "@/modules/shacl/validator";
import { runConformanceSuite } from "@/modules/shacl/conformance";
import { CANONICAL_PARTITION } from "@/modules/shacl/conformance-partition";
import { computePartition } from "@/modules/resolver/partition";
import { contentAddress, bytesToGlyph } from "@/modules/identity";
import { computeTriad } from "@/modules/triad";
import { fromBytes } from "@/modules/ring-core/ring";
import { classifyByte } from "@/lib/uor-ring";

const ring = Q0();

describe("DatumShape", () => {
  it("validates a well-formed datum", () => {
    const bytes = ring.toBytes(42);
    const triad = computeTriad(bytes);
    const datum = {
      iri: contentAddress(ring, 42),
      quantum: 0,
      value: 42,
      bytes,
      stratum: triad.stratum,
      total_stratum: triad.totalStratum,
      spectrum: triad.spectrum,
      glyph: bytesToGlyph(bytes),
      inverse_iri: contentAddress(ring, fromBytes(ring.neg(bytes))),
      not_iri: contentAddress(ring, fromBytes(ring.bnot(bytes))),
      succ_iri: contentAddress(ring, fromBytes(ring.succ(bytes))),
      pred_iri: contentAddress(ring, fromBytes(ring.pred(bytes))),
    };
    const r = DatumShape(datum);
    expect(r.conforms).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it("rejects datum without IRI", () => {
    const r = DatumShape({ quantum: 0, bytes: [42] });
    expect(r.conforms).toBe(false);
  });
});

describe("PartitionShape", () => {
  it("validates Q0 partition", () => {
    const p = computePartition(ring);
    const r = PartitionShape({ units: p.units, exterior: p.exterior, irreducible: p.irreducible, reducible: p.reducible, bits: 8 });
    expect(r.conforms).toBe(true);
  });
});

describe("validateOnWrite", () => {
  it("warns on datum without derivation or grade D", () => {
    const r = validateOnWrite({ iri: "https://uor.foundation/u/test", bytes: [0], quantum: 0 });
    expect(r.conforms).toBe(false);
  });
});

describe("Partition Cardinality (P21 Resolution)", () => {
  it("exterior = {0, 128} → cardinality 2", () => {
    expect(classifyByte(0, 8).component).toBe("partition:ExteriorSet");
    expect(classifyByte(128, 8).component).toBe("partition:ExteriorSet");
    expect(CANONICAL_PARTITION.exterior).toBe(2);
  });

  it("four sets sum to 256", () => {
    const p = computePartition(ring);
    expect(p.units.length + p.exterior.length + p.irreducible.length + p.reducible.length).toBe(256);
  });

  it("canonical cardinalities match", () => {
    const p = computePartition(ring);
    expect(p.exterior.length).toBe(CANONICAL_PARTITION.exterior);
    expect(p.units.length).toBe(CANONICAL_PARTITION.unit);
    expect(p.irreducible.length).toBe(CANONICAL_PARTITION.irreducible);
    expect(p.reducible.length).toBe(CANONICAL_PARTITION.reducible);
  });
});

describe("Full Conformance Suite (P21)", () => {
  it("all tests pass with zero failures", async () => {
    const result = await runConformanceSuite();
    
    // Log failures for debugging
    for (const r of result.results) {
      if (!r.passed) {
        console.error(`FAIL ${r.testId}: expected=${JSON.stringify(r.expected)}, actual=${JSON.stringify(r.actual)}`);
      }
    }

    expect(result.allPassed).toBe(true);
    expect(result.failed).toBe(0);
    expect(result.total).toBeGreaterThanOrEqual(35); // 8+1+9+6+4+4+3 = 35
  });

  it("has all 7 groups", async () => {
    const result = await runConformanceSuite();
    expect(result.groups).toHaveLength(7);
    const ids = result.groups.map(g => g.id);
    expect(ids).toContain("ring");
    expect(ids).toContain("criticalIdentity");
    expect(ids).toContain("partition");
    expect(ids).toContain("resolver");
    expect(ids).toContain("certificates");
    expect(ids).toContain("endToEnd");
    expect(ids).toContain("involutions");
  });
});
