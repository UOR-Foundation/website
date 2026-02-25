/**
 * Code Nexus — UOR Graph Persistence
 * ═══════════════════════════════════
 *
 * Persists code graph entities as first-class UOR citizens:
 *   - Entities → uor_derivations (with epistemic grade)
 *   - Relations → uor_triples (with graph IRI scoping)
 *   - Pipeline → uor_receipts (via withVerifiedReceipt)
 *
 * Single function, single responsibility: bridge local graph → persistent UOR KG.
 */

import { supabase } from "@/integrations/supabase/client";
import { withVerifiedReceipt } from "@/modules/verify/receipt-manager";
import type { UorMappingResult, MappedEntity, MappedTriple } from "./uor-mapper";

// ── Types ───────────────────────────────────────────────────────────────────

export interface PersistenceReport {
  derivationsWritten: number;
  triplesWritten: number;
  receiptId: string;
  graphIri: string;
}

// ── Batch helper ────────────────────────────────────────────────────────────

const BATCH_SIZE = 50;

async function batchInsert<T extends Record<string, unknown>>(
  table: "uor_datums" | "uor_derivations" | "uor_triples",
  rows: T[]
): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch as any);
    if (!error) written += batch.length;
  }
  return written;
}

// ── Derivation rows from mapped entities ────────────────────────────────────

function toDerivationRows(entities: MappedEntity[], graphIri: string) {
  return entities.map((me) => ({
    derivation_id: me.proof.derivationId,
    original_term: me.entity.name,
    canonical_term: me.entity.content.slice(0, 200),
    result_iri: me.iri,
    epistemic_grade: "B", // Graph-certified: structurally verified via URDNA2015
    quantum: 0,
    metrics: {
      source: "code-nexus",
      type: me.entity.type,
      cid: me.proof.cid,
      graphIri,
    },
  }));
}

// ── Triple rows from mapped triples ─────────────────────────────────────────

function toTripleRows(triples: MappedTriple[]) {
  return triples.map((t) => ({
    subject: t.subject,
    predicate: t.predicate,
    object: t.object,
    graph_iri: t.graph_iri,
  }));
}

// ── Main persistence function ───────────────────────────────────────────────

/**
 * Persist the full UOR mapping to the knowledge graph.
 * Wrapped in withVerifiedReceipt for audit trail compliance.
 */
export async function persistToUorGraph(
  mapping: UorMappingResult,
  onProgress?: (msg: string) => void
): Promise<PersistenceReport> {
  const graphIri = `urn:uor:lens:code-nexus:${mapping.sessionProof.cid}`;

  const { result: report, receipt } = await withVerifiedReceipt(
    "code-nexus",
    "persistGraph",
    async () => {
      onProgress?.("Writing derivations…");

      // First ensure result_iri datums exist (foreign key constraint)
      const datumRows = mapping.mappedEntities.map((me) => ({
        iri: me.iri,
        value: 0,
        quantum: 0,
        glyph: me.proof.uorAddress?.["u:glyph"]?.slice(0, 10) ?? "⠀",
        pred_iri: `urn:uor:pred:${me.iri}`,
        succ_iri: `urn:uor:succ:${me.iri}`,
        not_iri: `urn:uor:not:${me.iri}`,
        inverse_iri: `urn:uor:inv:${me.iri}`,
        bytes: { hex: me.proof.hashHex.slice(0, 64) },
        spectrum: { bands: [] },
        stratum: { layers: [] },
        total_stratum: 0,
      }));
      await batchInsert("uor_datums", datumRows);

      // Write derivations
      const derivationRows = toDerivationRows(mapping.mappedEntities, graphIri);
      const derivationsWritten = await batchInsert("uor_derivations", derivationRows);

      onProgress?.("Writing triples…");

      // Write triples
      const tripleRows = toTripleRows(mapping.triples);
      let triplesWritten = 0;
      for (let i = 0; i < tripleRows.length; i += BATCH_SIZE) {
        const batch = tripleRows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("uor_triples").insert(batch);
        if (!error) triplesWritten += batch.length;
      }

      return {
        derivationsWritten,
        triplesWritten,
        graphIri,
        receiptId: "", // filled below
      };
    },
    () => ({
      repoName: mapping.repoName,
      entityCount: mapping.mappedEntities.length,
      tripleCount: mapping.triples.length,
      sessionCid: mapping.sessionProof.cid,
    })
  );

  return { ...report, receiptId: receipt.receiptId };
}
