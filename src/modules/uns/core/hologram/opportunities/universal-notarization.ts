/**
 * Opportunity 5: UNIVERSAL NOTARIZATION
 * ══════════════════════════════════════
 *
 * Any projection (DID, VC, ONNX model, skill.md, AgentCard) can be
 * notarized on Bitcoin with zero additional code — the settlement
 * bridge is structural.
 *
 * @module uns/core/hologram/opportunities/universal-notarization
 */

import { project, PROJECTIONS } from "../index";
import type { ProjectionInput, HologramProjection } from "../index";

/** A notarization record for one projection. */
export interface NotarizationRecord {
  readonly projection: string;
  readonly value: string;
  /** The Bitcoin OP_RETURN script that anchors this projection. */
  readonly bitcoinScript: string;
  /** The Bitcoin hash-lock script for conditional reveal. */
  readonly hashLock: string;
  /** The Lightning payment hash for instant settlement. */
  readonly lightningHash: string | null;
  /** Verification: "same hash → same OP_RETURN → same identity" */
  readonly verificationProof: string;
}

/** The complete universal notarization for one identity. */
export interface UniversalNotarization {
  readonly "@type": "opportunity:UniversalNotarization";
  readonly threadHash: string;
  readonly bitcoinAnchor: HologramProjection;
  readonly hashLockAnchor: HologramProjection;
  readonly lightningAnchor: HologramProjection | null;
  readonly notarizations: readonly NotarizationRecord[];
  readonly notarizationCount: number;
  /** Every notarization shares this OP_RETURN — structural proof. */
  readonly sharedOpReturn: string;
}

/**
 * Build universal notarization records for all projections of an identity.
 *
 * The key insight: every projection derives from the same hash,
 * so ONE Bitcoin OP_RETURN notarizes ALL projections simultaneously.
 */
export function buildUniversalNotarization(
  input: ProjectionInput,
  /** Optional: only notarize specific projections. */
  targets?: string[],
): UniversalNotarization {
  const btc = project(input, "bitcoin");
  const hashLock = project(input, "bitcoin-hashlock");
  const lightning = PROJECTIONS.has("lightning") ? project(input, "lightning") : null;

  const notarizations: NotarizationRecord[] = [];
  const projectionNames = targets ?? [...PROJECTIONS.keys()];

  for (const name of projectionNames) {
    if (!PROJECTIONS.has(name)) continue;
    // Skip settlement projections themselves
    if (["bitcoin", "bitcoin-hashlock", "lightning"].includes(name)) continue;

    const resolved = project(input, name);
    notarizations.push({
      projection: name,
      value: resolved.value,
      bitcoinScript: btc.value,
      hashLock: hashLock.value,
      lightningHash: lightning?.value ?? null,
      verificationProof:
        `${name} value "${resolved.value.slice(0, 32)}..." and Bitcoin OP_RETURN ` +
        `"${btc.value.slice(0, 32)}..." share the same 256-bit hash ${input.hex.slice(0, 16)}... — ` +
        `notarization is structural, not asserted`,
    });
  }

  return {
    "@type": "opportunity:UniversalNotarization",
    threadHash: input.hex,
    bitcoinAnchor: btc,
    hashLockAnchor: hashLock,
    lightningAnchor: lightning,
    notarizations,
    notarizationCount: notarizations.length,
    sharedOpReturn: btc.value,
  };
}
