/**
 * Hologram Platform — Self-Contained Adapter Layer
 * ═════════════════════════════════════════════════
 *
 * Every external dependency the hologram system needs is defined
 * here as a typed interface. Implementations are injected via
 * setPlatform() at app startup — making the entire hologram tree
 * portable to any host environment.
 *
 * In-repo: bridge.ts wires these to the current app's infrastructure.
 * In a standalone repo: provide your own bridge.
 *
 * @module hologram/platform
 */

// ── Backend Adapter ───────────────────────────────────────────────────────

/** Minimal Supabase-compatible query builder. */
export interface BackendQueryBuilder {
  select(columns?: string): BackendQueryBuilder;
  insert(values: any): BackendQueryBuilder;
  update(values: any): BackendQueryBuilder;
  upsert(values: any, options?: any): BackendQueryBuilder;
  delete(): BackendQueryBuilder;
  eq(column: string, value: any): BackendQueryBuilder;
  neq(column: string, value: any): BackendQueryBuilder;
  gt(column: string, value: any): BackendQueryBuilder;
  lt(column: string, value: any): BackendQueryBuilder;
  gte(column: string, value: any): BackendQueryBuilder;
  lte(column: string, value: any): BackendQueryBuilder;
  in(column: string, values: any[]): BackendQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): BackendQueryBuilder;
  limit(count: number): BackendQueryBuilder;
  single(): BackendQueryBuilder;
  maybeSingle(): BackendQueryBuilder;
  then(onfulfilled?: (value: any) => any): Promise<any>;
}

export interface BackendAuth {
  getSession(): Promise<{ data: { session: any | null }; error: any }>;
  getUser(): Promise<{ data: { user: any | null }; error: any }>;
  refreshSession(): Promise<{ data: { session: any | null }; error: any }>;
  signOut(): Promise<{ error: any }>;
  onAuthStateChange(callback: (event: string, session: any) => void): { data: { subscription: { unsubscribe: () => void } } };
}

export interface BackendFunctions {
  invoke(name: string, options?: { body?: any; headers?: Record<string, string> }): Promise<{ data: any; error: any }>;
}

export interface BackendAdapter {
  from(table: string): BackendQueryBuilder;
  auth: BackendAuth;
  functions: BackendFunctions;
}

// ── Auth Adapter ──────────────────────────────────────────────────────────

export interface PrivacyRules {
  name?: boolean;
  email?: boolean;
  avatar?: boolean;
  bio?: boolean;
  handle?: boolean;
  canonicalId?: boolean;
  cid?: boolean;
  ipv6?: boolean;
  glyph?: boolean;
  ceremonyCid?: boolean;
  trustNode?: boolean;
  [key: string]: boolean | undefined;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  handle: string | null;
  coverImageUrl: string | null;
  threeWordName: string | null;
  ceremonyCid: string | null;
  trustNodeCid: string | null;
  disclosurePolicyCid: string | null;
  pqcAlgorithm: string | null;
  collapseIntact: boolean | null;
  uorCanonicalId: string | null;
  uorGlyph: string | null;
  uorIpv6: string | null;
  uorCid: string | null;
  claimedAt: string | null;
  privacyRules: PrivacyRules | null;
}

export interface AuthAdapter {
  user: { id: string; email?: string } | null;
  session: any | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ── Identity Adapter ──────────────────────────────────────────────────────

export interface CanonicalIdentity {
  "u:canonicalId": string;
  "u:ipv6": string;
  "u:cid": string;
  "u:glyph": string;
  "u:lossWarning"?: boolean;
}

export interface PqcKeypair {
  algorithm: string;
  publicKeyBytes: Uint8Array;
  privateKeyBytes: Uint8Array;
  canonicalId: string;
  publicKeyObject: Record<string, unknown>;
}

export interface SignedRecord<T extends object = object> {
  "cert:signature": {
    "@type": "cert:Signature";
    "cert:algorithm": string;
    "cert:signatureBytes": string;
    "cert:signerCanonicalId": string;
    "cert:signedAt": string;
  };
}

export interface IdentityAdapter {
  singleProofHash(obj: unknown): Promise<CanonicalIdentity>;
  generateKeypair(): Promise<PqcKeypair>;
  signRecord<T extends object>(record: T, keypair: PqcKeypair): Promise<T & SignedRecord<T>>;
}

// ── GPU Adapter ───────────────────────────────────────────────────────────

export interface GpuDeviceInfo {
  name: string;
  vendor: string;
  architecture: string;
  available: boolean;
  maxBufferSize: number;
}

export interface GpuBenchmarkResult {
  gflops: number;
  duration: number;
  matrixSize: number;
}

export interface LutEngineInfo {
  tablesLoaded: number;
  gpuAccelerated: boolean;
  cacheHitRate: number;
}

export type LutName = string;

export interface LutApplyResult {
  output: Uint8Array;
  gpuUsed: boolean;
  duration: number;
}

export interface CriticalIdentityProof {
  inputHash: string;
  outputHash: string;
  verified: boolean;
}

export interface GpuAdapter {
  init(): Promise<GpuDeviceInfo>;
  benchmark(size?: number): Promise<GpuBenchmarkResult>;
  matmul(a: Float32Array, b: Float32Array, m: number, n: number, k: number): Promise<Float32Array>;
  destroy(): void;
}

export interface LutEngineAdapter {
  apply(table: LutName, input: Uint8Array): Promise<LutApplyResult>;
  info(): Promise<LutEngineInfo>;
}

// ── Storage Adapter ───────────────────────────────────────────────────────

export interface StorageAdapter {
  writeSlot(key: string, value: string): Promise<void>;
  readSlot(key: string): Promise<string | null>;
  readSlotFromCloud(key: string): Promise<string | null>;
}

// ── Data Compression Adapter ──────────────────────────────────────────────

export interface CompressibleTriple {
  s: string;
  p: string;
  o: string;
}

export interface CompressionStats {
  tripleCount: number;
  rawBytes: number;
  compressedBytes: number;
  ratio: number;
  subjectDictSize: number;
  unknownPredicates: number;
  objectDictSize: number;
  objectDictHits: number;
}

export interface CompressionAdapter {
  compress(triples: CompressibleTriple[]): Promise<{ data: Uint8Array; stats: CompressionStats }>;
  decompress(data: Uint8Array): Promise<CompressibleTriple[]>;
  compressToBase64(triples: CompressibleTriple[]): Promise<string>;
  decompressFromBase64(encoded: string): Promise<CompressibleTriple[]>;
}

// ── Platform Singleton ────────────────────────────────────────────────────

export interface HologramPlatform {
  backend: BackendAdapter;
  identity: IdentityAdapter;
  gpu: GpuAdapter;
  lutEngine: LutEngineAdapter;
  storage: StorageAdapter;
  compression: CompressionAdapter;
}

let _platform: HologramPlatform | null = null;

export function setPlatform(p: HologramPlatform): void {
  _platform = p;
}

export function getPlatform(): HologramPlatform {
  if (!_platform) throw new Error("Hologram platform not initialized. Call setPlatform() first.");
  return _platform;
}

/** Get backend adapter (shorthand). */
export function getBackend(): BackendAdapter {
  return getPlatform().backend;
}

/** Get identity adapter (shorthand). */
export function getIdentity(): IdentityAdapter {
  return getPlatform().identity;
}

/** Get GPU adapter (shorthand). */
export function getGpu(): GpuAdapter {
  return getPlatform().gpu;
}

/** Get LUT engine adapter (shorthand). */
export function getLut(): LutEngineAdapter {
  return getPlatform().lutEngine;
}

/** Get storage adapter (shorthand). */
export function getStorage(): StorageAdapter {
  return getPlatform().storage;
}

// ── Re-export internalized modules ────────────────────────────────────────

export * from "./reward-circuit";
export * from "./geometric-coherence";
export * from "./foundation-types";
export * from "./utils";
