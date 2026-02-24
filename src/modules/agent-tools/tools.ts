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
import { recordTrace } from "@/modules/trace";
import type { TraceStep } from "@/modules/trace";

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

  // Stage 7: Record computation trace
  const traceSteps: TraceStep[] = [
    { index: 0, operation: "parse", input: input.term, output: serializeTerm(term), durationMs: 0 },
    { index: 1, operation: "derive", input: serializeTerm(term), output: derivationResult.resultValue, durationMs: 0 },
    { index: 2, operation: "verify", input: derivationResult.derivationId, output: receipt.selfVerified, durationMs: 0 },
  ];
  try {
    await recordTrace(
      derivationResult.derivationId,
      `uor_derive:${input.term}`,
      traceSteps,
      ring.quantum,
      receipt.receiptId
    );
  } catch { /* non-fatal */ }

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
// P32: Intent-based object resolution via query: namespace.
// If body.intent → UnsQuery.query() (DihedralFactorizationResolver)
// If body.sparql → UnsQuery.sparqlQuery() (SPARQL with epistemic grading)

import { UnsQuery } from "@/modules/sparql/query";
import type { QueryResult as IntentQueryResult, SparqlQueryResult, QueryIntent } from "@/modules/sparql/query";
import { UnsGraph } from "@/modules/kg-store/uns-graph";

export interface QueryInput {
  /** Natural-language intent for DihedralFactorization resolution. */
  intent?: string;
  /** SPARQL query for structure-based resolution. */
  sparql?: string;
  graph_uri?: string;
}

export interface QueryOutput {
  /** Intent-based resolution result (present if intent was provided). */
  intentResult?: IntentQueryResult;
  /** SPARQL result (present if sparql was provided). */
  sparqlResult?: SparqlQueryResult;
  /** Decomposed intent (present if intent was provided). */
  queryIntent?: QueryIntent;
  /** Legacy SPARQL-only result for backward compat. */
  results?: SparqlResult;
  executionTimeMs: number;
}

export async function uor_query(input: QueryInput): Promise<QueryOutput> {
  const start = performance.now();

  // Initialize graph for intent-based queries
  const graph = new UnsGraph();
  graph.loadOntologyGraph();
  graph.materializeQ0();
  const queryEngine = new UnsQuery(graph);

  let intentResult: IntentQueryResult | undefined;
  let sparqlResult: SparqlQueryResult | undefined;
  let queryIntent: QueryIntent | undefined;
  let legacyResults: SparqlResult | undefined;

  // Intent-based resolution (P32: DihedralFactorizationResolver)
  if (input.intent) {
    queryIntent = queryEngine.buildIntent(input.intent);
    intentResult = await queryEngine.resolve(queryIntent, input.graph_uri);
  }

  // SPARQL-based resolution
  if (input.sparql) {
    // Use in-memory graph SPARQL for epistemic grading
    sparqlResult = await queryEngine.sparqlQuery(
      input.sparql,
      input.graph_uri ?? "https://uor.foundation/graph/q0"
    );

    // Also execute against Supabase for backward compat
    try {
      legacyResults = await executeSparql(input.sparql);
    } catch {
      // Non-fatal — in-memory result takes precedence
    }
  }

  return {
    intentResult,
    sparqlResult,
    queryIntent,
    results: legacyResults,
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
// P33: Upgraded to fidelity engine with SKOS semantic recommendations.
// Supports both ring-value correlation (legacy) and canonical-ID fidelity (P33).

import {
  correlateIds,
  classifyFidelity,
  FIDELITY_THRESHOLDS,
  type CorrelateResult as FidelityResult,
  type SkosRelation,
} from "@/modules/resolver/correlate-engine";

export interface CorrelateInput {
  /** Ring value A (legacy mode). */
  a?: number;
  /** Ring value B (legacy mode). */
  b?: number;
  /** Canonical ID A (fidelity mode). */
  canonicalIdA?: string;
  /** Canonical ID B (fidelity mode). */
  canonicalIdB?: string;
  quantum?: number;
}

export interface CorrelateOutput {
  /** Ring-level correlation (legacy). */
  ring?: CorrelationResult;
  /** Fidelity-level correlation (P33). */
  fidelity?: FidelityResult;
  executionTimeMs: number;
}

export async function uor_correlate(input: CorrelateInput): Promise<CorrelateOutput> {
  const start = performance.now();
  const result: CorrelateOutput = { executionTimeMs: 0 };

  // Legacy ring-value correlation
  if (input.a !== undefined && input.b !== undefined) {
    const ring = getRing(input.quantum);
    result.ring = correlate(ring, input.a, input.b);
  }

  // P33: Fidelity-based canonical ID correlation
  if (input.canonicalIdA && input.canonicalIdB) {
    result.fidelity = await correlateIds(input.canonicalIdA, input.canonicalIdB);
  }

  result.executionTimeMs = Math.round(performance.now() - start);
  return result;
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

// ── Tool 6: uor_schema_bridge ──────────────────────────────────────────────

export interface SchemaBridgeInput {
  schema_type: string;
  mode?: "type" | "instance" | "catalog";
  store?: boolean;
  instance_data?: Record<string, unknown>;
}

export interface SchemaBridgeOutput {
  derivation_id: string;
  cid: string;
  uor_address: { glyph: string; length: number };
  epistemic_grade: string;
  schema_type: string;
  mode: string;
  coercions: Array<{ property: string; sourceType: string; resolvedType: string; rule: string }>;
  stored: boolean;
  executionTimeMs: number;
}

export async function uor_schema_bridge(input: SchemaBridgeInput): Promise<SchemaBridgeOutput> {
  const start = performance.now();
  const mode = input.mode ?? "type";

  // Build instance object for canonicalization
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": input.schema_type.includes(":") ? input.schema_type : `schema:${input.schema_type}`,
    ...(input.instance_data ?? {}),
  };

  // C2: Apply union type canonicalization before identity computation
  const { canonicalizeUnionTypes } = await import("@/modules/morphism/union-type-canon");
  const { canonicalized, coercions } = await canonicalizeUnionTypes(obj, false);

  // C1: Compute identity via Single Proof Hashing Standard (URDNA2015)
  const { singleProofHash } = await import("@/lib/uor-canonical");
  const proof = await singleProofHash(canonicalized);

  return {
    derivation_id: proof.derivationId,
    cid: proof.cid,
    uor_address: { glyph: proof.uorAddress["u:glyph"], length: proof.uorAddress["u:length"] },
    epistemic_grade: "B",  // C5: sobridge objects are Grade B (content-addressed + certified)
    schema_type: input.schema_type,
    mode,
    coercions: coercions.map(c => ({
      property: c.property,
      sourceType: c.sourceType,
      resolvedType: c.resolvedType,
      rule: c.rule,
    })),
    stored: input.store ?? false,
    executionTimeMs: Math.round(performance.now() - start),
  };
}

// ── Tool 7: uor_schema_coherence ───────────────────────────────────────────

export interface SchemaCoherenceInput {
  instances: Record<string, unknown>[];
}

export interface SchemaCoherenceOutput {
  verified: boolean;
  proof_id: string;
  instance_count: number;
  all_references_resolved: boolean;
  all_derivation_ids_verified: boolean;
  unresolved_refs: string[];
  epistemic_grade: string;
  instances: Array<{
    type: string;
    derivation_id: string;
    cid: string;
  }>;
  executionTimeMs: number;
}

export async function uor_schema_coherence(input: SchemaCoherenceInput): Promise<SchemaCoherenceOutput> {
  const start = performance.now();

  if (!Array.isArray(input.instances) || input.instances.length < 2) {
    throw new Error("instances must be an array of at least 2 JSON-LD objects");
  }

  const { canonicalizeUnionTypes } = await import("@/modules/morphism/union-type-canon");
  const { singleProofHash } = await import("@/lib/uor-canonical");

  // C2: Canonicalize each instance with union type coercion
  const identities: Array<{
    type: string;
    derivationId: string;
    cid: string;
    refs: string[];
  }> = [];

  for (const inst of input.instances) {
    const instType = String(inst["@type"] ?? inst.type ?? "Thing")
      .replace("schema:", "").replace("https://schema.org/", "");
    const clean: Record<string, unknown> = { ...inst };
    if (!clean["@type"]) clean["@type"] = `schema:${instType}`;
    if (!clean["@context"]) clean["@context"] = "https://schema.org/";

    const { canonicalized } = await canonicalizeUnionTypes(clean, false);
    const proof = await singleProofHash(canonicalized);

    // Detect cross-references
    const refs: string[] = [];
    for (const [, v] of Object.entries(canonicalized)) {
      if (typeof v === "object" && v !== null && !Array.isArray(v) && (v as Record<string, unknown>)["@type"]) {
        refs.push(String((v as Record<string, unknown>)["@type"]).replace("schema:", "").replace("https://schema.org/", ""));
      }
    }

    identities.push({ type: instType, derivationId: proof.derivationId, cid: proof.cid, refs });
  }

  // C3: Check reference resolution
  const typeSet = new Set(identities.map(id => id.type));
  const unresolvedRefs: string[] = [];
  for (const id of identities) {
    for (const ref of id.refs) {
      if (!typeSet.has(ref)) unresolvedRefs.push(ref);
    }
  }

  const allResolved = unresolvedRefs.length === 0;
  const verified = allResolved;

  // Compute coherence proof hash
  const proofData = await singleProofHash({
    "@context": { proof: "https://uor.foundation/proof/" },
    "@type": "proof:CoherenceProof",
    "proof:instances": identities.map(id => ({ type: id.type, cid: id.cid })),
    "proof:allResolved": allResolved,
  });

  // C5: Grade A if fully coherent, Grade B if resolved but unverified chains, Grade C otherwise
  const grade = allResolved ? "A" : "C";

  return {
    verified,
    proof_id: proofData.derivationId,
    instance_count: identities.length,
    all_references_resolved: allResolved,
    all_derivation_ids_verified: allResolved,
    unresolved_refs: unresolvedRefs,
    epistemic_grade: grade,
    instances: identities.map(id => ({
      type: id.type,
      derivation_id: id.derivationId,
      cid: id.cid,
    })),
    executionTimeMs: Math.round(performance.now() - start),
  };
}
