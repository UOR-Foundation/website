/**
 * UNS Core — Canonical Identity Engine
 *
 * THE trust anchor for the entire UNS platform.
 *
 * Pipeline:  obj → URDNA2015 → UTF-8 bytes → SHA-256 → derive all four forms
 *
 * One input. One hash. Four derived identity forms:
 *   1. u:canonicalId  — urn:uor:derivation:sha256:{hex64}  (LOSSLESS, 256-bit)
 *   2. u:ipv6         — fd00:0075:6f72:xxxx:xxxx:xxxx:xxxx:xxxx (routing, 80-bit)
 *   3. u:cid          — CIDv1/dag-json/sha2-256/base32lower (IPFS interop)
 *   4. u:glyph        — Braille bijection (visual identity)
 *
 * Every service in UNS derives correctness from this module.
 */

import { canonicalizeToNQuads } from "./canonicalize";
import {
  sha256,
  buildIdentity,
  verifyIpv6Routing as _verifyIpv6Routing,
} from "./address";
import type { UorCanonicalIdentity } from "./address";

// Re-export the identity type
export type { UorCanonicalIdentity } from "./address";

/**
 * THE SINGLE PROOF HASH.
 *
 * Takes any object (JSON-LD or plain), canonicalizes via URDNA2015,
 * computes one SHA-256 hash, and derives all four identity forms.
 *
 * Same object → same nquads → same hash → same identity.
 * On every system. At any time. Forever.
 *
 * @param obj  Any JSON-LD object or plain JavaScript object.
 * @returns    UorCanonicalIdentity with all four derived forms + u:lossWarning.
 */
export async function singleProofHash(
  obj: unknown
): Promise<UorCanonicalIdentity> {
  // Step 1: URDNA2015 canonical N-Quads
  const nquads = await canonicalizeToNQuads(obj);

  // Step 2: UTF-8 encode — THE single canonical byte sequence
  const canonicalBytes = new TextEncoder().encode(nquads);

  // Step 3: SHA-256 — THE single hash
  const hashBytes = await sha256(canonicalBytes);

  // Step 4: Derive all four identity forms
  return buildIdentity(hashBytes, canonicalBytes);
}

/**
 * PRIMARY verification: recompute the canonical identity and compare.
 *
 * Returns true iff the recomputed u:canonicalId matches the expected one.
 * This is the FULL verification — lossless, 256-bit, deterministic.
 *
 * Any agent, anywhere, can call this to verify identity — no trusted third party.
 */
export async function verifyCanonical(
  obj: unknown,
  expectedCanonicalId: string
): Promise<boolean> {
  const identity = await singleProofHash(obj);
  return identity["u:canonicalId"] === expectedCanonicalId;
}

/**
 * ROUTING-ONLY verification: check that an IPv6 address was correctly
 * derived from the given hash bytes.
 *
 * This verifies the routing projection only — NOT full content identity.
 * Use verifyCanonical() for authoritative verification.
 */
export function verifyIpv6Routing(
  ipv6: string,
  hashBytes: Uint8Array
): boolean {
  return _verifyIpv6Routing(ipv6, hashBytes);
}
