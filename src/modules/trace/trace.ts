/**
 * UOR Computation Trace Module — trace: namespace implementation.
 *
 * Records step-by-step computation traces for audit and PROV-O compatibility.
 * Every derivation can produce a ComputationTrace that captures inputs,
 * outputs, and intermediate ring operations.
 *
 * Delegates to:
 *   - lib/uor-address.ts for content-addressing (CID)
 *   - supabase client for persistence to uor_traces table
 *
 * Zero duplication — all hashing uses computeCid.
 */

import { canonicalJsonLd, computeCid } from "@/lib/uor-address";
import { supabase } from "@/integrations/supabase/client";

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
}

// ── recordTrace ─────────────────────────────────────────────────────────────

/**
 * Record a computation trace for a derivation.
 * Content-addresses the trace and persists to uor_traces.
 */
export async function recordTrace(
  derivationId: string,
  operation: string,
  steps: TraceStep[],
  quantum: number,
  certifiedBy?: string
): Promise<ComputationTrace> {
  const timestamp = new Date().toISOString();

  // Content-addressed trace ID
  const payload = canonicalJsonLd({ derivationId, operation, steps, quantum });
  const cid = await computeCid(new TextEncoder().encode(payload));
  const traceId = `urn:uor:trace:${cid.slice(0, 24)}`;

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
  };

  // Persist
  try {
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
