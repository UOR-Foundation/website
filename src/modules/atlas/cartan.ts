/**
 * Cartan Matrices and Dynkin Diagrams — Exact Integer Arithmetic
 *
 * TypeScript port of atlas-embeddings/src/cartan/mod.rs.
 *
 * All computations use exact integers. Zero floating point.
 * Cartan matrices encode the complete structure of a Lie algebra.
 *
 * @see https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings
 */

// ── Cartan Matrix ──────────────────────────────────────────────────────────

/**
 * Cartan matrix for a Lie algebra of rank N.
 * All entries are exact integers.
 */
export interface CartanMatrix {
  readonly rank: number;
  readonly entries: ReadonlyArray<ReadonlyArray<number>>;
}

/** Create a Cartan matrix from a 2D array. */
export function cartanMatrix(entries: number[][]): CartanMatrix {
  return { rank: entries.length, entries };
}

/** Check if a Cartan matrix is valid. */
export function isValidCartan(c: CartanMatrix): boolean {
  const n = c.rank;
  for (let i = 0; i < n; i++) {
    if (c.entries[i][i] !== 2) return false;
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        if (c.entries[i][j] > 0) return false;
        if ((c.entries[i][j] === 0) !== (c.entries[j][i] === 0)) return false;
      }
    }
  }
  return true;
}

/** Check if a Cartan matrix is simply-laced (all off-diagonal ∈ {0, -1}). */
export function isSimplyLaced(c: CartanMatrix): boolean {
  const n = c.rank;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && c.entries[i][j] !== 0 && c.entries[i][j] !== -1) return false;
    }
  }
  return true;
}

/** Check if a Cartan matrix is symmetric. */
export function isSymmetricCartan(c: CartanMatrix): boolean {
  const n = c.rank;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (c.entries[i][j] !== c.entries[j][i]) return false;
    }
  }
  return true;
}

/** Compute determinant using exact integer arithmetic (Laplace expansion). */
export function cartanDeterminant(c: CartanMatrix): number {
  return det(c.entries as number[][], c.rank);
}

function det(m: number[][], n: number): number {
  if (n === 1) return m[0][0];
  if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  let d = 0;
  for (let j = 0; j < n; j++) {
    const minor: number[][] = [];
    for (let i = 1; i < n; i++) {
      minor.push(m[i].filter((_, k) => k !== j));
    }
    d += (j % 2 === 0 ? 1 : -1) * m[0][j] * det(minor, n - 1);
  }
  return d;
}

// ── Dynkin Diagram ─────────────────────────────────────────────────────────

export interface DynkinBond {
  from: number;
  to: number;
  multiplicity: number; // 1=single, 2=double, 3=triple
}

export interface DynkinDiagram {
  groupName: string;
  rank: number;
  bonds: DynkinBond[];
  degrees: number[];
  branchNodes: number[];
  endpoints: number[];
  isConnected: boolean;
}

/** Extract Dynkin diagram from Cartan matrix. */
export function toDynkinDiagram(c: CartanMatrix, name: string): DynkinDiagram {
  const n = c.rank;
  const bonds: DynkinBond[] = [];
  const degrees = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (c.entries[i][j] !== 0 && c.entries[j][i] !== 0) {
        const mult = Math.abs(c.entries[i][j] * c.entries[j][i]);
        bonds.push({ from: i, to: j, multiplicity: mult });
        degrees[i]++;
        degrees[j]++;
      }
    }
  }

  const branchNodes = degrees.map((d, i) => d >= 3 ? i : -1).filter(i => i >= 0);
  const endpoints = degrees.map((d, i) => d === 1 ? i : -1).filter(i => i >= 0);

  // BFS connectivity check
  const visited = new Set<number>();
  if (n > 0) {
    const queue = [0];
    visited.add(0);
    while (queue.length > 0) {
      const node = queue.shift()!;
      for (const b of bonds) {
        const neighbor = b.from === node ? b.to : b.to === node ? b.from : -1;
        if (neighbor >= 0 && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  return {
    groupName: name,
    rank: n,
    bonds,
    degrees,
    branchNodes,
    endpoints,
    isConnected: visited.size === n,
  };
}

// ── Canonical Cartan Matrices ──────────────────────────────────────────────

/** G₂ Cartan matrix: rank 2, triple bond, det = 1 */
export const CARTAN_G2: CartanMatrix = cartanMatrix([
  [ 2, -3],
  [-1,  2],
]);

/** F₄ Cartan matrix: rank 4, double bond at (1,2), det = 1 */
export const CARTAN_F4: CartanMatrix = cartanMatrix([
  [ 2, -1,  0,  0],
  [-1,  2, -2,  0],
  [ 0, -1,  2, -1],
  [ 0,  0, -1,  2],
]);

/** E₆ Cartan matrix: rank 6, simply-laced, det = 3 */
export const CARTAN_E6: CartanMatrix = cartanMatrix([
  [ 2, -1,  0,  0,  0,  0],
  [-1,  2, -1,  0,  0,  0],
  [ 0, -1,  2, -1,  0, -1],
  [ 0,  0, -1,  2, -1,  0],
  [ 0,  0,  0, -1,  2,  0],
  [ 0,  0, -1,  0,  0,  2],
]);

/** E₇ Cartan matrix: rank 7, simply-laced, det = 2 */
export const CARTAN_E7: CartanMatrix = cartanMatrix([
  [ 2, -1,  0,  0,  0,  0,  0],
  [-1,  2, -1,  0,  0,  0,  0],
  [ 0, -1,  2, -1,  0,  0,  0],
  [ 0,  0, -1,  2, -1,  0, -1],
  [ 0,  0,  0, -1,  2, -1,  0],
  [ 0,  0,  0,  0, -1,  2,  0],
  [ 0,  0,  0, -1,  0,  0,  2],
]);

/** E₈ Cartan matrix: rank 8, simply-laced, det = 1 (unimodular) */
export const CARTAN_E8: CartanMatrix = cartanMatrix([
  [ 2, -1,  0,  0,  0,  0,  0,  0],
  [-1,  2, -1,  0,  0,  0,  0,  0],
  [ 0, -1,  2, -1,  0,  0,  0,  0],
  [ 0,  0, -1,  2, -1,  0,  0,  0],
  [ 0,  0,  0, -1,  2, -1,  0, -1],
  [ 0,  0,  0,  0, -1,  2, -1,  0],
  [ 0,  0,  0,  0,  0, -1,  2,  0],
  [ 0,  0,  0,  0, -1,  0,  0,  2],
]);
