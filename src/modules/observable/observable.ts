/**
 * UOR Observable Module — observable: namespace implementation.
 *
 * Handles fact retrieval from external data streams (IoT, financial, scientific).
 * Each observable is content-addressed and grounded in the ring algebra.
 *
 * Delegates to:
 *   - lib/uor-address.ts for content-addressing
 *   - supabase client for persistence to uor_observables table
 *
 * Zero duplication.
 */

import { canonicalJsonLd, computeCid } from "@/lib/uor-address";
import { supabase } from "@/integrations/supabase/client";

// ── Types ───────────────────────────────────────────────────────────────────

export interface Observable {
  "@type": "observable:Observable";
  observableIri: string;
  value: number;
  source: string;
  stratum: number;
  quantum: number;
  contextId: string | null;
  timestamp: string;
}

// ── recordObservable ────────────────────────────────────────────────────────

/**
 * Record an observable fact with a content-addressed IRI.
 */
export async function recordObservable(
  value: number,
  source: string,
  quantum: number = 0,
  stratum: number = 0,
  contextId?: string
): Promise<Observable> {
  const timestamp = new Date().toISOString();

  // Content-addressed observable IRI
  const payload = canonicalJsonLd({ value, source, quantum, stratum, timestamp });
  const cid = await computeCid(new TextEncoder().encode(payload));
  const observableIri = `urn:uor:observable:${cid.slice(0, 24)}`;

  const observable: Observable = {
    "@type": "observable:Observable",
    observableIri,
    value,
    source,
    stratum,
    quantum,
    contextId: contextId ?? null,
    timestamp,
  };

  // Persist
  try {
    await (supabase.from("uor_observables") as any).insert({
      observable_iri: observableIri,
      value,
      source,
      stratum,
      quantum,
      context_id: contextId ?? null,
    });
  } catch {
    // Non-fatal
  }

  return observable;
}

// ── queryObservables ────────────────────────────────────────────────────────

/**
 * Query observables by source and/or quantum level.
 */
export async function queryObservables(
  filters: { source?: string; quantum?: number; limit?: number } = {}
): Promise<Observable[]> {
  let query = (supabase
    .from("uor_observables") as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 50);

  if (filters.source) {
    query = query.eq("source", filters.source);
  }
  if (filters.quantum !== undefined) {
    query = query.eq("quantum", filters.quantum);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((d) => ({
    "@type": "observable:Observable" as const,
    observableIri: d.observable_iri,
    value: Number(d.value),
    source: d.source,
    stratum: d.stratum,
    quantum: d.quantum,
    contextId: d.context_id,
    timestamp: d.created_at,
  }));
}
