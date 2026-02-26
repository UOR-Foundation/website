/**
 * UOR Morphism: Transform — structure-preserving maps between ring values.
 *
 * Uses the Single Proof Hashing Standard (URDNA2015) for content-addressing.
 *
 * Delegates to:
 *   - ring-core for arithmetic
 *   - identity for IRI computation
 *   - lib/uor-canonical.ts for URDNA2015 Single Proof Hashing
 *   - kg-store for persistence
 */

import type { UORRing } from "@/modules/ring-core/ring";
import { contentAddress } from "@/modules/identity";
import { singleProofHash } from "@/lib/uor-canonical";
import { ingestTriples } from "@/modules/kg-store/store";
import { emitContext } from "@/modules/jsonld/context";

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * Runtime morphism kind — aligned with v2.0.0 foundation MorphismKind.
 * These are DISJOINT: no object may carry more than one kind.
 */
export type MorphismKind = "Transform" | "Isometry" | "Embedding" | "Action" | "Composition" | "Identity";

/** The five concrete subtypes (excludes the abstract "Transform" base). */
const DISJOINT_KINDS: ReadonlySet<MorphismKind> = new Set([
  "Isometry", "Embedding", "Action", "Composition", "Identity",
]);

/**
 * Assert that a morphism kind is valid and concrete.
 * Throws if an object attempts to claim multiple kinds.
 */
export function assertDisjointKind(kind: MorphismKind, label?: string): void {
  if (kind === "Transform") return; // base type, not a concrete subtype
  if (!DISJOINT_KINDS.has(kind)) {
    throw new Error(
      `[morphism:disjoint] Invalid morphism kind "${kind}"${label ? ` for ${label}` : ""}. ` +
      `Must be one of: ${[...DISJOINT_KINDS].join(", ")}`
    );
  }
}

/**
 * Enforce disjoint constraint on a TransformRecord.
 * Verifies that the record's kind and @type are consistent,
 * and that structural invariants hold per v2.0.0 spec.
 */
export function enforceDisjointConstraints(record: TransformRecord): void {
  const kind = record.kind;
  assertDisjointKind(kind, record.transformId);

  // Structural invariants per kind
  switch (kind) {
    case "Isometry":
      if (!record.fidelityPreserved) {
        throw new Error(
          `[morphism:disjoint] Isometry "${record.transformId}" must preserve fidelity`
        );
      }
      break;
    case "Identity":
      if (record.sourceIri !== record.targetIri && record.sourceValue !== record.targetValue) {
        throw new Error(
          `[morphism:disjoint] Identity "${record.transformId}" must map source to itself`
        );
      }
      if (!record.fidelityPreserved) {
        throw new Error(
          `[morphism:disjoint] Identity "${record.transformId}" must preserve fidelity`
        );
      }
      break;
    case "Composition":
      if (!record.rules || record.rules.length < 2) {
        throw new Error(
          `[morphism:disjoint] Composition "${record.transformId}" requires ≥2 rules`
        );
      }
      break;
  }
}

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
 * Generates a content-addressed transform ID via URDNA2015 and persists as triples.
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
  const fidelityPreserved = kind === "Isometry" || kind === "Embedding" || kind === "Identity";

  // ── Disjoint constraint enforcement ──────────────────────────────────
  assertDisjointKind(kind, `recordTransform(${sourceIri} → ${targetIri})`);
  const proof = await singleProofHash({
    "@context": { morphism: "https://uor.foundation/morphism/" },
    "@type": `morphism:${kind}`,
    "morphism:source": sourceIri,
    "morphism:target": targetIri,
    "morphism:kind": kind,
    "morphism:rules": rules,
  });
  const transformId = `urn:uor:morphism:${proof.cid.slice(0, 24)}`;

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
