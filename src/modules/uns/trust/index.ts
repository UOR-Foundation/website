/**
 * UNS Trust — Zero Trust Identity, Access Control & Encrypted Tunnels
 *
 * Phase 4-A: Authentication + Authorization (Dilithium-3)
 * Phase 4-B: Post-Quantum Encrypted Conduit (Kyber-1024 + AES-256-GCM)
 *
 * No CA. No X.509. No OCSP. The ring arithmetic is the CA.
 */

export { UnsAuthServer, signChallenge } from "./auth";
export type { UnsChallenge, UnsSession } from "./auth";

export { UnsAccessControl, trustMiddleware } from "./policy";
export type {
  UnsAccessPolicy,
  UnsAccessRule,
  EvaluationResult,
  MiddlewareHandler,
} from "./policy";

// ── Conduit — Post-Quantum Encrypted Tunnel (Phase 4-B) ────────────────────
export {
  UnsConduit,
  ConduitRelay,
  kyberKeygen,
  kyberEncapsulate,
  kyberDecapsulate,
  aesGcmEncrypt,
  aesGcmDecrypt,
} from "./conduit";

export type {
  ConduitConfig,
  TunnelInitMessage,
  TunnelReadyMessage,
  KyberKeypair,
} from "./conduit";

// ── P27: Attribution Protocol — cert:AttributionCertificate ─────────────────
export { UnsAttribution } from "./attribution";
export type {
  AttributionCertificate,
  AttributionVerifyResult,
  GdprExport,
  RoyaltyReport,
} from "./attribution";

// ── TrustGraph — Social Attestation Layer ───────────────────────────────────
export { UnsTrustGraph } from "./trust-graph";
export type {
  TrustAttestation,
  TrustNetwork,
  TrustWeights,
  TrustScore,
  TrustMember,
} from "./trust-graph";
