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
 *
 * This makes the knowledge graph a computational category where:
 *   - Storage is nodes
 *   - Computation is edges
 *   - Traversal is execution
 *   - The result is always deterministic and content-addressed
 */

import { grafeoStore } from "../grafeo-store";
import { sparqlUpdate } from "../grafeo-store";
import { compute, makeDatum, type Datum } from "@/modules/uor-sdk/ring";
import { singleProofHash } from "@/lib/uor-canonical";

// ── Types ───────────────────────────────────────────────────────────────────

/** Supported primitive ring operations (UOR Z/(2^n)Z) */
export type PrimitiveOp =
  | "add" | "sub" | "mul"
  | "neg" | "bnot" | "succ" | "pred"
  | "xor" | "and" | "or";

/** A morphism edge in the knowledge graph */
export interface GraphMorphism {
  /** Source node IRI */
  source: string;
  /** Target node IRI (result of applying the operation) */
  target: string;
  /** The ring operation that maps source → target */
  via: PrimitiveOp;
  /** Morphisms are always deterministic in Z/(2^n)Z */
  deterministic: true;
  /** Content-addressed ID of this morphism */
  morphismCid: string;
}

/** Result of applying a morphism */
export interface MorphismResult {
  /** The resulting datum after applying the operation */
  datum: Datum;
  /** The content-addressed IRI of the result node */
  resultIri: string;
  /** The morphism edge that was created/found */
  morphism: GraphMorphism;
}

// ── Core Operations ─────────────────────────────────────────────────────────

/**
 * Apply a ring morphism to a graph node.
 *
 * 1. Retrieves the source node's datum (quantum value)
 * 2. Applies the ring operation
 * 3. Returns the result datum + creates/finds the target node
 *
 * The target node is content-addressed — applying the same op to the
 * same source always yields the same target IRI. Deterministic.
 */
export async function applyMorphism(
  sourceIri: string,
  op: PrimitiveOp,
  operand?: number,
): Promise<MorphismResult> {
  // 1. Retrieve source datum from graph
  const sourceDatum = await retrieveDatum(sourceIri);
  if (!sourceDatum) {
    throw new Error(`[Morphism] No datum found at source IRI: ${sourceIri}`);
  }

  // 2. Apply ring operation
  const resultQuantum = computeOp(op, sourceDatum.quantum, operand);
  const resultDatum = makeDatum(resultQuantum);

  // 3. Content-address the result
  const resultIdentity = await singleProofHash({
    "@type": "uor:Datum",
    "uor:quantum": resultDatum.quantum,
    "uor:bytes": Array.from(resultDatum.bytes),
  });
  const resultIri = `urn:uor:datum:${resultIdentity["u:canonicalId"] ?? resultIdentity.derivationId}`;

  // 4. Content-address the morphism edge itself
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
 *
 * composeMorphisms(node, ["neg", "succ", "mul"])
 *   = mul(succ(neg(node)))
 *
 * Each step is content-addressed; the full chain is auditable.
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

  for (const { op, operand } of ops) {
    const result = await applyMorphism(currentIri, op, operand);
    chain.push(result.morphism);
    currentIri = result.resultIri;
  }

  // Retrieve the final datum
  const finalResult = await retrieveDatum(currentIri);
  const finalDatum = finalResult ?? makeDatum(0);

  return { finalDatum, finalIri: currentIri, chain };
}

/**
 * Materialize a morphism as a typed edge in GrafeoDB.
 *
 * This persists the computation as a graph edge — making the
 * knowledge graph a self-computing structure. Future traversals
 * can replay the computation by following morphism edges.
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

/** Retrieve a Datum from a graph node IRI */
async function retrieveDatum(iri: string): Promise<Datum | null> {
  try {
    const results = await grafeoStore.sparqlSelect(
      `SELECT ?q WHERE { <${iri}> <urn:uor:schema:quantum> ?q } LIMIT 1`
    );
    if (results.length > 0 && results[0].q) {
      const quantum = parseInt(String(results[0].q), 10);
      if (!isNaN(quantum)) return makeDatum(quantum);
    }
  } catch { /* node may not have quantum property */ }

  // Try to extract quantum from IRI pattern
  const match = iri.match(/quantum[:/](\d+)/);
  if (match) return makeDatum(parseInt(match[1], 10));

  return null;
}

/** Apply a ring operation */
function computeOp(op: PrimitiveOp, a: number, b?: number): number {
  // Unary ops
  if (op === "neg" || op === "bnot" || op === "succ" || op === "pred") {
    return compute(op, a);
  }
  // Binary ops require operand
  if (b === undefined) {
    throw new Error(`[Morphism] Binary operation '${op}' requires an operand`);
  }
  return compute(op, a, b);
}
