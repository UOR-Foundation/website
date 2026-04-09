/**
 * UOR Engine — Layer 0
 * ═══════════════════════════════════════════════════════════════
 *
 * THE foundational computational kernel of the UOR framework.
 * Pure math. Zero storage. Zero network. Zero side-effects.
 *
 * Pipeline:  obj → URDNA2015 → UTF-8 → SHA-256 → derive all identity forms
 *
 * This module owns:
 *   - singleProofHash()      — THE single proof hash
 *   - verifySingleProof()    — Verify derivation ID
 *   - canonicalizeToNQuads() — W3C URDNA2015 canonicalization
 *   - sha256hex()            — SHA-256 hex digest
 *   - computeCid()           — CIDv1 content identifier
 *   - computeUorAddress()    — Braille bijection address
 *   - computeIpv6Address()   — IPv6 ULA address
 *   - canonicalJsonLd()      — Deterministic JSON-LD serialization
 *
 * Every other module in the system accesses Layer 0 through:
 *   1. Direct import from "@/modules/engine" (for Layer 0 internals)
 *   2. bus.call("kernel/*") (for Layer 1+ consumers)
 *
 * Layer 0 has NO imports from Layer 1 (Knowledge Graph), Layer 2 (Bus),
 * or Layer 3 (UI). The dependency arrow points strictly upward.
 *
 * @layer 0
 * @module engine
 */

// ── Core: Single Proof Hash (the heart of UOR) ────────────────────────────

export {
  singleProofHash,
  verifySingleProof,
  canonicalizeToNQuads,
} from "@/lib/uor-canonical";

export type { SingleProofResult } from "@/lib/uor-canonical";

// ── Cryptographic Primitives ──────────────────────────────────────────────

export { sha256hex } from "@/lib/crypto";

// ── Content Addressing (CID, IPv6, Braille, Glyph) ───────────────────────

export {
  computeCid,
  formatIpv6,
  ipv6ToContentBytes,
  encodeGlyph,
  sha256,
  bytesToHex,
  verifyIpv6Routing,
  buildIdentity,
} from "@/modules/uns/core/address";

export type { UorCanonicalIdentity } from "@/modules/uns/core/address";

// ── Address Utilities (from uor-address library layer) ────────────────────

export {
  computeUorAddress,
  computeIpv6Address,
  computeIpv6Full,
  verifyIpv6Address,
  computeModuleIdentity,
  canonicalJsonLd,
  stripSelfReferentialFields,
} from "@/lib/uor-address";

export type { ModuleIdentity } from "@/lib/uor-address";
