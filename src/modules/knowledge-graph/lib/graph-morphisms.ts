/**
 * Graph Morphisms — UOR Ring Operations as Graph Edges.
 * ═════════════════════════════════════════════════════
 *
 * This module bridges the gap between the knowledge graph (data) and
 * the UOR ring engine (computation). Ring operations become first-class
 * graph edges — traversal IS computation.
 *
 * A GraphMorphism is a typed edge: source --[op]--> target
 * where the target node's datum is the result of applying `op` to
 * the source node's datum.
 *
 * Category-theoretic interpretation:
 *   Objects  = Graph nodes (each carrying a UOR Datum)
 *   Arrows   = Ring morphisms (add, mul, neg, xor, etc.)
 *   Compose  = Sequential application (functorial)
 *   Identity = id morphism (no-op, source === target)
 */

import { grafeoStore } from "../grafeo-store";
import { sparqlUpdate, sparqlQuery, type SparqlBinding } from "../grafeo-store";
import { compute, makeDatum, type Datum } from "@/modules/uor-sdk/ring";

/** Default quantum level (q=0 → 1 byte → Z/256Z) */
const DEFAULT_Q = 0;
import { singleProofHash } from "@/lib/uor-canonical";

// ── Types ───────────────────────────────────────────────────────────────────

export type PrimitiveOp =
  | "add" | "sub" | "mul"
  | "neg" | "bnot" | "succ" | "pred"
  | "xor" | "and" | "or";

export interface GraphMorphism {
  source: string;
  target: string;
  via: PrimitiveOp;
  deterministic: true;
  morphismCid: string;
}

export interface MorphismResult {
  datum: Datum;
  resultIri: string;
  morphism: GraphMorphism;
}

// ── Core Operations ─────────────────────────────────────────────────────────

/**
 * Apply a ring morphism to a graph node.
 */
export async function applyMorphism(
  sourceIri: string,
  op: PrimitiveOp,
  operand?: number,
): Promise<MorphismResult> {
  const sourceDatum = await retrieveDatum(sourceIri);
  if (!sourceDatum) {
    throw new Error(`[Morphism] No datum found at source IRI: ${sourceIri}`);
  }

  const sourceValue = sourceDatum["schema:value"];
  const resultQuantum = computeOp(op, sourceValue, operand);
  const resultDatum = makeDatum(resultQuantum, DEFAULT_RING);

  // Content-address the result
  const resultIdentity = await singleProofHash({
    "@type": "uor:Datum",
    "uor:quantum": resultDatum["schema:quantum"],
    "uor:value": resultDatum["schema:value"],
  });
  const resultIri = `urn:uor:datum:${resultIdentity["u:canonicalId"] ?? resultIdentity.derivationId}`;

  // Content-address the morphism edge itself
  const morphismIdentity = await singleProofHash({
    "@type": "uor:Morphism",
    "uor:source": sourceIri,
    "uor:target": resultIri,
    "uor:operation": op,
    "uor:operand": operand,
  });
  const morphismCid = morphismIdentity["u:canonicalId"] ?? morphismIdentity.derivationId;

  const morphism: GraphMorphism = {
    source: sourceIri,
    target: resultIri,
    via: op,
    deterministic: true,
    morphismCid,
  };

  return { datum: resultDatum, resultIri, morphism };
}

/**
 * Compose multiple morphisms sequentially (functorial composition).
 */
export async function composeMorphisms(
  sourceIri: string,
  ops: Array<{ op: PrimitiveOp; operand?: number }>,
): Promise<{
  finalDatum: Datum;
  finalIri: string;
  chain: GraphMorphism[];
}> {
  let currentIri = sourceIri;
  const chain: GraphMorphism[] = [];
  let lastDatum: Datum | null = null;

  for (const { op, operand } of ops) {
    const result = await applyMorphism(currentIri, op, operand);
    chain.push(result.morphism);
    currentIri = result.resultIri;
    lastDatum = result.datum;
  }

  const finalDatum = lastDatum ?? makeDatum(0, DEFAULT_RING);
  return { finalDatum, finalIri: currentIri, chain };
}

/**
 * Materialize a morphism as a typed edge in GrafeoDB.
 */
export async function materializeMorphismEdge(morphism: GraphMorphism): Promise<void> {
  const sparql = `
    INSERT DATA {
      <${morphism.source}>
        <urn:uor:morphism:${morphism.via}>
        <${morphism.target}> .
      <${morphism.target}>
        <urn:uor:morphism:inverse:${morphism.via}>
        <${morphism.source}> .
      <${morphism.source}>
        <urn:uor:morphism:cid>
        "${morphism.morphismCid}" .
    }
  `;
  await sparqlUpdate(sparql);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function retrieveDatum(iri: string): Promise<Datum | null> {
  try {
    const results = await sparqlQuery(
      `SELECT ?q WHERE { <${iri}> <urn:uor:schema:quantum> ?q } LIMIT 1`
    ) as SparqlBinding[];
    if (Array.isArray(results) && results.length > 0) {
      const qVal = results[0]["?q"] || results[0].q;
      if (qVal) {
        const quantum = parseInt(String(qVal), 10);
        if (!isNaN(quantum)) return makeDatum(quantum, DEFAULT_RING);
      }
    }
  } catch { /* node may not have quantum property */ }

  // Try to extract value from IRI pattern
  const match = iri.match(/quantum[:/](\d+)/);
  if (match) return makeDatum(parseInt(match[1], 10), DEFAULT_RING);

  return null;
}

function computeOp(op: PrimitiveOp, a: number, b?: number): number {
  if (op === "neg" || op === "bnot" || op === "succ" || op === "pred") {
    return compute(op, a);
  }
  if (b === undefined) {
    throw new Error(`[Morphism] Binary operation '${op}' requires an operand`);
  }
  return compute(op, a, b);
}
