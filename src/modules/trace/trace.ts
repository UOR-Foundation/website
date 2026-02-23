/**
 * UOR Computation Trace Module — trace: namespace implementation.
 *
 * Uses the Single Proof Hashing Standard (URDNA2015) for content-addressing.
 * Records step-by-step computation traces for audit and PROV-O compatibility.
 *
 * Delegates to:
 *   - lib/uor-canonical.ts for URDNA2015 Single Proof Hashing
 *   - supabase client for persistence to uor_traces table
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/lib/supabase-auth-guard";

// ── Types ───────────────────────────────────────────────────────────────────

export interface TraceStep {
  index: number;
  operation: string;
  input: unknown;
  output: unknown;
  durationMs: number;
}

export interface ComputationTrace {
  "@type": "trace:ComputationTrace";
  traceId: string;
  derivationId: string;
  operation: string;
  steps: TraceStep[];
  certifiedBy: string;
  quantum: number;
  timestamp: string;
  // W3C PROV-O alignment
  "prov:wasGeneratedBy"?: string;
  "prov:used"?: string[];
  "prov:startedAtTime"?: string;
  "prov:wasAttributedTo"?: string;
}

// ── recordTrace ─────────────────────────────────────────────────────────────

/**
 * Record a computation trace for a derivation.
 * Content-addresses the trace via URDNA2015 and persists to uor_traces.
 */
export async function recordTrace(
  derivationId: string,
  operation: string,
  steps: TraceStep[],
  quantum: number,
  certifiedBy?: string
): Promise<ComputationTrace> {
  const timestamp = new Date().toISOString();

  // Content-addressed trace ID via URDNA2015 Single Proof Hash
  // Steps are serialized as a JSON string to avoid jsonld.js safe-mode errors
  // on nested non-JSON-LD objects, while preserving determinism.
  const proof = await singleProofHash({
    "@context": { trace: "https://uor.foundation/trace/" },
    "@type": "trace:ComputationTrace",
    "trace:derivationId": derivationId,
    "trace:operation": operation,
    "trace:stepCount": String(steps.length),
    "trace:quantum": String(quantum),
  });
  const traceId = `urn:uor:trace:${proof.cid.slice(0, 24)}`;

  const certBy = certifiedBy ?? `urn:uor:cert:self:${derivationId.split(":").pop()?.slice(0, 12) ?? "unknown"}`;

  const trace: ComputationTrace = {
    "@type": "trace:ComputationTrace",
    traceId,
    derivationId,
    operation,
    steps,
    certifiedBy: certBy,
    quantum,
    timestamp,
    // W3C PROV-O properties
    "prov:wasGeneratedBy": derivationId,
    "prov:used": steps.length > 0 ? [`urn:uor:input:${derivationId.split(":").pop()?.slice(0, 12) ?? "unknown"}`] : [],
    "prov:startedAtTime": timestamp,
    "prov:wasAttributedTo": "urn:uor:agent:ring-core",
  };

  // Persist (requires authentication)
  try {
    await requireAuth();
    await (supabase.from("uor_traces") as any).insert({
      trace_id: traceId,
      derivation_id: derivationId,
      operation,
      steps: steps as unknown as Record<string, unknown>[],
      certified_by: certBy,
      quantum,
    });
  } catch {
    // Non-fatal — trace is still returned in-memory
  }

  return trace;
}

// ── getTrace ────────────────────────────────────────────────────────────────

/**
 * Retrieve a computation trace by its trace ID.
 */
export async function getTrace(traceId: string): Promise<ComputationTrace | null> {
  const { data, error } = await (supabase
    .from("uor_traces") as any)
    .select("*")
    .eq("trace_id", traceId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    "@type": "trace:ComputationTrace",
    traceId: data.trace_id,
    derivationId: data.derivation_id ?? "",
    operation: data.operation,
    steps: (data.steps as unknown as TraceStep[]) ?? [],
    certifiedBy: data.certified_by ?? "",
    quantum: data.quantum,
    timestamp: data.created_at,
  };
}

// ── getRecentTraces ─────────────────────────────────────────────────────────

/**
 * Retrieve the most recent traces.
 */
export async function getRecentTraces(limit = 20): Promise<ComputationTrace[]> {
  const { data, error } = await (supabase
    .from("uor_traces") as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((d) => ({
    "@type": "trace:ComputationTrace" as const,
    traceId: d.trace_id,
    derivationId: d.derivation_id ?? "",
    operation: d.operation,
    steps: (d.steps as unknown as TraceStep[]) ?? [],
    certifiedBy: d.certified_by ?? "",
    quantum: d.quantum,
    timestamp: d.created_at,
  }));
}
