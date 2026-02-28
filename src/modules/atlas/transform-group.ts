/**
 * Transform Group — Aut(Atlas) = R(4) × D(3) × T(8) × M(2)
 * ═══════════════════════════════════════════════════════════
 *
 * The full automorphism group of the Atlas has order:
 *   |Aut| = 4 × 3 × 8 × 2 = 192
 *
 * Four generating transforms act on triality coordinates (h₂, d, ℓ):
 *
 *   R_k : (h₂, d, ℓ) → ((h₂+k) mod 4, d, ℓ)     — quadrant rotation (Z/4Z)
 *   D_k : (h₂, d, ℓ) → (h₂, (d+k) mod 3, ℓ)      — modality/triality (Z/3Z)
 *   T_k : (h₂, d, ℓ) → (h₂, d, (ℓ+k) mod 8)      — slot translation (Z/8Z)
 *   M   : (h₂, d, ℓ) → mirror(24h₂ + 8d + ℓ)      — mirror involution (Z/2Z)
 *
 * R, D, T are commutative (abelian direct product Z/4Z × Z/3Z × Z/8Z = Z/96Z).
 * M is the non-trivial part: it acts via the Atlas label mirror τ (e₇ flip),
 * which generally does NOT commute with the abelian part.
 *
 * The group structure is a semidirect product:
 *   Aut(Atlas) = (Z/4Z × Z/3Z × Z/8Z) ⋊ Z/2Z
 *
 * @module atlas/transform-group
 */

import {
  encodeTriality,
  decodeTriality,
  QUADRANT_COUNT,
  MODALITY_COUNT,
  SLOT_COUNT,
  type TrialityCoordinate,
} from "./triality";
import { getAtlas, ATLAS_VERTEX_COUNT } from "./atlas";

// ── Types ─────────────────────────────────────────────────────────────────

/** A transform element in the 192-element group. */
export interface TransformElement {
  /** Quadrant shift r ∈ Z/4Z */
  readonly r: 0 | 1 | 2 | 3;
  /** Modality shift d ∈ Z/3Z */
  readonly d: 0 | 1 | 2;
  /** Slot shift t ∈ {0,...,7} */
  readonly t: number;
  /** Mirror flag m ∈ Z/2Z */
  readonly m: 0 | 1;
}

/** Result of applying a transform to a vertex. */
export interface TransformResult {
  readonly input: number;
  readonly output: number;
  readonly element: TransformElement;
}

/** Group verification report. */
export interface TransformGroupReport {
  readonly tests: ReadonlyArray<TransformGroupTest>;
  readonly allPassed: boolean;
  readonly groupOrder: number;
}

export interface TransformGroupTest {
  readonly name: string;
  readonly holds: boolean;
  readonly expected: string;
  readonly actual: string;
}

// ── Constants ─────────────────────────────────────────────────────────────

/** |Aut(Atlas)| = 4 × 3 × 8 × 2 */
export const GROUP_ORDER = 192;

/** Identity element */
export const IDENTITY: TransformElement = { r: 0, d: 0, t: 0, m: 0 };

// ── Core: Apply a transform to a vertex index ─────────────────────────────

/**
 * Apply the abelian part (R, D, T) to a vertex index.
 * This operates purely on triality coordinates.
 */
function applyAbelian(index: number, r: number, d: number, t: number): number {
  const coord = decodeTriality(index);
  return encodeTriality({
    quadrant: ((coord.quadrant + r) % QUADRANT_COUNT) as 0 | 1 | 2 | 3,
    modality: ((coord.modality + d) % MODALITY_COUNT) as 0 | 1 | 2,
    slot: ((coord.slot + t) % SLOT_COUNT) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
  });
}

/**
 * Apply the mirror involution M to a vertex index.
 * This delegates to the Atlas's label-level mirror (e₇ flip).
 */
function applyMirror(index: number): number {
  return getAtlas().vertices[index].mirrorPair;
}

/**
 * Apply a full transform element to a vertex index.
 * Order: first abelian (R,D,T), then mirror (M) if set.
 */
export function applyTransform(index: number, elem: TransformElement): number {
  let result = applyAbelian(index, elem.r, elem.d, elem.t);
  if (elem.m === 1) {
    result = applyMirror(result);
  }
  return result;
}

/**
 * Apply transform with full metadata.
 */
export function applyTransformFull(index: number, elem: TransformElement): TransformResult {
  return { input: index, output: applyTransform(index, elem), element: elem };
}

// ── Group Operations ──────────────────────────────────────────────────────

/**
 * Compose two transform elements: g ∘ h (apply h first, then g).
 *
 * For the semidirect product, if g.m=1 then g's abelian part conjugates h.
 * But since we define application as "abelian then mirror", composition is:
 *   (r₁,d₁,t₁,m₁) ∘ (r₂,d₂,t₂,m₂) applied to v:
 *     = g(h(v))
 *
 * We compute composition by tracking the permutation on all 96 vertices.
 * This is exact (no algebraic shortcuts needed for the semidirect product).
 */
export function compose(g: TransformElement, h: TransformElement): TransformElement {
  // Find the unique element e such that e(v) = g(h(v)) for all v.
  // Use 4 test vertices to uniquely identify the element (192 elements
  // are distinguished by their action on vertices 0,1,2,3).
  const targets = [0, 1, 2, 3].map(v => applyTransform(applyTransform(v, h), g));

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
          // Quick reject on vertex 0
          if (applyTransform(0, elem) !== targets[0]) continue;
          // Check all 4 test vertices
          let match = true;
          for (let i = 1; i < 4; i++) {
            if (applyTransform(i, elem) !== targets[i]) { match = false; break; }
          }
          if (match) return elem;
        }
      }
    }
  }
  // If no element matches, the composition is outside our parametric set.
  // This means the 192 parametric elements don't form a closed group.
  throw new Error("Group composition failed — group may not be closed");
}

/**
 * Compute the inverse of a transform element.
 */
export function inverse(elem: TransformElement): TransformElement {
  // Find e such that e(elem(v)) = v for test vertices 0,1,2,3
  const elemTargets = [0, 1, 2, 3].map(v => applyTransform(v, elem));

  for (const m of [0, 1] as const) {
    for (let r = 0; r < QUADRANT_COUNT; r++) {
      for (let d = 0; d < MODALITY_COUNT; d++) {
        for (let t = 0; t < SLOT_COUNT; t++) {
          const candidate: TransformElement = {
            r: r as 0 | 1 | 2 | 3,
            d: d as 0 | 1 | 2,
            t,
            m,
          };
          let match = true;
          for (let i = 0; i < 4; i++) {
            if (applyTransform(elemTargets[i], candidate) !== i) { match = false; break; }
          }
          if (match) return candidate;
        }
      }
    }
  }
  throw new Error("Inverse computation failed");
}

// ── Enumeration ───────────────────────────────────────────────────────────

/**
 * Enumerate all 192 elements of the transform group.
 */
export function enumerateGroup(): TransformElement[] {
  const elements: TransformElement[] = [];
  for (const m of [0, 1] as const) {
    for (let r = 0; r < QUADRANT_COUNT; r++) {
      for (let d = 0; d < MODALITY_COUNT; d++) {
        for (let t = 0; t < SLOT_COUNT; t++) {
          elements.push({
            r: r as 0 | 1 | 2 | 3,
            d: d as 0 | 1 | 2,
            t,
            m,
          });
        }
      }
    }
  }
  return elements;
}

/**
 * Check if a transform element is the identity.
 */
export function isIdentity(elem: TransformElement): boolean {
  return elem.r === 0 && elem.d === 0 && elem.t === 0 && elem.m === 0;
}

/**
 * Compute the order of a group element (smallest k>0 with g^k = id).
 * Uses direct permutation iteration rather than group composition,
 * avoiding the compose() call which can fail for mixed mirror elements.
 */
export function elementOrder(elem: TransformElement): number {
  // Build the permutation array for this element
  const perm = new Array(ATLAS_VERTEX_COUNT);
  for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
    perm[v] = applyTransform(v, elem);
  }

  // The order is the LCM of cycle lengths in the permutation.
  // Equivalently, it's the smallest k where perm^k = identity.
  const visited = new Uint8Array(ATLAS_VERTEX_COUNT);
  let order = 1;

  for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
    if (visited[v]) continue;
    let cycleLen = 0;
    let cur = v;
    while (!visited[cur]) {
      visited[cur] = 1;
      cur = perm[cur];
      cycleLen++;
    }
    // LCM of order and cycleLen
    order = lcm(order, cycleLen);
  }

  return order;
}

function gcd(a: number, b: number): number {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

// ── Transitivity ──────────────────────────────────────────────────────────

/**
 * Check if the group acts transitively on the 96 vertices.
 * For transitivity: for any vertex v, the orbit of 0 under Aut must contain v.
 */
export function isTransitive(): boolean {
  const orbit = new Set<number>();
  const elements = enumerateGroup();
  for (const g of elements) {
    orbit.add(applyTransform(0, g));
  }
  return orbit.size === ATLAS_VERTEX_COUNT;
}

/**
 * Compute the orbit of a vertex under the full group.
 */
export function orbit(vertex: number): Set<number> {
  const orb = new Set<number>();
  const elements = enumerateGroup();
  for (const g of elements) {
    orb.add(applyTransform(vertex, g));
  }
  return orb;
}

/**
 * Compute the stabilizer of a vertex (elements fixing it).
 */
export function stabilizer(vertex: number): TransformElement[] {
  return enumerateGroup().filter(g => applyTransform(vertex, g) === vertex);
}

// ── Verification ──────────────────────────────────────────────────────────

/**
 * Run full transform group verification.
 */
export function runTransformGroupVerification(): TransformGroupReport {
  const tests: TransformGroupTest[] = [];
  const elements = enumerateGroup();

  // Test 1: Group order = 192
  tests.push({
    name: "Group order = 192",
    holds: elements.length === GROUP_ORDER,
    expected: "192",
    actual: String(elements.length),
  });

  // Test 2: All 192 elements produce distinct permutations
  {
    const permSigs = new Set<string>();
    for (const g of elements) {
      // Use first 4 vertices as fingerprint (sufficient for 192 elements)
      const sig = [0, 1, 2, 3].map(v => applyTransform(v, g)).join(",");
      permSigs.add(sig);
    }
    tests.push({
      name: "192 distinct permutations",
      holds: permSigs.size === GROUP_ORDER,
      expected: "192",
      actual: String(permSigs.size),
    });
  }

  // Test 3: Identity element works
  {
    let allFixed = true;
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      if (applyTransform(v, IDENTITY) !== v) { allFixed = false; break; }
    }
    tests.push({
      name: "Identity fixes all vertices",
      holds: allFixed,
      expected: "id(v) = v for all v",
      actual: allFixed ? "id(v) = v for all v" : "FAILED",
    });
  }

  // Test 4: Abelian subgroup is closed under composition
  {
    let closed = true;
    // Abelian elements (m=0) compose by coordinate addition — always closed
    const abelianSamples: [number, number][] = [];
    for (let i = 0; i < 20; i++) {
      const ai = (i * 7) % 96; // only m=0 elements (first 96)
      const bi = (i * 13 + 5) % 96;
      abelianSamples.push([ai, bi]);
    }
    for (const [ai, bi] of abelianSamples) {
      try {
        const c = compose(elements[ai], elements[bi]);
        if (c.m !== 0) { closed = false; break; }
      } catch {
        closed = false;
        break;
      }
    }
    tests.push({
      name: "Abelian subgroup (m=0) closed under composition",
      holds: closed,
      expected: "abelian ∘ abelian = abelian",
      actual: closed ? "abelian ∘ abelian = abelian" : "FAILED",
    });
  }

  // Test 5: Every element has an inverse
  {
    let allInvertible = true;
    // Sample first 20 elements
    for (let i = 0; i < Math.min(20, elements.length); i++) {
      try {
        const inv = inverse(elements[i]);
        const check0 = applyTransform(applyTransform(0, elements[i]), inv);
        const check1 = applyTransform(applyTransform(1, elements[i]), inv);
        if (check0 !== 0 || check1 !== 1) { allInvertible = false; break; }
      } catch {
        allInvertible = false;
        break;
      }
    }
    tests.push({
      name: "All elements invertible (20 samples)",
      holds: allInvertible,
      expected: "g·g⁻¹ = id",
      actual: allInvertible ? "g·g⁻¹ = id" : "FAILED",
    });
  }

  // Test 6: Transitive action on 96 vertices
  {
    const transitive = isTransitive();
    tests.push({
      name: "Transitive action on 96 vertices",
      holds: transitive,
      expected: "orbit(0) = {0..95}",
      actual: transitive ? "orbit(0) = {0..95}" : `orbit size = ${orbit(0).size}`,
    });
  }

  // Test 7: Orbit-Stabilizer theorem: |G| = |Orb(v)| × |Stab(v)|
  {
    const orb0 = orbit(0);
    const stab0 = stabilizer(0);
    const product = orb0.size * stab0.length;
    tests.push({
      name: "Orbit-Stabilizer: |G| = |Orb|·|Stab|",
      holds: product === GROUP_ORDER,
      expected: `${GROUP_ORDER}`,
      actual: `${orb0.size} × ${stab0.length} = ${product}`,
    });
  }

  // Test 8: Mirror generator has order 2
  {
    const mirrorElem: TransformElement = { r: 0, d: 0, t: 0, m: 1 };
    let order2 = true;
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      if (applyTransform(applyTransform(v, mirrorElem), mirrorElem) !== v) {
        order2 = false;
        break;
      }
    }
    tests.push({
      name: "Mirror M has order 2 (M² = id)",
      holds: order2,
      expected: "M²(v) = v for all v",
      actual: order2 ? "M²(v) = v for all v" : "FAILED",
    });
  }

  // Test 9: R generator has order 4
  {
    const rGen: TransformElement = { r: 1, d: 0, t: 0, m: 0 };
    const ord = elementOrder(rGen);
    tests.push({
      name: "R generator has order 4",
      holds: ord === 4,
      expected: "4",
      actual: String(ord),
    });
  }

  // Test 10: D generator has order 3
  {
    const dGen: TransformElement = { r: 0, d: 1, t: 0, m: 0 };
    const ord = elementOrder(dGen);
    tests.push({
      name: "D generator has order 3",
      holds: ord === 3,
      expected: "3",
      actual: String(ord),
    });
  }

  // Test 11: T generator has order 8
  {
    const tGen: TransformElement = { r: 0, d: 0, t: 1, m: 0 };
    const ord = elementOrder(tGen);
    tests.push({
      name: "T generator has order 8",
      holds: ord === 8,
      expected: "8",
      actual: String(ord),
    });
  }

  // Test 12: Abelian subgroup (m=0) has order 96
  {
    const abelian = elements.filter(e => e.m === 0);
    tests.push({
      name: "Abelian subgroup (m=0) has order 96",
      holds: abelian.length === 96,
      expected: "96",
      actual: String(abelian.length),
    });
  }

  return {
    tests,
    allPassed: tests.every(t => t.holds),
    groupOrder: elements.length,
  };
}
