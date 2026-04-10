/**
 * UOR Knowledge Graph Store — Sovereign Persistence.
 * ═══════════════════════════════════════════════════
 *
 * All writes go through GrafeoDB (canonical), then sync
 * asynchronously via the active persistence provider.
 *
 * NO DIRECT SUPABASE IMPORTS — fully backend-agnostic.
 */

import { grafeoStore, sparqlQuery, sparqlUpdate } from "./grafeo-store";
import type { SparqlBinding } from "./grafeo-store";
import { getProvider } from "./persistence";
import type { UORRing } from "@/modules/ring-core/ring";
import { fromBytes } from "@/modules/ring-core/ring";
import { contentAddress, bytesToGlyph } from "@/modules/identity";
import { computeTriad } from "@/modules/triad";
import type { Derivation } from "@/modules/derivation/derivation";
import type { Certificate } from "@/modules/derivation/certificate";
import type { DerivationReceipt } from "@/modules/derivation/receipt";
import type { JsonLdDocument } from "@/modules/jsonld/emitter";

const UOR_NS = "https://uor.foundation/";

// ── ingestDatum ─────────────────────────────────────────────────────────────

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

  // Write to GrafeoDB (canonical)
  const g = `${UOR_NS}graph/datums`;
  await grafeoStore.putNode({
    uorAddress: iri,
    label: `Z/${ring.quantum}[${value}]`,
    nodeType: "datum",
    rdfType: `${UOR_NS}schema/Datum`,
    properties: {
      quantum: ring.quantum,
      value,
      bytes,
      stratum: triad.stratum,
      totalStratum: triad.totalStratum,
      spectrum: triad.spectrum,
      glyph: bytesToGlyph(bytes),
      inverseIri: contentAddress(ring, fromBytes(negBytes)),
      notIri: contentAddress(ring, fromBytes(bnotBytes)),
      succIri: contentAddress(ring, fromBytes(succBytes)),
      predIri: contentAddress(ring, fromBytes(predBytes)),
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncState: "local",
  });

  // Async provider sync (fire-and-forget)
  getProvider().pushChanges([{
    changeCid: iri,
    namespace: "default",
    payload: `datum:${iri}`,
    timestamp: new Date().toISOString(),
    deviceId: localStorage.getItem("uor:device-id") || "unknown",
    userId: "local",
  }]).catch(err => console.warn("[Store] Provider sync failed:", err));

  return iri;
}

// ── Batch ingest datums ─────────────────────────────────────────────────────

export async function ingestDatumBatch(
  ring: UORRing,
  values: number[],
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  let ingested = 0;

  for (const value of values) {
    await ingestDatum(ring, value);
    ingested++;
    onProgress?.(ingested, values.length);
  }

  return ingested;
}

// ── ingestDerivation ────────────────────────────────────────────────────────

export async function ingestDerivation(
  d: Derivation,
  quantum: number
): Promise<void> {
  await grafeoStore.putDerivation({
    derivationId: d.derivationId,
    resultIri: d.resultIri,
    canonicalTerm: d.canonicalTerm,
    originalTerm: d.originalTerm,
    epistemicGrade: d.epistemicGrade,
    metrics: d.metrics,
    createdAt: Date.now(),
    syncState: "local",
  });
}

// ── ingestCertificate ───────────────────────────────────────────────────────

export async function ingestCertificate(cert: Certificate): Promise<void> {
  const g = `${UOR_NS}graph/certificates`;
  await grafeoStore.addQuad(
    `${UOR_NS}certificate/${cert.certificateId}`,
    `${UOR_NS}certificate/certifies`,
    cert.certifies,
    g
  );
  await grafeoStore.addQuad(
    `${UOR_NS}certificate/${cert.certificateId}`,
    `${UOR_NS}certificate/valid`,
    String(cert.valid),
    g
  );
}

// ── ingestReceipt ───────────────────────────────────────────────────────────

export async function ingestReceipt(r: DerivationReceipt): Promise<void> {
  const g = `${UOR_NS}graph/receipts`;
  await grafeoStore.addQuad(
    `${UOR_NS}receipt/${r.receiptId}`,
    `${UOR_NS}receipt/moduleId`,
    r.moduleId,
    g
  );
  await grafeoStore.addQuad(
    `${UOR_NS}receipt/${r.receiptId}`,
    `${UOR_NS}receipt/operation`,
    r.operation,
    g
  );
}

// ── ingestTriples ───────────────────────────────────────────────────────────

export async function ingestTriples(
  doc: JsonLdDocument,
  graphIri: string = "urn:uor:default"
): Promise<number> {
  let count = 0;

  for (const node of doc["@graph"]) {
    const subject = node["@id"];
    for (const [key, value] of Object.entries(node)) {
      if (key === "@id" || key === "@type") continue;

      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        await grafeoStore.addQuad(subject, key, String(value), graphIri);
        count++;
      } else if (Array.isArray(value)) {
        for (const item of value) {
          await grafeoStore.addQuad(subject, key, String(item), graphIri);
          count++;
        }
      }
    }
    if (node["@type"]) {
      await grafeoStore.addQuad(subject, "rdf:type", node["@type"], graphIri);
      count++;
    }
  }

  return count;
}

// ── getDatum ────────────────────────────────────────────────────────────────

export async function getDatum(iri: string) {
  // Read from GrafeoDB first
  const node = await grafeoStore.getNode(iri);
  if (node) return node;
  return null;
}

// ── getDatumByValue ─────────────────────────────────────────────────────────

export async function getDatumByValue(value: number, quantum: number) {
  const results = await sparqlQuery(`
    SELECT ?s WHERE {
      ?s <${UOR_NS}schema/value> "${value}" .
      ?s <${UOR_NS}schema/quantum> "${quantum}" .
    } LIMIT 1
  `) as SparqlBinding[];

  if (!Array.isArray(results) || results.length === 0) return null;
  return grafeoStore.getNode(results[0]["?s"]);
}

// ── getDerivation ───────────────────────────────────────────────────────────

export async function getDerivation(derivationId: string) {
  const derivations = await grafeoStore.getAllDerivations();
  return derivations.find(d => d.derivationId === derivationId) ?? null;
}
