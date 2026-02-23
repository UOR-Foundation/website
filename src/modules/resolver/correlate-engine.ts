/**
 * UOR Correlate Engine — Fidelity Scoring + SKOS Semantic Recommendations
 *
 * Fidelity is computed from ring arithmetic ONLY:
 *   fidelity(a, b) = 1 - (hammingDistance(a_bytes, b_bytes) / maxBits)
 *
 * SKOS thresholds are derived from partition cardinalities (not arbitrary):
 *   exactMatch:  fidelity = 1.0           (canonical ID equality)
 *   closeMatch:  fidelity >= 126/256       (IrreducibleSet / total)
 *   broadMatch:  fidelity >= 4/256         (CatastropheThreshold)
 *   noMatch:     fidelity < 4/256
 *
 * @see spec/src/namespaces/observable.rs — observable:CorrelationMeasure
 * @see SKOS: skos:exactMatch, skos:closeMatch, skos:broadMatch
 */

import { singleProofHash } from "@/modules/uns/core/identity";

// ── SKOS Semantic Relation Types ────────────────────────────────────────────

export type SkosRelation =
  | "skos:exactMatch"
  | "skos:closeMatch"
  | "skos:broadMatch"
  | "skos:noMatch";

// ── Thresholds derived from ring partition cardinalities ─────────────────────

export const FIDELITY_THRESHOLDS = {
  /** Canonical ID equality — identical objects. */
  exactMatch: 1.0,
  /** IrreducibleSet.cardinality / 256 = 126/256 ≈ 0.4921875. */
  closeMatch: 126 / 256,
  /** CatastropheThreshold = (UnitSet + ExteriorSet) / 256 = 4/256 = 0.015625. */
  broadMatch: 4 / 256,
} as const;

// ── Types ───────────────────────────────────────────────────────────────────

export interface CorrelateResult {
  "@type": "observable:CorrelationMeasure";
  "observable:a": string;
  "observable:b": string;
  fidelity: number;
  hamming_distance: number;
  max_bits: number;
  skos_recommendation: SkosRelation;
  skos_label: string;
  epistemic_grade: "A";
  "derivation:derivationId": string;
}

export interface NearDuplicatePair {
  a: string;
  b: string;
  fidelity: number;
  relation: SkosRelation;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Popcount of a byte. */
function popcount8(b: number): number {
  let n = b & 0xff;
  n = n - ((n >> 1) & 0x55);
  n = (n & 0x33) + ((n >> 2) & 0x33);
  return (n + (n >> 4)) & 0x0f;
}

/** Hamming distance between two equal-length byte arrays. */
function hammingDistanceBytes(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  let dist = 0;
  for (let i = 0; i < len; i++) {
    dist += popcount8(a[i] ^ b[i]);
  }
  return dist;
}

/** Decode hex string to Uint8Array. */
function hexToBytes(hex: string): Uint8Array {
  // Strip any prefix like "urn:uor:derivation:sha256:"
  const clean = hex.includes(":") ? hex.split(":").pop()! : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Classify fidelity into SKOS relation. */
export function classifyFidelity(fidelity: number): SkosRelation {
  if (fidelity >= FIDELITY_THRESHOLDS.exactMatch) return "skos:exactMatch";
  if (fidelity >= FIDELITY_THRESHOLDS.closeMatch) return "skos:closeMatch";
  if (fidelity >= FIDELITY_THRESHOLDS.broadMatch) return "skos:broadMatch";
  return "skos:noMatch";
}

/** Human-readable SKOS label. */
function skosLabel(relation: SkosRelation): string {
  switch (relation) {
    case "skos:exactMatch":
      return "Identical — canonical IDs match exactly";
    case "skos:closeMatch":
      return "Close match — structural fidelity ≥ 49.2% (irreducible threshold)";
    case "skos:broadMatch":
      return "Broad match — structural fidelity ≥ 1.6% (catastrophe threshold)";
    case "skos:noMatch":
      return "No match — below catastrophe threshold";
  }
}

// ── Core Correlate Functions ────────────────────────────────────────────────

/**
 * Compute fidelity between two canonical IDs.
 *
 * Uses the 32-byte SHA-256 hash values (256 bits max Hamming distance).
 * fidelity = 1 - (hammingDist / 256)
 */
export async function correlateIds(
  canonicalIdA: string,
  canonicalIdB: string
): Promise<CorrelateResult> {
  const bytesA = hexToBytes(canonicalIdA);
  const bytesB = hexToBytes(canonicalIdB);

  const maxBits = 256; // 32 bytes × 8 bits
  const hamming = hammingDistanceBytes(bytesA, bytesB);
  const fidelity = Math.round((1 - hamming / maxBits) * 10000) / 10000;

  const relation = classifyFidelity(fidelity);

  const proof = await singleProofHash({
    "@type": "observable:CorrelationMeasure",
    "observable:a": canonicalIdA,
    "observable:b": canonicalIdB,
    "observable:fidelity": fidelity,
    "observable:hammingDistance": hamming,
  });

  return {
    "@type": "observable:CorrelationMeasure",
    "observable:a": canonicalIdA,
    "observable:b": canonicalIdB,
    fidelity,
    hamming_distance: hamming,
    max_bits: maxBits,
    skos_recommendation: relation,
    skos_label: skosLabel(relation),
    epistemic_grade: "A",
    "derivation:derivationId": proof["u:canonicalId"],
  };
}

/**
 * Correlate raw byte buffers directly.
 *
 * Computes canonical IDs first, then measures fidelity between the IDs.
 */
export async function correlateBytes(
  a: Uint8Array,
  b: Uint8Array
): Promise<CorrelateResult> {
  // Convert to base64 for hashing
  const toBase64 = (bytes: Uint8Array): string => {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  };

  const [idA, idB] = await Promise.all([
    singleProofHash({ raw: toBase64(a) }),
    singleProofHash({ raw: toBase64(b) }),
  ]);

  return correlateIds(idA["u:canonicalId"], idB["u:canonicalId"]);
}

/**
 * Find all near-duplicate pairs in a set of canonical IDs.
 *
 * Returns pairs with fidelity >= threshold (default: closeMatch threshold).
 * O(n²) pairwise comparison — suitable for small-to-medium sets.
 */
export async function findNearDuplicates(
  canonicalIds: string[],
  threshold: number = FIDELITY_THRESHOLDS.closeMatch
): Promise<NearDuplicatePair[]> {
  const pairs: NearDuplicatePair[] = [];

  for (let i = 0; i < canonicalIds.length; i++) {
    for (let j = i + 1; j < canonicalIds.length; j++) {
      const bytesA = hexToBytes(canonicalIds[i]);
      const bytesB = hexToBytes(canonicalIds[j]);
      const hamming = hammingDistanceBytes(bytesA, bytesB);
      const fidelity = Math.round((1 - hamming / 256) * 10000) / 10000;

      if (fidelity >= threshold) {
        pairs.push({
          a: canonicalIds[i],
          b: canonicalIds[j],
          fidelity,
          relation: classifyFidelity(fidelity),
        });
      }
    }
  }

  return pairs.sort((a, b) => b.fidelity - a.fidelity);
}
