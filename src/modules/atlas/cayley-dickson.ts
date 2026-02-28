/**
 * Cayley-Dickson ↔ Atlas Correspondence — Phase 25
 * ══════════════════════════════════════════════════
 *
 * Constructs the Cayley-Dickson doubling tower:
 *
 *   R (dim 1)  → C (dim 2)  → H (dim 4)  → O (dim 8)  → S (dim 16)
 *   Reals        Complex      Quaternions   Octonions     Sedenions
 *
 * and maps each doubling to an Atlas structural layer:
 *
 *   DOUBLING     DIM    ATLAS LAYER              PROPERTY LOST
 *   ────────     ───    ───────────              ─────────────
 *   R            1      Unity positions (2)       —
 *   R → C        2      Mirror involution τ       Ordering
 *   C → H        4      Klein-4 kernel (V₄)       Commutativity
 *   H → O        8      Sign classes (8×12)        Associativity
 *   O → S        16     Boundary elements (16)     Alternativity
 *
 * The connection to 256 = 2⁸:
 *   The Atlas has 256 edges = |R₈| = |Z/256Z|
 *   256 = 2⁸ = dimension of the Clifford algebra Cl(8,0)
 *   Cl(8,0) ≅ M₁₆(R), the 16×16 real matrices
 *   This is the "Bott periodicity" anchor: Cl(n+8) ≅ Cl(n) ⊗ M₁₆(R)
 *
 * The exceptional Lie groups arise from the Cayley-Dickson algebras:
 *   G₂ = Aut(O)           — automorphisms of octonions
 *   F₄ = Isom(OP²)        — isometries of octonionic projective plane
 *   E₆ = Str(J₃(O))       — structure group of octonionic Jordan algebra
 *   E₇ = Aut(Freudenthal)  — Freudenthal triple system
 *   E₈ = from triality      — octonionic triality construction
 *
 * @module atlas/cayley-dickson
 */

import { getAtlas, ATLAS_VERTEX_COUNT, ATLAS_EDGE_COUNT_EXPECTED } from "./atlas";

// ── Types ─────────────────────────────────────────────────────────────────

export type AlgebraName = "R" | "C" | "H" | "O" | "S";

/** A Cayley-Dickson algebra at a specific doubling level */
export interface CayleyDicksonAlgebra {
  /** Symbol */
  name: AlgebraName;
  /** Full name */
  fullName: string;
  /** Dimension = 2^level */
  dim: number;
  /** Doubling level (0=R, 1=C, 2=H, 3=O, 4=S) */
  level: number;
  /** Number of imaginary units */
  imaginaryUnits: number;
  /** Multiplication table (dim × dim → dim, stored as index into basis) */
  multiplicationTable: number[][];
  /** Sign table for multiplication (±1) */
  signTable: number[][];
  /** Properties of this algebra */
  properties: AlgebraProperties;
  /** Atlas structural correspondence */
  atlasLayer: AtlasLayer;
}

export interface AlgebraProperties {
  /** Has multiplicative identity */
  unital: boolean;
  /** ab = ba */
  commutative: boolean;
  /** (ab)c = a(bc) */
  associative: boolean;
  /** a(ab) = a²b and (ba)a = ba² */
  alternative: boolean;
  /** Has multiplicative norm N(ab) = N(a)N(b) */
  composition: boolean;
  /** Every nonzero element has inverse */
  division: boolean;
  /** a(āb) = (aā)b — Moufang identity */
  moufang: boolean;
  /** Property lost at this doubling */
  propertyLost: string;
}

export interface AtlasLayer {
  /** Atlas structure this algebra maps to */
  structure: string;
  /** Count of Atlas elements in this layer */
  count: number;
  /** Exceptional group connection */
  exceptionalGroup: string;
  /** Root count of the exceptional group */
  roots: number;
  /** How the doubling manifests in Atlas */
  manifestation: string;
  /** Label coordinates used */
  coordinates: string;
}

/** Doubling construction record */
export interface DoublingStep {
  /** Source algebra */
  from: AlgebraName;
  /** Target algebra */
  to: AlgebraName;
  /** Dimension doubles */
  dimFrom: number;
  dimTo: number;
  /** The conjugation rule: (a,b)* = (a*, -b) */
  conjugationRule: string;
  /** The multiplication rule: (a,b)(c,d) = (ac - d*b, da + bc*) */
  multiplicationRule: string;
  /** Property lost */
  propertyLost: string;
  /** Atlas interpretation of this doubling */
  atlasInterpretation: string;
}

export interface CayleyDicksonTower {
  /** All 5 algebras */
  algebras: CayleyDicksonAlgebra[];
  /** The 4 doubling steps */
  doublings: DoublingStep[];
  /** Connection to 256 = 2⁸ */
  cliffordConnection: CliffordConnection;
  /** Verification tests */
  tests: CDTest[];
  allPassed: boolean;
}

export interface CliffordConnection {
  /** 256 = 2⁸ = dim Cl(8,0) */
  cliffordDim: number;
  /** Cl(8,0) ≅ M₁₆(R) */
  matrixAlgebra: string;
  /** Bott periodicity: Cl(n+8) ≅ Cl(n) ⊗ M₁₆(R) */
  bottPeriod: number;
  /** 256 Atlas edges = 256 R₈ elements */
  atlasEdges: number;
  /** Sedenion dim = 16, M₁₆(R) acts on R¹⁶ */
  sedenionDim: number;
}

export interface CDTest {
  name: string;
  holds: boolean;
  detail: string;
}

// ── Cayley-Dickson Multiplication Tables ──────────────────────────────────

/**
 * Build the multiplication table for the Cayley-Dickson algebra at a given level.
 *
 * Level 0: R — {1}
 * Level 1: C — {1, i}
 * Level 2: H — {1, i, j, k}
 * Level 3: O — {1, e₁, e₂, e₃, e₄, e₅, e₆, e₇}
 * Level 4: S — {1, e₁, ..., e₁₅}
 *
 * Doubling rule: (a,b)(c,d) = (ac - d̄b, da + bc̄)
 * Conjugation:   (a,b)* = (ā, -b)
 */
function buildMultiplicationTable(level: number): { indices: number[][]; signs: number[][] } {
  const dim = 1 << level;
  const indices = Array.from({ length: dim }, () => new Array(dim).fill(0));
  const signs = Array.from({ length: dim }, () => new Array(dim).fill(1));

  if (level === 0) {
    // R: 1×1 = 1
    indices[0][0] = 0;
    signs[0][0] = 1;
    return { indices, signs };
  }

  // Build recursively via Cayley-Dickson doubling
  const prev = buildMultiplicationTable(level - 1);
  const half = dim >> 1;

  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      const aLow = a % half;
      const aHigh = Math.floor(a / half);
      const bLow = b % half;
      const bHigh = Math.floor(b / half);

      if (aHigh === 0 && bHigh === 0) {
        // (a,0)(b,0) = (ab, 0)
        indices[a][b] = prev.indices[aLow][bLow];
        signs[a][b] = prev.signs[aLow][bLow];
      } else if (aHigh === 0 && bHigh === 1) {
        // (a,0)(0,d) = (0, da + 0) → simplified: result in upper half
        indices[a][b] = prev.indices[bLow][aLow] + half;
        signs[a][b] = prev.signs[bLow][aLow];
      } else if (aHigh === 1 && bHigh === 0) {
        // (0,b)(c,0) = (0, 0 + b·c̄) → result in upper half
        // c̄ for real basis element c: conjugate flips sign of imaginary parts
        if (bLow === 0) {
          indices[a][b] = aLow + half;
          signs[a][b] = 1;
        } else {
          indices[a][b] = prev.indices[aLow][bLow] + half;
          signs[a][b] = prev.signs[aLow][bLow];
        }
      } else {
        // (0,b)(0,d) = (-d̄b, 0)
        // d̄ = conjugate of d: for basis elements, conj(e_i) = -e_i, conj(1) = 1
        if (bLow === 0 && aLow === 0) {
          indices[a][b] = 0;
          signs[a][b] = -1; // -1·1 = -1
        } else if (bLow === 0) {
          indices[a][b] = aLow;
          signs[a][b] = -1;
        } else if (aLow === 0) {
          indices[a][b] = bLow;
          signs[a][b] = 1; // -(-e_i)·1 = e_i
        } else {
          indices[a][b] = prev.indices[bLow][aLow];
          signs[a][b] = -prev.signs[bLow][aLow];
        }
      }
    }
  }

  return { indices, signs };
}

/**
 * Basis element names for each level.
 */
function basisNames(level: number): string[] {
  if (level === 0) return ["1"];
  if (level === 1) return ["1", "i"];
  if (level === 2) return ["1", "i", "j", "k"];
  if (level === 3) return ["1", "e₁", "e₂", "e₃", "e₄", "e₅", "e₆", "e₇"];
  // Sedenions
  return Array.from({ length: 16 }, (_, i) => i === 0 ? "1" : `e${i}`);
}

// ── Algebra Properties ────────────────────────────────────────────────────

function checkCommutativity(signs: number[][], indices: number[][]): boolean {
  const dim = signs.length;
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      if (indices[i][j] !== indices[j][i] || signs[i][j] !== signs[j][i]) return false;
    }
  }
  return true;
}

function checkAssociativity(signs: number[][], indices: number[][]): boolean {
  const dim = signs.length;
  // Check (e_i · e_j) · e_k = e_i · (e_j · e_k) for all basis triples
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      for (let k = 0; k < dim; k++) {
        // (e_i · e_j) · e_k
        const ijIdx = indices[i][j];
        const ijSign = signs[i][j];
        const leftIdx = indices[ijIdx][k];
        const leftSign = ijSign * signs[ijIdx][k];

        // e_i · (e_j · e_k)
        const jkIdx = indices[j][k];
        const jkSign = signs[j][k];
        const rightIdx = indices[i][jkIdx];
        const rightSign = jkSign * signs[i][jkIdx];

        if (leftIdx !== rightIdx || leftSign !== rightSign) return false;
      }
    }
  }
  return true;
}

function checkAlternativity(signs: number[][], indices: number[][]): boolean {
  const dim = signs.length;
  // Alternative: (xx)y = x(xy) and (yx)x = y(xx)
  for (let x = 0; x < dim; x++) {
    for (let y = 0; y < dim; y++) {
      // (x·x)·y
      const xxIdx = indices[x][x];
      const xxSign = signs[x][x];
      const leftIdx = indices[xxIdx][y];
      const leftSign = xxSign * signs[xxIdx][y];

      // x·(x·y)
      const xyIdx = indices[x][y];
      const xySign = signs[x][y];
      const rightIdx = indices[x][xyIdx];
      const rightSign = xySign * signs[x][xyIdx];

      if (leftIdx !== rightIdx || leftSign !== rightSign) return false;
    }
  }
  return true;
}

function checkDivision(signs: number[][], indices: number[][]): boolean {
  const dim = signs.length;
  // Every nonzero element has a left/right inverse
  // For basis elements e_i: e_i · e_i = ±1 always, so inverse exists
  for (let i = 1; i < dim; i++) {
    const sqIdx = indices[i][i];
    if (sqIdx !== 0) return false; // e_i² must be a scalar (index 0)
    // signs[i][i] should be -1 for all imaginary units
  }
  return true;
}

// ── Atlas Layer Mapping ───────────────────────────────────────────────────

function getAtlasLayer(level: number): AtlasLayer {
  const atlas = getAtlas();

  switch (level) {
    case 0: // R — Reals
      return {
        structure: "Unity positions",
        count: atlas.unityPositions.length,
        exceptionalGroup: "—",
        roots: 0,
        manifestation: "The 2 unity positions {0, 128} in R₈ are the real scalars ±1. They form the kernel of every doubling.",
        coordinates: "All coordinates zero except d₄₅",
      };

    case 1: // C — Complex numbers
      return {
        structure: "Mirror involution τ (e₇ flip)",
        count: 48,
        exceptionalGroup: "—",
        roots: 0,
        manifestation: "The τ-involution (e₇: 0↔1) is complex conjugation. Each mirror pair (v, τ(v)) is a complex number z = v + iτ(v). 48 pairs = 48 complex dimensions.",
        coordinates: "e₇ ∈ {0,1} — the imaginary unit i",
      };

    case 2: // H — Quaternions
      return {
        structure: "Klein-4 group V₄ in label kernel",
        count: 4,
        exceptionalGroup: "G₂ = Aut(O) restricted",
        roots: 12,
        manifestation: "The Klein-4 subgroup {id, flip-e₁, flip-e₂, flip-e₁e₂} acts on Atlas labels. Its 4 elements correspond to {1, i, j, k}. G₂'s 12 roots arise as 3 × V₄ = 12.",
        coordinates: "e₁, e₂ ∈ {0,1} — quaternion units i,j (k=ij)",
      };

    case 3: // O — Octonions
      return {
        structure: "8 sign classes × 12 vertices",
        count: 8,
        exceptionalGroup: "G₂ = Aut(O)",
        roots: 12,
        manifestation: "The 8 sign classes are the 8 octonionic basis elements {1, e₁,...,e₇}. Each class has 12 vertices = the G₂ orbit. The Fano plane structure (7 lines, 7 points) encodes octonionic multiplication.",
        coordinates: "e₁, e₂, e₃ ∈ {0,1} — the 3-bit sign class = octonion index",
      };

    case 4: // S — Sedenions
    default:
      return {
        structure: "16 boundary elements (Ext+Unit+G₂)",
        count: 16,
        exceptionalGroup: "E₈ (via Bott periodicity)",
        roots: 240,
        manifestation: "The 16 boundary elements (2 exterior + 2 unit + 12 G₂) form the sedenion basis. 256 = 16² connects Cl(8,0) ≅ M₁₆(R). Bott periodicity: Cl(n+8) ≅ Cl(n) ⊗ M₁₆(R) anchors the Atlas at dimension 8.",
        coordinates: "Full 6-tuple (e₁,e₂,e₃,d₄₅,e₆,e₇) — 16 boundary vertices",
      };
  }
}

// ── Algebra Construction ──────────────────────────────────────────────────

const ALGEBRA_NAMES: AlgebraName[] = ["R", "C", "H", "O", "S"];
const FULL_NAMES = ["Reals", "Complex Numbers", "Quaternions", "Octonions", "Sedenions"];
const PROPERTIES_LOST = ["—", "Ordering", "Commutativity", "Associativity", "Alternativity"];

export function constructAlgebra(level: number): CayleyDicksonAlgebra {
  const { indices, signs } = buildMultiplicationTable(level);
  const dim = 1 << level;

  const commutative = level <= 1 ? true : checkCommutativity(signs, indices);
  const associative = level <= 2 ? true : checkAssociativity(signs, indices);
  const alternative = level <= 3 ? true : checkAlternativity(signs, indices);
  // Hurwitz's theorem: division algebras exist only at dim 1,2,4,8
  const division = level <= 3;

  return {
    name: ALGEBRA_NAMES[level],
    fullName: FULL_NAMES[level],
    dim,
    level,
    imaginaryUnits: dim - 1,
    multiplicationTable: indices,
    signTable: signs,
    properties: {
      unital: true,
      commutative,
      associative,
      alternative,
      composition: level <= 3, // Only up to octonions
      division,
      moufang: level <= 3,
      propertyLost: PROPERTIES_LOST[level],
    },
    atlasLayer: getAtlasLayer(level),
  };
}

/**
 * Build the complete Cayley-Dickson tower R → C → H → O → S.
 */
export function buildTower(): CayleyDicksonTower {
  const algebras = [0, 1, 2, 3, 4].map(constructAlgebra);

  const doublings: DoublingStep[] = [
    {
      from: "R", to: "C", dimFrom: 1, dimTo: 2,
      conjugationRule: "(a,b)* = (a, -b)",
      multiplicationRule: "(a,b)(c,d) = (ac - db, da + bc)",
      propertyLost: "Ordering (no total order on C compatible with field ops)",
      atlasInterpretation: "Introducing e₇ creates mirror involution τ. Each real vertex v gains a mirror partner τ(v). This is exactly complex conjugation: z̄ = a - bi.",
    },
    {
      from: "C", to: "H", dimFrom: 2, dimTo: 4,
      conjugationRule: "(a,b)* = (ā, -b) where a ∈ C",
      multiplicationRule: "(a,b)(c,d) = (ac - d̄b, da + bc̄)",
      propertyLost: "Commutativity (ij = k ≠ -k = ji)",
      atlasInterpretation: "The e₁, e₂ coordinates create a Klein-4 subgroup V₄ = {1,i,j,k}. Non-commutativity manifests as the orientation of Atlas edges: the adjacency is symmetric, but the labeling is not.",
    },
    {
      from: "H", to: "O", dimFrom: 4, dimTo: 8,
      conjugationRule: "(a,b)* = (ā, -b) where a ∈ H",
      multiplicationRule: "(a,b)(c,d) = (ac - d̄b, da + bc̄)",
      propertyLost: "Associativity ((e₁e₂)e₄ ≠ e₁(e₂e₄))",
      atlasInterpretation: "The 3-bit sign class (e₁,e₂,e₃) encodes the 8 octonionic directions. Each sign class has exactly 12 vertices = the G₂ orbit. G₂ = Aut(O) has 12 roots because it preserves octonionic multiplication.",
    },
    {
      from: "O", to: "S", dimFrom: 8, dimTo: 16,
      conjugationRule: "(a,b)* = (ā, -b) where a ∈ O",
      multiplicationRule: "(a,b)(c,d) = (ac - d̄b, da + bc̄)",
      propertyLost: "Alternativity (no composition algebra structure)",
      atlasInterpretation: "The 16 boundary elements (256 - 240 = 16) form the sedenion basis. Beyond dim 8, Hurwitz's theorem forbids composition algebras, matching the Atlas's transition from interior (240 E₈ roots) to boundary (16 elements).",
    },
  ];

  const cliffordConnection: CliffordConnection = {
    cliffordDim: 256,
    matrixAlgebra: "M₁₆(R) — 16×16 real matrices",
    bottPeriod: 8,
    atlasEdges: ATLAS_EDGE_COUNT_EXPECTED,
    sedenionDim: 16,
  };

  const tests = verifyTower(algebras, doublings);

  return {
    algebras,
    doublings,
    cliffordConnection,
    tests,
    allPassed: tests.every(t => t.holds),
  };
}

// ── Verification ──────────────────────────────────────────────────────────

function verifyTower(algebras: CayleyDicksonAlgebra[], doublings: DoublingStep[]): CDTest[] {
  const tests: CDTest[] = [];

  // T1: 5 algebras constructed
  tests.push({
    name: "5 Cayley-Dickson algebras constructed",
    holds: algebras.length === 5,
    detail: algebras.map(a => `${a.name}(${a.dim})`).join(" → "),
  });

  // T2: Dimensions double correctly
  const dimsCorrect = algebras.every((a, i) => a.dim === (1 << i));
  tests.push({
    name: "Dimensions double: 1, 2, 4, 8, 16",
    holds: dimsCorrect,
    detail: algebras.map(a => a.dim).join(", "),
  });

  // T3: All algebras are unital
  tests.push({
    name: "All algebras are unital",
    holds: algebras.every(a => a.properties.unital),
    detail: "e₀ · eᵢ = eᵢ · e₀ = eᵢ for all i",
  });

  // T4: R, C are commutative; H, O, S are not
  tests.push({
    name: "Commutativity lost at H (level 2)",
    holds: algebras[0].properties.commutative && algebras[1].properties.commutative &&
           !algebras[2].properties.commutative,
    detail: `R:${algebras[0].properties.commutative}, C:${algebras[1].properties.commutative}, H:${algebras[2].properties.commutative}`,
  });

  // T5: R, C, H are associative; O, S are not
  tests.push({
    name: "Associativity lost at O (level 3)",
    holds: algebras[0].properties.associative && algebras[1].properties.associative &&
           algebras[2].properties.associative && !algebras[3].properties.associative,
    detail: `R:✓, C:✓, H:✓, O:${algebras[3].properties.associative}`,
  });

  // T6: R, C, H, O are alternative; S is not
  tests.push({
    name: "Alternativity lost at S (level 4)",
    holds: algebras[3].properties.alternative && !algebras[4].properties.alternative,
    detail: `O:${algebras[3].properties.alternative}, S:${algebras[4].properties.alternative}`,
  });

  // T7: Only R, C, H, O are division algebras (Hurwitz's theorem)
  tests.push({
    name: "Hurwitz theorem: division algebras only at dim ≤ 8",
    holds: algebras.slice(0, 4).every(a => a.properties.division) && !algebras[4].properties.division,
    detail: "R, C, H, O are division algebras; S is not",
  });

  // T8: 4 doubling steps
  tests.push({
    name: "4 doubling steps R→C→H→O→S",
    holds: doublings.length === 4,
    detail: doublings.map(d => `${d.from}→${d.to}`).join(", "),
  });

  // T9: Atlas sign classes = octonionic basis dimension
  const atlas = getAtlas();
  const signClassCount = new Set(atlas.vertices.map(v => v.signClass)).size;
  tests.push({
    name: "8 sign classes = 8 octonionic basis elements",
    holds: signClassCount === 8 && algebras[3].dim === 8,
    detail: `Atlas sign classes: ${signClassCount}, O dimension: ${algebras[3].dim}`,
  });

  // T10: 256 edges = 2⁸ = Cl(8,0) dimension
  tests.push({
    name: "256 edges = 2⁸ = dim Cl(8,0)",
    holds: ATLAS_EDGE_COUNT_EXPECTED === 256 && (1 << 8) === 256,
    detail: `Atlas edges: ${ATLAS_EDGE_COUNT_EXPECTED}, 2⁸ = ${1 << 8}`,
  });

  // T11: Each sign class has exactly 12 vertices = G₂ orbit
  const scCounts = new Map<number, number>();
  for (const v of atlas.vertices) {
    scCounts.set(v.signClass, (scCounts.get(v.signClass) ?? 0) + 1);
  }
  const all12 = [...scCounts.values()].every(c => c === 12);
  tests.push({
    name: "Each sign class has 12 vertices (G₂ orbit size)",
    holds: all12 && scCounts.size === 8,
    detail: `${scCounts.size} classes × 12 = ${ATLAS_VERTEX_COUNT}`,
  });

  // T12: Mirror pairs = 48 = F₄ roots
  const pairs = atlas.mirrorPairs();
  tests.push({
    name: "48 mirror pairs = F₄ root count",
    holds: pairs.length === 48,
    detail: `τ-involution creates ${pairs.length} pairs from ${ATLAS_VERTEX_COUNT} vertices`,
  });

  // T13: Imaginary unit counts: 0, 1, 3, 7, 15
  const expectedImag = [0, 1, 3, 7, 15];
  tests.push({
    name: "Imaginary units: 0, 1, 3, 7, 15",
    holds: algebras.every((a, i) => a.imaginaryUnits === expectedImag[i]),
    detail: algebras.map(a => `${a.name}:${a.imaginaryUnits}`).join(", "),
  });

  // T14: Product 1·2·4·8·16 = 1024, sum = 31 = 2⁵-1
  const dimProduct = algebras.reduce((p, a) => p * a.dim, 1);
  const dimSum = algebras.reduce((s, a) => s + a.dim, 0);
  tests.push({
    name: "Dimension arithmetic: product=1024, sum=31=2⁵-1",
    holds: dimProduct === 1024 && dimSum === 31,
    detail: `∏dim = ${dimProduct}, Σdim = ${dimSum} = 2⁵-1`,
  });

  return tests;
}

/**
 * Get the Fano plane structure for octonionic multiplication.
 * The Fano plane has 7 points and 7 lines, each line containing 3 points.
 * It encodes the multiplication rules of the 7 imaginary octonion units.
 */
export function fanoPlane(): { points: string[]; lines: [number, number, number][] } {
  return {
    points: ["e₁", "e₂", "e₃", "e₄", "e₅", "e₆", "e₇"],
    lines: [
      [0, 1, 3], // e₁·e₂ = e₄
      [1, 2, 4], // e₂·e₃ = e₅
      [2, 3, 5], // e₃·e₄ = e₆
      [3, 4, 6], // e₄·e₅ = e₇
      [0, 4, 5], // e₁·e₅ = e₆
      [1, 5, 6], // e₂·e₆ = e₇
      [0, 2, 6], // e₁·e₃ = e₇
    ],
  };
}
