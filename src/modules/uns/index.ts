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
  // IPv6 Extension Header
  UOR_OPTION_TYPE, UOR_OPTION_DATA_LEN,
  encodeDestOptHeader, decodeDestOptHeader,
  verifyPacketIdentity, attachUorHeader,
  // DHT
  UnsDht, clearPeerRegistry, NameIndex,
  // Resolver API
  UnsResolver,
} from "./core";

export type {
  UorCanonicalIdentity,
  UnsKeypair, PublicKeyObject, SignatureBlock, SignedRecord,
  UnsNameRecord, SignedUnsRecord, UnsTarget, UnsService, CreateRecordOpts,
  UorDestOptHeader,
  DhtNodeConfig,
  CoherenceProof, CriticalIdentityCheck, ResolutionResult,
  VerificationResult, ResolverInfo, PublishResult, ResolutionError,
  ResolveQuery, QueryType,
} from "./core";

// ── Compute — Edge Functions & Agent Gateway (Phase 3-A, 5-A) ───────────────
export {
  deployFunction, getFunction, listFunctions, clearRegistry,
  invokeFunction, verifyExecution,
  UnsAgentGateway, buildAgentMessage,
} from "./compute";

export type {
  ComputeFunction, ComputationTrace, ExecutionResult,
  MorphismType, AgentMessage, AgentRegistration, RouteResult, InjectionAlert,
} from "./compute";

// ── Store + KV + Cache (Phase 3-B, 3-C) ────────────────────────────────────
export { UnsObjectStore, UnsKv, UnsCache } from "./store";
export type { StoredObject, CacheStats } from "./store";

// ── Ledger — Verifiable SQL (Phase 3-D) ─────────────────────────────────────
export { UnsLedger } from "./ledger";
export type { QueryProof, QueryResult, StateTransition, SchemaMigration } from "./ledger";

// ── Trust — Zero Trust Identity, Access & Conduit (Phase 4-A, 4-B) ──────────
export {
  UnsAuthServer, signChallenge, UnsAccessControl, trustMiddleware,
  UnsConduit, ConduitRelay,
  kyberKeygen, kyberEncapsulate, kyberDecapsulate, aesGcmEncrypt, aesGcmDecrypt,
  UnsTrustGraph,
} from "./trust";
export type {
  UnsChallenge, UnsSession,
  UnsAccessPolicy, UnsAccessRule, EvaluationResult, MiddlewareHandler,
  ConduitConfig, TunnelInitMessage, TunnelReadyMessage, KyberKeypair,
  TrustAttestation, TrustNetwork, TrustWeights, TrustScore, TrustMember,
} from "./trust";

// ── Mesh — BGP Orbit Routing & Node Orchestrator (Phase 4-C) ────────────────
export {
  canonicalIdToOrbitPrefix, canonicalIdToBgpCommunity,
  bgpCommunityToOrbitPrefix, buildRouteAnnouncements,
  ANYCAST_RESOLVER, ANYCAST_DOH, ANYCAST_DHT_BOOTSTRAP,
  UnsNode,
} from "./mesh";
export type {
  OrbitRouteAnnouncement, UnsNodeConfig, ServiceStatus, HealthResponse,
} from "./mesh";

// ── Build — Uorfile, Docker Compat, Compose, Secrets, Registry ──────────────
export {
  parseUorfile, parseDockerfile, buildImage, serializeUorfile,
  parseDockerRef, wrapDockerImage, buildFromDockerfile, generateCompatReport,
  DOCKER_FEATURE_MAP, DOCKER_VERB_MAP,
  tagImage, resolveTag, listTags, removeTag,
  pushImage, pullImage, listImages, inspectImage, imageHistory, removeImage,
  searchImages, clearImageRegistry,
  parseComposeSpec, composeUp, composeDown, composePs, composeScale,
  getComposeApp, listComposeApps, clearComposeApps,
  createSecret, listSecrets, inspectSecret, getSecretValue, removeSecret,
  injectSecrets, clearSecrets,
} from "./build";

export type {
  UorfileDirective, UorfileInstruction, UorfileBuildSpec, UorfileBaseImage,
  UorfileHealthcheck, UorImage, UorImageLayer,
  DockerImageRef, WrappedDockerImage, DockerCompatStatus, DockerFeatureMapping, DockerVerbMapping,
  ImageTag, PushResult, PullResult, ImageHistoryEntry,
  ComposeService, ComposeBuildConfig, ComposeHealthcheck, ComposeResources,
  ComposeVolume, ComposeNetwork, ComposeSecret, ComposeSpec, ComposeApp, ComposeServiceStatus,
  UorSecret, SecretValue, SecretWriteResult,
} from "./build";

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
