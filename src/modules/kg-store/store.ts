/**
 * UOR Knowledge Graph Store — persistent dual-addressed storage.
 *
 * Supabase for structured data + UOR IRIs for identity.
 * JSON-LD remains the canonical format; this module persists
 * the decomposed graph into relational tables for querying.
 *
 * Delegates to:
 *   - ring-core for arithmetic
 *   - identity for IRI computation
 *   - triad for triadic coordinates
 *   - jsonld for JSON-LD emission
 *   - derivation for derivation records
 */

import { supabase } from "@/integrations/supabase/client";
import type { UORRing } from "@/modules/ring-core/ring";
import { fromBytes } from "@/modules/ring-core/ring";
import { contentAddress, bytesToGlyph } from "@/modules/identity";
import { computeTriad } from "@/modules/triad";
import type { Derivation } from "@/modules/derivation/derivation";
import type { Certificate } from "@/modules/derivation/certificate";
import type { DerivationReceipt } from "@/modules/derivation/receipt";
import type { JsonLdDocument, JsonLdNode } from "@/modules/jsonld/emitter";

// ── ingestDatum ─────────────────────────────────────────────────────────────

/**
 * Compute a full datum record and upsert it into uor_datums.
 * Returns the IRI of the ingested datum.
 */
export async function ingestDatum(
  ring: UORRing,
  value: number
): Promise<string> {
  const bytes = ring.toBytes(value);
  const iri = contentAddress(ring, value);
  const triad = computeTriad(bytes);

  const negBytes = ring.neg(bytes);
  const bnotBytes = ring.bnot(bytes);
  const succBytes = ring.succ(bytes);
  const predBytes = ring.pred(bytes);

  const row = {
    iri,
    quantum: ring.quantum,
    value,
    bytes,
    stratum: triad.stratum,
    total_stratum: triad.totalStratum,
    spectrum: triad.spectrum,
    glyph: bytesToGlyph(bytes),
    inverse_iri: contentAddress(ring, fromBytes(negBytes)),
    not_iri: contentAddress(ring, fromBytes(bnotBytes)),
    succ_iri: contentAddress(ring, fromBytes(succBytes)),
    pred_iri: contentAddress(ring, fromBytes(predBytes)),
  };

  const { error } = await supabase
    .from("uor_datums")
    .upsert(row, { onConflict: "iri" });

  if (error) throw new Error(`ingestDatum failed: ${error.message}`);
  return iri;
}

// ── Batch ingest datums ─────────────────────────────────────────────────────

/**
 * Ingest a range of datum values in batches.
 * Reports progress via optional callback.
 */
export async function ingestDatumBatch(
  ring: UORRing,
  values: number[],
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const BATCH_SIZE = 50;
  let ingested = 0;

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    const rows = batch.map((value) => {
      const bytes = ring.toBytes(value);
      const triad = computeTriad(bytes);
      const negBytes = ring.neg(bytes);
      const bnotBytes = ring.bnot(bytes);
      const succBytes = ring.succ(bytes);
      const predBytes = ring.pred(bytes);

      return {
        iri: contentAddress(ring, value),
        quantum: ring.quantum,
        value,
        bytes,
        stratum: triad.stratum,
        total_stratum: triad.totalStratum,
        spectrum: triad.spectrum,
        glyph: bytesToGlyph(bytes),
        inverse_iri: contentAddress(ring, fromBytes(negBytes)),
        not_iri: contentAddress(ring, fromBytes(bnotBytes)),
        succ_iri: contentAddress(ring, fromBytes(succBytes)),
        pred_iri: contentAddress(ring, fromBytes(predBytes)),
      };
    });

    const { error } = await supabase
      .from("uor_datums")
      .upsert(rows, { onConflict: "iri" });

    if (error) throw new Error(`ingestDatumBatch failed: ${error.message}`);
    ingested += batch.length;
    onProgress?.(ingested, values.length);
  }

  return ingested;
}

// ── ingestDerivation ────────────────────────────────────────────────────────

export async function ingestDerivation(
  d: Derivation,
  quantum: number
): Promise<void> {
  const { error } = await supabase
    .from("uor_derivations")
    .upsert({
      derivation_id: d.derivationId,
      result_iri: d.resultIri,
      canonical_term: d.canonicalTerm,
      original_term: d.originalTerm,
      epistemic_grade: d.epistemicGrade,
      metrics: d.metrics,
      quantum,
    }, { onConflict: "derivation_id" });

  if (error) throw new Error(`ingestDerivation failed: ${error.message}`);
}

// ── ingestCertificate ───────────────────────────────────────────────────────

export async function ingestCertificate(cert: Certificate): Promise<void> {
  const { error } = await supabase
    .from("uor_certificates")
    .upsert({
      certificate_id: cert.certificateId,
      certifies_iri: cert.certifies,
      derivation_id: cert.derivationId,
      valid: cert.valid,
      cert_chain: cert.certChain,
      issued_at: cert.issuedAt,
    }, { onConflict: "certificate_id" });

  if (error) throw new Error(`ingestCertificate failed: ${error.message}`);
}

// ── ingestReceipt ───────────────────────────────────────────────────────────

export async function ingestReceipt(r: DerivationReceipt): Promise<void> {
  const { error } = await supabase
    .from("uor_receipts")
    .upsert({
      receipt_id: r.receiptId,
      module_id: r.moduleId,
      operation: r.operation,
      input_hash: r.inputHash,
      output_hash: r.outputHash,
      self_verified: r.selfVerified,
      coherence_verified: r.coherenceVerified,
    }, { onConflict: "receipt_id" });

  if (error) throw new Error(`ingestReceipt failed: ${error.message}`);
}

// ── ingestTriples ───────────────────────────────────────────────────────────

/**
 * Decompose a JSON-LD document into subject-predicate-object triples
 * and insert them into uor_triples.
 */
export async function ingestTriples(
  doc: JsonLdDocument,
  graphIri: string = "urn:uor:default"
): Promise<number> {
  const triples: { subject: string; predicate: string; object: string; graph_iri: string }[] = [];

  for (const node of doc["@graph"]) {
    const subject = node["@id"];
    for (const [key, value] of Object.entries(node)) {
      if (key === "@id" || key === "@type") continue;

      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        triples.push({ subject, predicate: key, object: String(value), graph_iri: graphIri });
      } else if (Array.isArray(value)) {
        for (const item of value) {
          triples.push({ subject, predicate: key, object: String(item), graph_iri: graphIri });
        }
      }
    }
    // Also emit @type as a triple
    if (node["@type"]) {
      triples.push({ subject, predicate: "rdf:type", object: node["@type"], graph_iri: graphIri });
    }
  }

  // Batch insert
  const BATCH = 100;
  for (let i = 0; i < triples.length; i += BATCH) {
    const batch = triples.slice(i, i + BATCH);
    const { error } = await supabase.from("uor_triples").insert(batch);
    if (error) throw new Error(`ingestTriples failed: ${error.message}`);
  }

  return triples.length;
}

// ── getDatum ────────────────────────────────────────────────────────────────

export async function getDatum(iri: string) {
  const { data, error } = await supabase
    .from("uor_datums")
    .select("*")
    .eq("iri", iri)
    .maybeSingle();

  if (error) throw new Error(`getDatum failed: ${error.message}`);
  return data;
}

// ── getDatumByValue ─────────────────────────────────────────────────────────

export async function getDatumByValue(value: number, quantum: number) {
  const { data, error } = await supabase
    .from("uor_datums")
    .select("*")
    .eq("value", value)
    .eq("quantum", quantum)
    .maybeSingle();

  if (error) throw new Error(`getDatumByValue failed: ${error.message}`);
  return data;
}

// ── getDerivation ───────────────────────────────────────────────────────────

export async function getDerivation(derivationId: string) {
  const { data, error } = await supabase
    .from("uor_derivations")
    .select("*")
    .eq("derivation_id", derivationId)
    .maybeSingle();

  if (error) throw new Error(`getDerivation failed: ${error.message}`);
  return data;
}
