/**
 * Cayley-Dickson Functor Chain — Test Suite
 * ══════════════════════════════════════════
 *
 * Verifies the Cayley-Dickson tower as a chain of adjunctions F ⊣ U
 * bridging discrete (ℝ) and continuous (𝕊) computation.
 */

import { describe, it, expect } from "vitest";
import {
  constructFreeFunctor,
  constructForgetfulFunctor,
  constructAdjunction,
  buildFunctorChain,
  analyzeDoublings,
  zero,
  unit,
  basis,
  multiply,
} from "@/modules/atlas/cayley-dickson-functors";

// ══════════════════════════════════════════════════════════════════════════
// Part I: Free Functor
// ══════════════════════════════════════════════════════════════════════════

describe("Free Functor — Cayley-Dickson Doubling", () => {
  it("F₀: ℝ(1D) → ℂ(2D)", () => {
    const f = constructFreeFunctor(0);
    expect(f.sourceDim).toBe(1);
    expect(f.targetDim).toBe(2);
    const result = f.apply([3.5]);
    expect(result).toEqual([3.5, 0]);
  });

  it("F₁: ℂ(2D) → ℍ(4D)", () => {
    const f = constructFreeFunctor(1);
    expect(f.sourceDim).toBe(2);
    expect(f.targetDim).toBe(4);
    const result = f.apply([1, 2]);
    expect(result).toEqual([1, 2, 0, 0]);
  });

  it("F₂: ℍ(4D) → 𝕆(8D)", () => {
    const f = constructFreeFunctor(2);
    const result = f.apply([1, 0, 0, 0]);
    expect(result.length).toBe(8);
    expect(result[0]).toBe(1);
    expect(result.slice(4)).toEqual([0, 0, 0, 0]);
  });

  it("F₃: 𝕆(8D) → 𝕊(16D)", () => {
    const f = constructFreeFunctor(3);
    const result = f.apply([1, 0, 0, 0, 0, 0, 0, 0]);
    expect(result.length).toBe(16);
    expect(result[0]).toBe(1);
    expect(result.slice(8)).toEqual(new Array(8).fill(0));
  });

  it("free functor preserves zero", () => {
    for (let level = 0; level < 4; level++) {
      const f = constructFreeFunctor(level);
      const z = f.apply(zero(f.sourceDim));
      expect(z).toEqual(zero(f.targetDim));
    }
  });

  it("free functor preserves unit", () => {
    for (let level = 0; level < 4; level++) {
      const f = constructFreeFunctor(level);
      const u = f.apply(unit(f.sourceDim));
      expect(u).toEqual(unit(f.targetDim));
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: Forgetful Functor
// ══════════════════════════════════════════════════════════════════════════

describe("Forgetful Functor — Projection", () => {
  it("U₀: ℂ(2D) → ℝ(1D)", () => {
    const u = constructForgetfulFunctor(0);
    expect(u.apply([3.5, 2.1])).toEqual([3.5]);
  });

  it("U₁: ℍ(4D) → ℂ(2D)", () => {
    const u = constructForgetfulFunctor(1);
    expect(u.apply([1, 2, 3, 4])).toEqual([1, 2]);
  });

  it("U₂: 𝕆(8D) → ℍ(4D)", () => {
    const u = constructForgetfulFunctor(2);
    const result = u.apply([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result).toEqual([1, 2, 3, 4]);
  });

  it("U₃: 𝕊(16D) → 𝕆(8D)", () => {
    const u = constructForgetfulFunctor(3);
    const input = Array.from({ length: 16 }, (_, i) => i + 1);
    expect(u.apply(input)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("forgetful functor discards imaginary half", () => {
    for (let level = 0; level < 4; level++) {
      const u = constructForgetfulFunctor(level);
      const dim = u.sourceDim;
      const half = u.targetDim;
      // Element with all imaginary parts set
      const elem = Array.from({ length: dim }, (_, i) => i < half ? 0 : 99);
      const result = u.apply(elem);
      // All zeros — imaginary part forgotten
      expect(result).toEqual(zero(half));
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: Round-Trip (U ∘ F = Id)
// ══════════════════════════════════════════════════════════════════════════

describe("Round-Trip — U∘F = Identity", () => {
  it("U∘F is identity at every level", () => {
    for (let level = 0; level < 4; level++) {
      const f = constructFreeFunctor(level);
      const u = constructForgetfulFunctor(level);
      const dim = f.sourceDim;
      for (let i = 0; i < dim; i++) {
        const elem = basis(dim, i);
        const roundTrip = u.apply(f.apply(elem));
        expect(roundTrip).toEqual(elem);
      }
    }
  });

  it("round-trip preserves arbitrary elements", () => {
    const f = constructFreeFunctor(2); // ℍ → 𝕆
    const u = constructForgetfulFunctor(2);
    const elem = [1.5, -2.3, 0.7, 4.1];
    expect(u.apply(f.apply(elem))).toEqual(elem);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part IV: Adjunction — Triangle Identities
// ══════════════════════════════════════════════════════════════════════════

describe("Adjunction — Triangle Identities", () => {
  it("all 4 adjunctions are valid", () => {
    for (let level = 0; level < 4; level++) {
      const adj = constructAdjunction(level);
      expect(adj.isAdjunction, `Adjunction ${level} failed`).toBe(true);
    }
  });

  it("left triangle: Uε ∘ ηU = id_U at every level", () => {
    for (let level = 0; level < 4; level++) {
      const adj = constructAdjunction(level);
      expect(adj.leftTriangleHolds).toBe(true);
    }
  });

  it("right triangle: εF ∘ Fη = id_F at every level", () => {
    for (let level = 0; level < 4; level++) {
      const adj = constructAdjunction(level);
      expect(adj.rightTriangleHolds).toBe(true);
    }
  });

  it("unit η is identity (embedding then projecting is lossless)", () => {
    for (let level = 0; level < 4; level++) {
      const adj = constructAdjunction(level);
      const dim = 1 << level;
      for (let i = 0; i < dim; i++) {
        const elem = basis(dim, i);
        expect(adj.unit(elem)).toEqual(elem);
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part V: Properties Lost at Each Doubling
// ══════════════════════════════════════════════════════════════════════════

describe("Properties Lost — Cayley-Dickson Degradation", () => {
  it("ℝ→ℂ loses ordering", () => {
    const adj = constructAdjunction(0);
    expect(adj.propertyLost).toContain("Ordering");
  });

  it("ℂ→ℍ loses commutativity", () => {
    const adj = constructAdjunction(1);
    expect(adj.propertyLost).toContain("Commutativity");
  });

  it("ℍ→𝕆 loses associativity", () => {
    const adj = constructAdjunction(2);
    expect(adj.propertyLost).toContain("Associativity");
  });

  it("𝕆→𝕊 loses alternativity", () => {
    const adj = constructAdjunction(3);
    expect(adj.propertyLost).toContain("Alternativity");
  });

  it("ℍ→𝕆 is where attention diverges from coherence", () => {
    const adj = constructAdjunction(2);
    expect(adj.bridgeDescription).toContain("attention");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part VI: Complete Functor Chain
// ══════════════════════════════════════════════════════════════════════════

describe("Complete Functor Chain ℝ → 𝕊", () => {
  const chain = buildFunctorChain();

  it("all 4 adjunctions valid", () => {
    expect(chain.allValid).toBe(true);
    expect(chain.adjunctions.length).toBe(4);
  });

  it("composite free: ℝ(1D) → 𝕊(16D)", () => {
    const result = chain.compositeFree([42]);
    expect(result.length).toBe(16);
    expect(result[0]).toBe(42);
    expect(result.slice(1)).toEqual(new Array(15).fill(0));
  });

  it("composite forgetful: 𝕊(16D) → ℝ(1D)", () => {
    const input = Array.from({ length: 16 }, (_, i) => i + 1);
    const result = chain.compositeForgetful(input);
    expect(result).toEqual([1]); // Only the real component survives
  });

  it("round-trip ℝ → 𝕊 → ℝ is lossless", () => {
    expect(chain.roundTripLossless).toBe(true);
    // Verify manually
    for (const val of [[1], [0], [-1], [3.14159], [0.001]]) {
      const recovered = chain.compositeForgetful(chain.compositeFree(val));
      expect(recovered[0]).toBeCloseTo(val[0], 10);
    }
  });

  it("prints summary", () => {
    console.log("\n" + chain.summary);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part VII: Discrete-Continuous Bridge Analysis
// ══════════════════════════════════════════════════════════════════════════

describe("Discrete-Continuous Bridge", () => {
  const analysis = analyzeDoublings();

  it("4 doubling steps", () => {
    expect(analysis.length).toBe(4);
  });

  it("degrees of freedom double at each step", () => {
    expect(analysis[0].degreesAdded).toBe(1);   // ℝ→ℂ: +1
    expect(analysis[1].degreesAdded).toBe(2);   // ℂ→ℍ: +2
    expect(analysis[2].degreesAdded).toBe(4);   // ℍ→𝕆: +4
    expect(analysis[3].degreesAdded).toBe(8);   // 𝕆→𝕊: +8
  });

  it("division algebra property holds through 𝕆, fails at 𝕊", () => {
    expect(analysis[0].isDivisionAlgebra).toBe(true);  // ℂ
    expect(analysis[1].isDivisionAlgebra).toBe(true);  // ℍ
    expect(analysis[2].isDivisionAlgebra).toBe(true);  // 𝕆
    expect(analysis[3].isDivisionAlgebra).toBe(false); // 𝕊
  });

  it("zero divisors appear only at 𝕊", () => {
    expect(analysis[0].hasZeroDivisors).toBe(false);
    expect(analysis[1].hasZeroDivisors).toBe(false);
    expect(analysis[2].hasZeroDivisors).toBe(false);
    expect(analysis[3].hasZeroDivisors).toBe(true);
  });

  it("continuity score increases monotonically", () => {
    for (let i = 1; i < analysis.length; i++) {
      expect(analysis[i].continuityScore).toBeGreaterThan(
        analysis[i - 1].continuityScore
      );
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part VIII: Multiplication Preservation
// ══════════════════════════════════════════════════════════════════════════

describe("Multiplication Preservation Across Levels", () => {
  it("ℝ multiplication: 1 × 1 = 1", () => {
    const result = multiply(0, [1], [1]);
    expect(result).toEqual([1]);
  });

  it("ℂ multiplication: i² = -1", () => {
    const i = [0, 1]; // i = e₁
    const result = multiply(1, i, i);
    expect(result[0]).toBeCloseTo(-1, 10);
    expect(result[1]).toBeCloseTo(0, 10);
  });

  it("ℍ multiplication is non-commutative", () => {
    // At level 2 (quaternions), find any two basis elements that don't commute
    let foundNonCommutative = false;
    for (let a = 1; a < 4 && !foundNonCommutative; a++) {
      for (let b = a + 1; b < 4; b++) {
        const ea = basis(4, a);
        const eb = basis(4, b);
        const ab = multiply(2, ea, eb);
        const ba = multiply(2, eb, ea);
        const differs = ab.some((v, idx) => Math.abs(v - ba[idx]) > 1e-10);
        if (differs) { foundNonCommutative = true; break; }
      }
    }
    expect(foundNonCommutative).toBe(true);
  });

  it("embedded ℝ multiplication in ℂ matches ℝ", () => {
    const f = constructFreeFunctor(0);
    const a = f.apply([3]);
    const b = f.apply([4]);
    const product = multiply(1, a, b);
    const u = constructForgetfulFunctor(0);
    const projected = u.apply(product);
    expect(projected[0]).toBeCloseTo(12, 10);
  });
});
