/**
 * UNS Core — Canonical Identity Engine + Records + PQC Signing
 *
 * Public API surface for the UNS identity module.
 * All internal implementation details are encapsulated.
 *
 * Phase 0-A: Ring, Address, Canonicalization, Identity Engine
 * Phase 0-B: Keypair (Dilithium-3), Name Records, Signed Mutable Pointers
 */

// ── Phase 0-A: Ring R_8 ─────────────────────────────────────────────────────
export { neg, bnot, succ, pred, verifyCriticalIdentity } from "./ring";

// ── Phase 0-A: Address Model ────────────────────────────────────────────────
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

// ── Phase 0-A: Canonicalization ─────────────────────────────────────────────
export { canonicalizeToNQuads } from "./canonicalize";

// ── Phase 0-A: Identity Engine ──────────────────────────────────────────────
export { singleProofHash, verifyCanonical } from "./identity";

// ── Phase 0-B: PQC Keypair & Signing ────────────────────────────────────────
export type {
  UnsKeypair,
  PublicKeyObject,
  SignatureBlock,
  SignedRecord,
} from "./keypair";
export {
  generateKeypair,
  signRecord,
  verifyRecord,
  registerPublicKey,
  lookupPublicKey,
} from "./keypair";

// ── Phase 0-B: Name Records ────────────────────────────────────────────────
export type {
  UnsNameRecord,
  SignedUnsRecord,
  UnsTarget,
  UnsService,
  CreateRecordOpts,
} from "./record";
export {
  createRecord,
  publishRecord,
  resolveByName,
  clearRecordStore,
} from "./record";
