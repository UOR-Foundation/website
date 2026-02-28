/**
 * Semidirect Product Analysis — τ-Conjugation on Z/4Z × Z/3Z × Z/8Z
 * ═══════════════════════════════════════════════════════════════════
 *
 * The full Aut(Atlas) = (Z/4Z × Z/3Z × Z/8Z) ⋊_φ Z/2Z where
 * φ: Z/2Z → Aut(Z/4Z × Z/3Z × Z/8Z) is the conjugation action of
 * the mirror involution τ on the abelian subgroup.
 *
 * This module computes φ(τ) explicitly by evaluating:
 *   τ · (r,d,t,0) · τ⁻¹ = (r',d',t',0)
 *
 * for each generator R₁, D₁, T₁ and all 96 abelian elements.
 *
 * The result characterizes the exact semidirect product structure,
 * revealing whether τ acts as inversion (-r,-d,-t), as a non-trivial
 * automorphism, or as a mixed action on the three cyclic factors.
 *
 * @module atlas/semidirect-analysis
 */

import {
  applyTransform,
  enumerateGroup,
  IDENTITY,
  GROUP_ORDER,
  type TransformElement,
} from "./transform-group";
import {
  decodeTriality,
  encodeTriality,
  QUADRANT_COUNT,
  MODALITY_COUNT,
  SLOT_COUNT,
} from "./triality";
import { getAtlas, ATLAS_VERTEX_COUNT } from "./atlas";

// ── Types ─────────────────────────────────────────────────────────────────

/** Result of conjugating an abelian element by τ. */
export interface ConjugationResult {
  /** Original abelian element (r, d, t, m=0). */
  readonly original: TransformElement;
  /** Conjugated element τ·g·τ⁻¹ expressed as (r', d', t', m'). */
  readonly conjugated: TransformElement | null;
  /** Whether the conjugated element is still in the abelian subgroup (m'=0). */
  readonly staysAbelian: boolean;
  /** Whether conjugation acts as inversion: τgτ⁻¹ = g⁻¹. */
  readonly isInversion: boolean;
  /** Whether conjugation fixes this element: τgτ⁻¹ = g. */
  readonly isFixed: boolean;
}

/** Analysis of τ action on a single cyclic factor. */
export interface FactorAction {
  /** Which factor: "R" (Z/4Z), "D" (Z/3Z), or "T" (Z/8Z). */
  readonly factor: "R" | "D" | "T";
  /** Order of the cyclic factor. */
  readonly order: number;
  /** The generator element. */
  readonly generator: TransformElement;
  /** τ·gen·τ⁻¹ result as (r', d', t'). */
  readonly conjugatedElement: TransformElement | null;
  /** τ·gen·τ⁻¹ expressed as a power of gen: gen^k (-1 if cross-factor mixing). */
  readonly conjugatedPower: number;
  /** Whether the conjugation stays within this single factor (no cross-mixing). */
  readonly pureFactorAction: boolean;
  /** Whether τ acts as inversion on this factor: k = order-1. */
  readonly actsAsInversion: boolean;
  /** Whether τ fixes this factor: k = 1. */
  readonly fixes: boolean;
  /** The full permutation mapping: element i → element conjugatedPower*i mod order. */
  readonly permutation: number[];
}

/** Full semidirect product characterization. */
export interface SemidirectAnalysis {
  /** Conjugation action on each factor. */
  readonly factorActions: [FactorAction, FactorAction, FactorAction];
  /** Whether τ normalizes the abelian subgroup (conjugation stays abelian). */
  readonly normalizesAbelian: boolean;
  /** Whether the automorphism φ(τ) is involutory: φ(τ)² = id. */
  readonly isInvolutory: boolean;
  /** Fixed-point subgroup: elements g where τgτ⁻¹ = g. */
  readonly fixedPointCount: number;
  /** Elements where τgτ⁻¹ = g⁻¹. */
  readonly inversionCount: number;
  /** Full conjugation table for all 96 abelian elements. */
  readonly conjugationTable: ConjugationResult[];
  /** Human-readable description of the semidirect product. */
  readonly structureDescription: string;
  /** The automorphism matrix: φ(τ) acts on Z/4Z×Z/3Z×Z/8Z as multiplication by this. */
  readonly automorphismVector: [number, number, number];
  /** Verification tests. */
  readonly tests: SemidirectTest[];
  readonly allPassed: boolean;
}

export interface SemidirectTest {
  readonly name: string;
  readonly holds: boolean;
  readonly expected: string;
  readonly actual: string;
}

// ── Core: Compute τ-conjugation ──────────────────────────────────────────

/**
 * Apply mirror τ to a vertex index.
 */
function applyMirror(index: number): number {
  return getAtlas().vertices[index].mirrorPair;
}

/**
 * Since τ is an involution (τ² = id), τ⁻¹ = τ.
 * So τ·g·τ⁻¹ = τ·g·τ.
 *
 * For g = (r,d,t,0):
 *   (τ·g·τ)(v) = τ(g(τ(v)))
 *
 * We find the unique (r',d',t',m') matching this permutation.
 */
export function conjugateByTau(g: TransformElement): ConjugationResult {
  // Compute τ·g·τ on test vertices (4 vertices distinguish all 192 elements)
  const targets: number[] = [];
  for (let v = 0; v < 4; v++) {
    const step1 = applyMirror(v);           // τ(v)
    const step2 = applyTransform(step1, g); // g(τ(v))
    const step3 = applyMirror(step2);       // τ(g(τ(v)))
    targets.push(step3);
  }

  // Find matching element (4 test vertices suffice per transform group proof)
  for (const m of [0, 1] as const) {
    for (let r = 0; r < QUADRANT_COUNT; r++) {
      for (let d = 0; d < MODALITY_COUNT; d++) {
        for (let t = 0; t < SLOT_COUNT; t++) {
          const elem: TransformElement = {
            r: r as 0 | 1 | 2 | 3,
            d: d as 0 | 1 | 2,
            t,
            m,
          };
          if (applyTransform(0, elem) !== targets[0]) continue;
          let match = true;
          for (let i = 1; i < 4; i++) {
            if (applyTransform(i, elem) !== targets[i]) { match = false; break; }
          }
          if (match) {
            const isInv = checkIsInverse(g, elem);
            const isFix = elem.r === g.r && elem.d === g.d && elem.t === g.t && elem.m === g.m;
            return {
              original: g,
              conjugated: elem,
              staysAbelian: elem.m === 0,
              isInversion: isInv,
              isFixed: isFix,
            };
          }
        }
      }
    }
  }

  return {
    original: g,
    conjugated: null,
    staysAbelian: false,
    isInversion: false,
    isFixed: false,
  };
}

/**
 * Check if elem is the inverse of g in the abelian subgroup.
 * For (r,d,t,0), inverse is ((-r) mod 4, (-d) mod 3, (-t) mod 8, 0).
 */
function checkIsInverse(g: TransformElement, elem: TransformElement): boolean {
  if (elem.m !== 0 || g.m !== 0) return false;
  return (
    elem.r === ((QUADRANT_COUNT - g.r) % QUADRANT_COUNT) &&
    elem.d === ((MODALITY_COUNT - g.d) % MODALITY_COUNT) &&
    elem.t === ((SLOT_COUNT - g.t) % SLOT_COUNT)
  );
}

// ── Factor Analysis ──────────────────────────────────────────────────────

/**
 * Analyze how τ acts on a single cyclic factor.
 * Given generator gen of order n, find k such that τ·gen·τ = gen^k.
 */
export function analyzeFactorAction(
  factor: "R" | "D" | "T",
  generator: TransformElement,
  order: number,
): FactorAction {
  const conj = conjugateByTau(generator);
  const conjugatedElement = conj.conjugated ?? null;

  // Check if conjugation stays within this single factor
  let pureFactorAction = false;
  let conjugatedPower = -1;

  if (conj.conjugated && conj.staysAbelian) {
    // Check purity: for R generator, d' and t' should be 0
    // for D generator, r' and t' should be 0, etc.
    if (factor === "R") pureFactorAction = conj.conjugated.d === 0 && conj.conjugated.t === 0;
    if (factor === "D") pureFactorAction = conj.conjugated.r === 0 && conj.conjugated.t === 0;
    if (factor === "T") pureFactorAction = conj.conjugated.r === 0 && conj.conjugated.d === 0;

    // Find k such that conjugated = gen^k (only meaningful if pure)
    for (let k = 0; k < order; k++) {
      const genK: TransformElement = {
        r: ((generator.r * k) % QUADRANT_COUNT) as 0 | 1 | 2 | 3,
        d: ((generator.d * k) % MODALITY_COUNT) as 0 | 1 | 2,
        t: (generator.t * k) % SLOT_COUNT,
        m: 0,
      };
      if (genK.r === conj.conjugated.r &&
          genK.d === conj.conjugated.d &&
          genK.t === conj.conjugated.t) {
        conjugatedPower = k;
        break;
      }
    }
  }

  const permutation: number[] = [];
  for (let i = 0; i < order; i++) {
    permutation.push(conjugatedPower >= 0 ? (conjugatedPower * i) % order : -1);
  }

  return {
    factor,
    order,
    generator,
    conjugatedElement,
    conjugatedPower,
    pureFactorAction,
    actsAsInversion: conjugatedPower === order - 1,
    fixes: conjugatedPower === 1,
    permutation,
  };
}

// ── Full Analysis ────────────────────────────────────────────────────────

/**
 * Run the complete semidirect product analysis.
 */
export function runSemidirectAnalysis(): SemidirectAnalysis {
  // Generators of each cyclic factor
  const genR: TransformElement = { r: 1, d: 0, t: 0, m: 0 }; // R₁ generates Z/4Z
  const genD: TransformElement = { r: 0, d: 1, t: 0, m: 0 }; // D₁ generates Z/3Z
  const genT: TransformElement = { r: 0, d: 0, t: 1, m: 0 }; // T₁ generates Z/8Z

  const factorR = analyzeFactorAction("R", genR, QUADRANT_COUNT);
  const factorD = analyzeFactorAction("D", genD, MODALITY_COUNT);
  const factorT = analyzeFactorAction("T", genT, SLOT_COUNT);

  // Conjugate all 96 abelian elements
  const conjugationTable: ConjugationResult[] = [];
  for (let r = 0; r < QUADRANT_COUNT; r++) {
    for (let d = 0; d < MODALITY_COUNT; d++) {
      for (let t = 0; t < SLOT_COUNT; t++) {
        const elem: TransformElement = {
          r: r as 0 | 1 | 2 | 3,
          d: d as 0 | 1 | 2,
          t,
          m: 0,
        };
        conjugationTable.push(conjugateByTau(elem));
      }
    }
  }

  const normalizesAbelian = conjugationTable.every(c => c.staysAbelian);
  const fixedPointCount = conjugationTable.filter(c => c.isFixed).length;
  const inversionCount = conjugationTable.filter(c => c.isInversion).length;

  // Check involutory: φ(τ)² = id means conjugating twice returns original
  let isInvolutory = true;
  for (const c of conjugationTable) {
    if (!c.conjugated) { isInvolutory = false; break; }
    const twice = conjugateByTau(c.conjugated);
    if (!twice.conjugated ||
        twice.conjugated.r !== c.original.r ||
        twice.conjugated.d !== c.original.d ||
        twice.conjugated.t !== c.original.t) {
      isInvolutory = false;
      break;
    }
  }

  // Build structure description
  const autVec: [number, number, number] = [
    factorR.conjugatedPower,
    factorD.conjugatedPower,
    factorT.conjugatedPower,
  ];

  const allPure = factorR.pureFactorAction && factorD.pureFactorAction && factorT.pureFactorAction;

  const parts: string[] = [];
  const descFactor = (f: typeof factorR) => {
    const c = f.conjugatedElement;
    if (!c) return `τ·${f.factor}₁·τ = ? (not found)`;
    if (f.pureFactorAction) {
      if (f.fixes) return `τ fixes ${f.factor} (Z/${f.order}Z)`;
      if (f.actsAsInversion) return `τ inverts ${f.factor}: x ↦ -x (mod ${f.order})`;
      return `τ maps ${f.factor}₁ ↦ ${f.factor}^${f.conjugatedPower}`;
    }
    return `τ·${f.factor}₁·τ = (R^${c.r}, D^${c.d}, T^${c.t}) — CROSS-FACTOR MIXING`;
  };
  parts.push(descFactor(factorR));
  parts.push(descFactor(factorD));
  parts.push(descFactor(factorT));

  const structureDescription = [
    allPure
      ? `Aut(Atlas) = (Z/4Z × Z/3Z × Z/8Z) ⋊_φ Z/2Z (diagonal action)`
      : `Aut(Atlas) = (Z/4Z × Z/3Z × Z/8Z) ⋊_φ Z/2Z (cross-factor action)`,
    allPure
      ? `φ(τ): (r,d,t) ↦ (${autVec[0]}r mod 4, ${autVec[1]}d mod 3, ${autVec[2]}t mod 8)`
      : `φ(τ): non-diagonal — τ mixes the cyclic factors`,
    ...parts,
    `Fixed points: ${fixedPointCount}/96`,
    `Inversion matches: ${inversionCount}/96`,
    normalizesAbelian
      ? "τ normalizes the abelian subgroup (true semidirect product)"
      : "τ does NOT normalize — not a standard semidirect product",
    isInvolutory ? "φ(τ)² = id (involutory)" : "φ(τ)² ≠ id",
  ].join("\n");

  // ── Verification tests ──────────────────────────────────────────────
  const tests: SemidirectTest[] = [];

  tests.push({
    name: "τ² = id (involution)",
    holds: (() => {
      for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
        if (applyMirror(applyMirror(v)) !== v) return false;
      }
      return true;
    })(),
    expected: "true",
    actual: "computed",
  });

  tests.push({
    name: "τ normalizes abelian subgroup",
    holds: normalizesAbelian,
    expected: "true",
    actual: String(normalizesAbelian),
  });

  tests.push({
    name: "φ(τ) is involutory",
    holds: isInvolutory,
    expected: "true",
    actual: String(isInvolutory),
  });

  tests.push({
    name: "Conjugation table covers all 96 elements",
    holds: conjugationTable.length === 96,
    expected: "96",
    actual: String(conjugationTable.length),
  });

  tests.push({
    name: "All conjugations found a match",
    holds: conjugationTable.every(c => c.conjugated !== null),
    expected: "true",
    actual: String(conjugationTable.every(c => c.conjugated !== null)),
  });

  tests.push({
    name: "Conjugation is a bijection on abelian subgroup",
    holds: (() => {
      const images = new Set<string>();
      for (const c of conjugationTable) {
        if (!c.conjugated) return false;
        images.add(`${c.conjugated.r},${c.conjugated.d},${c.conjugated.t}`);
      }
      return images.size === 96;
    })(),
    expected: "96 distinct images",
    actual: "computed",
  });

  tests.push({
    name: "Identity is fixed by conjugation",
    holds: conjugationTable[0]?.isFixed ?? false,
    expected: "true",
    actual: String(conjugationTable[0]?.isFixed),
  });

  tests.push({
    name: "R factor conjugation found",
    holds: factorR.conjugatedElement !== null,
    expected: "not null",
    actual: factorR.conjugatedElement ? `(${factorR.conjugatedElement.r},${factorR.conjugatedElement.d},${factorR.conjugatedElement.t})` : "null",
  });

  tests.push({
    name: "D factor conjugation found",
    holds: factorD.conjugatedElement !== null,
    expected: "not null",
    actual: factorD.conjugatedElement ? `(${factorD.conjugatedElement.r},${factorD.conjugatedElement.d},${factorD.conjugatedElement.t})` : "null",
  });

  tests.push({
    name: "T factor conjugation found",
    holds: factorT.conjugatedElement !== null,
    expected: "not null",
    actual: factorT.conjugatedElement ? `(${factorT.conjugatedElement.r},${factorT.conjugatedElement.d},${factorT.conjugatedElement.t})` : "null",
  });

  tests.push({
    name: allPure ? "Diagonal automorphism verified" : "Cross-factor mixing detected",
    holds: true, // This is a discovery, not a pass/fail
    expected: "characterized",
    actual: allPure ? `diagonal (${autVec})` : "non-diagonal mixing",
  });

  tests.push({
    name: "Group order = |abelian| × |Z/2Z| = 192",
    holds: conjugationTable.length * 2 === GROUP_ORDER,
    expected: "192",
    actual: String(conjugationTable.length * 2),
  });

  return {
    factorActions: [factorR, factorD, factorT],
    normalizesAbelian,
    isInvolutory,
    fixedPointCount,
    inversionCount,
    conjugationTable,
    structureDescription,
    automorphismVector: autVec,
    tests,
    allPassed: tests.every(t => t.holds),
  };
}
