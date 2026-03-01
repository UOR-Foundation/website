/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  GENESIS  —  The Seed Crystal                           ║
 * ║                                                          ║
 * ║  Single entry point for the self-contained kernel.       ║
 * ║                                                          ║
 * ║  Phase 0: POST (verify axioms)                           ║
 * ║  Phase 1: Crystallize (derive subsystems)                ║
 * ║  Phase 2: Project (manifest into target environment)     ║
 * ║                                                          ║
 * ║  This file has ZERO external dependencies.               ║
 * ║  It can be dropped onto any JS runtime and it will       ║
 * ║  self-verify and self-assemble.                          ║
 * ╚══════════════════════════════════════════════════════════╝
 */

// ── Re-export all axioms (the complete seed surface) ──────
export {
  Q, N, MASK,
  mod, add, mul, neg, succ, pred,
  bnot, band, bor, bxor,
  shr, rotr32,
  verifyCriticalIdentity, verifyRingCoherence,
  byteTuple, bytesEqual, concatBytes,
  toHex, fromHex, encodeUtf8, decodeUtf8,
  type RingElement, type ByteTuple,
} from "./axiom-ring";

export {
  sha256, sha256str, sha256hex, doubleSha256,
} from "./axiom-hash";

export {
  createCid, createRawCid, verifyCid, cidFromString,
  cidToIri, cidToIpv6, cidToGlyph,
  encodeVarint, decodeVarint,
  type Cid,
} from "./axiom-cid";

export {
  canonicalEncode, canonicalStringify, canonicalDecode,
} from "./axiom-codec";

export {
  tau, verifyTauInvolution, verifyMirrorCoherence,
  generateMirrorPairs, MIRROR_PAIRS, MIRROR_COUNT, ATLAS_VERTICES,
  FANO_POINTS, FANO_LINES, fanoLine, fanoIntersection,
  computeSyndrome, hScore,
  type MirrorPair,
} from "./axiom-mirror";

export {
  post,
  type PostCheck, type PostResult,
} from "./axiom-post";

export {
  signalBus,
  type Signal, type SignalSource, type SignalListener,
} from "./axiom-signal";

export {
  EIGHT_LAWS,
  verifyConstitution,
  getConstitutionCid,
  getConstitutionHash,
  getConstitutionDocument,
  getConstitutionalAttestation,
  constitutionalCheck,
  fullConstitutionalScan,
  getViolationLog,
  type ConstitutionalLaw,
  type ConstitutionalPredicate,
  type ConstitutionalViolation,
} from "./axiom-constitution";

export {
  buildArtifact, serializeArtifact, stringifyArtifact,
  deserializeArtifact, verifyArtifact, toBlob,
  type UorArtifact, type DerivationNode, type ArtifactVerification,
} from "./artifact";

// ── Genesis Boot Sequence ─────────────────────────────────

import { post as runPost, type PostResult } from "./axiom-post";
import { type Cid, cidToIri, cidToGlyph as _glyph } from "./axiom-cid";

export interface GenesisState {
  /** Phase 0 result */
  readonly post: PostResult;
  /** The kernel's birth certificate (CID of POST result) */
  readonly genesisCid: Cid;
  /** UOR IRI of the genesis */
  readonly genesisIri: string;
  /** Braille glyph fingerprint */
  readonly genesisGlyph: string;
  /** Is the kernel alive? */
  readonly alive: boolean;
}

/**
 * Boot the genesis seed.
 *
 * This is the very first function call in the entire system.
 * If it returns alive=true, the kernel's algebraic foundation
 * is verified and all subsequent operations are grounded.
 *
 * Usage:
 *   const genesis = bootGenesis();
 *   if (!genesis.alive) throw new Error("Universe is broken");
 *   // ... kernel crystallization proceeds ...
 */
export function bootGenesis(): GenesisState {
  const result = runPost();

  if (!result.passed || !result.genesisCid) {
    return {
      post: result,
      genesisCid: null!,
      genesisIri: "",
      genesisGlyph: "",
      alive: false,
    };
  }

  return Object.freeze({
    post: result,
    genesisCid: result.genesisCid,
    genesisIri: cidToIri(result.genesisCid),
    genesisGlyph: _glyph(result.genesisCid),
    alive: true,
  });
}
