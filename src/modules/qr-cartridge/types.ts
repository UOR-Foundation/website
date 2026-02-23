/**
 * QR Cartridge — Type Definitions
 *
 * All types are serializable and aligned with the UOR ontology.
 * The cartridge envelope wraps a UorCanonicalIdentity with
 * QR-specific metadata for encoding/decoding.
 */

import type { UorCanonicalIdentity } from "@/modules/uns/core";

// ── Media Types ─────────────────────────────────────────────────────────────

/**
 * Content types a cartridge can reference.
 * The cartridge itself is media-agnostic — it carries the identity,
 * not the content. The media type is metadata for client hinting.
 */
export type CartridgeMediaType =
  | "application/octet-stream"    // generic binary
  | "application/vnd.uor.app"     // UOR application bundle
  | "video/mp4"                   // movie
  | "audio/mpeg"                  // music (MP3)
  | "audio/flac"                  // music (lossless)
  | "text/html"                   // website
  | "application/json"            // structured data
  | "application/ld+json"         // JSON-LD (native UOR)
  | "image/png"                   // image
  | "image/svg+xml"               // vector image
  | "application/pdf"             // document
  | "application/wasm";           // WebAssembly module

// ── Cartridge Envelope ──────────────────────────────────────────────────────

/**
 * The complete Cartridge — a JSON-LD document that wraps a UOR identity
 * with QR-specific encoding metadata.
 *
 * This is what gets serialized into the QR code's binary segment
 * and what a UOR-aware scanner reconstructs after decoding.
 */
export interface UorCartridge {
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld";
  "@type": "uor:Cartridge";

  /** The cartridge protocol version. */
  "cartridge:version": typeof CARTRIDGE_VERSION;

  /** Full canonical identity — all four derived forms. */
  "u:canonicalId": string;
  "u:ipv6": string;
  "u:cid": string;
  "u:glyph": string;

  /** Explicit loss warning inherited from identity model. */
  "u:lossWarning": "ipv6-is-routing-projection-only";

  /** Content type hint for the referenced media. */
  "cartridge:mediaType": CartridgeMediaType;

  /** Human-readable label (optional). */
  "cartridge:label"?: string;

  /** Resolution endpoints — ordered by preference. */
  "cartridge:resolvers": string[];

  /** ISO 8601 timestamp of cartridge creation. */
  "cartridge:issuedAt": string;

  /** Raw 32-byte SHA-256 hash — for verification (not serialized to QR). */
  hashBytes?: Uint8Array;
}

// ── QR Encoding Config ──────────────────────────────────────────────────────

/**
 * Configuration for QR code generation.
 * Aligned with ISO/IEC 18004 parameters.
 */
export interface QrEncodingConfig {
  /** Error correction level: L(7%), M(15%), Q(25%), H(30%). Default: M. */
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
  /** QR version (1-40). Auto-selected if omitted. */
  version?: number;
  /** Output pixel width. Default: 256. */
  width: number;
  /** Margin (quiet zone) in modules. Default: 4. */
  margin: number;
  /** Dark module color. Default: #000000. */
  colorDark: string;
  /** Light module color. Default: #ffffff. */
  colorLight: string;
}

// ── QR Payload ──────────────────────────────────────────────────────────────

/**
 * The dual-layer payload structure.
 *
 * Layer 1 (Alphanumeric): HTTP fallback URL — scannable by any phone.
 * Layer 2 (Binary): Raw 32-byte SHA-256 hash — UOR-native verification.
 *
 * Standard QR scanners see the URL. UOR-aware clients extract the binary.
 */
export interface CartridgeQrPayload {
  /** HTTP fallback URL (alphanumeric segment). */
  httpFallback: string;
  /** Hex-encoded SHA-256 hash (for QR binary segment). */
  hashHex: string;
  /** Combined payload string for QR encoding. */
  combined: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

export const CARTRIDGE_VERSION = "1.0.0" as const;

/** Base resolution URL for HTTP fallback. */
export const CARTRIDGE_BASE_URL = "https://uor.foundation/u/" as const;

/** Default QR encoding configuration. */
export const DEFAULT_QR_CONFIG: QrEncodingConfig = {
  errorCorrectionLevel: "M",
  width: 256,
  margin: 4,
  colorDark: "#000000",
  colorLight: "#ffffff",
};
