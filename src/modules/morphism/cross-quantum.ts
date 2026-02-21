/**
 * UOR Morphism: Cross-Quantum — embeddings and projections between ring sizes.
 *
 * From the UOR ontology:
 *   - Embedding: injective (no information lost) — Q0 → Q1
 *   - Projection: surjective (take low byte) — Q1 → Q0
 *
 * Both operations record the morphism with certificate via transform.ts.
 *
 * Delegates to:
 *   - ring-core for ring instances
 *   - morphism/transform for recording
 *   - derivation for receipts and certificates
 *
 * Zero duplication — all arithmetic delegated to ring-core.
 */

import { Q0, Q1, UORRing } from "@/modules/ring-core/ring";
import {
  applyTransform,
  recordTransform,
  type MappingRule,
  type TransformRecord,
} from "./transform";
import { generateReceipt } from "@/modules/derivation/receipt";
import type { DerivationReceipt } from "@/modules/derivation/receipt";
import { parseTerm } from "@/modules/agent-tools/parser";

// ── Types ───────────────────────────────────────────────────────────────────

export interface CrossQuantumResult {
  sourceValue: number;
  targetValue: number;
  sourceQuantum: number;
  targetQuantum: number;
  transform: TransformRecord;
  receipt: DerivationReceipt;
  lossless: boolean;
  executionTimeMs: number;
}

// ── Embed Q0 → Q1 ──────────────────────────────────────────────────────────

/**
 * Embed an 8-bit value into the 16-bit ring (pad with zeros in high byte).
 * This is injective — no information is lost.
 */
export async function embedQ0toQ1(value: number): Promise<CrossQuantumResult> {
  const start = performance.now();
  const sourceRing = Q0();
  const targetRing = Q1();

  // Verify ring coherence (R4)
  if (!sourceRing.coherenceVerified) sourceRing.verify();
  if (!targetRing.coherenceVerified) targetRing.verify();

  const rules: MappingRule[] = [
    {
      label: "Zero-pad embedding Q0→Q1",
      operation: "embed",
      sourceQuantum: 0,
      targetQuantum: 1,
    },
  ];

  const targetValue = applyTransform(sourceRing, targetRing, value, rules);

  // Record morphism
  const transform = await recordTransform(
    sourceRing,
    targetRing,
    value,
    targetValue,
    rules,
    "Embedding"
  );

  // Generate canonical receipt for the embedding operation
  const term = parseTerm(String(value));
  const { receipt } = await generateReceipt("morphism", sourceRing, term);

  return {
    sourceValue: value,
    targetValue,
    sourceQuantum: 0,
    targetQuantum: 1,
    transform,
    receipt,
    lossless: true,
    executionTimeMs: Math.round(performance.now() - start),
  };
}

// ── Project Q1 → Q0 ────────────────────────────────────────────────────────

/**
 * Project a 16-bit value down to the 8-bit ring (take low byte).
 * This is NOT lossless if the high byte is non-zero.
 */
export async function projectQ1toQ0(value: number): Promise<CrossQuantumResult> {
  const start = performance.now();
  const sourceRing = Q1();
  const targetRing = Q0();

  // Verify ring coherence (R4)
  if (!sourceRing.coherenceVerified) sourceRing.verify();
  if (!targetRing.coherenceVerified) targetRing.verify();

  const rules: MappingRule[] = [
    {
      label: "Low-byte projection Q1→Q0",
      operation: "project",
      sourceQuantum: 1,
      targetQuantum: 0,
    },
  ];

  const targetValue = applyTransform(sourceRing, targetRing, value, rules);
  const lossless = targetValue === value; // Only lossless if value fits in 8 bits

  // Record morphism
  const transform = await recordTransform(
    sourceRing,
    targetRing,
    value,
    targetValue,
    rules,
    lossless ? "Isometry" : "Transform"
  );

  // Generate canonical receipt
  const term = parseTerm(String(value & 0xff));
  const { receipt } = await generateReceipt("morphism", targetRing, term);

  return {
    sourceValue: value,
    targetValue,
    sourceQuantum: 1,
    targetQuantum: 0,
    transform,
    receipt,
    lossless,
    executionTimeMs: Math.round(performance.now() - start),
  };
}

// ── General cross-quantum transform ─────────────────────────────────────────

/**
 * Generic cross-quantum transform between any two quantum levels.
 * Automatically selects embed or project based on direction.
 */
export async function crossQuantumTransform(
  value: number,
  sourceQuantum: number,
  targetQuantum: number
): Promise<CrossQuantumResult> {
  if (sourceQuantum === targetQuantum) {
    // Identity transform
    const start = performance.now();
    const ring = new UORRing(sourceQuantum);
    if (!ring.coherenceVerified) ring.verify();

    const rules: MappingRule[] = [
      {
        label: `Identity Q${sourceQuantum}→Q${targetQuantum}`,
        operation: "identity",
        sourceQuantum,
        targetQuantum,
      },
    ];

    const targetValue = applyTransform(ring, ring, value, rules);
    const transform = await recordTransform(ring, ring, value, targetValue, rules, "Isometry");
    const term = parseTerm(String(value));
    const { receipt } = await generateReceipt("morphism", ring, term);

    return {
      sourceValue: value,
      targetValue,
      sourceQuantum,
      targetQuantum,
      transform,
      receipt,
      lossless: true,
      executionTimeMs: Math.round(performance.now() - start),
    };
  }

  if (sourceQuantum < targetQuantum) {
    // Embedding (upward)
    if (sourceQuantum === 0 && targetQuantum === 1) {
      return embedQ0toQ1(value);
    }
    // General embedding for higher quantums
    const start = performance.now();
    const sourceRing = new UORRing(sourceQuantum);
    const targetRing = new UORRing(targetQuantum);
    if (!sourceRing.coherenceVerified) sourceRing.verify();
    if (!targetRing.coherenceVerified) targetRing.verify();

    const rules: MappingRule[] = [
      {
        label: `Embed Q${sourceQuantum}→Q${targetQuantum}`,
        operation: "embed",
        sourceQuantum,
        targetQuantum,
      },
    ];

    const targetValue = applyTransform(sourceRing, targetRing, value, rules);
    const transform = await recordTransform(sourceRing, targetRing, value, targetValue, rules, "Embedding");
    const term = parseTerm(String(value));
    const { receipt } = await generateReceipt("morphism", sourceRing, term);

    return {
      sourceValue: value,
      targetValue,
      sourceQuantum,
      targetQuantum,
      transform,
      receipt,
      lossless: true,
      executionTimeMs: Math.round(performance.now() - start),
    };
  }

  // Projection (downward)
  if (sourceQuantum === 1 && targetQuantum === 0) {
    return projectQ1toQ0(value);
  }

  const start = performance.now();
  const sourceRing = new UORRing(sourceQuantum);
  const targetRing = new UORRing(targetQuantum);
  if (!sourceRing.coherenceVerified) sourceRing.verify();
  if (!targetRing.coherenceVerified) targetRing.verify();

  const rules: MappingRule[] = [
    {
      label: `Project Q${sourceQuantum}→Q${targetQuantum}`,
      operation: "project",
      sourceQuantum,
      targetQuantum,
    },
  ];

  const targetValue = applyTransform(sourceRing, targetRing, value, rules);
  const lossless = targetValue === value;
  const transform = await recordTransform(
    sourceRing, targetRing, value, targetValue, rules,
    lossless ? "Isometry" : "Transform"
  );
  const term = parseTerm(String(targetValue));
  const { receipt } = await generateReceipt("morphism", targetRing, term);

  return {
    sourceValue: value,
    targetValue,
    sourceQuantum,
    targetQuantum,
    transform,
    receipt,
    lossless,
    executionTimeMs: Math.round(performance.now() - start),
  };
}
