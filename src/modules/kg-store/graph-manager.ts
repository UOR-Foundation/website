/**
 * UOR Knowledge Graph Manager — named graph management and stats.
 *
 * Named graphs are logical partitions of the triple store identified by IRIs.
 * This module manages graph lifecycle and provides aggregate statistics.
 */

import { supabase } from "@/integrations/supabase/client";

// ── Graph stats ─────────────────────────────────────────────────────────────

export interface GraphStats {
  datumCount: number;
  derivationCount: number;
  certificateCount: number;
  receiptCount: number;
  tripleCount: number;
}

/**
 * Get aggregate stats across all KG tables.
 */
export async function getGraphStats(): Promise<GraphStats> {
  const [datums, derivations, certificates, receipts, triples] = await Promise.all([
    supabase.from("uor_datums").select("iri", { count: "exact", head: true }),
    supabase.from("uor_derivations").select("derivation_id", { count: "exact", head: true }),
    supabase.from("uor_certificates").select("certificate_id", { count: "exact", head: true }),
    supabase.from("uor_receipts").select("receipt_id", { count: "exact", head: true }),
    supabase.from("uor_triples").select("id", { count: "exact", head: true }),
  ]);

  return {
    datumCount: datums.count ?? 0,
    derivationCount: derivations.count ?? 0,
    certificateCount: certificates.count ?? 0,
    receiptCount: receipts.count ?? 0,
    tripleCount: triples.count ?? 0,
  };
}

// ── Named graphs ────────────────────────────────────────────────────────────

/**
 * List all distinct named graphs in the triple store.
 */
export async function listGraphs(): Promise<string[]> {
  const { data, error } = await supabase
    .from("uor_triples")
    .select("graph_iri")
    .limit(1000);

  if (error) throw new Error(`listGraphs failed: ${error.message}`);

  // Deduplicate
  const seen = new Set<string>();
  for (const row of data ?? []) {
    seen.add(row.graph_iri);
  }
  return Array.from(seen).sort();
}

/**
 * Get triple count for a specific named graph.
 */
export async function getNamedGraphTripleCount(graphIri: string): Promise<number> {
  const { count, error } = await supabase
    .from("uor_triples")
    .select("id", { count: "exact", head: true })
    .eq("graph_iri", graphIri);

  if (error) throw new Error(`getNamedGraphTripleCount failed: ${error.message}`);
  return count ?? 0;
}
