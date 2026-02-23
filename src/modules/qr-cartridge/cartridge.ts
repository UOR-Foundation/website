/**
 * QR Cartridge — Builder
 *
 * Constructs a complete UorCartridge envelope from any JSON-LD object.
 *
 * Pipeline:
 *   obj → singleProofHash() → UorCanonicalIdentity → UorCartridge
 *
 * The builder ensures every cartridge is:
 *   1. Canonically derived (URDNA2015 → SHA-256)
 *   2. Self-verifying (hash embedded in QR payload)
 *   3. Multi-resolver (HTTP, IPFS, IPv6)
 *   4. Standards-compliant (JSON-LD envelope + ISO 18004 QR)
 */

import { singleProofHash, bytesToHex } from "@/modules/uns/core";
import type { UorCanonicalIdentity } from "@/modules/uns/core";
import type { UorCartridge, CartridgeMediaType } from "./types";
import { CARTRIDGE_VERSION, CARTRIDGE_BASE_URL } from "./types";

// ── Builder Options ─────────────────────────────────────────────────────────

export interface BuildCartridgeOpts {
  /** Content type of the referenced media. Default: application/octet-stream. */
  mediaType?: CartridgeMediaType;
  /** Human-readable label for the cartridge. */
  label?: string;
  /** Additional resolver URLs beyond the defaults. */
  extraResolvers?: string[];
}

// ── Builder ─────────────────────────────────────────────────────────────────

/**
 * Build a complete UorCartridge from any object.
 *
 * This is the primary public API. It:
 *   1. Canonicalizes the object via singleProofHash()
 *   2. Constructs resolution URLs from the derived identity
 *   3. Wraps everything in a JSON-LD cartridge envelope
 *
 * @param obj   Any JSON-LD or plain JavaScript object.
 * @param opts  Optional cartridge metadata.
 * @returns     A complete UorCartridge ready for QR encoding.
 */
export async function buildCartridge(
  obj: unknown,
  opts: BuildCartridgeOpts = {}
): Promise<UorCartridge> {
  const identity = await singleProofHash(obj);
  return buildCartridgeFromIdentity(identity, opts);
}

/**
 * Build a UorCartridge from an existing UorCanonicalIdentity.
 *
 * Use this when you already have the identity (e.g., from a stored object)
 * and want to generate a cartridge without re-hashing.
 */
export function buildCartridgeFromIdentity(
  identity: UorCanonicalIdentity,
  opts: BuildCartridgeOpts = {}
): UorCartridge {
  const {
    mediaType = "application/octet-stream",
    label,
    extraResolvers = [],
  } = opts;

  const glyph = identity["u:glyph"];
  const encodedGlyph = encodeURIComponent(glyph);

  // Default resolvers: HTTP (universal), IPFS (decentralized), IPv6 (network-native)
  const resolvers = [
    `${CARTRIDGE_BASE_URL}${encodedGlyph}`,
    `ipfs://${identity["u:cid"]}`,
    `ip6://${identity["u:ipv6"]}`,
    ...extraResolvers,
  ];

  const cartridge: UorCartridge = {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@type": "uor:Cartridge",
    "cartridge:version": CARTRIDGE_VERSION,
    "u:canonicalId": identity["u:canonicalId"],
    "u:ipv6": identity["u:ipv6"],
    "u:cid": identity["u:cid"],
    "u:glyph": identity["u:glyph"],
    "u:lossWarning": "ipv6-is-routing-projection-only",
    "cartridge:mediaType": mediaType,
    "cartridge:resolvers": resolvers,
    "cartridge:issuedAt": new Date().toISOString(),
    hashBytes: identity.hashBytes,
  };

  if (label) {
    cartridge["cartridge:label"] = label;
  }

  return cartridge;
}

/**
 * Serialize a cartridge to its JSON-LD representation.
 *
 * Strips the non-serializable hashBytes field for JSON output.
 * This is what gets stored, transmitted, or embedded in documents.
 */
export function serializeCartridge(cartridge: UorCartridge): string {
  const { hashBytes, ...serializable } = cartridge;
  return JSON.stringify(serializable, null, 2);
}

/**
 * Extract the hex hash from a cartridge for QR payload construction.
 */
export function cartridgeHashHex(cartridge: UorCartridge): string {
  if (!cartridge.hashBytes) {
    // Extract from canonicalId: urn:uor:derivation:sha256:{hex64}
    const parts = cartridge["u:canonicalId"].split(":");
    return parts[parts.length - 1];
  }
  return bytesToHex(cartridge.hashBytes);
}
