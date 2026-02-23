/**
 * UNS Shield — Ring-Arithmetic Partition Analysis Engine
 *
 * Classifies network traffic using the UOR ring R_8 = Z/256Z partition
 * structure. Every byte belongs to exactly one of four algebraic classes:
 *
 *   EXTERIOR    b === 0 || b === 128             (2 values)
 *   UNIT        b === 1 || b === 255             (2 values)
 *   IRREDUCIBLE b is odd, b ∉ {1, 255}          (126 values)
 *   REDUCIBLE   b is even, b ∉ {0, 128}         (126 values)
 *
 * CANONICAL SOURCE: spec/src/namespaces/partition.rs — ExteriorSet = {0, m/2}
 *   128 is exterior because it is the unique fixed point of negation
 *   (neg(128) = 128) and the maximal zero divisor (128 × 2 ≡ 0 mod 256).
 *   It generates the unique maximal ideal ⟨128⟩ = {0, 128} in Z/256Z.
 *
 * Legitimate traffic (HTTPS, TLS) has high irreducible density (0.40–0.65).
 * Flood traffic (null bytes, repeated patterns) has near-zero density.
 * This enables sub-microsecond DDoS classification at the byte level.
 *
 * @see spec/src/namespaces/partition.rs — ExteriorSet definition
 * @see src/lib/uor-ring.ts classifyByte — canonical classification logic
 */

import { CATASTROPHE_THRESHOLD } from "@/modules/observable/geometry";

// ── Types ───────────────────────────────────────────────────────────────────

/** The four algebraic partition classes in R_8. */
export type PartitionClass = "IRREDUCIBLE" | "REDUCIBLE" | "UNIT" | "EXTERIOR";

/** Traffic action based on irreducible density. */
export type ShieldAction = "PASS" | "WARN" | "CHALLENGE" | "BLOCK";

/** Full partition analysis result with per-byte audit trail. */
export interface PartitionResult {
  /** Count of irreducible bytes (odd, not 1 or 255). */
  irreducible: number;
  /** Count of reducible bytes (even, not 0 or 128). */
  reducible: number;
  /** Count of unit bytes (1 or 255). */
  unit: number;
  /** Count of exterior bytes (0 or 128). */
  exterior: number;
  /** Total byte count. */
  total: number;
  /** Irreducible density: irreducible / total. */
  density: number;
  /** Recommended action based on density thresholds. */
  action: ShieldAction;
  /** Per-byte classification (for audit). */
  perByte: PartitionClass[];
  /** Cascade length to nearest irreducible element across payload bytes. */
  cascadeLengthToNearestIrreducible: number;
  /** Maximum discrete curvature K(x) across payload bytes. */
  curvatureAtDensityPeak: number;
  /** Net holonomy across the payload byte sequence. */
  holonomyOfPayloadPath: number;
}

/** Lightweight analysis result (fast path — no per-byte array). */
export interface PartitionResultFast {
  density: number;
  action: ShieldAction;
  irreducible: number;
  total: number;
}

// ── Precomputed Lookup Table ────────────────────────────────────────────────

/**
 * 256-entry lookup table: byte value → partition class.
 *
 * Built once at module load. Enables O(1) classification per byte.
 *
 * Canonical cardinalities (spec/src/namespaces/partition.rs):
 *   ExteriorSet:    2   ({0, 128})
 *   UnitSet:        2   ({1, 255})
 *   IrreducibleSet: 126 (odd, ∉ {1, 255})
 *   ReducibleSet:   126 (even, ∉ {0, 128})
 */
const BYTE_CLASS: PartitionClass[] = new Array(256);

for (let b = 0; b < 256; b++) {
  if (b === 0 || b === 128) {
    // spec/src/namespaces/partition.rs — ExteriorSet = {0, m/2}
    BYTE_CLASS[b] = "EXTERIOR";
  } else if (b === 1 || b === 255) {
    BYTE_CLASS[b] = "UNIT";
  } else if (b % 2 === 1) {
    BYTE_CLASS[b] = "IRREDUCIBLE";
  } else {
    BYTE_CLASS[b] = "REDUCIBLE";
  }
}

// ── Density → Action Thresholds ─────────────────────────────────────────────

/**
 * Map density to shield action.
 *
 * BLOCK threshold is ring-derived from CATASTROPHE_THRESHOLD = 4/256 = 0.015625.
 * Source: observable:CatastropheThreshold — (UnitSet + ExteriorSet) / 256.
 *
 *   density >= 0.40                      → PASS       (typical HTTPS: 0.40–0.65)
 *   density >= 0.25                      → WARN       (low entropy — possible bot)
 *   density >  CATASTROPHE_THRESHOLD     → CHALLENGE  (ring PoW required)
 *   density <= CATASTROPHE_THRESHOLD     → BLOCK      (structural collapse — flood/spam)
 */
function densityToAction(density: number): ShieldAction {
  if (density >= 0.40) return "PASS";
  if (density >= 0.25) return "WARN";
  // Ring-derived BLOCK threshold: CATASTROPHE_THRESHOLD = 4/256 = 0.015625
  if (density <= CATASTROPHE_THRESHOLD.value) return "BLOCK";
  return "CHALLENGE";
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Map PartitionClass to numeric ordinal for curvature computation.
 * exterior→0, unit→1, reducible→1, irreducible→2
 */
function classOrdinalFromPartition(cls: PartitionClass): number {
  switch (cls) {
    case "EXTERIOR": return 0;
    case "UNIT": return 1;
    case "REDUCIBLE": return 1;
    case "IRREDUCIBLE": return 2;
  }
}

/**
 * Classify a single byte in R_8 = Z/256Z.
 *
 * O(1) via precomputed lookup table.
 */
export function classifyByte(b: number): PartitionClass {
  return BYTE_CLASS[b & 0xff];
}

/**
 * Full partition analysis of a payload.
 *
 * Returns counts for all four classes, density, action, and a per-byte
 * classification array for auditing purposes.
 *
 * @param payload  Raw bytes to analyze.
 * @returns        Full partition result with audit trail.
 */
export function analyzePayload(payload: Uint8Array): PartitionResult {
  let irreducible = 0;
  let reducible = 0;
  let unit = 0;
  let exterior = 0;
  const perByte: PartitionClass[] = new Array(payload.length);

  for (let i = 0; i < payload.length; i++) {
    const cls = BYTE_CLASS[payload[i]];
    perByte[i] = cls;
    switch (cls) {
      case "IRREDUCIBLE":
        irreducible++;
        break;
      case "REDUCIBLE":
        reducible++;
        break;
      case "UNIT":
        unit++;
        break;
      case "EXTERIOR":
        exterior++;
        break;
    }
  }

  const total = payload.length;
  const density = total > 0 ? irreducible / total : 0;

  // ── P31 Geometry: compute geometric observables across payload ──────────
  let cascadeLengthToNearestIrreducible = 0;
  let curvatureAtDensityPeak = 0;
  let holonomyOfPayloadPath = 0;

  if (total > 0) {
    // Cascade to nearest irreducible: for non-irreducible bytes, measure succ-steps
    for (let i = 0; i < payload.length; i++) {
      if (perByte[i] !== "IRREDUCIBLE") {
        // Find forward cascade to nearest irreducible
        let steps = 0;
        let probe = payload[i];
        while (steps < 256) {
          probe = (probe + 1) % 256;
          steps++;
          if (BYTE_CLASS[probe] === "IRREDUCIBLE") break;
        }
        if (steps < cascadeLengthToNearestIrreducible || cascadeLengthToNearestIrreducible === 0) {
          cascadeLengthToNearestIrreducible = steps;
        }
      }
    }

    // Curvature: max |K(x)| across all payload bytes
    for (let i = 0; i < payload.length; i++) {
      const b = payload[i];
      const succB = (b + 1) % 256;
      const predB = (b + 255) % 256;
      const classOfSucc = classOrdinalFromPartition(BYTE_CLASS[succB]);
      const classOfX = classOrdinalFromPartition(BYTE_CLASS[b]);
      const classOfPred = classOrdinalFromPartition(BYTE_CLASS[predB]);
      const K = classOfSucc - 2 * classOfX + classOfPred;
      if (Math.abs(K) > Math.abs(curvatureAtDensityPeak)) {
        curvatureAtDensityPeak = K;
      }
    }

    // Holonomy: net ring displacement across payload byte sequence
    if (payload.length >= 2) {
      const first = payload[0];
      const last = payload[payload.length - 1];
      holonomyOfPayloadPath = ((last - first) % 256 + 256) % 256;
    }
  }

  return {
    irreducible,
    reducible,
    unit,
    exterior,
    total,
    density,
    action: densityToAction(density),
    perByte,
    cascadeLengthToNearestIrreducible,
    curvatureAtDensityPeak,
    holonomyOfPayloadPath,
  };
}

/**
 * Fast-path partition analysis — density and action only.
 *
 * Skips per-byte array allocation for maximum throughput.
 * Produces identical density and action values as analyzePayload().
 *
 * Target: < 1μs per packet on modern hardware.
 */
export function analyzePayloadFast(payload: Uint8Array): PartitionResultFast {
  let irreducible = 0;

  for (let i = 0; i < payload.length; i++) {
    if (BYTE_CLASS[payload[i]] === "IRREDUCIBLE") {
      irreducible++;
    }
  }

  const total = payload.length;
  const density = total > 0 ? irreducible / total : 0;

  return {
    density,
    action: densityToAction(density),
    irreducible,
    total,
  };
}
