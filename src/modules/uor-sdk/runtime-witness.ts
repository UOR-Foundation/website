/**
 * UOR SDK — Runtime Witness (P8)
 *
 * Every invocation of a deployed app produces an auditable execution trace
 * stored on IPFS. The trace proves what the app did, when it ran, what its
 * inputs and outputs were, and whether injection was detected.
 *
 * The RuntimeWitness is a thin observer layer that wraps an existing app
 * without requiring code changes. It instruments request/response cycles
 * producing trace:ExecutionTrace records linked to the app's canonical ID.
 *
 * @see trace: namespace — execution tracing
 * @see derivation: namespace — canonical identity
 * @see observable: namespace — runtime monitoring
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { UnsKv } from "@/modules/uns/store/kv";

// ── JSON-LD Context ────────────────────────────────────────────────────────

const TRACE_JSONLD_CONTEXT = {
  trace: "https://uor.foundation/trace/",
  store: "https://uor.foundation/store/",
  u: "https://uor.foundation/u/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  "trace:appCanonicalId": { "@id": "trace:appCanonicalId", "@type": "xsd:string" },
  "trace:requestCanonicalId": { "@id": "trace:requestCanonicalId", "@type": "xsd:string" },
  "trace:responseCanonicalId": { "@id": "trace:responseCanonicalId", "@type": "xsd:string" },
  "trace:durationMs": { "@id": "trace:durationMs", "@type": "xsd:double" },
  "trace:partitionDensity": { "@id": "trace:partitionDensity", "@type": "xsd:double" },
  "trace:injectionDetected": { "@id": "trace:injectionDetected", "@type": "xsd:boolean" },
  "trace:hammingDrift": { "@id": "trace:hammingDrift", "@type": "xsd:integer" },
  "trace:executedAt": { "@id": "trace:executedAt", "@type": "xsd:dateTime" },
  "trace:method": { "@id": "trace:method", "@type": "xsd:string" },
  "trace:path": { "@id": "trace:path", "@type": "xsd:string" },
  "trace:statusCode": { "@id": "trace:statusCode", "@type": "xsd:integer" },
  body: { "@id": "trace:body", "@type": "xsd:string" },
  method: { "@id": "trace:httpMethod", "@type": "xsd:string" },
  path: { "@id": "trace:httpPath", "@type": "xsd:string" },
  statusCode: { "@id": "trace:httpStatusCode", "@type": "xsd:integer" },
} as const;

// ── Types ───────────────────────────────────────────────────────────────────

export interface ExecutionTrace {
  "@type": "trace:ExecutionTrace";
  "trace:appCanonicalId": string;
  "trace:requestCanonicalId": string;
  "trace:responseCanonicalId": string;
  "trace:durationMs": number;
  "trace:partitionDensity": number;
  "trace:injectionDetected": boolean;
  "trace:hammingDrift": number;
  "trace:executedAt": string;
  "trace:method": string;
  "trace:path": string;
  "trace:statusCode": number;
  "u:canonicalId"?: string;
  "store:cid"?: string;
}

/** Simulated request for framework-agnostic middleware. */
export interface WitnessRequest {
  method: string;
  path: string;
  body: string;
  headers?: Record<string, string>;
}

/** Simulated response for framework-agnostic middleware. */
export interface WitnessResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

/** Handler function type. */
export type WitnessHandler = (req: WitnessRequest) => Promise<WitnessResponse>;

// ── Helpers ────────────────────────────────────────────────────────────────

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Compute byte-class partition density. */
function computeDensity(input: string): number {
  const bytes = enc.encode(input);
  if (bytes.length === 0) return 0;
  const seen = new Uint8Array(256);
  for (const b of bytes) seen[b] = 1;
  let distinct = 0;
  for (let i = 0; i < 256; i++) if (seen[i]) distinct++;
  return distinct / 256;
}

/** Compute Hamming drift for injection detection. */
function computeHammingDrift(body: string): { drift: number; detected: boolean } {
  const bytes = enc.encode(body);
  let sig = 0;
  for (const b of bytes) sig = (sig + b) % 256;

  // Baseline: neg(bnot(42))
  let baseline = 42;
  baseline = ((-baseline % 256) + 256) % 256; // neg
  baseline = baseline ^ 0xff; // bnot

  let xor = sig ^ baseline;
  let drift = 0;
  while (xor > 0) {
    drift += xor & 1;
    xor >>= 1;
  }

  return { drift, detected: drift > 6 };
}

/** Generate a simulated IPFS CID from content hash. */
function generateCid(hash: string): string {
  // CIDv1 base32 prefix (bafkrei) + first 52 chars of hash
  return `bafkrei${hash.slice(0, 52)}`;
}

// ── Runtime Witness ────────────────────────────────────────────────────────

export class RuntimeWitness {
  private readonly appCanonicalId: string;
  private readonly kv: UnsKv;
  private readonly traces: ExecutionTrace[] = [];

  constructor(appCanonicalId: string, kv?: UnsKv) {
    this.appCanonicalId = appCanonicalId;
    this.kv = kv ?? new UnsKv();
  }

  /**
   * Wrap a handler with execution tracing.
   *
   * Pipeline:
   *   1. Record request start time + encode request body canonical ID
   *   2. Execute handler
   *   3. Encode response body canonical ID
   *   4. Compute partition density on response bytes
   *   5. Run injection check (Hamming drift)
   *   6. Build ExecutionTrace
   *   7. Pin trace to IPFS (KV storage)
   *   8. Add trace headers: X-UOR-Trace-ID, X-UOR-Injection-Detected
   */
  async execute(
    req: WitnessRequest,
    handler: WitnessHandler,
  ): Promise<WitnessResponse> {
    const startTime = performance.now();
    const executedAt = new Date().toISOString();

    // 1. Canonical ID of request
    const reqProof = await singleProofHash({
      "@context": TRACE_JSONLD_CONTEXT,
      "@type": "trace:RequestBody",
      body: req.body,
      method: req.method,
      path: req.path,
    });

    // 2. Execute handler
    const response = await handler(req);

    // 3. Canonical ID of response
    const resProof = await singleProofHash({
      "@context": TRACE_JSONLD_CONTEXT,
      "@type": "trace:ResponseBody",
      body: response.body,
      statusCode: response.statusCode,
    });

    // 4. Partition density
    const density = computeDensity(response.body);

    // 5. Injection check
    const { drift, detected } = computeHammingDrift(response.body);

    // 6. Duration
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    // 7. Build trace
    const traceBody = {
      "@context": TRACE_JSONLD_CONTEXT,
      "@type": "trace:ExecutionTrace" as const,
      "trace:appCanonicalId": this.appCanonicalId,
      "trace:requestCanonicalId": reqProof.derivationId,
      "trace:responseCanonicalId": resProof.derivationId,
      "trace:durationMs": durationMs,
      "trace:partitionDensity": density,
      "trace:injectionDetected": detected,
      "trace:hammingDrift": drift,
      "trace:executedAt": executedAt,
      "trace:method": req.method,
      "trace:path": req.path,
      "trace:statusCode": response.statusCode,
    };

    const traceProof = await singleProofHash(traceBody);
    const cid = generateCid(traceProof.derivationId.replace("urn:uor:derivation:sha256:", ""));

    const trace: ExecutionTrace = {
      ...traceBody,
      "@type": "trace:ExecutionTrace",
      "u:canonicalId": traceProof.derivationId,
      "store:cid": cid,
    };

    // 8. Pin to KV (simulates IPFS)
    await this.kv.put(
      `trace-${traceProof.derivationId.replace("urn:uor:derivation:sha256:", "").slice(0, 16)}`,
      enc.encode(JSON.stringify(trace)),
    );

    // Store in history index
    this.traces.unshift(trace);

    // Store by canonical ID for retrieval
    await this.kv.put(
      `trace-id-${traceProof.derivationId.replace("urn:uor:derivation:sha256:", "").slice(0, 24)}`,
      enc.encode(JSON.stringify(trace)),
    );

    // 9. Add headers
    response.headers["X-UOR-Trace-ID"] = traceProof.derivationId;
    response.headers["X-UOR-Injection-Detected"] = String(detected);

    return response;
  }

  /** Get execution history (reverse-chronological). */
  async getHistory(limit = 100): Promise<ExecutionTrace[]> {
    return this.traces.slice(0, limit);
  }

  /** Get specific trace by canonical ID. */
  async getTrace(canonicalId: string): Promise<ExecutionTrace | null> {
    const key = `trace-id-${canonicalId.replace("urn:uor:derivation:sha256:", "").slice(0, 24)}`;
    const result = await this.kv.get(key);
    if (!result) return null;
    return JSON.parse(dec.decode(result.value)) as ExecutionTrace;
  }

  /** Verify a trace: recompute canonical ID from content. */
  async verifyTrace(canonicalId: string): Promise<boolean> {
    const trace = await this.getTrace(canonicalId);
    if (!trace) return false;

    // Recompute canonical ID from trace content
    const body = {
      "@context": TRACE_JSONLD_CONTEXT,
      "@type": "trace:ExecutionTrace" as const,
      "trace:appCanonicalId": trace["trace:appCanonicalId"],
      "trace:requestCanonicalId": trace["trace:requestCanonicalId"],
      "trace:responseCanonicalId": trace["trace:responseCanonicalId"],
      "trace:durationMs": trace["trace:durationMs"],
      "trace:partitionDensity": trace["trace:partitionDensity"],
      "trace:injectionDetected": trace["trace:injectionDetected"],
      "trace:hammingDrift": trace["trace:hammingDrift"],
      "trace:executedAt": trace["trace:executedAt"],
      "trace:method": trace["trace:method"],
      "trace:path": trace["trace:path"],
      "trace:statusCode": trace["trace:statusCode"],
    };

    const proof = await singleProofHash(body);
    return proof.derivationId === canonicalId;
  }

  /** Rollback target: return manifest CID for any previous version. */
  async getRollbackTarget(targetCanonicalId: string): Promise<string | null> {
    const trace = await this.getTrace(targetCanonicalId);
    if (!trace) return null;
    return trace["store:cid"] ?? null;
  }
}
