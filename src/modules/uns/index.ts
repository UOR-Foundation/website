/**
 * UoR Name Service (UNS) — Module barrel export.
 *
 * Decentralized name resolution via IPv6 content-addressing
 * and UOR algebraic identity. All public API surfaces are
 * re-exported here to enforce module encapsulation.
 */

// ── Core Identity Engine (Phase 0-A) + Records & Signing (Phase 0-B) ───────
export {
  // Ring R_8
  neg, bnot, succ, pred, verifyCriticalIdentity,
  // Address model
  formatIpv6, ipv6ToContentBytes, verifyIpv6Routing, encodeGlyph,
  computeCid, sha256, bytesToHex, buildIdentity,
  // Canonicalization
  canonicalizeToNQuads,
  // Identity engine
  singleProofHash, verifyCanonical,
  // PQC Keypair & Signing
  generateKeypair, signRecord, verifyRecord,
  registerPublicKey, lookupPublicKey,
  // Name Records
  createRecord, publishRecord, resolveByName, clearRecordStore,
} from "./core";

export type {
  UorCanonicalIdentity,
  UnsKeypair, PublicKeyObject, SignatureBlock, SignedRecord,
  UnsNameRecord, SignedUnsRecord, UnsTarget, UnsService, CreateRecordOpts,
} from "./core";

// ── Types (re-export all for consumer modules) ──────────────────────────────
export type {
  UnsRecordType,
  UnsRecord,
  UnsZone,
  UnsResolveRequest,
  UnsResolveResponse,
  UnsReverseResolveRequest,
  UnsReverseResolveResponse,
  UnsRegisterRequest,
  UnsRegisterResponse,
  UnsCertificate,
  UnsHealth,
} from "./types";
