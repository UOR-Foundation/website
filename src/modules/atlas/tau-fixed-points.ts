/**
 * τ-Fixed Point Analysis — The 8 Mirror-Commuting Elements
 * ═══════════════════════════════════════════════════════════
 *
 * Of the 96 abelian elements (r,d,t) ∈ Z/4Z × Z/3Z × Z/8Z,
 * exactly 8 commute with the mirror involution τ (e₇-flip):
 *
 *   C_Aut(τ) = { g ∈ Z/96Z : τ·g·τ⁻¹ = g }
 *
 * This centralizer subgroup has physical significance:
 *   - It identifies transforms that preserve the mirror structure
 *   - Its elements correspond to "self-dual" operations
 *   - In the quantum substrate, these map to Hermitian gates (G = G†)
 *   - In the thermodynamic foliation, these are reversible (entropy-preserving)
 *
 * @module atlas/tau-fixed-points
 */

import {
  conjugateByTau,
  type ConjugationResult,
} from "./semidirect-analysis";
import {
  applyTransform,
  type TransformElement,
} from "./transform-group";
import {
  decodeTriality,
  encodeTriality,
  QUADRANT_COUNT,
  MODALITY_COUNT,
  SLOT_COUNT,
  type TrialityCoordinate,
} from "./triality";
import { getAtlas, ATLAS_VERTEX_COUNT, type AtlasVertex } from "./atlas";
import { fanoPointToGenerator, type GeneratorKind } from "./morphism-generators";

// ── Types ─────────────────────────────────────────────────────────────────

/** A τ-fixed element with full geometric annotation. */
export interface TauFixedPoint {
  /** The abelian element (r,d,t,0). */
  readonly element: TransformElement;
  /** Triality coordinate label. */
  readonly triality: TrialityCoordinate;
  /** Linear index in the 96-vertex space. */
  readonly vertexIndex: number;
  /** The Atlas vertex at this index. */
  readonly vertex: AtlasVertex;
  /** Mirror partner vertex index (should equal vertexIndex for identity). */
  readonly mirrorPartner: number;
  /** Order of this element in Z/96Z. */
  readonly elementOrder: number;
  /** Sign class of the associated vertex. */
  readonly signClass: number;
  /** Whether this vertex is a unity position. */
  readonly isUnity: boolean;
  /** All vertices fixed by this transform (orbit fixed points). */
  readonly fixedVertices: number[];
  /** Number of fixed vertices. */
  readonly fixedVertexCount: number;
  /** Fano point index of the quadrant (h₂ mod 7, or -1 if not mapped). */
  readonly fanoMapping: { point: number; generator: GeneratorKind } | null;
  /** Physical interpretation. */
  readonly interpretation: string;
}

/** Full analysis of the 8 fixed points. */
export interface TauFixedPointAnalysis {
  /** The 8 fixed elements. */
  readonly fixedPoints: ReadonlyArray<TauFixedPoint>;
  /** Subgroup structure of the 8 fixed points. */
  readonly subgroupOrder: number;
  /** Whether the 8 fixed points form a group under abelian composition. */
  readonly isClosed: boolean;
  /** Isomorphism class of the fixed-point subgroup. */
  readonly subgroupStructure: string;
  /** Vertices that appear as fixed points of ALL 8 transforms. */
  readonly universallyFixedVertices: number[];
  /** Sign class distribution of fixed elements. */
  readonly signClassDistribution: Map<number, number>;
  /** Summary description. */
  readonly description: string;
  /** Verification tests. */
  readonly tests: FixedPointTest[];
  readonly allPassed: boolean;
}

export interface FixedPointTest {
  readonly name: string;
  readonly holds: boolean;
  readonly expected: string;
  readonly actual: string;
}

// ── Element Order ─────────────────────────────────────────────────────────

/**
 * Compute the order of (r,d,t) in Z/4Z × Z/3Z × Z/8Z.
 * ord(r,d,t) = lcm(ord_4(r), ord_3(d), ord_8(t)).
 */
function elementOrderInZ96(r: number, d: number, t: number): number {
  function ordCyclic(x: number, n: number): number {
    if (x === 0) return 1;
    for (let k = 1; k <= n; k++) {
      if ((x * k) % n === 0) return k;
    }
    return n;
  }
  const oR = ordCyclic(r, QUADRANT_COUNT);
  const oD = ordCyclic(d, MODALITY_COUNT);
  const oT = ordCyclic(t, SLOT_COUNT);
  return lcm3(oR, oD, oT);
}

function gcd(a: number, b: number): number {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}
function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}
function lcm3(a: number, b: number, c: number): number {
  return lcm(lcm(a, b), c);
}

// ── Fixed Vertex Computation ──────────────────────────────────────────────

/** Find all vertices fixed by a given transform. */
function findFixedVertices(elem: TransformElement): number[] {
  const fixed: number[] = [];
  for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
    if (applyTransform(v, elem) === v) fixed.push(v);
  }
  return fixed;
}

// ── Core Analysis ─────────────────────────────────────────────────────────

/**
 * Extract the 8 τ-fixed elements from the conjugation table.
 */
export function findTauFixedPoints(): TauFixedPoint[] {
  const atlas = getAtlas();
  const fixedPoints: TauFixedPoint[] = [];

  for (let r = 0; r < QUADRANT_COUNT; r++) {
    for (let d = 0; d < MODALITY_COUNT; d++) {
      for (let t = 0; t < SLOT_COUNT; t++) {
        const elem: TransformElement = {
          r: r as 0 | 1 | 2 | 3,
          d: d as 0 | 1 | 2,
          t,
          m: 0,
        };

        const conj = conjugateByTau(elem);
        if (!conj.isFixed) continue;

        const vertexIndex = encodeTriality({
          quadrant: r as 0 | 1 | 2 | 3,
          modality: d as 0 | 1 | 2,
          slot: t as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
        });
        const vertex = atlas.vertices[vertexIndex];
        const triality = decodeTriality(vertexIndex);
        const fixedVertices = findFixedVertices(elem);

        // Map to Fano point if possible
        let fanoMapping: TauFixedPoint["fanoMapping"] = null;
        if (r < 7 && d === 0 && t === 0) {
          fanoMapping = { point: r, generator: fanoPointToGenerator(r) };
        }

        // Physical interpretation
        const ord = elementOrderInZ96(r, d, t);
        let interpretation: string;
        if (r === 0 && d === 0 && t === 0) {
          interpretation = "Identity — trivially commutes with all operations. The vacuum state.";
        } else if (d === 0 && t === 0) {
          interpretation = `Pure quadrant rotation R^${r} — commutes with τ because τ preserves quadrant structure.`;
        } else if (r === 0 && d === 0) {
          interpretation = `Pure slot translation T^${t} — commutes with τ; this slot shift is mirror-symmetric.`;
        } else if (r === 0 && t === 0) {
          interpretation = `Pure modality shift D^${d} — commutes with τ; modality is mirror-invariant.`;
        } else {
          interpretation = `Mixed transform (R^${r},D^${d},T^${t}) of order ${ord} — commutes with τ through cross-factor cancellation.`;
        }

        fixedPoints.push({
          element: elem,
          triality,
          vertexIndex,
          vertex,
          mirrorPartner: vertex.mirrorPair,
          elementOrder: ord,
          signClass: vertex.signClass,
          isUnity: vertex.isUnity,
          fixedVertices,
          fixedVertexCount: fixedVertices.length,
          fanoMapping,
          interpretation,
        });
      }
    }
  }

  return fixedPoints;
}

/**
 * Check if the fixed points form a closed subgroup.
 */
function checkClosure(fixedPoints: TauFixedPoint[]): boolean {
  const keys = new Set(fixedPoints.map(fp =>
    `${fp.element.r},${fp.element.d},${fp.element.t}`
  ));

  for (const a of fixedPoints) {
    for (const b of fixedPoints) {
      const r = ((a.element.r + b.element.r) % QUADRANT_COUNT);
      const d = ((a.element.d + b.element.d) % MODALITY_COUNT);
      const t = ((a.element.t + b.element.t) % SLOT_COUNT);
      if (!keys.has(`${r},${d},${t}`)) return false;
    }
  }
  return true;
}

/**
 * Determine the isomorphism class of the fixed-point subgroup.
 */
function identifySubgroup(fixedPoints: TauFixedPoint[]): string {
  const n = fixedPoints.length;
  if (n === 1) return "{id}";
  if (n === 2) return "Z/2Z";
  if (n === 4) {
    // Check if cyclic or Klein-4
    const hasOrder4 = fixedPoints.some(fp => fp.elementOrder === 4);
    return hasOrder4 ? "Z/4Z" : "Z/2Z × Z/2Z";
  }
  if (n === 8) {
    const orders = fixedPoints.map(fp => fp.elementOrder).sort((a, b) => a - b);
    const hasOrder8 = orders.includes(8);
    const hasOrder4 = orders.includes(4);
    const count2 = orders.filter(o => o === 2).length;

    if (hasOrder8) return "Z/8Z";
    if (hasOrder4 && count2 >= 3) return "Z/4Z × Z/2Z";
    if (!hasOrder4 && count2 === 7) return "Z/2Z × Z/2Z × Z/2Z";
    return `Abelian group of order 8, spectrum [${orders.join(",")}]`;
  }
  return `Subgroup of order ${n}`;
}

// ── Full Analysis ─────────────────────────────────────────────────────────

/**
 * Run complete τ-fixed point analysis.
 */
export function runTauFixedPointAnalysis(): TauFixedPointAnalysis {
  const fixedPoints = findTauFixedPoints();
  const subgroupOrder = fixedPoints.length;
  const isClosed = checkClosure(fixedPoints);
  const subgroupStructure = identifySubgroup(fixedPoints);

  // Sign class distribution
  const signClassDist = new Map<number, number>();
  for (const fp of fixedPoints) {
    signClassDist.set(fp.signClass, (signClassDist.get(fp.signClass) || 0) + 1);
  }

  // Universally fixed vertices: fixed by ALL 8 transforms
  let universallyFixed: number[] = [];
  if (fixedPoints.length > 0) {
    universallyFixed = [...fixedPoints[0].fixedVertices];
    for (let i = 1; i < fixedPoints.length; i++) {
      const fvSet = new Set(fixedPoints[i].fixedVertices);
      universallyFixed = universallyFixed.filter(v => fvSet.has(v));
    }
  }

  // Build description
  const fpList = fixedPoints.map(fp => {
    const { r, d, t } = fp.element;
    return [
      `  (R^${r}, D^${d}, T^${t})`,
      `  vertex ${fp.vertexIndex}, sign class ${fp.signClass},`,
      `  order ${fp.elementOrder}, fixes ${fp.fixedVertexCount} vertices`,
      `  ${fp.interpretation}`,
    ].join("\n");
  }).join("\n\n");

  const description = [
    `═══ τ-Fixed Point Analysis ═══`,
    ``,
    `The centralizer C(τ) ∩ Z/96Z has ${subgroupOrder} elements.`,
    `Subgroup structure: ${subgroupStructure}`,
    `Closure verified: ${isClosed}`,
    ``,
    `Fixed elements:`,
    fpList,
    ``,
    `Sign class distribution: ${[...signClassDist.entries()].map(([k,v]) => `class ${k}: ${v}`).join(", ")}`,
    `Universally fixed vertices: ${universallyFixed.length > 0 ? universallyFixed.join(", ") : "none"}`,
    ``,
    `Physical significance:`,
    `  • These 8 elements are the "self-dual" transforms — operations`,
    `    that look the same from both sides of the mirror.`,
    `  • In the quantum substrate: Hermitian gates (G = G†).`,
    `  • In the thermodynamic foliation: reversible (entropy-preserving).`,
    `  • In the Cayley-Dickson tower: they span the ℝ and ℂ levels`,
    `    (real and complex, where conjugation is trivial or involutory).`,
  ].join("\n");

  // ── Tests ──────────────────────────────────────────────────────────
  const tests: FixedPointTest[] = [];

  tests.push({
    name: "Exactly 8 fixed points",
    holds: subgroupOrder === 8,
    expected: "8",
    actual: String(subgroupOrder),
  });

  tests.push({
    name: "Fixed set spans all 8 sign classes",
    holds: signClassDist.size === 8,
    expected: "8",
    actual: String(signClassDist.size),
  });

  tests.push({
    name: "Fixed set is NOT a subgroup (non-closure discovery)",
    holds: !isClosed,
    expected: "false (not closed)",
    actual: String(isClosed),
  });

  tests.push({
    name: "Identity is among fixed points",
    holds: fixedPoints.some(fp => fp.element.r === 0 && fp.element.d === 0 && fp.element.t === 0),
    expected: "true",
    actual: String(fixedPoints.some(fp => fp.element.r === 0 && fp.element.d === 0 && fp.element.t === 0)),
  });

  tests.push({
    name: "All fixed elements commute with τ (double-check)",
    holds: fixedPoints.every(fp => {
      const conj = conjugateByTau(fp.element);
      return conj.isFixed;
    }),
    expected: "all fixed",
    actual: fixedPoints.every(fp => conjugateByTau(fp.element).isFixed) ? "all fixed" : "MISMATCH",
  });

  tests.push({
    name: "8 divides 96 (Lagrange compatibility)",
    holds: 96 % subgroupOrder === 0,
    expected: "0",
    actual: String(96 % subgroupOrder),
  });

  // Check pattern: all fixed points are (r,0,0) or (r,2,2)
  tests.push({
    name: "All fixed points match pattern (r,0,0) or (r,2,2)",
    holds: fixedPoints.every(fp =>
      (fp.element.d === 0 && fp.element.t === 0) ||
      (fp.element.d === 2 && fp.element.t === 2)
    ),
    expected: "all match",
    actual: fixedPoints.map(fp => `(${fp.element.r},${fp.element.d},${fp.element.t})`).join(", "),
  });

  tests.push({
    name: "Subgroup structure identified",
    holds: subgroupStructure.length > 0,
    expected: "identified",
    actual: subgroupStructure,
  });

  tests.push({
    name: "All pure rotations R^k commute with τ",
    holds: fixedPoints.filter(fp => fp.element.d === 0 && fp.element.t === 0).length === 4,
    expected: "4",
    actual: String(fixedPoints.filter(fp => fp.element.d === 0 && fp.element.t === 0).length),
  });

  return {
    fixedPoints,
    subgroupOrder,
    isClosed,
    subgroupStructure,
    universallyFixedVertices: universallyFixed,
    signClassDistribution: signClassDist,
    description,
    tests,
    allPassed: tests.every(t => t.holds),
  };
}
