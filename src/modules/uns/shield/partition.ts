/**
 * UNS Shield — Ring-Arithmetic Partition Analysis Engine
 *
 * Classifies network traffic using the UOR ring R_8 = Z/256Z partition
 * structure. Every byte belongs to exactly one of four algebraic classes:
 *
 *   EXTERIOR    b === 0                         (1 value)
 *   UNIT        b === 1 || b === 255            (2 values)
 *   IRREDUCIBLE b is odd, b ∉ {1, 255}         (126 values)
 *   REDUCIBLE   b is even, b !== 0             (127 values)
 *
 * Legitimate traffic (HTTPS, TLS) has high irreducible density (0.40–0.65).
 * Flood traffic (null bytes, repeated patterns) has near-zero density.
 * This enables sub-microsecond DDoS classification at the byte level.
 *
 * @see partition: namespace — UOR Framework spec/src/namespaces/partition.rs
 */

// ── Types ───────────────────────────────────────────────────────────────────

/** The four algebraic partition classes in R_8. */
export type PartitionClass = "IRREDUCIBLE" | "REDUCIBLE" | "UNIT" | "EXTERIOR";

/** Traffic action based on irreducible density. */
export type ShieldAction = "PASS" | "WARN" | "CHALLENGE" | "BLOCK";

/** Full partition analysis result with per-byte audit trail. */
export interface PartitionResult {
  /** Count of irreducible bytes (odd, not 1 or 255). */
  irreducible: number;
  /** Count of reducible bytes (even, not 0). */
  reducible: number;
  /** Count of unit bytes (1 or 255). */
  unit: number;
  /** Count of exterior bytes (0). */
  exterior: number;
  /** Total byte count. */
  total: number;
  /** Irreducible density: irreducible / total. */
  density: number;
  /** Recommended action based on density thresholds. */
  action: ShieldAction;
  /** Per-byte classification (for audit). */
  perByte: PartitionClass[];
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
 */
const BYTE_CLASS: PartitionClass[] = new Array(256);

for (let b = 0; b < 256; b++) {
  if (b === 0) {
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
 *   density >= 0.40  → PASS       (typical HTTPS: 0.40–0.65)
 *   density >= 0.25  → WARN       (low entropy — possible bot)
 *   density >= 0.15  → CHALLENGE  (ring PoW required)
 *   density <  0.15  → BLOCK      (flood/spam)
 */
function densityToAction(density: number): ShieldAction {
  if (density >= 0.40) return "PASS";
  if (density >= 0.25) return "WARN";
  if (density >= 0.15) return "CHALLENGE";
  return "BLOCK";
}

// ── Public API ──────────────────────────────────────────────────────────────

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

  return {
    irreducible,
    reducible,
    unit,
    exterior,
    total,
    density,
    action: densityToAction(density),
    perByte,
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
