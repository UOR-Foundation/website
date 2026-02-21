/**
 * UOR JSON-LD Emitter — W3C JSON-LD 1.1 document generation.
 *
 * Requirement R6: All UOR output must be valid W3C JSON-LD 1.1.
 *
 * Delegates to:
 *   - context.ts for the @context
 *   - ring-core for arithmetic
 *   - identity for IRI computation
 *   - triad for triadic coordinates
 *   - lib/uor-ring for makeDatum, classifyByte
 *
 * Zero duplication of any arithmetic, addressing, or triad logic.
 */

import { emitContext } from "./context";
import type { UORRing } from "@/modules/ring-core/ring";
import { fromBytes } from "@/modules/ring-core/ring";
import { bytesToGlyph, bytesToUPlus, bytesToIRI, contentAddress } from "@/modules/identity";
import { computeTriad, stratumLevel, stratumDensity } from "@/modules/triad";
import { classifyByte } from "@/lib/uor-ring";
import type { Derivation } from "@/modules/derivation/derivation";

// ── Types ───────────────────────────────────────────────────────────────────

export interface JsonLdNode {
  "@id": string;
  "@type": string;
  [key: string]: unknown;
}

export interface JsonLdDocument {
  "@context": ReturnType<typeof emitContext>;
  "proof:coherenceVerified"?: boolean;
  "proof:timestamp"?: string;
  "@graph": JsonLdNode[];
}

export interface EmitGraphOptions {
  /** Include derivation nodes in the graph. Default: false. */
  derivations?: Derivation[];
  /** Only emit a subset of values. Default: all values in the ring. */
  values?: number[];
  /** Maximum number of datum nodes to emit. Default: all. */
  limit?: number;
}

// ── emitDatum ───────────────────────────────────────────────────────────────

/**
 * Emit a JSON-LD node for a single datum value in the given ring.
 * All fields align with the UOR ontology schema:Datum.
 */
export function emitDatum(
  ring: UORRing,
  value: number,
  derivationIds?: string[]
): JsonLdNode {
  const bytes = ring.toBytes(value);
  const iri = contentAddress(ring, value);
  const triad = computeTriad(bytes);
  const classification = classifyByte(value, ring.bits);

  // Compute related IRIs
  const negBytes = ring.neg(bytes);
  const bnotBytes = ring.bnot(bytes);
  const succBytes = ring.succ(bytes);
  const predBytes = ring.pred(bytes);

  const node: JsonLdNode = {
    "@id": iri,
    "@type": "schema:Datum",
    "rdfs:label": `Datum(${value})`,
    "rdfs:comment": `Ring element ${value} in Q${ring.quantum} [Z/(2^${ring.bits})Z]`,
    "schema:value": value,
    "schema:quantum": ring.quantum,
    "schema:width": ring.width,
    "schema:bits": ring.bits,
    "schema:bytes": bytes,
    "schema:stratum": triad.stratum,
    "schema:totalStratum": triad.totalStratum,
    "schema:spectrum": triad.spectrum,
    "schema:stratumLevel": stratumLevel(triad.totalStratum, ring.bits),
    "schema:stratumDensity": Math.round(stratumDensity(triad.totalStratum, ring.bits) * 100) / 100,
    "schema:glyph": bytesToGlyph(bytes),
    "schema:codepoints": bytesToUPlus(bytes),
    "partition:component": classification.component,
    inverse: contentAddress(ring, fromBytes(negBytes)),
    not: contentAddress(ring, fromBytes(bnotBytes)),
    succ: contentAddress(ring, fromBytes(succBytes)),
    pred: contentAddress(ring, fromBytes(predBytes)),
    basis: triad.spectrum
      .flat()
      .map((bitIdx) => `op:basis_${bitIdx}`),
    // Gap 4: SKOS stratum hierarchy — lower stratum = broader concept
    "skos:broader": triad.totalStratum > 0
      ? contentAddress(ring, Math.max(0, value - 1))
      : undefined,
  };

  if (derivationIds && derivationIds.length > 0) {
    node["derivation:derivedBy"] = derivationIds;
  }

  return node;
}

// ── emitDerivation ──────────────────────────────────────────────────────────

/**
 * Emit a JSON-LD node for a Derivation record.
 */
export function emitDerivation(d: Derivation): JsonLdNode {
  return {
    "@id": d.derivationId,
    "@type": "derivation:Record",
    "rdfs:label": `Derivation: ${d.originalTerm}`,
    "derivation:originalTerm": d.originalTerm,
    "derivation:canonicalTerm": d.canonicalTerm,
    "derivation:resultValue": d.resultValue,
    "derivation:resultIri": d.resultIri,
    "derivation:epistemicGrade": d.epistemicGrade,
    "derivation:timestamp": d.timestamp,
    "derivation:originalComplexity": d.metrics.originalComplexity,
    "derivation:canonicalComplexity": d.metrics.canonicalComplexity,
    "derivation:reductionRatio": d.metrics.reductionRatio,
    // W3C PROV-O alignment
    "prov:wasGeneratedBy": `urn:uor:proof:coherence:Q0`,
    "prov:startedAtTime": d.timestamp,
    "prov:wasAttributedTo": "urn:uor:agent:ring-core",
  };
}

// ── emitCoherenceProof ──────────────────────────────────────────────────────

/**
 * Emit a JSON-LD node for the ring coherence proof metadata.
 */
export function emitCoherenceProof(ring: UORRing): JsonLdNode {
  const verifyResult = ring.coherenceVerified
    ? { verified: true, failures: [] as string[] }
    : ring.verify();

  // Gap 5: Extract notClosedUnder operations from failures
  const closureOps = ["neg", "bnot", "succ", "pred", "add", "mul"];
  const notClosedUnder = closureOps.filter((op) =>
    verifyResult.failures.some((f) => f.toLowerCase().includes(op))
  );

  return {
    "@id": `urn:uor:proof:coherence:Q${ring.quantum}`,
    "@type": "proof:CoherenceProof",
    "proof:quantum": ring.quantum,
    "proof:bits": ring.bits,
    "proof:verified": verifyResult.verified,
    "proof:failures": verifyResult.failures,
    "proof:notClosedUnder": notClosedUnder,
    "proof:criticalIdentity": "neg(bnot(x)) = succ(x)",
    "proof:timestamp": new Date().toISOString(),
  };
}

// ── emitGraph ───────────────────────────────────────────────────────────────

/**
 * Emit a complete JSON-LD document with @context, coherence proof, and @graph.
 * Loadable by any standard triplestore (Oxigraph, Jena, GraphDB).
 */
export function emitGraph(
  ring: UORRing,
  options: EmitGraphOptions = {}
): JsonLdDocument {
  const { derivations = [], values, limit } = options;

  // Ensure coherence
  if (!ring.coherenceVerified) {
    ring.verify();
  }

  // Determine which values to emit
  let valuesToEmit: number[];
  if (values) {
    valuesToEmit = values;
  } else {
    const max = Number(ring.cycle);
    // For Q0 (256 values) emit all; for larger rings, cap at limit or 256
    const cap = limit ?? Math.min(max, 256);
    valuesToEmit = Array.from({ length: cap }, (_, i) => i);
  }

  // Build derivation ID map (value → derivation IDs)
  const derivationMap = new Map<number, string[]>();
  for (const d of derivations) {
    const existing = derivationMap.get(d.resultValue) ?? [];
    existing.push(d.derivationId);
    derivationMap.set(d.resultValue, existing);
  }

  // Emit datum nodes
  const datumNodes = valuesToEmit.map((v) =>
    emitDatum(ring, v, derivationMap.get(v))
  );

  // Emit derivation nodes
  const derivationNodes = derivations.map(emitDerivation);

  // Coherence proof
  const proofNode = emitCoherenceProof(ring);

  return {
    "@context": emitContext(),
    "proof:coherenceVerified": ring.coherenceVerified,
    "proof:timestamp": new Date().toISOString(),
    "@graph": [proofNode, ...datumNodes, ...derivationNodes],
  };
}
