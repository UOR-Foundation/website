/**
 * Belt ↔ Atlas Fiber Bijection
 * ═══════════════════════════════
 *
 * THEOREM: The Sigmatics belt addressing system (48 pages × 256 bytes = 12,288 slots)
 * corresponds exactly to the Atlas fiber decomposition (96 vertices × 128 exterior = 12,288).
 *
 * Belt addressing:
 *   belt_addr = page × 256 + byte
 *   where page ∈ [0, 47], byte ∈ [0, 255]
 *
 * Atlas fiber addressing:
 *   fiber_addr = vertex × 128 + exterior
 *   where vertex ∈ [0, 95], exterior ∈ [0, 127]
 *
 * The bijection:
 *   48 pages  = 96 vertices / 2  (mirror-folded: each page = one mirror pair)
 *   256 bytes = 128 exterior × 2 (dual semantics: literal + operational)
 *
 * Dual semantics from Sigmatics:
 *   Literal backend   (byte < 128) → Observer side (measurement/observation)
 *   Operational backend (byte ≥ 128) → Curry-Howard side (proof/computation)
 *
 * @module atlas/belt-fiber
 */

import { getAtlas, ATLAS_VERTEX_COUNT } from "./atlas";

// ── Constants ─────────────────────────────────────────────────────────────

/** Number of belt pages = 96 / 2 (mirror-folded). */
export const BELT_PAGES = 48;
/** Bytes per page. */
export const BYTES_PER_PAGE = 256;
/** Total belt slots. */
export const BELT_TOTAL = BELT_PAGES * BYTES_PER_PAGE; // 12,288
/** Number of exterior elements per vertex. */
export const EXTERIOR_PER_VERTEX = 128;
/** Total fiber slots. */
export const FIBER_TOTAL = ATLAS_VERTEX_COUNT * EXTERIOR_PER_VERTEX; // 12,288

// ── Types ─────────────────────────────────────────────────────────────────

/** A belt address in Sigmatics format. */
export interface BeltAddress {
  /** Page index (0–47). */
  readonly page: number;
  /** Byte offset within page (0–255). */
  readonly byte: number;
}

/** An Atlas fiber coordinate. */
export interface FiberCoordinate {
  /** Vertex index (0–95). */
  readonly vertex: number;
  /** Exterior element index (0–127). */
  readonly exterior: number;
}

/** Dual semantic classification of a belt byte. */
export interface DualSemantic {
  /** Which backend this byte belongs to. */
  readonly backend: "literal" | "operational";
  /** The exterior element index (0–127) regardless of backend. */
  readonly exteriorIndex: number;
  /** Description of the semantic role. */
  readonly role: string;
}

/** The mirror pair corresponding to a belt page. */
export interface PageMirrorPair {
  /** Page index (0–47). */
  readonly page: number;
  /** The "primary" vertex (lower index of the mirror pair). */
  readonly primaryVertex: number;
  /** The "mirror" vertex (higher index). */
  readonly mirrorVertex: number;
}

/** Full belt↔fiber bijection result. */
export interface BeltFiberBijection {
  /** All 48 page↔mirror correspondences. */
  readonly pageMirrorPairs: ReadonlyArray<PageMirrorPair>;
  /** Total slots verified. */
  readonly totalSlots: number;
  /** Whether the bijection is verified. */
  readonly bijectionVerified: boolean;
}

/** Verification report. */
export interface BeltFiberReport {
  readonly tests: ReadonlyArray<BeltFiberTest>;
  readonly allPassed: boolean;
  readonly totalSlots: number;
}

export interface BeltFiberTest {
  readonly name: string;
  readonly holds: boolean;
  readonly expected: string;
  readonly actual: string;
}

// ── Page ↔ Mirror Pair Mapping ────────────────────────────────────────────

/** Cached mirror pairs sorted by primary vertex. */
let _mirrorPairsCache: PageMirrorPair[] | null = null;

function getMirrorPairs(): PageMirrorPair[] {
  if (_mirrorPairsCache) return _mirrorPairsCache;
  const atlas = getAtlas();
  const pairs: PageMirrorPair[] = [];
  const seen = new Set<number>();
  for (const v of atlas.vertices) {
    if (!seen.has(v.index)) {
      const lo = Math.min(v.index, v.mirrorPair);
      const hi = Math.max(v.index, v.mirrorPair);
      pairs.push({
        page: pairs.length,
        primaryVertex: lo,
        mirrorVertex: hi,
      });
      seen.add(v.index);
      seen.add(v.mirrorPair);
    }
  }
  _mirrorPairsCache = pairs;
  return pairs;
}

// ── Bijection Functions ───────────────────────────────────────────────────

/**
 * Convert a belt address to a fiber coordinate.
 *
 * page → mirror pair → (primary vertex, mirror vertex)
 * byte < 128: literal backend → primary vertex, exterior = byte
 * byte ≥ 128: operational backend → mirror vertex, exterior = byte - 128
 */
export function beltToFiber(addr: BeltAddress): FiberCoordinate {
  if (addr.page < 0 || addr.page >= BELT_PAGES) {
    throw new RangeError(`Page ${addr.page} out of range [0, ${BELT_PAGES})`);
  }
  if (addr.byte < 0 || addr.byte >= BYTES_PER_PAGE) {
    throw new RangeError(`Byte ${addr.byte} out of range [0, ${BYTES_PER_PAGE})`);
  }
  const pair = getMirrorPairs()[addr.page];
  if (addr.byte < 128) {
    return { vertex: pair.primaryVertex, exterior: addr.byte };
  } else {
    return { vertex: pair.mirrorVertex, exterior: addr.byte - 128 };
  }
}

/**
 * Convert a fiber coordinate to a belt address.
 *
 * vertex → find which mirror pair → page
 * If vertex is primary: byte = exterior (literal backend)
 * If vertex is mirror: byte = exterior + 128 (operational backend)
 */
export function fiberToBelt(coord: FiberCoordinate): BeltAddress {
  if (coord.vertex < 0 || coord.vertex >= ATLAS_VERTEX_COUNT) {
    throw new RangeError(`Vertex ${coord.vertex} out of range [0, ${ATLAS_VERTEX_COUNT})`);
  }
  if (coord.exterior < 0 || coord.exterior >= EXTERIOR_PER_VERTEX) {
    throw new RangeError(`Exterior ${coord.exterior} out of range [0, ${EXTERIOR_PER_VERTEX})`);
  }
  const pairs = getMirrorPairs();
  for (const pair of pairs) {
    if (coord.vertex === pair.primaryVertex) {
      return { page: pair.page, byte: coord.exterior };
    }
    if (coord.vertex === pair.mirrorVertex) {
      return { page: pair.page, byte: coord.exterior + 128 };
    }
  }
  throw new Error(`Vertex ${coord.vertex} not found in any mirror pair`);
}

/**
 * Classify the dual semantic of a belt byte.
 */
export function classifyByte(byte: number): DualSemantic {
  if (byte < 128) {
    return {
      backend: "literal",
      exteriorIndex: byte,
      role: "Observer side: measurement, observation, state readout",
    };
  } else {
    return {
      backend: "operational",
      exteriorIndex: byte - 128,
      role: "Curry-Howard side: proof term, computation, gate application",
    };
  }
}

/**
 * Convert a linear slot index [0, 12287] to a belt address.
 */
export function slotToBelt(slot: number): BeltAddress {
  return { page: Math.floor(slot / BYTES_PER_PAGE), byte: slot % BYTES_PER_PAGE };
}

/**
 * Convert a belt address to a linear slot index.
 */
export function beltToSlot(addr: BeltAddress): number {
  return addr.page * BYTES_PER_PAGE + addr.byte;
}

/**
 * Convert a linear slot index to a fiber coordinate.
 */
export function slotToFiber(slot: number): FiberCoordinate {
  return beltToFiber(slotToBelt(slot));
}

/**
 * Convert a fiber coordinate to a linear slot index.
 */
export function fiberToSlot(coord: FiberCoordinate): number {
  return beltToSlot(fiberToBelt(coord));
}

// ── Full Bijection Construction ───────────────────────────────────────────

/**
 * Build and verify the complete belt↔fiber bijection.
 */
export function buildBeltFiberBijection(): BeltFiberBijection {
  const pairs = getMirrorPairs();

  // Verify round-trip for all 12,288 slots
  let allOk = true;
  for (let slot = 0; slot < BELT_TOTAL; slot++) {
    const belt = slotToBelt(slot);
    const fiber = beltToFiber(belt);
    const roundTrip = fiberToBelt(fiber);
    if (roundTrip.page !== belt.page || roundTrip.byte !== belt.byte) {
      allOk = false;
      break;
    }
  }

  return {
    pageMirrorPairs: pairs,
    totalSlots: BELT_TOTAL,
    bijectionVerified: allOk,
  };
}

// ── Verification ──────────────────────────────────────────────────────────

/**
 * Run full belt↔fiber verification.
 */
export function runBeltFiberVerification(): BeltFiberReport {
  const tests: BeltFiberTest[] = [];
  const pairs = getMirrorPairs();

  // Test 1: Total slots = 12,288
  tests.push({
    name: "Total belt slots = 12,288",
    holds: BELT_TOTAL === 12288,
    expected: "12288",
    actual: String(BELT_TOTAL),
  });

  // Test 2: Total fiber slots = 12,288
  tests.push({
    name: "Total fiber slots = 12,288",
    holds: FIBER_TOTAL === 12288,
    expected: "12288",
    actual: String(FIBER_TOTAL),
  });

  // Test 3: Belt = Fiber (sizes match)
  tests.push({
    name: "Belt total = Fiber total",
    holds: BELT_TOTAL === FIBER_TOTAL,
    expected: "12288 = 12288",
    actual: `${BELT_TOTAL} = ${FIBER_TOTAL}`,
  });

  // Test 4: 48 mirror pairs
  tests.push({
    name: "48 mirror pairs (pages)",
    holds: pairs.length === BELT_PAGES,
    expected: "48",
    actual: String(pairs.length),
  });

  // Test 5: Mirror pairs cover all 96 vertices
  {
    const allVerts = new Set<number>();
    for (const p of pairs) {
      allVerts.add(p.primaryVertex);
      allVerts.add(p.mirrorVertex);
    }
    tests.push({
      name: "Mirror pairs cover all 96 vertices",
      holds: allVerts.size === ATLAS_VERTEX_COUNT,
      expected: "96",
      actual: String(allVerts.size),
    });
  }

  // Test 6: Belt→Fiber→Belt round-trip (all 12,288 slots)
  {
    let roundTripOk = true;
    for (let slot = 0; slot < BELT_TOTAL; slot++) {
      const belt = slotToBelt(slot);
      const fiber = beltToFiber(belt);
      const rt = fiberToBelt(fiber);
      if (rt.page !== belt.page || rt.byte !== belt.byte) {
        roundTripOk = false;
        break;
      }
    }
    tests.push({
      name: "Belt→Fiber→Belt round-trip (12,288 slots)",
      holds: roundTripOk,
      expected: "all 12,288 round-trip",
      actual: roundTripOk ? "all 12,288 round-trip" : "FAILED",
    });
  }

  // Test 7: Fiber→Belt→Fiber round-trip (all 12,288 coordinates)
  {
    let roundTripOk = true;
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      for (let e = 0; e < EXTERIOR_PER_VERTEX; e++) {
        const fiber: FiberCoordinate = { vertex: v, exterior: e };
        const belt = fiberToBelt(fiber);
        const rt = beltToFiber(belt);
        if (rt.vertex !== v || rt.exterior !== e) {
          roundTripOk = false;
          break;
        }
      }
      if (!roundTripOk) break;
    }
    tests.push({
      name: "Fiber→Belt→Fiber round-trip (12,288 coords)",
      holds: roundTripOk,
      expected: "all 12,288 round-trip",
      actual: roundTripOk ? "all 12,288 round-trip" : "FAILED",
    });
  }

  // Test 8: Literal backend maps to primary vertices
  {
    let allLiteralPrimary = true;
    for (let page = 0; page < BELT_PAGES; page++) {
      for (let byte = 0; byte < 128; byte++) {
        const fiber = beltToFiber({ page, byte });
        if (fiber.vertex !== pairs[page].primaryVertex) {
          allLiteralPrimary = false;
          break;
        }
      }
      if (!allLiteralPrimary) break;
    }
    tests.push({
      name: "Literal backend → primary vertex",
      holds: allLiteralPrimary,
      expected: "byte < 128 → primary",
      actual: allLiteralPrimary ? "byte < 128 → primary" : "FAILED",
    });
  }

  // Test 9: Operational backend maps to mirror vertices
  {
    let allOpMirror = true;
    for (let page = 0; page < BELT_PAGES; page++) {
      for (let byte = 128; byte < 256; byte++) {
        const fiber = beltToFiber({ page, byte });
        if (fiber.vertex !== pairs[page].mirrorVertex) {
          allOpMirror = false;
          break;
        }
      }
      if (!allOpMirror) break;
    }
    tests.push({
      name: "Operational backend → mirror vertex",
      holds: allOpMirror,
      expected: "byte ≥ 128 → mirror",
      actual: allOpMirror ? "byte ≥ 128 → mirror" : "FAILED",
    });
  }

  // Test 10: Dual semantics classify correctly
  {
    const lit = classifyByte(0);
    const op = classifyByte(200);
    const correct = lit.backend === "literal" && lit.exteriorIndex === 0 &&
                    op.backend === "operational" && op.exteriorIndex === 72;
    tests.push({
      name: "Dual semantic classification correct",
      holds: correct,
      expected: "literal(0)=0, operational(200)=72",
      actual: `${lit.backend}(0)=${lit.exteriorIndex}, ${op.backend}(200)=${op.exteriorIndex}`,
    });
  }

  // Test 11: Fiber addresses are unique (no collisions)
  {
    const fiberSet = new Set<string>();
    let unique = true;
    for (let slot = 0; slot < BELT_TOTAL; slot++) {
      const f = beltToFiber(slotToBelt(slot));
      const key = `${f.vertex}:${f.exterior}`;
      if (fiberSet.has(key)) { unique = false; break; }
      fiberSet.add(key);
    }
    tests.push({
      name: "All fiber addresses unique (injection)",
      holds: unique,
      expected: "12,288 unique fiber coords",
      actual: unique ? "12,288 unique fiber coords" : "FAILED",
    });
  }

  // Test 12: Surjection — all (vertex, exterior) pairs are hit
  {
    const fiberSet = new Set<string>();
    for (let slot = 0; slot < BELT_TOTAL; slot++) {
      const f = beltToFiber(slotToBelt(slot));
      fiberSet.add(`${f.vertex}:${f.exterior}`);
    }
    tests.push({
      name: "All fiber coords reachable (surjection)",
      holds: fiberSet.size === FIBER_TOTAL,
      expected: "12288",
      actual: String(fiberSet.size),
    });
  }

  return {
    tests,
    allPassed: tests.every(t => t.holds),
    totalSlots: BELT_TOTAL,
  };
}
