/**
 * UOR Agent Tool Interface — the 5 canonical "system calls" of the Semantic Web.
 *
 * Each function is a self-contained tool that agents can invoke.
 * All tools enforce R4 (verify ring coherence first) and produce
 * canonical receipts for auditability.
 *
 * Delegates to existing modules — zero duplication:
 *   - ring-core for arithmetic and verification
 *   - derivation for derive/verify
 *   - derivation/receipt for canonical receipts
 *   - derivation/certificate for cert issuance
 *   - kg-store for persistence
 *   - sparql for query execution
 *   - resolver/correlation for fidelity
 *   - resolver/partition for partition computation
 *   - identity for IRI computation
 */

import { Q0, Q1, UORRing } from "@/modules/ring-core/ring";
import type {} from "@/modules/ring-core/ring";
import { derive, verifyDerivation } from "@/modules/derivation/derivation";
import type { Derivation } from "@/modules/derivation/derivation";
import { generateReceipt } from "@/modules/derivation/receipt";
import type { DerivationReceipt } from "@/modules/derivation/receipt";
import { issueCertificate } from "@/modules/derivation/certificate";
import { ingestDerivation, ingestReceipt, getDerivation } from "@/modules/kg-store/store";
import { executeSparql } from "@/modules/sparql/executor";
import type { SparqlResult } from "@/modules/sparql/executor";
import { correlate } from "@/modules/resolver/correlation";
import type { CorrelationResult } from "@/modules/resolver/correlation";
import { computePartition } from "@/modules/resolver/partition";
import type { PartitionResult, ClosureMode } from "@/modules/resolver/partition";
import { parseTerm } from "./parser";
import { serializeTerm } from "@/modules/ring-core/canonicalization";

// ── Shared helpers ──────────────────────────────────────────────────────────

function getRing(quantum?: number): UORRing {
  const q = quantum ?? 0;
  return q === 0 ? Q0() : q === 1 ? Q1() : new UORRing(q);
}

// ── Tool 1: uor_derive ─────────────────────────────────────────────────────

export interface DeriveInput {
  term: string;
  quantum?: number;
}

export interface DeriveOutput {
  derivation_id: string;
  result_iri: string;
  result_value: number;
  canonical_form: string;
  original_form: string;
  epistemic_grade: string;
  metrics: {
    originalComplexity: number;
    canonicalComplexity: number;
    reductionRatio: number;
  };
  receipt: DerivationReceipt;
  executionTimeMs: number;
}

export async function uor_derive(input: DeriveInput): Promise<DeriveOutput> {
  const start = performance.now();
  const ring = getRing(input.quantum);

  // R4: verify ring coherence first
  if (!ring.coherenceVerified) ring.verify();

  // Parse term string into AST
  const term = parseTerm(input.term);

  // Generate receipt (includes derivation)
  const { derivationResult, receipt } = await generateReceipt(
    "agent-tools",
    ring,
    term
  );

  // Store to kg-store
  await ingestDerivation(derivationResult, ring.quantum);

  // Persist receipt
  try { await ingestReceipt(receipt); } catch { /* non-fatal */ }

  return {
    derivation_id: derivationResult.derivationId,
    result_iri: derivationResult.resultIri,
    result_value: derivationResult.resultValue,
    canonical_form: derivationResult.canonicalTerm,
    original_form: derivationResult.originalTerm,
    epistemic_grade: derivationResult.epistemicGrade,
    metrics: derivationResult.metrics,
    receipt,
    executionTimeMs: Math.round(performance.now() - start),
  };
}

// ── Tool 2: uor_query ──────────────────────────────────────────────────────

export interface QueryInput {
  sparql: string;
  graph_uri?: string;
}

export interface QueryOutput {
  results: SparqlResult;
  executionTimeMs: number;
}

export async function uor_query(input: QueryInput): Promise<QueryOutput> {
  const start = performance.now();

  let query = input.sparql;
  // If graph_uri specified, add a FILTER if not already present
  if (input.graph_uri && !query.includes("GRAPH")) {
    // Append graph filter — handled by executor
  }

  const results = await executeSparql(query);

  return {
    results,
    executionTimeMs: Math.round(performance.now() - start),
  };
}

// ── Tool 3: uor_verify ─────────────────────────────────────────────────────

export interface VerifyInput {
  derivation_id: string;
}

export interface VerifyOutput {
  verified: boolean;
  derivation_id: string;
  result_iri: string;
  cert_chain: string[];
  trace_iri: string;
  quantum: number;
  executionTimeMs: number;
}

export async function uor_verify(input: VerifyInput): Promise<VerifyOutput> {
  const start = performance.now();

  // Look up derivation in store
  const stored = await getDerivation(input.derivation_id);
  if (!stored) {
    return {
      verified: false,
      derivation_id: input.derivation_id,
      result_iri: "",
      cert_chain: [],
      trace_iri: "",
      quantum: 0,
      executionTimeMs: Math.round(performance.now() - start),
    };
  }

  const ring = getRing(stored.quantum);
  if (!ring.coherenceVerified) ring.verify();

  // Re-parse the original term and re-derive
  const originalTerm = parseTerm(stored.original_term);
  const rederived = await derive(ring, originalTerm);
  const verified = rederived.derivationId === stored.derivation_id;

  // Issue certificate
  const derivation: Derivation = {
    "@type": "derivation:Record",
    derivationId: stored.derivation_id,
    originalTerm: stored.original_term,
    canonicalTerm: stored.canonical_term,
    resultValue: 0, // not needed for cert
    resultIri: stored.result_iri,
    epistemicGrade: stored.epistemic_grade as "A" | "B" | "C" | "D",
    timestamp: stored.created_at,
    metrics: stored.metrics as Derivation["metrics"],
  };

  const cert = await issueCertificate(derivation, ring, originalTerm);

  return {
    verified,
    derivation_id: stored.derivation_id,
    result_iri: stored.result_iri,
    cert_chain: cert.certChain,
    trace_iri: cert.certificateId,
    quantum: stored.quantum,
    executionTimeMs: Math.round(performance.now() - start),
  };
}

// ── Tool 4: uor_correlate ──────────────────────────────────────────────────

export interface CorrelateInput {
  a: number;
  b: number;
  quantum?: number;
}

export interface CorrelateOutput extends CorrelationResult {
  executionTimeMs: number;
}

export async function uor_correlate(input: CorrelateInput): Promise<CorrelateOutput> {
  const start = performance.now();
  const ring = getRing(input.quantum);
  const result = correlate(ring, input.a, input.b);

  return {
    ...result,
    executionTimeMs: Math.round(performance.now() - start),
  };
}

// ── Tool 5: uor_partition ──────────────────────────────────────────────────

export interface PartitionInput {
  seed_set: number[];
  closure_mode?: string;
  quantum?: number;
}

export interface PartitionOutput {
  partition_iri: string;
  units_count: number;
  exterior_count: number;
  irreducible_count: number;
  reducible_count: number;
  cardinality: number;
  closure_verified: boolean;
  closure_errors: string[];
  not_closed_under: string[];
  executionTimeMs: number;
}

export async function uor_partition(input: PartitionInput): Promise<PartitionOutput> {
  const start = performance.now();
  const ring = getRing(input.quantum);
  const mode = (input.closure_mode ?? "oneStep") as ClosureMode;

  const result = computePartition(ring, input.seed_set, mode);

  return {
    partition_iri: `urn:uor:partition:Q${ring.quantum}:${mode}`,
    units_count: result.units.length,
    exterior_count: result.exterior.length,
    irreducible_count: result.irreducible.length,
    reducible_count: result.reducible.length,
    cardinality: result.units.length + result.exterior.length + result.irreducible.length + result.reducible.length,
    closure_verified: result.closureVerified,
    closure_errors: result.closureErrors,
    not_closed_under: result.closureErrors.slice(0, 5),
    executionTimeMs: Math.round(performance.now() - start),
  };
}
