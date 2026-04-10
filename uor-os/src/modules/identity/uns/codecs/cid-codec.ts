/**
 * UOR ↔ CID Bidirectional Codec
 * ══════════════════════════════
 *
 * Provides interoperability between UOR canonical addresses and
 * the multiformats CID ecosystem (IPFS, Filecoin, AT Protocol).
 *
 * Uses the `multiformats` library — the standard CID implementation
 * used by IPFS, Bluesky/AT Protocol, and all CID-aware systems.
 *
 * @module uns/codecs/cid-codec
 */

import { CID } from "multiformats/cid";
import * as json from "multiformats/codecs/json";
import { sha256 } from "multiformats/hashes/sha2";
import { sha256 as nobleSha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

// ── dag-json codec code ─────────────────────────────────────────────────────
const DAG_JSON_CODE = 0x0129;

/**
 * Create a CIDv1 from raw content bytes.
 * Uses dag-json codec + sha2-256 multihash — identical to UOR's CID derivation.
 */
export async function cidFromBytes(contentBytes: Uint8Array): Promise<CID> {
  const hash = await sha256.digest(contentBytes);
  return CID.create(1, DAG_JSON_CODE, hash);
}

/**
 * Create a CIDv1 from a JSON-serializable object.
 * Encodes via the standard JSON codec, then hashes with sha2-256.
 */
export async function cidFromObject(obj: unknown): Promise<CID> {
  const bytes = json.encode(obj);
  const hash = await sha256.digest(bytes);
  return CID.create(1, json.code, hash);
}

/**
 * Convert a UOR canonical ID (urn:uor:derivation:sha256:{hex64}) to a CID.
 *
 * The hex64 portion is the raw SHA-256 digest. We wrap it in a CIDv1
 * with dag-json codec and sha2-256 multihash.
 */
export function cidFromUorCanonicalId(canonicalId: string): CID {
  const match = canonicalId.match(/^urn:uor:derivation:sha256:([0-9a-f]{64})$/);
  if (!match) {
    throw new Error(`Invalid UOR canonical ID format: ${canonicalId}`);
  }
  const hexDigest = match[1];
  const digestBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    digestBytes[i] = parseInt(hexDigest.slice(i * 2, i * 2 + 2), 16);
  }

  // Build multihash digest object manually
  // code=0x12 (sha2-256), size=32, digest=bytes
  const multihashDigest = {
    code: 0x12,
    size: 32,
    digest: digestBytes,
    bytes: new Uint8Array([0x12, 0x20, ...digestBytes]),
  };

  return CID.create(1, DAG_JSON_CODE, multihashDigest as any);
}

/**
 * Convert a CID back to a UOR canonical ID.
 *
 * Only works for CIDs using sha2-256 multihash (code 0x12).
 * Returns the urn:uor:derivation:sha256:{hex64} form.
 */
export function uorCanonicalIdFromCid(cid: CID): string {
  const multihash = cid.multihash;
  if (multihash.code !== 0x12) {
    throw new Error(`CID uses hash code ${multihash.code}, expected 0x12 (sha2-256)`);
  }
  const hex = bytesToHex(multihash.digest);
  return `urn:uor:derivation:sha256:${hex}`;
}

/**
 * Convert a CID to its string representation (multibase-encoded).
 */
export function cidToString(cid: CID): string {
  return cid.toString();
}

/**
 * Parse a CID from its string representation.
 */
export function cidFromString(cidStr: string): CID {
  return CID.parse(cidStr);
}

/**
 * Compute the UOR canonical ID directly from content bytes.
 * Uses @noble/hashes for synchronous SHA-256.
 */
export function uorCanonicalIdFromBytes(contentBytes: Uint8Array): string {
  const digest = nobleSha256(contentBytes);
  return `urn:uor:derivation:sha256:${bytesToHex(digest)}`;
}

/**
 * Verify that a CID and UOR canonical ID refer to the same content.
 * Both must be derived from the same SHA-256 digest.
 */
export function verifyCidUorAlignment(cid: CID, canonicalId: string): boolean {
  try {
    const cidCanonical = uorCanonicalIdFromCid(cid);
    return cidCanonical === canonicalId;
  } catch {
    return false;
  }
}
