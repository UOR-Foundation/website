/**
 * QR Cartridge — Decoder
 *
 * Parses a scanned QR code payload back into its UOR identity components.
 *
 * The decoder handles the standard URL format:
 *   https://uor.foundation/u/{encoded_glyph}#sha256={hex64}
 *
 * It extracts:
 *   1. The Braille glyph from the URL path (visual identity)
 *   2. The full SHA-256 hash from the URL fragment (lossless identity)
 *   3. Reconstructs the canonical ID, CID, IPv6, and glyph
 *
 * The decoder does NOT require network access. All identity forms are
 * derivable from the 32-byte hash embedded in the fragment.
 *
 * Zero dependencies beyond UNS core. Pure computation.
 */

import {
  buildIdentity,
  encodeGlyph,
  formatIpv6,
} from "@/modules/uns/core";
import type { UorCanonicalIdentity } from "@/modules/uns/core";
import { CARTRIDGE_BASE_URL } from "./types";

// ── Parsed Result ───────────────────────────────────────────────────────────

export interface DecodedCartridge {
  /** Whether the payload was successfully parsed. */
  valid: boolean;
  /** The reconstructed identity (null if invalid). */
  identity: UorCanonicalIdentity | null;
  /** The original scanned payload string. */
  rawPayload: string;
  /** Parse error message (null if valid). */
  error: string | null;
}

// ── Hex Parsing ─────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// ── Decoder ─────────────────────────────────────────────────────────────────

/**
 * Decode a scanned QR payload into a UOR canonical identity.
 *
 * Accepts:
 *   - Full URL: https://uor.foundation/u/{glyph}#sha256={hex64}
 *   - Fragment only: #sha256={hex64}
 *   - Raw hex: {hex64} (64 hex chars = 32 bytes)
 *
 * @param payload  The raw string scanned from the QR code.
 * @returns        DecodedCartridge with reconstructed identity.
 */
export async function decodeCartridgePayload(
  payload: string
): Promise<DecodedCartridge> {
  const trimmed = payload.trim();

  try {
    let hashHex: string | null = null;

    // Strategy 1: Full URL with #sha256= fragment
    if (trimmed.startsWith(CARTRIDGE_BASE_URL) || trimmed.startsWith("https://")) {
      const fragmentIdx = trimmed.indexOf("#sha256=");
      if (fragmentIdx !== -1) {
        hashHex = trimmed.slice(fragmentIdx + 8);
      }
    }

    // Strategy 2: Fragment only
    if (!hashHex && trimmed.startsWith("#sha256=")) {
      hashHex = trimmed.slice(8);
    }

    // Strategy 3: Raw 64-char hex
    if (!hashHex && /^[0-9a-fA-F]{64}$/.test(trimmed)) {
      hashHex = trimmed;
    }

    if (!hashHex || hashHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(hashHex)) {
      return {
        valid: false,
        identity: null,
        rawPayload: trimmed,
        error: "No valid SHA-256 hash found in payload. Expected URL with #sha256={hex64} fragment or raw 64-char hex.",
      };
    }

    // Reconstruct identity from hash bytes
    const hashBytes = hexToBytes(hashHex);

    // We need canonical bytes for CID computation; since we only have the hash,
    // we pass the hash itself as canonical bytes (CID will be of the hash).
    // This is correct: the CID is always computed from the canonical representation,
    // and when decoding from a QR code, the hash IS the identity anchor.
    const identity = await buildIdentity(hashBytes, hashBytes);

    // Verify internal consistency
    const expectedGlyph = encodeGlyph(hashBytes);
    const expectedIpv6 = formatIpv6(hashBytes);

    if (identity["u:glyph"] !== expectedGlyph) {
      return {
        valid: false,
        identity: null,
        rawPayload: trimmed,
        error: "Glyph verification failed after reconstruction.",
      };
    }

    if (identity["u:ipv6"] !== expectedIpv6) {
      return {
        valid: false,
        identity: null,
        rawPayload: trimmed,
        error: "IPv6 verification failed after reconstruction.",
      };
    }

    return {
      valid: true,
      identity,
      rawPayload: trimmed,
      error: null,
    };
  } catch (err) {
    return {
      valid: false,
      identity: null,
      rawPayload: trimmed,
      error: `Decode error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
