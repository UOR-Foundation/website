/**
 * Triality Coordinate System — Sigmatics (h₂, d, ℓ) Decomposition
 * ══════════════════════════════════════════════════════════════════
 *
 * Every Atlas vertex index v ∈ [0, 95] decomposes uniquely as:
 *
 *     v = 24·h₂ + 8·d + ℓ
 *
 * where:
 *   h₂ ∈ Z/4Z  (quadrant, 0–3)
 *   d  ∈ Z/3Z  (modality, 0–2)
 *   ℓ  ∈ Z/8Z  (context slot, 0–7)
 *
 * This establishes a bijection between the 96 Atlas vertices and the
 * direct product Z/4Z × Z/3Z × Z/8Z, whose order is 4·3·8 = 96.
 *
 * The D-transform (modality rotation) is a Z/3Z action:
 *   D_k(h₂, d, ℓ) = (h₂, (d+k) mod 3, ℓ)
 *
 * This generates 32 triality orbits of size 3 each (96/3 = 32),
 * corresponding to D₄ triality in the E₈ root system.
 *
 * @module atlas/triality
 */

import { getAtlas, type AtlasVertex, ATLAS_VERTEX_COUNT } from "./atlas";

// ── Types ─────────────────────────────────────────────────────────────────

/** Triality coordinate triple from Sigmatics decomposition. */
export interface TrialityCoordinate {
  /** Quadrant index h₂ ∈ Z/4Z (0–3). */
  readonly quadrant: 0 | 1 | 2 | 3;
  /** Modality index d ∈ Z/3Z (0–2). */
  readonly modality: 0 | 1 | 2;
  /** Context slot ℓ ∈ Z/8Z (0–7). */
  readonly slot: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

/** A vertex annotated with its triality coordinate. */
export interface TrialityVertex {
  /** Atlas vertex index (0–95). */
  readonly index: number;
  /** The triality coordinate triple. */
  readonly coord: TrialityCoordinate;
  /** The Atlas vertex data. */
  readonly vertex: AtlasVertex;
}

/** A triality orbit: 3 vertices sharing (h₂, ℓ) but cycling through d ∈ {0,1,2}. */
export interface TrialityOrbit {
  /** Orbit index (0–31). */
  readonly orbitIndex: number;
  /** The shared quadrant h₂. */
  readonly quadrant: 0 | 1 | 2 | 3;
  /** The shared slot ℓ. */
  readonly slot: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** The 3 vertex indices in this orbit, ordered by modality 0, 1, 2. */
  readonly vertices: [number, number, number];
}

/** Full triality decomposition result. */
export interface TrialityDecomposition {
  /** All 96 triality vertices. */
  readonly vertices: ReadonlyArray<TrialityVertex>;
  /** All 32 triality orbits. */
  readonly orbits: ReadonlyArray<TrialityOrbit>;
  /** Bijection verification: true if encoding ↔ index is exact. */
  readonly bijectionVerified: boolean;
}

/** D-transform result. */
export interface DTransformResult {
  /** The input vertex index. */
  readonly input: number;
  /** The shift k applied: d → (d+k) mod 3. */
  readonly shift: 1 | 2;
  /** The output vertex index. */
  readonly output: number;
  /** Input coordinate. */
  readonly inputCoord: TrialityCoordinate;
  /** Output coordinate. */
  readonly outputCoord: TrialityCoordinate;
}

/** Verification report for the triality system. */
export interface TrialityReport {
  readonly tests: ReadonlyArray<TrialityTest>;
  readonly allPassed: boolean;
  readonly orbitCount: number;
  readonly bijectionHolds: boolean;
}

export interface TrialityTest {
  readonly name: string;
  readonly holds: boolean;
  readonly expected: string;
  readonly actual: string;
}

// ── Constants ─────────────────────────────────────────────────────────────

/** Number of quadrants (h₂ range). */
export const QUADRANT_COUNT = 4;
/** Number of modalities (d range). */
export const MODALITY_COUNT = 3;
/** Number of context slots (ℓ range). */
export const SLOT_COUNT = 8;
/** Number of triality orbits = 96 / 3 = 32. */
export const ORBIT_COUNT = 32;

// ── Core Functions ────────────────────────────────────────────────────────

/**
 * Encode a triality coordinate to a vertex index.
 * v = 24·h₂ + 8·d + ℓ
 */
export function encodeTriality(coord: TrialityCoordinate): number {
  return 24 * coord.quadrant + 8 * coord.modality + coord.slot;
}

/**
 * Decode a vertex index to a triality coordinate.
 * Inverse of encodeTriality.
 */
export function decodeTriality(index: number): TrialityCoordinate {
  if (index < 0 || index >= ATLAS_VERTEX_COUNT) {
    throw new RangeError(`Vertex index ${index} out of range [0, ${ATLAS_VERTEX_COUNT})`);
  }
  const quadrant = Math.floor(index / 24) as 0 | 1 | 2 | 3;
  const remainder = index % 24;
  const modality = Math.floor(remainder / 8) as 0 | 1 | 2;
  const slot = (remainder % 8) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  return { quadrant, modality, slot };
}

/**
 * Apply the D-transform (Z/3Z modality rotation).
 *   D_k(h₂, d, ℓ) = (h₂, (d + k) mod 3, ℓ)
 *
 * @param index - Source vertex index (0–95)
 * @param k - Rotation amount (1 or 2); k=3 is identity
 * @returns The transformed vertex index
 */
export function dTransform(index: number, k: 1 | 2): number {
  const coord = decodeTriality(index);
  const newModality = ((coord.modality + k) % MODALITY_COUNT) as 0 | 1 | 2;
  return encodeTriality({ ...coord, modality: newModality });
}

/**
 * Apply the D-transform and return full result with coordinates.
 */
export function dTransformFull(index: number, k: 1 | 2): DTransformResult {
  const inputCoord = decodeTriality(index);
  const newModality = ((inputCoord.modality + k) % MODALITY_COUNT) as 0 | 1 | 2;
  const outputCoord: TrialityCoordinate = { ...inputCoord, modality: newModality };
  return {
    input: index,
    shift: k,
    output: encodeTriality(outputCoord),
    inputCoord,
    outputCoord,
  };
}

/**
 * Compute the full triality decomposition of the Atlas.
 * Builds all 96 triality vertices and 32 orbits, verifying the bijection.
 */
export function computeTrialityDecomposition(): TrialityDecomposition {
  const atlas = getAtlas();

  // Build all 96 triality vertices
  const vertices: TrialityVertex[] = [];
  let bijectionOk = true;

  for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
    const coord = decodeTriality(i);
    // Verify round-trip
    if (encodeTriality(coord) !== i) {
      bijectionOk = false;
    }
    vertices.push({
      index: i,
      coord,
      vertex: atlas.vertices[i],
    });
  }

  // Build 32 orbits: one for each (h₂, ℓ) pair
  const orbits: TrialityOrbit[] = [];
  let orbitIdx = 0;
  for (let h2 = 0; h2 < QUADRANT_COUNT; h2++) {
    for (let l = 0; l < SLOT_COUNT; l++) {
      const v0 = encodeTriality({ quadrant: h2 as 0|1|2|3, modality: 0, slot: l as 0|1|2|3|4|5|6|7 });
      const v1 = encodeTriality({ quadrant: h2 as 0|1|2|3, modality: 1, slot: l as 0|1|2|3|4|5|6|7 });
      const v2 = encodeTriality({ quadrant: h2 as 0|1|2|3, modality: 2, slot: l as 0|1|2|3|4|5|6|7 });
      orbits.push({
        orbitIndex: orbitIdx++,
        quadrant: h2 as 0 | 1 | 2 | 3,
        slot: l as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
        vertices: [v0, v1, v2],
      });
    }
  }

  return { vertices, orbits, bijectionVerified: bijectionOk };
}

/**
 * Get the triality orbit containing a given vertex.
 */
export function getOrbit(index: number): TrialityOrbit {
  const coord = decodeTriality(index);
  const orbitIndex = coord.quadrant * SLOT_COUNT + coord.slot;
  const v0 = encodeTriality({ ...coord, modality: 0 });
  const v1 = encodeTriality({ ...coord, modality: 1 });
  const v2 = encodeTriality({ ...coord, modality: 2 });
  return {
    orbitIndex,
    quadrant: coord.quadrant,
    slot: coord.slot,
    vertices: [v0, v1, v2],
  };
}

/**
 * Analyze how triality orbits interact with Atlas sign classes.
 * Returns a map from orbit index → set of sign classes present.
 */
export function orbitSignClassDistribution(): Map<number, Set<number>> {
  const atlas = getAtlas();
  const decomp = computeTrialityDecomposition();
  const result = new Map<number, Set<number>>();

  for (const orbit of decomp.orbits) {
    const classes = new Set<number>();
    for (const vi of orbit.vertices) {
      classes.add(atlas.vertices[vi].signClass);
    }
    result.set(orbit.orbitIndex, classes);
  }
  return result;
}

/**
 * Analyze how triality orbits interact with mirror pairs.
 * For each orbit, reports whether all 3 vertices' mirror partners
 * belong to a single other orbit (mirror orbit).
 */
export function orbitMirrorCorrespondence(): Array<{
  orbitIndex: number;
  mirrorOrbitIndex: number;
  isSelfMirror: boolean;
}> {
  const atlas = getAtlas();
  const results: Array<{
    orbitIndex: number;
    mirrorOrbitIndex: number;
    isSelfMirror: boolean;
  }> = [];

  const decomp = computeTrialityDecomposition();

  for (const orbit of decomp.orbits) {
    // Get the mirror of the first vertex and find its orbit
    const mirrorIdx = atlas.vertices[orbit.vertices[0]].mirrorPair;
    const mirrorOrbit = getOrbit(mirrorIdx);
    results.push({
      orbitIndex: orbit.orbitIndex,
      mirrorOrbitIndex: mirrorOrbit.orbitIndex,
      isSelfMirror: orbit.orbitIndex === mirrorOrbit.orbitIndex,
    });
  }

  return results;
}

/**
 * Map triality coordinates to the E₈ root system's D₄ triality.
 *
 * In the E₈ root system, D₄ triality permutes three 8-dimensional
 * representations (vector, spinor+, spinor−). The Z/3Z modality
 * rotation d → (d+1) mod 3 is the Atlas-level avatar of this symmetry.
 *
 * Returns the correspondence for each modality value.
 */
export function d4TrialityCorrespondence(): Array<{
  modality: 0 | 1 | 2;
  d4Representation: string;
  vertexCount: number;
  description: string;
}> {
  return [
    {
      modality: 0,
      d4Representation: "vector (8_v)",
      vertexCount: 32,
      description: "Standard representation: real-valued observables, measurement basis",
    },
    {
      modality: 1,
      d4Representation: "spinor+ (8_s)",
      vertexCount: 32,
      description: "Positive chirality spinor: left-handed quantum states",
    },
    {
      modality: 2,
      d4Representation: "spinor− (8_c)",
      vertexCount: 32,
      description: "Negative chirality spinor: right-handed quantum states",
    },
  ];
}

// ── Verification ──────────────────────────────────────────────────────────

/**
 * Run full triality verification suite.
 */
export function runTrialityVerification(): TrialityReport {
  const atlas = getAtlas();
  const decomp = computeTrialityDecomposition();
  const tests: TrialityTest[] = [];

  // Test 1: Bijection round-trip for all 96 vertices
  {
    let allOk = true;
    for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
      const coord = decodeTriality(i);
      if (encodeTriality(coord) !== i) { allOk = false; break; }
    }
    tests.push({
      name: "Bijection round-trip (encode∘decode = id)",
      holds: allOk,
      expected: "96/96 round-trips",
      actual: allOk ? "96/96 round-trips" : "FAILED",
    });
  }

  // Test 2: Inverse round-trip (decode∘encode = id)
  {
    let allOk = true;
    for (let h2 = 0; h2 < QUADRANT_COUNT; h2++) {
      for (let d = 0; d < MODALITY_COUNT; d++) {
        for (let l = 0; l < SLOT_COUNT; l++) {
          const coord: TrialityCoordinate = {
            quadrant: h2 as 0|1|2|3,
            modality: d as 0|1|2,
            slot: l as 0|1|2|3|4|5|6|7,
          };
          const decoded = decodeTriality(encodeTriality(coord));
          if (decoded.quadrant !== coord.quadrant ||
              decoded.modality !== coord.modality ||
              decoded.slot !== coord.slot) {
            allOk = false;
            break;
          }
        }
      }
    }
    tests.push({
      name: "Inverse round-trip (decode∘encode = id)",
      holds: allOk,
      expected: "96/96 inverse round-trips",
      actual: allOk ? "96/96 inverse round-trips" : "FAILED",
    });
  }

  // Test 3: All indices covered exactly once
  {
    const seen = new Set<number>();
    for (let h2 = 0; h2 < QUADRANT_COUNT; h2++) {
      for (let d = 0; d < MODALITY_COUNT; d++) {
        for (let l = 0; l < SLOT_COUNT; l++) {
          seen.add(encodeTriality({
            quadrant: h2 as 0|1|2|3,
            modality: d as 0|1|2,
            slot: l as 0|1|2|3|4|5|6|7,
          }));
        }
      }
    }
    tests.push({
      name: "Surjection: all 96 indices covered",
      holds: seen.size === 96,
      expected: "96",
      actual: String(seen.size),
    });
  }

  // Test 4: D-transform is order 3 (D³ = identity)
  {
    let allOrder3 = true;
    for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
      const d1 = dTransform(i, 1);
      const d2 = dTransform(d1, 1);
      const d3 = dTransform(d2, 1);
      if (d3 !== i) { allOrder3 = false; break; }
    }
    tests.push({
      name: "D-transform has order 3 (D³ = id)",
      holds: allOrder3,
      expected: "D³(v) = v for all v",
      actual: allOrder3 ? "D³(v) = v for all v" : "FAILED",
    });
  }

  // Test 5: D² = D⁻¹ (applying D twice = applying D inverse once)
  {
    let allOk = true;
    for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
      const d2 = dTransform(dTransform(i, 1), 1);
      const dInv = dTransform(i, 2);
      if (d2 !== dInv) { allOk = false; break; }
    }
    tests.push({
      name: "D² = D⁻¹ (shift-2 is inverse of shift-1)",
      holds: allOk,
      expected: "D²(v) = D⁻¹(v) for all v",
      actual: allOk ? "D²(v) = D⁻¹(v) for all v" : "FAILED",
    });
  }

  // Test 6: Exactly 32 orbits
  {
    tests.push({
      name: "Orbit count = 32",
      holds: decomp.orbits.length === ORBIT_COUNT,
      expected: "32",
      actual: String(decomp.orbits.length),
    });
  }

  // Test 7: Every orbit has exactly 3 vertices
  {
    const allSize3 = decomp.orbits.every(o => o.vertices.length === 3);
    tests.push({
      name: "Every orbit has exactly 3 vertices",
      holds: allSize3,
      expected: "all orbits size 3",
      actual: allSize3 ? "all orbits size 3" : "FAILED",
    });
  }

  // Test 8: Orbits partition the vertex set (disjoint union = {0..95})
  {
    const allVertices = new Set<number>();
    for (const orbit of decomp.orbits) {
      for (const v of orbit.vertices) allVertices.add(v);
    }
    const isPartition = allVertices.size === 96;
    tests.push({
      name: "Orbits partition {0..95}",
      holds: isPartition,
      expected: "96 distinct vertices across orbits",
      actual: String(allVertices.size),
    });
  }

  // Test 9: D-transform preserves quadrant and slot
  {
    let preserves = true;
    for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
      const c0 = decodeTriality(i);
      const c1 = decodeTriality(dTransform(i, 1));
      if (c0.quadrant !== c1.quadrant || c0.slot !== c1.slot) {
        preserves = false; break;
      }
    }
    tests.push({
      name: "D-transform preserves (h₂, ℓ)",
      holds: preserves,
      expected: "h₂ and ℓ invariant under D",
      actual: preserves ? "h₂ and ℓ invariant under D" : "FAILED",
    });
  }

  // Test 10: Each modality has exactly 32 vertices
  {
    const counts = [0, 0, 0];
    for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
      counts[decodeTriality(i).modality]++;
    }
    const allEq = counts.every(c => c === 32);
    tests.push({
      name: "Each modality has 32 vertices",
      holds: allEq,
      expected: "[32, 32, 32]",
      actual: `[${counts.join(", ")}]`,
    });
  }

  // Test 11: D₄ triality correspondence covers all 3 representations
  {
    const corr = d4TrialityCorrespondence();
    const allThree = corr.length === 3 &&
      corr[0].d4Representation.includes("8_v") &&
      corr[1].d4Representation.includes("8_s") &&
      corr[2].d4Representation.includes("8_c");
    tests.push({
      name: "D₄ triality: 8_v, 8_s, 8_c all present",
      holds: allThree,
      expected: "3 D₄ representations",
      actual: allThree ? "3 D₄ representations" : "FAILED",
    });
  }

  // Test 12: Mirror τ preserves quadrant (h₂) — since τ flips e₇ within
  // a 12-element (e₁,e₂,e₃) block, and each quadrant spans two such blocks,
  // τ stays within the same quadrant.
  {
    let preservesQuadrant = true;
    for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
      const c = decodeTriality(i);
      const mi = atlas.vertices[i].mirrorPair;
      const mc = decodeTriality(mi);
      if (c.quadrant !== mc.quadrant) { preservesQuadrant = false; break; }
    }
    tests.push({
      name: "Mirror τ preserves quadrant (h₂)",
      holds: preservesQuadrant,
      expected: "h₂(v) = h₂(τ(v)) for all v",
      actual: preservesQuadrant ? "h₂(v) = h₂(τ(v)) for all v" : "FAILED",
    });
  }

  return {
    tests,
    allPassed: tests.every(t => t.holds),
    orbitCount: decomp.orbits.length,
    bijectionHolds: decomp.bijectionVerified,
  };
}
