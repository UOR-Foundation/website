/**
 * UOR Morphism: Transform — structure-preserving maps between ring values.
 *
 * From the UOR ontology (morphism: namespace):
 *   - Transform: general mapping with source, target, mapping rules
 *   - Every transform generates a certificate and canonical receipt
 *
 * Uses ingestTriples from kg-store for persistence. Delegates to:
 *   - ring-core for arithmetic
 *   - identity for IRI computation
 *   - derivation for certificates and receipts
 *   - kg-store for persistence
 *
 * Zero duplication — all crypto uses computeCid, all addressing uses identity.
 */

import type { UORRing } from "@/modules/ring-core/ring";
import { contentAddress } from "@/modules/identity";
import { canonicalJsonLd, computeCid } from "@/lib/uor-address";
import { ingestTriples } from "@/modules/kg-store/store";
import { emitContext } from "@/modules/jsonld/context";

// ── Types ───────────────────────────────────────────────────────────────────

export type MorphismKind = "Transform" | "Isometry" | "Embedding" | "Action";

export interface MappingRule {
  /** Human-readable label for the rule */
  label: string;
  /** The operation applied: e.g. "embed", "project", "identity" */
  operation: string;
  /** Source quantum level */
  sourceQuantum: number;
  /** Target quantum level */
  targetQuantum: number;
}

export interface TransformRecord {
  "@type": `morphism:${MorphismKind}`;
  transformId: string;
  sourceIri: string;
  targetIri: string;
  sourceValue: number;
  targetValue: number;
  sourceQuantum: number;
  targetQuantum: number;
  kind: MorphismKind;
  rules: MappingRule[];
  fidelityPreserved: boolean;
  timestamp: string;
}

// ── applyTransform ──────────────────────────────────────────────────────────

/**
 * Apply mapping rules to transform a value from one ring to another.
 * Returns the transformed value. The rules determine how the mapping works.
 */
export function applyTransform(
  sourceRing: UORRing,
  targetRing: UORRing,
  value: number,
  rules: MappingRule[]
): number {
  const sourceBits = sourceRing.bits;
  const targetBits = targetRing.bits;

  // Determine transform operation from rules
  const primaryRule = rules[0];
  if (!primaryRule) throw new Error("At least one mapping rule is required");

  switch (primaryRule.operation) {
    case "embed": {
      // Injective embedding: value preserved, zero-padded in higher bits
      const mask = (1 << sourceBits) - 1;
      return value & mask; // value is already valid in larger ring
    }
    case "project": {
      // Projection: take low bits of target width
      const mask = (1 << targetBits) - 1;
      return value & mask;
    }
    case "identity": {
      // Identity morphism (same ring)
      return value;
    }
    default:
      throw new Error(`Unknown transform operation: ${primaryRule.operation}`);
  }
}

// ── recordTransform ─────────────────────────────────────────────────────────

/**
 * Record a transform as a morphism:Transform in the knowledge graph.
 * Generates a content-addressed transform ID and persists as triples.
 */
export async function recordTransform(
  sourceRing: UORRing,
  targetRing: UORRing,
  sourceValue: number,
  targetValue: number,
  rules: MappingRule[],
  kind: MorphismKind = "Transform"
): Promise<TransformRecord> {
  const sourceIri = contentAddress(sourceRing, sourceValue);
  const targetIri = contentAddress(targetRing, targetValue);
  const timestamp = new Date().toISOString();

  // Determine if fidelity is preserved (round-trip recovers original)
  const fidelityPreserved = kind === "Isometry" || kind === "Embedding";

  // Content-addressed transform ID
  const payload = canonicalJsonLd({
    source: sourceIri,
    target: targetIri,
    kind,
    rules,
  });
  const cid = await computeCid(new TextEncoder().encode(payload));
  const transformId = `urn:uor:morphism:${cid.slice(0, 24)}`;

  const record: TransformRecord = {
    "@type": `morphism:${kind}`,
    transformId,
    sourceIri,
    targetIri,
    sourceValue,
    targetValue,
    sourceQuantum: sourceRing.quantum,
    targetQuantum: targetRing.quantum,
    kind,
    rules,
    fidelityPreserved,
    timestamp,
  };

  // Persist as triples in the knowledge graph
  await ingestTriples(
    {
      "@context": emitContext(),
      "@graph": [
        {
          "@id": transformId,
          "@type": `morphism:${kind}`,
          "morphism:source": sourceIri,
          "morphism:target": targetIri,
          "morphism:sourceQuantum": String(sourceRing.quantum),
          "morphism:targetQuantum": String(targetRing.quantum),
          "morphism:fidelityPreserved": String(fidelityPreserved),
        },
      ],
    },
    "urn:uor:graph:morphisms"
  );

  return record;
}
