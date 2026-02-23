/**
 * UNS Core — Public API Surface
 *
 * Phase 0-A: Ring, Address, Canonicalization, Identity Engine
 * Phase 0-B: Keypair (Dilithium-3), Name Records, Signed Mutable Pointers
 * Phase 0-C: IPv6 Extension Header (lossless full-hash transport)
 * Phase 1-A: DHT (Kademlia distributed record storage)
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

// ── Phase 0-C: IPv6 Extension Header ───────────────────────────────────────
export type { UorDestOptHeader } from "./ipv6ext";
export {
  UOR_OPTION_TYPE,
  UOR_OPTION_DATA_LEN,
  encodeDestOptHeader,
  decodeDestOptHeader,
  verifyPacketIdentity,
  attachUorHeader,
} from "./ipv6ext";

// ── Phase 1-A: DHT (Kademlia) ──────────────────────────────────────────────
export type { DhtNodeConfig } from "./dht";
export { UnsDht, clearPeerRegistry } from "./dht";
export { NameIndex } from "./name-index";

// ── Phase 1-B: Resolver API ────────────────────────────────────────────────
export type {
  CoherenceProof,
  CriticalIdentityCheck,
  ResolutionResult,
  VerificationResult,
  ResolverInfo,
  PublishResult,
  ResolutionError,
  ResolveQuery,
  QueryType,
} from "./resolver";
export { UnsResolver } from "./resolver";
