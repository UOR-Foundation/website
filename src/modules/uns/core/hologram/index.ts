/**
 * UOR Hologram Projection Registry
 * ═════════════════════════════════
 *
 * Every UOR object is a hologram: one canonical identity, infinite projections.
 *
 * A projection is a pure function that maps hash bytes to a protocol-native
 * identifier. Just as IPv6, CID, and Braille are projections of the same
 * SHA-256 hash, so are ActivityPub IDs, AT Protocol URIs, WebFinger accounts,
 * and every other standard on earth.
 *
 * One object. One hash. Every standard.
 *
 *   const identity = await singleProofHash(obj);
 *   const hologram = project(identity);
 *   hologram.did         → "did:uor:{cid}"
 *   hologram.activitypub → "https://uor.foundation/ap/objects/{hex}"
 *   hologram.webfinger   → "acct:{hex16}@uor.foundation"
 *
 * @module uns/core/hologram
 */

import type { UorCanonicalIdentity } from "../address";
import { SPECS } from "./specs";

// ── Types ───────────────────────────────────────────────────────────────────

/** The input every projection receives — derived from singleProofHash(). */
export interface ProjectionInput {
  /** Raw 32-byte SHA-256 digest. */
  readonly hashBytes: Uint8Array;
  /** CIDv1/dag-json/sha2-256/base32lower. */
  readonly cid: string;
  /** SHA-256 lowercase hex (64 chars). */
  readonly hex: string;
}

/** Whether the projection preserves the full 256-bit identity. */
export type Fidelity = "lossless" | "lossy";

/** A projection specification — one per external standard. */
export interface HologramSpec {
  /** Pure function: identity → protocol-native identifier string. */
  readonly project: (input: ProjectionInput) => string;
  /** Does this projection preserve the full 256-bit hash? */
  readonly fidelity: Fidelity;
  /** URL to the standard's specification. */
  readonly spec: string;
  /** Human-readable warning if lossy. */
  readonly lossWarning?: string;
}

/** The complete hologram: every registered projection of one identity. */
export interface Hologram {
  /** The source canonical identity. */
  readonly source: ProjectionInput;
  /** All projections keyed by standard name. */
  readonly projections: Readonly<Record<string, HologramProjection>>;
}

/** A single resolved projection. */
export interface HologramProjection {
  readonly value: string;
  readonly fidelity: Fidelity;
  readonly spec: string;
  readonly lossWarning?: string;
}

// ── Registry ────────────────────────────────────────────────────────────────

/** The live projection registry. Immutable after module load. */
export const PROJECTIONS: ReadonlyMap<string, HologramSpec> = SPECS;

// ── Projection Function ────────────────────────────────────────────────────

/**
 * Extract ProjectionInput from a UorCanonicalIdentity.
 */
function toInput(identity: UorCanonicalIdentity): ProjectionInput {
  const hex = identity["u:canonicalId"].split(":").pop()!;
  return { hashBytes: identity.hashBytes, cid: identity["u:cid"], hex };
}

/**
 * Project a UOR identity through all registered standards.
 *
 * @param identity  Output of singleProofHash() or buildIdentity().
 * @param target    Optional — project only one standard by name.
 * @returns         The complete hologram, or a single projection if target specified.
 */
export function project(identity: UorCanonicalIdentity): Hologram;
export function project(identity: UorCanonicalIdentity, target: string): HologramProjection;
export function project(
  identity: UorCanonicalIdentity,
  target?: string,
): Hologram | HologramProjection {
  const input = toInput(identity);

  if (target) {
    const spec = PROJECTIONS.get(target);
    if (!spec) throw new Error(`Unknown projection: "${target}". Registered: ${[...PROJECTIONS.keys()].join(", ")}`);
    return resolve(spec, input);
  }

  const projections: Record<string, HologramProjection> = {};
  for (const [name, spec] of PROJECTIONS) {
    projections[name] = resolve(spec, input);
  }
  return { source: input, projections };
}

function resolve(spec: HologramSpec, input: ProjectionInput): HologramProjection {
  return {
    value: spec.project(input),
    fidelity: spec.fidelity,
    spec: spec.spec,
    ...(spec.lossWarning ? { lossWarning: spec.lossWarning } : {}),
  };
}
