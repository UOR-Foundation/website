/**
 * Atlas of Resonance Classes — TypeScript Port
 *
 * A faithful TypeScript implementation of the 96-vertex Atlas graph from
 * the atlas-embeddings Rust crate (UOR Foundation).
 *
 * The Atlas is the unique stationary configuration of an action functional
 * on a 12,288-cell boundary complex. It is the initial object in the
 * category ResGraph, from which all five exceptional Lie groups emerge.
 *
 * Construction uses exact integer arithmetic only. Zero floating point.
 *
 * @see https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings
 */

// ── Label System ────────────────────────────────────────────────────────────

/**
 * Atlas canonical label: 6-tuple (e₁, e₂, e₃, d₄₅, e₆, e₇)
 *
 * - e₁, e₂, e₃, e₆, e₇ ∈ {0, 1}  (binary coordinates)
 * - d₄₅ ∈ {-1, 0, +1}             (ternary: e₄ − e₅ canonicalized)
 *
 * Total: 2⁵ × 3 = 96 vertices
 */
export interface AtlasLabel {
  readonly e1: 0 | 1;
  readonly e2: 0 | 1;
  readonly e3: 0 | 1;
  readonly d45: -1 | 0 | 1;
  readonly e6: 0 | 1;
  readonly e7: 0 | 1;
}

/** Serialize a label to a unique string key for indexing. */
function labelKey(l: AtlasLabel): string {
  return `${l.e1}${l.e2}${l.e3}:${l.d45}:${l.e6}${l.e7}`;
}

/** Check if two labels are equal. */
function labelsEqual(a: AtlasLabel, b: AtlasLabel): boolean {
  return a.e1 === b.e1 && a.e2 === b.e2 && a.e3 === b.e3 &&
         a.d45 === b.d45 && a.e6 === b.e6 && a.e7 === b.e7;
}

// ── Atlas Vertex ────────────────────────────────────────────────────────────

export interface AtlasVertex {
  /** Vertex index (0–95) */
  readonly index: number;
  /** Canonical 6-tuple label */
  readonly label: AtlasLabel;
  /** Degree in the Atlas graph (5 or 6) */
  degree: number;
  /** Indices of adjacent vertices */
  neighbors: number[];
  /** Index of mirror pair under τ */
  mirrorPair: number;
  /** Sign class index (0–7) */
  signClass: number;
  /** Whether this is a unity position */
  isUnity: boolean;
}

// ── Mirror Involution τ ─────────────────────────────────────────────────────

/** Apply mirror transformation: flip e₇ */
function mirrorLabel(l: AtlasLabel): AtlasLabel {
  return { ...l, e7: (1 - l.e7) as 0 | 1 };
}

// ── d₄₅ Flip Functions ─────────────────────────────────────────────────────

/**
 * Update d₄₅ when e₄ is flipped.
 * Canonicalization: -1→0, 0→+1, +1→0
 */
function flipD45ByE4(d: -1 | 0 | 1): -1 | 0 | 1 {
  if (d === -1 || d === 1) return 0;
  return 1; // d === 0
}

/**
 * Update d₄₅ when e₅ is flipped.
 * Canonicalization: -1→0, 0→-1, +1→0
 */
function flipD45ByE5(d: -1 | 0 | 1): -1 | 0 | 1 {
  if (d === -1 || d === 1) return 0;
  return -1; // d === 0
}

// ── Neighbor Computation ────────────────────────────────────────────────────

/**
 * Compute all neighbor labels under Hamming-1 flips.
 * Flips: e₁, e₂, e₃, e₆, e₄ (via d₄₅), e₅ (via d₄₅).
 * Does NOT flip e₇ (mirror is global symmetry, not an edge).
 */
function computeNeighborLabels(label: AtlasLabel): AtlasLabel[] {
  const { e1, e2, e3, d45, e6, e7 } = label;
  return [
    { e1: (1 - e1) as 0 | 1, e2, e3, d45, e6, e7 },
    { e1, e2: (1 - e2) as 0 | 1, e3, d45, e6, e7 },
    { e1, e2, e3: (1 - e3) as 0 | 1, d45, e6, e7 },
    { e1, e2, e3, d45, e6: (1 - e6) as 0 | 1, e7 },
    { e1, e2, e3, d45: flipD45ByE4(d45), e6, e7 },
    { e1, e2, e3, d45: flipD45ByE5(d45), e6, e7 },
  ];
}

// ── Sign Class Computation ──────────────────────────────────────────────────

/**
 * Compute the sign class of an Atlas label.
 * Extends to 8D via the even parity constraint, then extracts
 * the 3-bit sign pattern from (e₁, e₂, e₃).
 *
 * 8 sign classes of 12 vertices each.
 */
function computeSignClass(label: AtlasLabel): number {
  // The sign class is determined by the parity pattern of the binary coordinates.
  // We use (e₁, e₂, e₃) as the 3-bit sign class index (8 classes).
  return (label.e1 << 2) | (label.e2 << 1) | label.e3;
}

// ── Atlas Construction ──────────────────────────────────────────────────────

export const ATLAS_VERTEX_COUNT = 96;
export const ATLAS_EDGE_COUNT_EXPECTED = 256;

/**
 * The Atlas of Resonance Classes.
 *
 * Constructed from first principles: 96 vertices from 2⁵ × 3 label space,
 * adjacency from Hamming-1 flips, mirror symmetry τ from e₇ flip.
 */
export class Atlas {
  readonly vertices: ReadonlyArray<AtlasVertex>;
  readonly edgeCount: number;
  readonly unityPositions: ReadonlyArray<number>;

  private readonly labelIndex: Map<string, number>;

  constructor() {
    // Step 1: Generate all 96 labels
    const labels = this.generateLabels();
    
    // Step 2: Build label index
    this.labelIndex = new Map<string, number>();
    labels.forEach((l, i) => this.labelIndex.set(labelKey(l), i));

    // Step 3: Build vertices with adjacency, mirror, sign class
    const verts: AtlasVertex[] = labels.map((label, index) => ({
      index,
      label,
      degree: 0,
      neighbors: [],
      mirrorPair: -1,
      signClass: computeSignClass(label),
      isUnity: label.d45 === 0 && label.e1 === 0 && label.e2 === 0 &&
               label.e3 === 0 && label.e6 === 0,
    }));

    // Step 4: Compute adjacency
    let totalEdges = 0;
    for (let i = 0; i < verts.length; i++) {
      const neighborLabels = computeNeighborLabels(verts[i].label);
      const neighborSet = new Set<number>();
      for (const nl of neighborLabels) {
        const j = this.labelIndex.get(labelKey(nl));
        if (j !== undefined && j !== i) {
          neighborSet.add(j);
        }
      }
      verts[i].neighbors = Array.from(neighborSet).sort((a, b) => a - b);
      verts[i].degree = verts[i].neighbors.length;
      totalEdges += verts[i].degree;
    }
    this.edgeCount = totalEdges / 2; // Each edge counted twice

    // Step 5: Compute mirror pairs
    for (let i = 0; i < verts.length; i++) {
      const ml = mirrorLabel(verts[i].label);
      const j = this.labelIndex.get(labelKey(ml));
      if (j !== undefined) {
        verts[i].mirrorPair = j;
      }
    }

    // Step 6: Find unity positions
    this.unityPositions = verts
      .filter(v => v.isUnity)
      .map(v => v.index);

    this.vertices = Object.freeze(verts);
    this.verify();
  }

  /** Generate all 96 canonical labels. */
  private generateLabels(): AtlasLabel[] {
    const labels: AtlasLabel[] = [];
    for (let e1 = 0; e1 <= 1; e1++) {
      for (let e2 = 0; e2 <= 1; e2++) {
        for (let e3 = 0; e3 <= 1; e3++) {
          for (let e6 = 0; e6 <= 1; e6++) {
            for (let e7 = 0; e7 <= 1; e7++) {
              for (let d45 = -1; d45 <= 1; d45++) {
                labels.push({
                  e1: e1 as 0 | 1,
                  e2: e2 as 0 | 1,
                  e3: e3 as 0 | 1,
                  d45: d45 as -1 | 0 | 1,
                  e6: e6 as 0 | 1,
                  e7: e7 as 0 | 1,
                });
              }
            }
          }
        }
      }
    }
    return labels;
  }

  /** Verify all Atlas invariants. Throws if any fail. */
  private verify(): void {
    // Vertex count
    if (this.vertices.length !== ATLAS_VERTEX_COUNT) {
      throw new Error(`Atlas must have ${ATLAS_VERTEX_COUNT} vertices, got ${this.vertices.length}`);
    }

    // Edge count
    if (this.edgeCount !== ATLAS_EDGE_COUNT_EXPECTED) {
      throw new Error(`Atlas must have ${ATLAS_EDGE_COUNT_EXPECTED} edges, got ${this.edgeCount}`);
    }

    // Degree bounds
    for (const v of this.vertices) {
      if (v.degree !== 5 && v.degree !== 6) {
        throw new Error(`Vertex ${v.index} has degree ${v.degree}, expected 5 or 6`);
      }
    }

    // Mirror involution: τ² = id
    for (const v of this.vertices) {
      const mirror = this.vertices[v.mirrorPair];
      if (mirror.mirrorPair !== v.index) {
        throw new Error(`Mirror involution failed: τ²(${v.index}) ≠ ${v.index}`);
      }
    }

    // Mirror pairs not adjacent
    for (const v of this.vertices) {
      if (v.neighbors.includes(v.mirrorPair)) {
        throw new Error(`Mirror pair (${v.index}, ${v.mirrorPair}) must not be adjacent`);
      }
    }

    // Unity count
    if (this.unityPositions.length !== 2) {
      throw new Error(`Must have 2 unity positions, got ${this.unityPositions.length}`);
    }
  }

  // ── Query Methods ───────────────────────────────────────────────────────

  /** Get vertex by index. */
  vertex(i: number): AtlasVertex {
    return this.vertices[i];
  }

  /** Find vertex by label. */
  findVertex(label: AtlasLabel): number | undefined {
    return this.labelIndex.get(labelKey(label));
  }

  /** Check if two vertices are adjacent. */
  isAdjacent(v1: number, v2: number): boolean {
    return this.vertices[v1].neighbors.includes(v2);
  }

  /** Get degree-5 vertices (d₄₅ = ±1). */
  degree5Vertices(): number[] {
    return this.vertices.filter(v => v.degree === 5).map(v => v.index);
  }

  /** Get degree-6 vertices (d₄₅ = 0). */
  degree6Vertices(): number[] {
    return this.vertices.filter(v => v.degree === 6).map(v => v.index);
  }

  /** Get vertices by sign class. */
  signClassVertices(signClass: number): number[] {
    return this.vertices.filter(v => v.signClass === signClass).map(v => v.index);
  }

  /** Get all 48 mirror pairs as [v, τ(v)] tuples. */
  mirrorPairs(): [number, number][] {
    const pairs: [number, number][] = [];
    const seen = new Set<number>();
    for (const v of this.vertices) {
      if (!seen.has(v.index)) {
        pairs.push([v.index, v.mirrorPair]);
        seen.add(v.index);
        seen.add(v.mirrorPair);
      }
    }
    return pairs;
  }

  // ── Structural Metrics ────────────────────────────────────────────────

  /** Count vertices by degree. */
  degreeCounts(): { degree5: number; degree6: number } {
    let d5 = 0, d6 = 0;
    for (const v of this.vertices) {
      if (v.degree === 5) d5++;
      else d6++;
    }
    return { degree5: d5, degree6: d6 };
  }

  /** Count vertices per sign class. */
  signClassCounts(): number[] {
    const counts = new Array(8).fill(0);
    for (const v of this.vertices) {
      counts[v.signClass]++;
    }
    return counts;
  }

  /** Verify adjacency symmetry. */
  isSymmetric(): boolean {
    for (const v of this.vertices) {
      for (const n of v.neighbors) {
        if (!this.vertices[n].neighbors.includes(v.index)) return false;
      }
    }
    return true;
  }
}

// ── Singleton ───────────────────────────────────────────────────────────────

let _atlasInstance: Atlas | null = null;

/** Get or construct the singleton Atlas instance. */
export function getAtlas(): Atlas {
  if (!_atlasInstance) {
    _atlasInstance = new Atlas();
  }
  return _atlasInstance;
}
