/**
 * Phase 2 Test Suite — Ring & Morphism Alignment
 *
 * T2.1: All 10 PrimitiveOps callable and correct at Q0
 * T2.2: GeometricCharacter assigned to each op
 * T2.3: Critical identity holds with expanded op set
 * T2.4: Isometry extends Transform (structural check)
 * T2.5: CompositionLaw: compose(neg, bnot) = succ
 * T2.6: DihedralGroup: neg and bnot generate D_{256}
 * T2.7: Cross-quantum: all 10 ops work at Q0/Q1/Q2
 */
import { describe, it, expect } from "vitest";
import { UORRing, Q0, Q1, Q2, fromBytes } from "@/modules/ring-core/ring";
import { OP_TABLE, OP_META, verifyGeometryAlignment, dihedralOrder } from "@/modules/ring-core/op-meta";
import { compose, verifyCriticalComposition, verifyCriticalCompositionAll } from "@/modules/ring-core/compose";
import { OP_GEOMETRY, CRITICAL_IDENTITY, D2N } from "@/types/uor-foundation/kernel/op";
import { CRITICAL_COMPOSITION } from "@/types/uor-foundation/user/morphism";
import type { Isometry, Transform } from "@/types/uor-foundation/user/morphism";
import type { PrimitiveOp, GeometricCharacter } from "@/types/uor-foundation/enums";

describe("Phase 2: Ring & Morphism Alignment", () => {
  // ── T2.1: All 10 PrimitiveOps callable at Q0 ────────────────────────────
  describe("T2.1: 10 PrimitiveOps at Q0", () => {
    const ring = Q0();

    it("neg(42) = 214", () => expect(fromBytes(ring.neg(ring.toBytes(42)))).toBe(214));
    it("bnot(42) = 213", () => expect(fromBytes(ring.bnot(ring.toBytes(42)))).toBe(213));
    it("succ(255) = 0", () => expect(fromBytes(ring.succ(ring.toBytes(255)))).toBe(0));
    it("pred(0) = 255", () => expect(fromBytes(ring.pred(ring.toBytes(0)))).toBe(255));
    it("add(200, 100) = 44", () => expect(fromBytes(ring.add(ring.toBytes(200), ring.toBytes(100)))).toBe(44));
    it("sub(10, 20) = 246", () => expect(fromBytes(ring.sub(ring.toBytes(10), ring.toBytes(20)))).toBe(246));
    it("mul(16, 16) = 0", () => expect(fromBytes(ring.mul(ring.toBytes(16), ring.toBytes(16)))).toBe(0));
    it("xor(0xAA, 0x55) = 0xFF", () => expect(fromBytes(ring.xor(ring.toBytes(0xAA), ring.toBytes(0x55)))).toBe(0xFF));
    it("and(0xAA, 0x0F) = 0x0A", () => expect(fromBytes(ring.band(ring.toBytes(0xAA), ring.toBytes(0x0F)))).toBe(0x0A));
    it("or(0xA0, 0x05) = 0xA5", () => expect(fromBytes(ring.bor(ring.toBytes(0xA0), ring.toBytes(0x05)))).toBe(0xA5));
  });

  // ── T2.2: GeometricCharacter assignment ──────────────────────────────────
  describe("T2.2: GeometricCharacter", () => {
    it("all 10 ops have geometry in OP_TABLE", () => {
      expect(OP_TABLE).toHaveLength(10);
      for (const m of OP_TABLE) {
        expect(m.geometry).toBeDefined();
        expect(typeof m.geometry).toBe("string");
      }
    });

    it("OP_META matches OP_GEOMETRY from foundation", () => {
      expect(verifyGeometryAlignment()).toBe(true);
    });

    it("neg = RingReflection", () => expect(OP_META.Neg.geometry).toBe("RingReflection"));
    it("bnot = HypercubeReflection", () => expect(OP_META.Bnot.geometry).toBe("HypercubeReflection"));
    it("succ = Rotation", () => expect(OP_META.Succ.geometry).toBe("Rotation"));
    it("pred = RotationInverse", () => expect(OP_META.Pred.geometry).toBe("RotationInverse"));
    it("xor = HypercubeTranslation", () => expect(OP_META.Xor.geometry).toBe("HypercubeTranslation"));
    it("and = HypercubeProjection", () => expect(OP_META.And.geometry).toBe("HypercubeProjection"));
    it("or = HypercubeJoin", () => expect(OP_META.Or.geometry).toBe("HypercubeJoin"));

    it("involutions: neg, bnot, xor are involutions", () => {
      expect(OP_META.Neg.involution).toBe(true);
      expect(OP_META.Bnot.involution).toBe(true);
      expect(OP_META.Xor.involution).toBe(true);
    });

    it("non-involutions: succ, add, mul are not", () => {
      expect(OP_META.Succ.involution).toBe(false);
      expect(OP_META.Add.involution).toBe(false);
      expect(OP_META.Mul.involution).toBe(false);
    });
  });

  // ── T2.3: Critical identity with expanded op set ─────────────────────────
  describe("T2.3: Critical identity", () => {
    it("CRITICAL_IDENTITY named individual matches spec", () => {
      expect(CRITICAL_IDENTITY["@id"]).toBe("op:critical_identity");
      expect(CRITICAL_IDENTITY.equation).toBe("neg(bnot(x)) = succ(x)");
      expect(CRITICAL_IDENTITY.lhs).toBe("Succ");
      expect(CRITICAL_IDENTITY.rhs).toEqual(["Neg", "Bnot"]);
    });

    it("holds exhaustively at Q0", () => {
      const ring = Q0();
      const result = ring.verify();
      expect(result.verified).toBe(true);
      expect(result.failures).toHaveLength(0);
    });
  });

  // ── T2.4: Isometry extends Transform (structural) ───────────────────────
  describe("T2.4: Morphism hierarchy", () => {
    it("Isometry structurally extends Transform", () => {
      // Type-level check: an Isometry must satisfy Transform
      const iso: Isometry = {
        transformId: () => "test",
        sourceIri: () => "urn:source",
        targetIri: () => "urn:target",
        sourceQuantum: () => 0,
        targetQuantum: () => 0,
        fidelityPreserved: () => true as const,
        verifyRoundTrip: () => true,
      };
      // Assignable to Transform
      const t: Transform = iso;
      expect(t.fidelityPreserved()).toBe(true);
    });

    it("CRITICAL_COMPOSITION matches spec", () => {
      expect(CRITICAL_COMPOSITION["@id"]).toBe("morphism:critical_composition");
      expect(CRITICAL_COMPOSITION.lawComponents).toEqual(["Neg", "Bnot"]);
      expect(CRITICAL_COMPOSITION.lawResult).toBe("Succ");
      expect(CRITICAL_COMPOSITION.equation).toBe("neg ∘ bnot = succ");
    });
  });

  // ── T2.5: Composition law: compose(neg, bnot) = succ ────────────────────
  describe("T2.5: Composition", () => {
    it("compose(neg, bnot)(x) = succ(x) for all x ∈ R_8", () => {
      const result = verifyCriticalCompositionAll(Q0());
      expect(result.verified).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it("compose(neg, bnot)(42) = succ(42) = 43", () => {
      expect(verifyCriticalComposition(Q0(), 42)).toBe(true);
    });
  });

  // ── T2.6: Dihedral group D_{2^n} ────────────────────────────────────────
  describe("T2.6: DihedralGroup", () => {
    it("D2N named individual matches spec", () => {
      expect(D2N["@id"]).toBe("op:d2n");
      expect(D2N.generatedBy).toEqual(["Neg", "Bnot"]);
      expect(D2N.presentation).toBe("⟨r, s | r^{2^n} = s² = e, srs = r⁻¹⟩");
    });

    it("D_{256} has order 512 at Q0 (8 bits)", () => {
      expect(dihedralOrder(8)).toBe(512n);
    });

    it("D_{65536} has order 131072 at Q1 (16 bits)", () => {
      expect(dihedralOrder(16)).toBe(131072n);
    });

    it("neg and bnot are both involutions (order 2 generators)", () => {
      const ring = Q0();
      for (let x = 0; x < 256; x++) {
        const b = ring.toBytes(x);
        expect(fromBytes(ring.neg(ring.neg(b)))).toBe(x);
        expect(fromBytes(ring.bnot(ring.bnot(b)))).toBe(x);
      }
    });
  });

  // ── T2.7: Cross-quantum ─────────────────────────────────────────────────
  describe("T2.7: Cross-quantum ops", () => {
    const rings = [Q0(), Q1(), Q2()];

    for (const ring of rings) {
      const label = `Q${ring.quantum}`;

      it(`${label}: neg is involution`, () => {
        const x = ring.toBytes(42);
        expect(fromBytes(ring.neg(ring.neg(x)))).toBe(42);
      });

      it(`${label}: bnot is involution`, () => {
        const x = ring.toBytes(42);
        expect(fromBytes(ring.bnot(ring.bnot(x)))).toBe(42);
      });

      it(`${label}: critical composition holds`, () => {
        expect(verifyCriticalComposition(ring, 42)).toBe(true);
      });

      it(`${label}: add/sub inverse`, () => {
        const a = ring.toBytes(100);
        const b = ring.toBytes(50);
        expect(fromBytes(ring.sub(ring.add(a, b), b))).toBe(100);
      });
    }
  });
});
