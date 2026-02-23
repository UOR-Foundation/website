/**
 * QR Cartridge — Module Public API
 *
 * Barrel export for the qr-cartridge module.
 * All public types and functions are re-exported here.
 */

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  UorCartridge,
  CartridgeMediaType,
  CartridgeQrPayload,
  QrEncodingConfig,
} from "./types";

export {
  CARTRIDGE_VERSION,
  CARTRIDGE_BASE_URL,
  DEFAULT_QR_CONFIG,
} from "./types";

// ── Encoder ─────────────────────────────────────────────────────────────────
export {
  buildQrPayload,
  encodeCartridgeQR,
  encodeCartridgeSVG,
} from "./encoder";

// ── Decoder ─────────────────────────────────────────────────────────────────
export type { DecodedCartridge } from "./decoder";
export { decodeCartridgePayload } from "./decoder";

// ── Cartridge Builder ───────────────────────────────────────────────────────
export type { BuildCartridgeOpts } from "./cartridge";
export {
  buildCartridge,
  buildCartridgeFromIdentity,
  serializeCartridge,
  cartridgeHashHex,
} from "./cartridge";
