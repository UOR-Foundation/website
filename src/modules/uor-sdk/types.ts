/**
 * UOR SDK. Canonical type definitions.
 *
 * All types mirror the live UOR API response shapes exactly.
 * No speculative fields. Every property maps to a documented endpoint.
 */

// ── Identity ────────────────────────────────────────────────────────────────

/** Content-addressed identity returned by /kernel/address/encode */
export interface UorIdentity {
  "u:canonicalId": string;       // urn:uor:derivation:sha256:{hex64}
  "u:ipv6": string;              // fd00:0075:6f72:xxxx:xxxx:xxxx:xxxx:xxxx
  "u:cid": string;               // CIDv1 base32lower
  "u:glyph": string;             // Braille bijection
  "u:lossWarning": "ipv6-is-routing-projection-only";
}

// ── Ring arithmetic ─────────────────────────────────────────────────────────

/** Result of /kernel/op/verify */
export interface CriticalIdentityResult {
  holds: boolean;
  x: number;
  neg_bnot: number;
  succ_x: number;
  n: number;
}

/** Result of /kernel/op/compute */
export interface RingOpsResult {
  x: number;
  y?: number;
  n: number;
  [op: string]: unknown;
}

/** Result of /kernel/address/encode (Braille) */
export interface BrailleResult {
  "u:glyph": string;
  "u:length": number;
}

// ── Partition analysis ──────────────────────────────────────────────────────

/** Result of /bridge/partition */
export interface PartitionResult {
  "partition:density": number;
  "partition:irreducibleCount": number;
  "partition:totalBytes": number;
  quality_signal: "PASS" | "WARN" | "FAIL";
}

// ── Trace / injection detection ─────────────────────────────────────────────

/** Result of /bridge/trace */
export interface TraceResult {
  steps: TraceStep[];
  summary: {
    total_hamming_drift: number;
    injection_detected: boolean;
    step_count: number;
  };
}

export interface TraceStep {
  op: string;
  value: number;
  binary: string;
  stratum: number;
  hamming_drift: number;
}

// ── Store ───────────────────────────────────────────────────────────────────

/** Result of /store/write */
export interface StoreWriteResult {
  "store:cid": string;
  "store:uorCid": string;
  pinResult: { cid: string; gateway?: string };
}

/** Result of /store/read/:cid */
export interface StoreReadResult {
  "store:verified": boolean;
  "store:cid"?: string;
  [key: string]: unknown;
}

/** Result of /store/verify/:cid */
export interface StoreVerifyResult {
  "store:verified": boolean;
  "store:cid"?: string;
  method?: string;
}

// ── Observer ────────────────────────────────────────────────────────────────

export type ObserverZone = "COHERENCE" | "DRIFT" | "COLLAPSE";

export interface ObserverRegistration {
  agent_id: string;
  zone: ObserverZone;
  h_score_mean: number;
}

export interface ObserverStatus {
  agent_id: string;
  zone: ObserverZone;
  h_score: number;
  persistence: number;
  grade_a_rate: number;
}

// ── Error ───────────────────────────────────────────────────────────────────

export class UorApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    message: string,
  ) {
    super(`[UOR API ${status}] ${endpoint}: ${message}`);
    this.name = "UorApiError";
  }
}

// ── v0.3.1: Principal pipeline ──────────────────────────────────────────────

/** Result of POST /pipeline/run — the canonical Datum→Validated→…→Certified envelope */
export interface PipelineResult {
  "@type": "schema:PipelineResult";
  "schema:phase": string;
  "schema:targetType": string;
  "schema:hostBytes": number[];
  datum: Record<string, unknown>;
  validated: Record<string, unknown>;
  grounded: Record<string, unknown>;
  triad: Record<string, unknown>;
  certified: Record<string, unknown>;
  "derivation:derivationId": string;
  epistemic_grade: "A" | "B" | "C" | "D";
  epistemic_grade_label: string;
  epistemic_grade_reason: string;
}

// ── v0.3.1: Named resolvers ─────────────────────────────────────────────────

/** Mirror of Rust `Result<Certified<Cert>, Witness>` */
export interface NamedResolverResult {
  "@type": "resolver:Resolution";
  "resolver:name": string;
  "resolver:input": number;
  "resolver:quantum": number;
  verdict: "Certified" | "Witness";
  result: Record<string, unknown>;
}

// ── v0.3.1: Trace replay + observability ────────────────────────────────────

export interface TraceReplay {
  "@type": "trace:Trace";
  "trace:formatVersion": string;
  "trace:replayOf": string;
  "trace:eventCount": number;
  events: Array<Record<string, unknown>>;
}

export interface HostTypesBinding {
  "@type": "schema:HostTypes";
  source: "DefaultHostTypes";
  crate: "uor-foundation";
  crate_version: string;
  bindings: Record<string, string>;
}

export interface ConformanceReport {
  "@type": "schema:ConformanceReport";
  spec_version: string;
  crate_version: string;
  spec_paths: number;
  implemented_paths: number;
  missing: string[];
  extra: string[];
  fully_conformant: boolean;
  checked_at: string;
}
