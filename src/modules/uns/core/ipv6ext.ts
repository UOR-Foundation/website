/**
 * UNS Core — IPv6 Destination Options Extension Header
 *
 * Implements lossless full-hash transport alongside every UNS packet.
 *
 * THE PROBLEM:
 *   The IPv6 address (fd00:0075:6f72::/48) carries only 80 content bits —
 *   a lossy routing projection of the 256-bit canonical identity.
 *
 * THE SOLUTION:
 *   An IPv6 Destination Options extension header (RFC 8200 §4.6) carrying
 *   the full 32-byte SHA-256 canonical hash. The IPv6 address routes,
 *   the extension header authenticates.
 *
 * BACKWARD COMPATIBILITY:
 *   Option type 0x1E has action bits 00 (skip and continue) per RFC 8200.
 *   Non-UNS routers forward the header unchanged. Only UNS-aware endpoints
 *   read and verify it.
 *
 * HEADER LAYOUT (40 bytes, aligned to 8-octet boundary):
 *   Offset  Size  Field
 *   ──────  ────  ─────────────────────────────────────
 *   0       1     Next Header (upper-layer protocol)
 *   1       1     Hdr Ext Len = 4 → (4+1)×8 = 40 bytes
 *   2       1     Option Type = 0x1E (UOR canonical hash)
 *   3       1     Option Length = 32
 *   4–35    32    SHA-256 canonical hash bytes
 *   36      1     PadN option type = 0x01
 *   37      1     PadN option length = 0x02
 *   38–39   2     PadN padding = 0x00 0x00
 *
 * @see RFC 8200 §4.6 — Destination Options Header
 * @see RFC 2460 — TLV-encoded options
 */

import { sha256, bytesToHex } from "./address";
import type { UorCanonicalIdentity } from "./address";

// ── Constants ───────────────────────────────────────────────────────────────

/** UOR option type: bits 7-6 = 00 (skip+continue), bit 5 = 0 (not mutable). */
export const UOR_OPTION_TYPE = 0x1e;

/** Length of the SHA-256 hash data in the option. */
export const UOR_OPTION_DATA_LEN = 32;

/** Total header length in bytes (aligned to 8-octet boundary). */
const HEADER_LENGTH = 40;

/** Hdr Ext Len field value: (40 / 8) - 1 = 4. */
const HDR_EXT_LEN = 4;

/** PadN option type (RFC 8200 §4.2). */
const PADN_TYPE = 0x01;

/** PadN option length (2 bytes of zero padding). */
const PADN_LEN = 0x02;

// ── Types ───────────────────────────────────────────────────────────────────

/** Decoded UOR Destination Options header. */
export interface UorDestOptHeader {
  /** Upper-layer protocol number (59 = no next, 6 = TCP, 17 = UDP). */
  nextHeader: number;
  /** The full 32-byte SHA-256 canonical hash. */
  hashBytes: Uint8Array;
}

// ── Encoding ────────────────────────────────────────────────────────────────

/**
 * Encode a UOR Destination Options header.
 *
 * Produces a 40-byte buffer conforming to RFC 8200 §4.6:
 *   [NextHeader][HdrExtLen=4][Type=0x1E][Len=32][hash×32][PadN×4]
 *
 * @param opts  Next header protocol number and the 32-byte canonical hash.
 * @returns     A 40-byte Uint8Array ready for prepending to a payload.
 * @throws      If hashBytes is not exactly 32 bytes.
 */
export function encodeDestOptHeader(opts: UorDestOptHeader): Uint8Array {
  if (opts.hashBytes.length !== UOR_OPTION_DATA_LEN) {
    throw new Error(
      `hashBytes must be exactly ${UOR_OPTION_DATA_LEN} bytes, got ${opts.hashBytes.length}`
    );
  }

  const buf = new Uint8Array(HEADER_LENGTH);

  // Fixed header fields
  buf[0] = opts.nextHeader & 0xff;
  buf[1] = HDR_EXT_LEN;

  // UOR TLV option
  buf[2] = UOR_OPTION_TYPE;
  buf[3] = UOR_OPTION_DATA_LEN;
  buf.set(opts.hashBytes, 4);

  // PadN to align to 8-octet boundary (4 bytes: type + len + 2 zero)
  buf[36] = PADN_TYPE;
  buf[37] = PADN_LEN;
  buf[38] = 0x00;
  buf[39] = 0x00;

  return buf;
}

// ── Decoding ────────────────────────────────────────────────────────────────

/**
 * Decode a UOR Destination Options header.
 *
 * Scans the TLV options for the UOR option type (0x1E).
 * Safely skips unrecognized options per RFC 8200 (action bits 00).
 *
 * @param buf  The raw extension header bytes (minimum 40 bytes).
 * @returns    The decoded header, or null if UOR option not found.
 */
export function decodeDestOptHeader(
  buf: Uint8Array
): UorDestOptHeader | null {
  if (buf.length < 2) return null;

  const nextHeader = buf[0];
  const hdrExtLen = buf[1];
  const totalLen = (hdrExtLen + 1) * 8;

  if (buf.length < totalLen) return null;

  // Scan TLV options starting at offset 2
  let offset = 2;
  while (offset < totalLen) {
    const optType = buf[offset];

    // Pad1 — single zero byte (RFC 8200 §4.2)
    if (optType === 0x00) {
      offset++;
      continue;
    }

    // All other options have Type + Length + Data
    if (offset + 1 >= totalLen) break;
    const optLen = buf[offset + 1];

    if (optType === UOR_OPTION_TYPE && optLen === UOR_OPTION_DATA_LEN) {
      if (offset + 2 + optLen > totalLen) return null;
      const hashBytes = buf.slice(offset + 2, offset + 2 + optLen);
      return { nextHeader, hashBytes };
    }

    // Skip unrecognized option (action bits 00 = skip and continue)
    offset += 2 + optLen;
  }

  return null;
}

// ── Verification ────────────────────────────────────────────────────────────

/**
 * Verify full canonical identity from a packet's extension header.
 *
 * Three-way verification:
 *   1. Decode UOR option from header → extract hashBytes
 *   2. SHA-256(payload) → compare to hashBytes
 *   3. Build urn:uor:derivation:sha256:{hex} → compare to expectedCanonicalId
 *
 * Returns true ONLY if all three match.
 *
 * @param destOptHeader      Raw extension header bytes.
 * @param payload            Packet payload to verify.
 * @param expectedCanonicalId  The expected canonical identity URN.
 */
export async function verifyPacketIdentity(
  destOptHeader: Uint8Array,
  payload: Uint8Array,
  expectedCanonicalId: string
): Promise<boolean> {
  // Step 1: Decode the UOR option
  const decoded = decodeDestOptHeader(destOptHeader);
  if (!decoded) return false;

  // Step 2: SHA-256 the payload and compare to header hash
  const payloadHash = await sha256(payload);
  if (payloadHash.length !== decoded.hashBytes.length) return false;
  if (!payloadHash.every((b, i) => b === decoded.hashBytes[i])) return false;

  // Step 3: Build canonical ID and compare
  const hex = bytesToHex(payloadHash);
  const computedId = `urn:uor:derivation:sha256:${hex}`;
  return computedId === expectedCanonicalId;
}

// ── Attachment ──────────────────────────────────────────────────────────────

/**
 * Prepend a UOR Destination Options header to a payload.
 *
 * Uses the hashBytes from the identity to populate the extension header.
 * The resulting buffer is: [40B header][payload].
 *
 * @param payload     The packet payload.
 * @param identity    The UOR canonical identity (source of hashBytes).
 * @param nextHeader  Upper-layer protocol number (default: 59 = no next).
 * @returns           New Uint8Array with the header prepended.
 */
export function attachUorHeader(
  payload: Uint8Array,
  identity: UorCanonicalIdentity,
  nextHeader: number = 59
): Uint8Array {
  const header = encodeDestOptHeader({
    nextHeader,
    hashBytes: identity.hashBytes,
  });

  const result = new Uint8Array(header.length + payload.length);
  result.set(header, 0);
  result.set(payload, header.length);
  return result;
}
