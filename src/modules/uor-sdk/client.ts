/**
 * UOR SDK — Typed API client for the live UOR REST API.
 *
 * Wraps https://api.uor.foundation/v1 with full TypeScript types,
 * automatic retry (3 attempts, 500ms exponential backoff), and
 * structured error handling.
 *
 * No auth required for kernel endpoints (120 req/min rate limit).
 * POST endpoints: 60 req/min.
 *
 * KEY PRINCIPLE: Use existing UOR API endpoints — do NOT reimplement
 * ring arithmetic or content addressing on the server side.
 */

import { API_BASE_URL } from "@/data/api-layers";
import { singleProofHash } from "@/lib/uor-canonical";
import { canonicalJsonLd } from "@/lib/uor-address";
import type {
  UorIdentity,
  CriticalIdentityResult,
  RingOpsResult,
  BrailleResult,
  PartitionResult,
  TraceResult,
  StoreWriteResult,
  StoreReadResult,
  StoreVerifyResult,
  ObserverRegistration,
  ObserverStatus,
} from "./types";
import { UorApiError } from "./types";

// ── Runtime base (calls Supabase edge function directly) ────────────────────

const RUNTIME_BASE = `https://${
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "erwfuxphwcvynxhfbvql"
}.supabase.co/functions/v1/uor-api`;

// ── Retry-capable fetch ─────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function retryFetch(
  url: string,
  init?: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, init);
      // Don't retry client errors (4xx), only server/network errors
      if (res.ok || (res.status >= 400 && res.status < 500)) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    if (attempt < retries - 1) {
      await new Promise((r) =>
        setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt)),
      );
    }
  }

  throw lastError ?? new Error("retryFetch: exhausted retries");
}

// ── Request helpers ─────────────────────────────────────────────────────────

async function apiGet<T>(path: string): Promise<T> {
  const res = await retryFetch(`${RUNTIME_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new UorApiError(res.status, path, text);
  }
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await retryFetch(`${RUNTIME_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new UorApiError(res.status, path, text);
  }
  return res.json() as Promise<T>;
}

// ── UorClient interface ─────────────────────────────────────────────────────

export interface UorClient {
  /** The display base URL for documentation/curl snippets */
  readonly baseUrl: string;

  // ── Kernel: ring arithmetic ─────────────────────────────────
  verifyCriticalIdentity(x: number, n?: number): Promise<CriticalIdentityResult>;
  computeRingOps(x: number, y?: number, n?: number): Promise<RingOpsResult>;
  encodeToBraille(input: string): Promise<BrailleResult>;

  // ── Kernel: content addressing ──────────────────────────────
  encodeAddress(input: string | object): Promise<UorIdentity>;

  // ── Bridge: partition analysis ──────────────────────────────
  analyzePartition(input: string): Promise<PartitionResult>;

  // ── Bridge: trace & injection detection ─────────────────────
  traceHammingDrift(x: number, ops: string, n?: number): Promise<TraceResult>;

  // ── Store: IPFS persistence ─────────────────────────────────
  storeWrite(obj: object, pin?: boolean): Promise<StoreWriteResult>;
  storeRead(cid: string): Promise<StoreReadResult>;
  storeVerify(cid: string): Promise<StoreVerifyResult>;

  // ── Observer: agent identity ────────────────────────────────
  registerObserver(agentId: string, derivationId: string): Promise<ObserverRegistration>;
  getObserverZone(agentId: string): Promise<ObserverStatus>;
}

// ── Factory ─────────────────────────────────────────────────────────────────

export function createUorClient(): UorClient {
  return {
    baseUrl: API_BASE_URL,

    // ── Kernel ──────────────────────────────────────────────────
    verifyCriticalIdentity(x, n = 8) {
      return apiGet<CriticalIdentityResult>(
        `/kernel/op/verify?x=${x}&n=${n}`,
      );
    },

    computeRingOps(x, y, n = 8) {
      const qs = y !== undefined ? `&y=${y}` : "";
      return apiGet<RingOpsResult>(`/kernel/op/compute?x=${x}${qs}&n=${n}`);
    },

    async encodeToBraille(input) {
      const res = await apiPost<Record<string, unknown>>(
        "/kernel/address/encode",
        { input, encoding: "utf8" },
      );
      return {
        "u:glyph": String(res["u:glyph"] ?? res["schema:glyph"] ?? ""),
        "u:length": Number(res["u:length"] ?? res["schema:glyphLength"] ?? 0),
      };
    },

    async encodeAddress(input) {
      // Compute identity locally via Single Proof Hashing Standard.
      // This is the correct UOR approach: identity is derived from content,
      // not fetched from a server. Any agent reproduces identical results.
      const obj =
        typeof input === "string"
          ? { "@context": { store: "https://uor.foundation/store/", xsd: "http://www.w3.org/2001/XMLSchema#", serialisation: { "@id": "https://uor.foundation/store/serialisation", "@type": "xsd:string" } }, "@type": "store:StoredObject", serialisation: canonicalJsonLd(input) }
          : input;

      const proof = await singleProofHash(obj);

      return {
        "u:canonicalId": proof.derivationId,
        "u:ipv6": proof.ipv6Address["u:ipv6"],
        "u:cid": proof.cid,
        "u:glyph": proof.uorAddress["u:glyph"],
        "u:lossWarning": "ipv6-is-routing-projection-only" as const,
      };
    },

    // ── Bridge ──────────────────────────────────────────────────
    async analyzePartition(input) {
      const res = await apiPost<Record<string, unknown>>("/bridge/partition", {
        input,
      });
      const density = Number(res["partition:density"] ?? 0);
      return {
        "partition:density": density,
        "partition:irreducibleCount": Number(
          res["partition:irreducibleCount"] ?? 0,
        ),
        "partition:totalBytes": Number(res["partition:totalBytes"] ?? 0),
        quality_signal: (res["quality_signal"] ??
          (density >= 0.25 ? "PASS" : density >= 0.1 ? "WARN" : "FAIL")) as
          | "PASS"
          | "WARN"
          | "FAIL",
      };
    },

    traceHammingDrift(x, ops, n = 8) {
      return apiGet<TraceResult>(
        `/bridge/trace?x=${x}&ops=${encodeURIComponent(ops)}&n=${n}`,
      );
    },

    // ── Store ───────────────────────────────────────────────────
    storeWrite(obj, pin = false) {
      return apiPost<StoreWriteResult>("/store/write", {
        object: obj,
        pin,
      });
    },

    storeRead(cid) {
      return apiGet<StoreReadResult>(`/store/read/${cid}`);
    },

    storeVerify(cid) {
      return apiGet<StoreVerifyResult>(`/store/verify/${cid}`);
    },

    // ── Observer ────────────────────────────────────────────────
    registerObserver(agentId, derivationId) {
      return apiPost<ObserverRegistration>("/user/observer/register", {
        agent_id: agentId,
        founding_derivation_id: derivationId,
      });
    },

    getObserverZone(agentId) {
      return apiGet<ObserverStatus>(`/user/observer/${agentId}`);
    },
  };
}
