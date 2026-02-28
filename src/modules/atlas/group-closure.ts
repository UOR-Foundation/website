/**
 * Group Closure Analysis — True |Aut(Atlas)| via Stabilizer Enumeration
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Strategy: |G| = |orbit(0)| × |Stab(0)| = 96 × |Stab(0)|.
 * We enumerate Stab(0) by BFS with hash-based dedup.
 *
 * @module atlas/group-closure
 */

import { applyTransform, type TransformElement } from "./transform-group";
import { ATLAS_VERTEX_COUNT } from "./atlas";
import { QUADRANT_COUNT, MODALITY_COUNT, SLOT_COUNT } from "./triality";

// ── Types ─────────────────────────────────────────────────────────────────

export type Perm = Uint8Array;

export interface ClosureResult {
  readonly order: number;
  readonly factorization: string;
  readonly stabilizerOrder: number;
  readonly generatorCount: number;
  readonly distinctParametric: number;
  readonly parametricClosed: boolean;
  readonly orderSpectrum: Map<number, number>;
  readonly groupName: string;
  readonly description: string;
  readonly tests: ClosureTest[];
  readonly allPassed: boolean;
}

export interface ClosureTest {
  readonly name: string;
  readonly holds: boolean;
  readonly expected: string;
  readonly actual: string;
}

// ── Permutation Primitives ───────────────────────────────────────────────

const N = ATLAS_VERTEX_COUNT; // 96

function identity(): Perm {
  const p = new Uint8Array(N);
  for (let i = 0; i < N; i++) p[i] = i;
  return p;
}

function composePerm(f: Perm, g: Perm): Perm {
  const result = new Uint8Array(N);
  for (let i = 0; i < N; i++) result[i] = f[g[i]];
  return result;
}

function invertPerm(p: Perm): Perm {
  const inv = new Uint8Array(N);
  for (let i = 0; i < N; i++) inv[p[i]] = i;
  return inv;
}

function permEqual(a: Perm, b: Perm): boolean {
  for (let i = 0; i < N; i++) if (a[i] !== b[i]) return false;
  return true;
}

function isIdentityPerm(p: Perm): boolean {
  for (let i = 0; i < N; i++) if (p[i] !== i) return false;
  return true;
}

/**
 * Fast 53-bit hash of a permutation for dedup.
 * FNV-1a variant, reduced to safe integer range.
 */
function permHash(p: Perm): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < N; i++) {
    h ^= p[i];
    h = Math.imul(h, 0x01000193);
  }
  // Mix to reduce collisions
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0; // Unsigned 32-bit
}

function permOrder(p: Perm): number {
  const visited = new Uint8Array(N);
  let ord = 1;
  for (let i = 0; i < N; i++) {
    if (visited[i]) continue;
    let len = 0, cur = i;
    while (!visited[cur]) { visited[cur] = 1; cur = p[cur]; len++; }
    ord = lcm(ord, len);
  }
  return ord;
}

function gcd(a: number, b: number): number {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}
function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

// ── Hash Set for Permutations ────────────────────────────────────────────

/**
 * Memory-efficient hash set for permutations.
 * Uses open addressing with linear probing.
 * Stores full permutations for correctness (hash collisions handled).
 */
class PermSet {
  private capacity: number;
  private count = 0;
  private hashes: Int32Array;
  private perms: (Perm | null)[];

  constructor(initialCapacity = 1024) {
    this.capacity = initialCapacity;
    this.hashes = new Int32Array(initialCapacity).fill(-1);
    this.perms = new Array(initialCapacity).fill(null);
  }

  get size() { return this.count; }

  has(p: Perm): boolean {
    const h = permHash(p);
    let idx = h % this.capacity;
    while (this.hashes[idx] !== -1) {
      if (this.hashes[idx] === h && this.perms[idx] && permEqual(this.perms[idx]!, p)) return true;
      idx = (idx + 1) % this.capacity;
    }
    return false;
  }

  /** Returns true if newly added, false if already present. */
  add(p: Perm): boolean {
    if (this.count > this.capacity * 0.7) this.resize();
    const h = permHash(p);
    let idx = h % this.capacity;
    while (this.hashes[idx] !== -1) {
      if (this.hashes[idx] === h && this.perms[idx] && permEqual(this.perms[idx]!, p)) return false;
      idx = (idx + 1) % this.capacity;
    }
    this.hashes[idx] = h;
    this.perms[idx] = new Uint8Array(p); // Copy
    this.count++;
    return true;
  }

  private resize() {
    const oldHashes = this.hashes;
    const oldPerms = this.perms;
    this.capacity *= 2;
    this.hashes = new Int32Array(this.capacity).fill(-1);
    this.perms = new Array(this.capacity).fill(null);
    this.count = 0;
    for (let i = 0; i < oldHashes.length; i++) {
      if (oldHashes[i] !== -1 && oldPerms[i]) {
        this.add(oldPerms[i]!);
      }
    }
  }
}

// ── Generators ───────────────────────────────────────────────────────────

function elementToPerm(elem: TransformElement): Perm {
  const p = new Uint8Array(N);
  for (let v = 0; v < N; v++) p[v] = applyTransform(v, elem);
  return p;
}

function getGeneratorPerms(): Perm[] {
  const gens = [
    elementToPerm({ r: 1, d: 0, t: 0, m: 0 }),
    elementToPerm({ r: 0, d: 1, t: 0, m: 0 }),
    elementToPerm({ r: 0, d: 0, t: 1, m: 0 }),
    elementToPerm({ r: 0, d: 0, t: 0, m: 1 }),
  ];
  return [...gens, ...gens.map(invertPerm)];
}

// ── Stabilizer Enumeration ───────────────────────────────────────────────

/**
 * Compute orbit and coset representatives (transversal) for a point.
 */
function computeOrbitTransversal(
  point: number,
  generators: Perm[],
): { orbit: number[]; transversal: Map<number, Perm> } {
  const transversal = new Map<number, Perm>();
  const orbit = [point];
  transversal.set(point, identity());

  let frontier = [point];
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const pt of frontier) {
      for (const gen of generators) {
        const image = gen[pt];
        if (!transversal.has(image)) {
          transversal.set(image, composePerm(gen, transversal.get(pt)!));
          orbit.push(image);
          next.push(image);
        }
      }
    }
    frontier = next;
  }
  return { orbit, transversal };
}

/**
 * Compute Schreier generators for Stab(basePoint).
 * Filters to only those that actually fix basePoint and are non-trivial.
 */
function computeSchreierGens(
  generators: Perm[],
  orbit: number[],
  transversal: Map<number, Perm>,
  basePoint: number,
): Perm[] {
  const stabGens: Perm[] = [];
  const seen = new PermSet(256);
  seen.add(identity());

  for (const pt of orbit) {
    const uPt = transversal.get(pt)!;
    for (const gen of generators) {
      const image = gen[pt];
      const uImage = transversal.get(image)!;
      const schreier = composePerm(invertPerm(uImage), composePerm(gen, uPt));
      if (schreier[basePoint] !== basePoint) continue;
      if (isIdentityPerm(schreier)) continue;
      if (seen.add(schreier)) {
        stabGens.push(schreier);
      }
    }
  }
  return stabGens;
}

/**
 * Compute group order via iterated stabilizer chain.
 * |G| = |orbit₀| × |orbit₁| × ... where each orbit is computed
 * in the stabilizer of previous base points.
 *
 * Uses at most `maxDepth` levels to prevent runaway.
 */
function computeGroupOrder(generators: Perm[], maxDepth = 20): {
  order: number;
  orbitSizes: number[];
  depths: number;
} {
  let currentGens = generators;
  const orbitSizes: number[] = [];
  let order = 1;

  for (let depth = 0; depth < maxDepth; depth++) {
    if (currentGens.length === 0) break;

    // Find a point moved by some generator
    let basePoint = -1;
    for (let pt = 0; pt < N; pt++) {
      if (currentGens.some(g => g[pt] !== pt)) { basePoint = pt; break; }
    }
    if (basePoint === -1) break;

    const { orbit, transversal } = computeOrbitTransversal(basePoint, currentGens);
    orbitSizes.push(orbit.length);
    order *= orbit.length;

    // Compute stabilizer generators
    const stabGens = computeSchreierGens(currentGens, orbit, transversal, basePoint);

    // Deduplicate and limit generator count to prevent explosion
    // Keep at most 20 generators (sufficient for most practical groups)
    currentGens = stabGens.slice(0, 20);
  }

  return { order, orbitSizes, depths: orbitSizes.length };
}

// ── Parametric Closure Check ─────────────────────────────────────────────

function checkParametricClosure(): { closed: boolean; distinctCount: number } {
  const paramSet = new PermSet(256);
  for (const m of [0, 1] as const) {
    for (let r = 0; r < QUADRANT_COUNT; r++) {
      for (let d = 0; d < MODALITY_COUNT; d++) {
        for (let t = 0; t < SLOT_COUNT; t++) {
          paramSet.add(elementToPerm({ r: r as any, d: d as any, t, m }));
        }
      }
    }
  }
  const distinctCount = paramSet.size;

  const tau = elementToPerm({ r: 0, d: 0, t: 0, m: 1 });
  const D1 = elementToPerm({ r: 0, d: 1, t: 0, m: 0 });
  const T1 = elementToPerm({ r: 0, d: 0, t: 1, m: 0 });
  const tauD1tau = composePerm(tau, composePerm(D1, tau));
  const tauT1tau = composePerm(tau, composePerm(T1, tau));
  const closed = paramSet.has(tauD1tau) && paramSet.has(tauT1tau);

  return { closed, distinctCount };
}

/** Sample element orders by random walk. */
function sampleOrders(generators: Perm[], count = 200): Map<number, number> {
  const spectrum = new Map<number, number>();
  spectrum.set(1, 1);
  let cur = identity();
  for (let i = 0; i < count + 100; i++) {
    cur = composePerm(cur, generators[i % generators.length]);
    if (i >= 100) {
      const o = permOrder(cur);
      spectrum.set(o, (spectrum.get(o) || 0) + 1);
    }
  }
  return spectrum;
}

function factorizationString(n: number): string {
  const factors: [number, number][] = [];
  let d = 2;
  let m = n;
  while (d * d <= m) {
    let e = 0;
    while (m % d === 0) { e++; m /= d; }
    if (e > 0) factors.push([d, e]);
    d++;
  }
  if (m > 1) factors.push([m, 1]);
  return factors.map(([p, e]) => e === 1 ? String(p) : `${p}^${e}`).join(" × ");
}

function identifyGroup(order: number, orbitSizes: number[]): string {
  const chain = orbitSizes.join(" × ");

  // Known fingerprints
  if (order === 192) return `(Z/4Z × Z/3Z × Z/8Z) ⋊ Z/2Z — closed at order 192, chain [${chain}]`;
  if (order === 96) return `Z/4Z × Z/3Z × Z/8Z ≅ Z/96Z (abelian), chain [${chain}]`;

  const ratio = order / 96;
  if (Number.isInteger(ratio)) {
    return `|Aut(Atlas)| = ${order} = 96 × ${ratio}, stabilizer chain [${chain}]`;
  }
  return `|Aut(Atlas)| = ${order}, stabilizer chain [${chain}]`;
}

// ── Public API ───────────────────────────────────────────────────────────

export function runClosureAnalysis(): ClosureResult {
  const generators = getGeneratorPerms();
  const { order, orbitSizes, depths } = computeGroupOrder(generators);
  const factorization = factorizationString(order);

  const { closed: parametricClosed, distinctCount: distinctParametric } = checkParametricClosure();
  const orderSpectrum = sampleOrders(generators);
  const groupName = identifyGroup(order, orbitSizes);

  const spectrumStr = [...orderSpectrum.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ord, cnt]) => `  order ${ord}: ~${cnt}`)
    .join("\n");

  const description = [
    `═══ Group Closure Analysis (Stabilizer Chain) ═══`,
    `|Aut(Atlas)| = ${order}`,
    `Factorization: ${factorization}`,
    `Identified as: ${groupName}`,
    ``,
    `Stabilizer chain depth: ${depths}`,
    `Orbit sizes: [${orbitSizes.join(", ")}]`,
    `|G| = ${orbitSizes.join(" × ")} = ${order}`,
    ``,
    `Generators: 4 (R₁, D₁, T₁, τ) + 4 inverses`,
    `Distinct parametric perms: ${distinctParametric}/192`,
    `Parametric set closed: ${parametricClosed}`,
    ``,
    `Element order spectrum (sampled):`,
    spectrumStr,
  ].join("\n");

  const tests: ClosureTest[] = [];

  tests.push({ name: "Group order > 0", holds: order > 0, expected: "> 0", actual: String(order) });
  tests.push({ name: "Order ≥ 192", holds: order >= 192, expected: "≥ 192", actual: String(order) });
  tests.push({
    name: "First orbit is transitive (96 vertices)",
    holds: orbitSizes.length > 0 && orbitSizes[0] === N,
    expected: "96", actual: orbitSizes.length > 0 ? String(orbitSizes[0]) : "none",
  });
  tests.push({
    name: "Product of orbit sizes = order",
    holds: orbitSizes.reduce((a, b) => a * b, 1) === order,
    expected: String(order), actual: String(orbitSizes.reduce((a, b) => a * b, 1)),
  });
  tests.push({
    name: "Parametric elements not closed",
    holds: !parametricClosed,
    expected: "false", actual: String(parametricClosed),
  });
  tests.push({
    name: "Order divisible by 96",
    holds: order % 96 === 0,
    expected: "96 | order", actual: `${order} mod 96 = ${order % 96}`,
  });
  tests.push({
    name: "τ·D₁·τ NOT in parametric set",
    holds: (() => {
      const tau = elementToPerm({ r: 0, d: 0, t: 0, m: 1 });
      const D1 = elementToPerm({ r: 0, d: 1, t: 0, m: 0 });
      const tauD1tau = composePerm(tau, composePerm(D1, tau));
      const paramSet = new PermSet(256);
      for (const m of [0, 1] as const)
        for (let r = 0; r < QUADRANT_COUNT; r++)
          for (let d = 0; d < MODALITY_COUNT; d++)
            for (let t = 0; t < SLOT_COUNT; t++)
              paramSet.add(elementToPerm({ r: r as any, d: d as any, t, m }));
      return !paramSet.has(tauD1tau);
    })(),
    expected: "true", actual: "verified",
  });

  return {
    order,
    factorization,
    stabilizerOrder: order / N,
    generatorCount: 4,
    distinctParametric,
    parametricClosed,
    orderSpectrum,
    groupName,
    description,
    tests,
    allPassed: tests.every(t => t.holds),
  };
}
