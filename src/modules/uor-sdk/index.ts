/**
 * UOR SDK — Barrel export.
 *
 * The typed TypeScript bridge to the UOR Framework.
 * All subsequent app-platform modules (app-identity, app-store, app-compute,
 * app-trust, app-sdk, app-console) import from this single entry point.
 *
 * Three layers:
 *   1. client  — Live API wrapper (remote, verified, JSON-LD responses)
 *   2. ring    — Local ring arithmetic (offline, unit tests)
 *   3. canonical — Local content-addressing (URDNA2015 + SHA-256)
 */

// ── API Client ──────────────────────────────────────────────────────────────
export { createUorClient } from "./client";
export type { UorClient } from "./client";

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  UorIdentity,
  CriticalIdentityResult,
  RingOpsResult,
  BrailleResult,
  PartitionResult,
  TraceResult,
  TraceStep,
  StoreWriteResult,
  StoreReadResult,
  StoreVerifyResult,
  ObserverZone,
  ObserverRegistration,
  ObserverStatus,
} from "./types";
export { UorApiError } from "./types";

// ── Local ring arithmetic (re-export from lib/uor-ring.ts) ──────────────────
export {
  neg,
  bnot,
  succ,
  pred,
  add,
  sub,
  mul,
  xor,
  and,
  or,
  compute,
  verifyCriticalIdentity,
  verifyAllCriticalIdentity,
  modulus,
  ringConfig,
  DEFAULT_RING,
  buildTriad,
  makeDatum,
  classifyByte,
} from "./ring";

// ── Local canonical identity (re-export from lib/uor-canonical.ts) ──────────
export {
  singleProofHash,
  canonicalizeToNQuads,
  verifySingleProof,
  computeCid,
  computeUorAddress,
  computeIpv6Address,
  computeModuleIdentity,
  canonicalJsonLd,
} from "./canonical";

// ── Monetization (payment-provider agnostic) ────────────────────────────────
export { MonetizationEngine, createPaymentGateMiddleware } from "./monetization";
export type {
  MonetizationConfig,
  PaymentProof,
  PaymentRecord,
  AccessCertificate,
  DeveloperBalance,
  AccessCheckResult,
  BillingModel,
  BillingInterval,
  Currency,
  RevenueSplit,
} from "./monetization-types";
export { DEFAULT_REVENUE_SPLIT } from "./monetization-types";

// ── App Identity (P2 — canonical identity for every deployed app) ───────────
export {
  createManifest,
  updateManifest,
  verifyManifest,
  buildVersionChain,
  AppRegistry,
} from "./app-identity";
export type { AppManifest, ManifestInput } from "./app-identity";

// ── Import Adapter (P3 — one-click deploy from any platform) ────────────────
export { importApp, refreshApp } from "./import-adapter";
export type {
  ImportSource,
  ImportResult,
  AppFile,
} from "./import-adapter";

// ── Sovereign Data (P4 — Solid Pod user-owned storage) ──────────────────────
export {
  PodManager,
  connectUser,
  writeUserData,
  readUserData,
  getUserHistory,
  exportUserData,
} from "./sovereign-data";
export type {
  UserPodContext,
  DataAccessEvent,
  WriteResult,
  ReadResult,
  BindingCertificate,
} from "./sovereign-data";

// ── Security Gate (P5 — partition analysis + injection detection) ────────────
export {
  scanDeployment,
  partitionGate,
  checkInjection,
  rateLimitCheck,
  appSecurityCheck,
} from "./security-gate";
export type {
  GateVerdict,
  DeploymentScanResult,
  InjectionCheckResult,
  GateRequest,
  GateResponse,
} from "./security-gate";

// ── Certified Developer-User Relationship (P6 — cert:TransformCertificate) ──
export {
  issueCertificate,
  verifyCertificate,
  revokeCertificate,
  getCertificate,
  exportCertificateChain,
} from "./relationship";
export type {
  RelationshipCertificate,
  CertificateVerification,
} from "./relationship";

export type {
  AppCliResult,
  DeployOptions,
  UpdateOptions,
  MonetizeOptions,
  RollbackOptions,
  AppRecord,
  DeveloperIdentity,
} from "./cli-types";
