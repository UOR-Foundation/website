/**
 * QR Cartridge — Encoder
 *
 * Converts a UorCanonicalIdentity into an ISO/IEC 18004 compliant QR code.
 *
 * Encoding strategy:
 *   The QR payload is the HTTP fallback URL which embeds the full hex hash
 *   in the IRI path. This makes the QR scannable by ANY standard phone camera
 *   while encoding the complete 256-bit identity in the URL itself.
 *
 *   Format: https://uor.foundation/u/{glyph}#sha256={hex64}
 *
 *   - The path segment ({glyph}) is the Braille bijection — visual identity
 *   - The fragment (#sha256={hex64}) carries the full lossless hash
 *   - Standard scanners navigate to the URL; UOR clients parse the fragment
 *
 * Compliance: ISO/IEC 18004:2015 (QR Code 2005)
 * - Uses byte-mode encoding for full Unicode support (Braille codepoints)
 * - Error correction level M (15% recovery) by default
 * - Automatic version selection based on payload size
 *
 * Zero custom QR extensions. Pure standard. Maximum compatibility.
 */

import QRCode from "qrcode";
import type { UorCanonicalIdentity } from "@/modules/uns/core";
import { bytesToHex } from "@/modules/uns/core";
import { encodeGlyph } from "@/modules/uns/core";
import type { CartridgeQrPayload, QrEncodingConfig } from "./types";
import { CARTRIDGE_BASE_URL, DEFAULT_QR_CONFIG } from "./types";

// ── Payload Construction ────────────────────────────────────────────────────

/**
 * Build the dual-purpose QR payload from a canonical identity.
 *
 * The URL format:
 *   https://uor.foundation/u/{braille_glyph}#sha256={hex64}
 *
 * - Path: content-derived Braille address (visual, invertible)
 * - Fragment: full SHA-256 hex (lossless, 256-bit)
 *
 * Any phone scans the URL. UOR agents parse the fragment for verification.
 */
export function buildQrPayload(identity: UorCanonicalIdentity): CartridgeQrPayload {
  const glyph = identity["u:glyph"];
  const hashHex = bytesToHex(identity.hashBytes);

  // The URL IS the complete identity — path + fragment = lossless
  const httpFallback = `${CARTRIDGE_BASE_URL}${encodeURIComponent(glyph)}`;
  const combined = `${httpFallback}#sha256=${hashHex}`;

  return { httpFallback, hashHex, combined };
}

// ── QR Code Generation ──────────────────────────────────────────────────────

/**
 * Generate a QR code as a data URL (PNG base64) from a canonical identity.
 *
 * Uses the standard `qrcode` library which implements ISO/IEC 18004.
 * The QR uses byte-mode encoding to support Braille Unicode codepoints.
 *
 * @param identity  The UOR canonical identity to encode.
 * @param config    Optional QR rendering config (defaults to DEFAULT_QR_CONFIG).
 * @returns         A data:image/png;base64,... string ready for <img src>.
 */
export async function encodeCartridgeQR(
  identity: UorCanonicalIdentity,
  config: Partial<QrEncodingConfig> = {}
): Promise<string> {
  const merged = { ...DEFAULT_QR_CONFIG, ...config };
  const payload = buildQrPayload(identity);

  const dataUrl = await QRCode.toDataURL(payload.combined, {
    errorCorrectionLevel: merged.errorCorrectionLevel,
    version: merged.version,
    width: merged.width,
    margin: merged.margin,
    color: {
      dark: merged.colorDark,
      light: merged.colorLight,
    },
  });

  return dataUrl;
}

/**
 * Generate a QR code as an SVG string from a canonical identity.
 *
 * SVG output is resolution-independent — ideal for print and high-DPI.
 *
 * @param identity  The UOR canonical identity to encode.
 * @param config    Optional QR rendering config.
 * @returns         An SVG string.
 */
export async function encodeCartridgeSVG(
  identity: UorCanonicalIdentity,
  config: Partial<QrEncodingConfig> = {}
): Promise<string> {
  const merged = { ...DEFAULT_QR_CONFIG, ...config };
  const payload = buildQrPayload(identity);

  const svg = await QRCode.toString(payload.combined, {
    type: "svg",
    errorCorrectionLevel: merged.errorCorrectionLevel,
    version: merged.version,
    width: merged.width,
    margin: merged.margin,
    color: {
      dark: merged.colorDark,
      light: merged.colorLight,
    },
  });

  return svg;
}
