/**
 * UNS Core — Canonical Identity Engine
 *
 * Public API surface for the UNS identity module.
 * All internal implementation details are encapsulated.
 *
 * Endpoints:
 *   singleProofHash   — derive all 4 identity forms from any object
 *   verifyCanonical    — lossless 256-bit verification (PRIMARY)
 *   verifyIpv6Routing  — routing-projection verification (SECONDARY)
 *   verifyCriticalIdentity — ring R_8 soundness check (TRUST ANCHOR)
 *   ipv6ToContentBytes — parse IPv6 back to content bytes
 */

// Ring
export { neg, bnot, succ, pred, verifyCriticalIdentity } from "./ring";

// Address model
export type { UorCanonicalIdentity } from "./address";
export {
  formatIpv6,
  ipv6ToContentBytes,
  verifyIpv6Routing,
  encodeGlyph,
  computeCid,
  sha256,
  bytesToHex,
  buildIdentity,
} from "./address";

// Canonicalization
export { canonicalizeToNQuads } from "./canonicalize";

// Identity engine (primary API)
export { singleProofHash, verifyCanonical } from "./identity";
