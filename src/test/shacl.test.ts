import { describe, it, expect } from "vitest";
import { Q0 } from "@/modules/ring-core/ring";
import { DatumShape, DerivationShape, CertificateShape, PartitionShape } from "@/modules/shacl/shapes";
import { validate, validateOnWrite } from "@/modules/shacl/validator";
import { runConformanceSuite } from "@/modules/shacl/conformance";
import { computePartition } from "@/modules/resolver/partition";
import { contentAddress, bytesToGlyph } from "@/modules/identity";
import { computeTriad } from "@/modules/triad";
import { fromBytes } from "@/modules/ring-core/ring";

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

describe("conformance suite", () => {
  it("all 7 tests pass for Q0", () => {
    const result = runConformanceSuite(ring);
    expect(result.tests).toHaveLength(7);
    expect(result.allPassed).toBe(true);
    for (const t of result.tests) {
      expect(t.passed).toBe(true);
    }
  });
});
