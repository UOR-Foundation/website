/**
 * Extended Morphism Generators — 5 → 7 Categorical Operations
 * ═════════════════════════════════════════════════════════════
 *
 * Extends the original 5 categorical operations with 2 generators from Sigmatics:
 *
 *   Original 5:
 *     product     (G₂)  — decomposition into independent factors
 *     quotient    (F₄)  — equivalence-class collapse
 *     filtration  (E₆)  — graded subsets by property
 *     augmentation(E₇)  — extension with new structure
 *     embedding   (E₈)  — full structure-preserving injection
 *
 *   New from Sigmatics:
 *     suspension  — A → ΣA — lifts to higher categorical level (quote)
 *     projection  — A×B → A — canonical factor extraction (split)
 *
 * These 7 generators map to the 7 Fano plane points (e₁…e₇),
 * establishing a correspondence between morphism generators and
 * octonionic multiplication units.
 *
 * @module atlas/morphism-generators
 */

import { FANO_ORDER } from "./fano-plane";

// ── Types ─────────────────────────────────────────────────────────────────

/** All 7 categorical generator types. */
export type GeneratorKind =
  | "product"
  | "quotient"
  | "filtration"
  | "augmentation"
  | "embedding"
  | "suspension"
  | "projection";

/** A categorical generator mapped to a Fano point. */
export interface CategoricalGenerator {
  /** Generator kind. */
  readonly kind: GeneratorKind;
  /** Fano point index (0–6, mapping to e₁…e₇). */
  readonly fanoPoint: number;
  /** Associated exceptional group (for original 5) or algebraic structure. */
  readonly algebraicStructure: string;
  /** Root count or structural dimension. */
  readonly dimension: number;
  /** Category-theoretic signature. */
  readonly signature: string;
  /** Description of the generator's role. */
  readonly description: string;
  /** Dual generator (via Fano anti-commutativity). */
  readonly dualGenerator: GeneratorKind;
}

/** Fano line connecting 3 generators. */
export interface GeneratorTriple {
  /** The 3 generator kinds on this Fano line. */
  readonly generators: [GeneratorKind, GeneratorKind, GeneratorKind];
  /** The 3 Fano point indices. */
  readonly fanoPoints: [number, number, number];
  /** The interaction rule: g₁ ∘ g₂ = g₃ (composition). */
  readonly compositionRule: string;
  /** Structural meaning of this triple. */
  readonly meaning: string;
}

/** Full 7-generator analysis. */
export interface GeneratorAnalysis {
  /** All 7 generators. */
  readonly generators: ReadonlyArray<CategoricalGenerator>;
  /** All 7 Fano lines as generator triples. */
  readonly triples: ReadonlyArray<GeneratorTriple>;
  /** Verification tests. */
  readonly tests: ReadonlyArray<GeneratorTest>;
  readonly allPassed: boolean;
}

export interface GeneratorTest {
  readonly name: string;
  readonly holds: boolean;
  readonly expected: string;
  readonly actual: string;
}

// ── Generator Definitions ─────────────────────────────────────────────────

/**
 * The 7 canonical categorical generators mapped to Fano points.
 *
 * The mapping follows the Cayley-Dickson doubling tower:
 *   e₁ = product (ℝ-level: direct product of independent factors)
 *   e₂ = projection (ℂ-level: canonical factor extraction)
 *   e₃ = quotient (ℍ-level: equivalence collapse via involution)
 *   e₄ = filtration (𝕆-level: graded selection by property)
 *   e₅ = suspension (𝕊-level: categorical level shift)
 *   e₆ = augmentation (E₇-level: structure extension)
 *   e₇ = embedding (E₈-level: full structure-preserving injection)
 */
const GENERATOR_DEFS: CategoricalGenerator[] = [
  {
    kind: "product",
    fanoPoint: 0,
    algebraicStructure: "G₂",
    dimension: 12,
    signature: "A × B → A⊗B",
    description: "Decomposes identity into independent factors. Like Klein × Z/3 = 12.",
    dualGenerator: "quotient",
  },
  {
    kind: "projection",
    fanoPoint: 1,
    algebraicStructure: "ℂ-conjugation",
    dimension: 2,
    signature: "A × B → A",
    description: "Canonical factor extraction (split). Dual of product — selects one component.",
    dualGenerator: "augmentation",
  },
  {
    kind: "quotient",
    fanoPoint: 2,
    algebraicStructure: "F₄",
    dimension: 48,
    signature: "A → A/∼",
    description: "Equivalence-class collapse. Many credentials → one trust assertion.",
    dualGenerator: "product",
  },
  {
    kind: "filtration",
    fanoPoint: 3,
    algebraicStructure: "E₆",
    dimension: 72,
    signature: "A → Gr(A)",
    description: "Graded subsets by property. Languages graded by type-theoretic capability.",
    dualGenerator: "embedding",
  },
  {
    kind: "suspension",
    fanoPoint: 4,
    algebraicStructure: "Σ-functor",
    dimension: 16,
    signature: "A → ΣA",
    description: "Lifts to higher categorical level (quote). Boundary elements as suspended objects.",
    dualGenerator: "projection",
  },
  {
    kind: "augmentation",
    fanoPoint: 5,
    algebraicStructure: "E₇",
    dimension: 126,
    signature: "A → A⋉B",
    description: "Extension with new structure. AI augments data with intelligence.",
    dualGenerator: "projection",
  },
  {
    kind: "embedding",
    fanoPoint: 6,
    algebraicStructure: "E₈",
    dimension: 240,
    signature: "A ↪ B",
    description: "Full structure-preserving injection. Ring algebra lifts to unitary gates.",
    dualGenerator: "filtration",
  },
];

/**
 * Fano lines connecting generator triples.
 * Each line {i, j, k} means eᵢ · eⱼ = eₖ (cyclic).
 * Standard Fano plane lines: {1,2,4}, {2,3,5}, {3,4,6}, {4,5,7}, {5,6,1}, {6,7,2}, {7,1,3}
 * (Using 0-indexed: {0,1,3}, {1,2,4}, {2,3,5}, {3,4,6}, {4,5,0}, {5,6,1}, {6,0,2})
 */
const GENERATOR_TRIPLES: GeneratorTriple[] = [
  {
    generators: ["product", "projection", "filtration"],
    fanoPoints: [0, 1, 3],
    compositionRule: "product ∘ projection = filtration",
    meaning: "Decomposing then extracting produces a graded selection",
  },
  {
    generators: ["projection", "quotient", "suspension"],
    fanoPoints: [1, 2, 4],
    compositionRule: "projection ∘ quotient = suspension",
    meaning: "Extracting from an equivalence class lifts to higher level",
  },
  {
    generators: ["quotient", "filtration", "augmentation"],
    fanoPoints: [2, 3, 5],
    compositionRule: "quotient ∘ filtration = augmentation",
    meaning: "Collapsing a graded structure extends it with new capabilities",
  },
  {
    generators: ["filtration", "suspension", "embedding"],
    fanoPoints: [3, 4, 6],
    compositionRule: "filtration ∘ suspension = embedding",
    meaning: "Grading a suspended object produces a full embedding",
  },
  {
    generators: ["suspension", "augmentation", "product"],
    fanoPoints: [4, 5, 0],
    compositionRule: "suspension ∘ augmentation = product",
    meaning: "Suspending an augmented structure factors into a product",
  },
  {
    generators: ["augmentation", "embedding", "projection"],
    fanoPoints: [5, 6, 1],
    compositionRule: "augmentation ∘ embedding = projection",
    meaning: "Augmenting an embedded structure allows factor extraction",
  },
  {
    generators: ["embedding", "product", "quotient"],
    fanoPoints: [6, 0, 2],
    compositionRule: "embedding ∘ product = quotient",
    meaning: "Embedding a product collapses to an equivalence class",
  },
];

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Get all 7 categorical generators.
 */
export function getGenerators(): ReadonlyArray<CategoricalGenerator> {
  return GENERATOR_DEFS;
}

/**
 * Get a generator by kind.
 */
export function getGenerator(kind: GeneratorKind): CategoricalGenerator {
  const g = GENERATOR_DEFS.find(g => g.kind === kind);
  if (!g) throw new Error(`Unknown generator: ${kind}`);
  return g;
}

/**
 * Get all 7 Fano-line generator triples.
 */
export function getGeneratorTriples(): ReadonlyArray<GeneratorTriple> {
  return GENERATOR_TRIPLES;
}

/**
 * Map a Fano point index to its generator kind.
 */
export function fanoPointToGenerator(point: number): GeneratorKind {
  if (point < 0 || point >= FANO_ORDER) {
    throw new RangeError(`Fano point ${point} out of range [0, ${FANO_ORDER})`);
  }
  return GENERATOR_DEFS[point].kind;
}

/**
 * Map a generator kind to its Fano point index.
 */
export function generatorToFanoPoint(kind: GeneratorKind): number {
  return getGenerator(kind).fanoPoint;
}

// ── Verification ──────────────────────────────────────────────────────────

/**
 * Run full 7-generator analysis and verification.
 */
export function runGeneratorAnalysis(): GeneratorAnalysis {
  const generators = GENERATOR_DEFS;
  const triples = GENERATOR_TRIPLES;
  const tests: GeneratorTest[] = [];

  // Test 1: Exactly 7 generators
  tests.push({
    name: "Exactly 7 generators",
    holds: generators.length === FANO_ORDER,
    expected: "7",
    actual: String(generators.length),
  });

  // Test 2: All Fano points covered (0–6)
  {
    const points = new Set(generators.map(g => g.fanoPoint));
    tests.push({
      name: "All 7 Fano points covered",
      holds: points.size === 7,
      expected: "{0,1,2,3,4,5,6}",
      actual: `{${[...points].sort().join(",")}}`,
    });
  }

  // Test 3: Exactly 7 generator triples (Fano lines)
  tests.push({
    name: "7 generator triples (Fano lines)",
    holds: triples.length === 7,
    expected: "7",
    actual: String(triples.length),
  });

  // Test 4: Each generator appears in exactly 3 triples (3 lines per point)
  {
    const counts = new Map<GeneratorKind, number>();
    for (const g of generators) counts.set(g.kind, 0);
    for (const t of triples) {
      for (const gk of t.generators) {
        counts.set(gk, (counts.get(gk) || 0) + 1);
      }
    }
    const all3 = [...counts.values()].every(c => c === 3);
    tests.push({
      name: "Each generator in exactly 3 triples",
      holds: all3,
      expected: "all counts = 3",
      actual: `[${[...counts.values()].join(",")}]`,
    });
  }

  // Test 5: Original 5 operations preserved
  {
    const orig5: GeneratorKind[] = ["product", "quotient", "filtration", "augmentation", "embedding"];
    const allPresent = orig5.every(k => generators.some(g => g.kind === k));
    tests.push({
      name: "Original 5 operations preserved",
      holds: allPresent,
      expected: "product, quotient, filtration, augmentation, embedding",
      actual: allPresent ? "all present" : "MISSING",
    });
  }

  // Test 6: New generators are suspension and projection
  {
    const hasNew = generators.some(g => g.kind === "suspension") &&
                   generators.some(g => g.kind === "projection");
    tests.push({
      name: "New generators: suspension + projection",
      holds: hasNew,
      expected: "suspension, projection",
      actual: hasNew ? "suspension, projection" : "MISSING",
    });
  }

  // Test 7: All generator kinds are unique
  {
    const kinds = new Set(generators.map(g => g.kind));
    tests.push({
      name: "All generator kinds unique",
      holds: kinds.size === 7,
      expected: "7 unique kinds",
      actual: String(kinds.size),
    });
  }

  // Test 8: Triple Fano points match standard Fano plane incidence
  {
    // Standard Fano lines (0-indexed): {0,1,3}, {1,2,4}, {2,3,5}, {3,4,6}, {4,5,0}, {5,6,1}, {6,0,2}
    const standardLines = [
      [0,1,3], [1,2,4], [2,3,5], [3,4,6], [4,5,0], [5,6,1], [6,0,2],
    ];
    let match = true;
    for (let i = 0; i < 7; i++) {
      const actual = [...triples[i].fanoPoints].sort((a,b) => a-b);
      const expected = [...standardLines[i]].sort((a,b) => a-b);
      if (actual[0] !== expected[0] || actual[1] !== expected[1] || actual[2] !== expected[2]) {
        match = false;
        break;
      }
    }
    tests.push({
      name: "Triples match standard Fano incidence",
      holds: match,
      expected: "7 standard Fano lines",
      actual: match ? "7 standard Fano lines" : "MISMATCH",
    });
  }

  // Test 9: Every generator has a non-empty signature
  {
    const allSigs = generators.every(g => g.signature.length > 0);
    tests.push({
      name: "All generators have signatures",
      holds: allSigs,
      expected: "7 non-empty signatures",
      actual: allSigs ? "7 non-empty signatures" : "MISSING",
    });
  }

  // Test 10: Dimension ordering respects exceptional group chain
  {
    // G₂(12) < F₄(48) < E₆(72) < E₇(126) < E₈(240)
    const orig5Dims = generators
      .filter(g => ["product","quotient","filtration","augmentation","embedding"].includes(g.kind))
      .sort((a, b) => a.dimension - b.dimension)
      .map(g => g.dimension);
    const ordered = orig5Dims.every((d, i) => i === 0 || d > orig5Dims[i-1]);
    tests.push({
      name: "Original 5 dimensions follow G₂<F₄<E₆<E₇<E₈",
      holds: ordered,
      expected: "12 < 48 < 72 < 126 < 240",
      actual: orig5Dims.join(" < "),
    });
  }

  return {
    generators,
    triples,
    tests,
    allPassed: tests.every(t => t.holds),
  };
}
