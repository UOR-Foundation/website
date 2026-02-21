/**
 * UOR 8-Stage Agent Resolution Cycle — unified pipeline orchestrator.
 *
 * Implements the roadmap's 8-stage sequence:
 *   1. Context Binding (state module)
 *   2. Type Extraction (resolver/type-registry)
 *   3. Entity Resolution (resolver)
 *   4. Partition Retrieval (resolver/partition)
 *   5. Fact Retrieval (observable)
 *   6. Certificate Verification (derivation/certificate)
 *   7. Trace Recording (trace)
 *   8. Transform (morphism)
 *
 * Each stage delegates to existing modules — zero duplication.
 * Produces a canonical receipt for the full cycle.
 */

import { Q0, Q1, UORRing } from "@/modules/ring-core/ring";
import { createContext, addBinding } from "@/modules/state";
import { extractType } from "@/modules/resolver/type-registry";
import type { PrimitiveType } from "@/modules/resolver/type-registry";
import { resolve } from "@/modules/resolver/resolver";
import type { ResolverResult } from "@/modules/resolver/resolver";
import { computePartition } from "@/modules/resolver/partition";
import type { PartitionResult } from "@/modules/resolver/partition";
import { queryObservables } from "@/modules/observable";
import type { Observable } from "@/modules/observable";
import { derive } from "@/modules/derivation/derivation";
import { issueCertificate } from "@/modules/derivation/certificate";
import type { Certificate } from "@/modules/derivation/certificate";
import { recordTrace } from "@/modules/trace";
import type { ComputationTrace, TraceStep } from "@/modules/trace";
import { parseTerm } from "./parser";
import { canonicalJsonLd, computeCid } from "@/lib/uor-address";

// ── Types ───────────────────────────────────────────────────────────────────

export interface StageResult {
  stage: number;
  name: string;
  durationMs: number;
  output: unknown;
}

export interface ResolutionResult {
  "@type": "agent:ResolutionCycle";
  cycleId: string;
  query: string;
  quantum: number;
  stages: StageResult[];
  resolvedIri: string | null;
  certificate: Certificate | null;
  trace: ComputationTrace | null;
  selfVerified: boolean;
  totalDurationMs: number;
  timestamp: string;
}

// ── Helper ──────────────────────────────────────────────────────────────────

function getRing(quantum: number): UORRing {
  return quantum === 0 ? Q0() : quantum === 1 ? Q1() : new UORRing(quantum);
}

// ── Execute Resolution Cycle ────────────────────────────────────────────────

/**
 * Execute the full 8-stage agent resolution cycle.
 * Each stage is audited with timing and output.
 */
export async function executeResolutionCycle(
  query: string,
  quantum: number = 0
): Promise<ResolutionResult> {
  const totalStart = performance.now();
  const stages: StageResult[] = [];
  const traceSteps: TraceStep[] = [];
  const ring = getRing(quantum);
  const timestamp = new Date().toISOString();

  // Ensure ring coherence (R4)
  if (!ring.coherenceVerified) ring.verify();

  // ── Stage 1: Context Binding ──────────────────────────────────────────
  const s1Start = performance.now();
  let contextId: string | null = null;
  try {
    const ctx = await createContext(quantum, 256);
    contextId = ctx?.context_id ?? null;
    if (contextId) {
      await addBinding(contextId, `urn:uor:query:${Date.now()}`, query);
    }
  } catch { /* non-fatal */ }
  const s1Output = { contextId, quantum };
  stages.push({ stage: 1, name: "Context Binding", durationMs: Math.round(performance.now() - s1Start), output: s1Output });
  traceSteps.push({ index: 0, operation: "context_bind", input: { query, quantum }, output: s1Output, durationMs: stages[0].durationMs });

  // ── Stage 2: Type Extraction ──────────────────────────────────────────
  const s2Start = performance.now();
  const extractedType: PrimitiveType | null = extractType(query);
  const effectiveQuantum = extractedType?.quantum ?? quantum;
  const effectiveRing = effectiveQuantum !== quantum ? getRing(effectiveQuantum) : ring;
  stages.push({ stage: 2, name: "Type Extraction", durationMs: Math.round(performance.now() - s2Start), output: extractedType });
  traceSteps.push({ index: 1, operation: "type_extract", input: query, output: extractedType, durationMs: stages[1].durationMs });

  // ── Stage 3: Entity Resolution ────────────────────────────────────────
  const s3Start = performance.now();
  let resolverResult: ResolverResult | null = null;
  let resolvedValue: number | null = null;
  try {
    // Try to parse as a numeric value or term
    const numMatch = query.match(/\d+/);
    if (numMatch) {
      resolvedValue = parseInt(numMatch[0]);
      resolverResult = resolve(effectiveRing, resolvedValue);
    }
  } catch { /* non-fatal */ }
  stages.push({ stage: 3, name: "Entity Resolution", durationMs: Math.round(performance.now() - s3Start), output: resolverResult });
  traceSteps.push({ index: 2, operation: "entity_resolve", input: query, output: resolverResult, durationMs: stages[2].durationMs });

  // ── Stage 4: Partition Retrieval ──────────────────────────────────────
  const s4Start = performance.now();
  let partitionResult: PartitionResult | null = null;
  if (resolvedValue !== null) {
    partitionResult = computePartition(effectiveRing, [resolvedValue], "oneStep");
  }
  stages.push({ stage: 4, name: "Partition Retrieval", durationMs: Math.round(performance.now() - s4Start), output: partitionResult ? { closureVerified: partitionResult.closureVerified, units: partitionResult.units.length, exterior: partitionResult.exterior.length } : null });
  traceSteps.push({ index: 3, operation: "partition_retrieve", input: resolvedValue, output: partitionResult?.closureVerified, durationMs: stages[3].durationMs });

  // ── Stage 5: Fact Retrieval ───────────────────────────────────────────
  const s5Start = performance.now();
  let observables: Observable[] = [];
  try {
    observables = await queryObservables({ quantum: effectiveQuantum, limit: 5 });
  } catch { /* non-fatal */ }
  stages.push({ stage: 5, name: "Fact Retrieval", durationMs: Math.round(performance.now() - s5Start), output: { count: observables.length } });
  traceSteps.push({ index: 4, operation: "fact_retrieve", input: { quantum: effectiveQuantum }, output: { count: observables.length }, durationMs: stages[4].durationMs });

  // ── Stage 6: Certificate Verification ─────────────────────────────────
  const s6Start = performance.now();
  let certificate: Certificate | null = null;
  let derivationId = "";
  try {
    if (resolvedValue !== null) {
      const term = parseTerm(String(resolvedValue));
      const derivation = await derive(effectiveRing, term);
      derivationId = derivation.derivationId;
      certificate = await issueCertificate(derivation, effectiveRing, term);
    }
  } catch { /* non-fatal */ }
  stages.push({ stage: 6, name: "Certificate Verification", durationMs: Math.round(performance.now() - s6Start), output: certificate ? { valid: certificate.valid, certificateId: certificate.certificateId } : null });
  traceSteps.push({ index: 5, operation: "cert_verify", input: derivationId, output: certificate?.valid, durationMs: stages[5].durationMs });

  // ── Stage 7: Trace Recording ──────────────────────────────────────────
  const s7Start = performance.now();
  let trace: ComputationTrace | null = null;
  try {
    trace = await recordTrace(
      derivationId || `urn:uor:cycle:${Date.now()}`,
      `resolution_cycle:${query}`,
      traceSteps,
      effectiveQuantum,
      certificate?.certificateId
    );
  } catch { /* non-fatal */ }
  stages.push({ stage: 7, name: "Trace Recording", durationMs: Math.round(performance.now() - s7Start), output: trace ? { traceId: trace.traceId } : null });

  // ── Stage 8: Transform ────────────────────────────────────────────────
  const s8Start = performance.now();
  // The transform stage verifies the cycle itself is self-consistent
  const selfVerified = ring.coherenceVerified && (certificate?.valid ?? false);
  stages.push({ stage: 8, name: "Transform", durationMs: Math.round(performance.now() - s8Start), output: { selfVerified } });

  // ── Build cycle ID ────────────────────────────────────────────────────
  const cyclePayload = canonicalJsonLd({ query, quantum, stages: stages.map((s) => s.name), timestamp });
  const cycleCid = await computeCid(new TextEncoder().encode(cyclePayload));
  const cycleId = `urn:uor:cycle:${cycleCid.slice(0, 24)}`;

  return {
    "@type": "agent:ResolutionCycle",
    cycleId,
    query,
    quantum: effectiveQuantum,
    stages,
    resolvedIri: resolverResult?.canonicalIri ?? null,
    certificate,
    trace,
    selfVerified,
    totalDurationMs: Math.round(performance.now() - totalStart),
    timestamp,
  };
}
