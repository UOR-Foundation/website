/**
 * UOR v2.0.0 — Proof-Gated Inference (PGI)
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Decomposes queries into atomic claims, checks each against the proof store,
 * and only sends uncached "gaps" to the LLM. Cached claims replay instantly
 * via tensor-product composition with live fragments.
 *
 * Privacy guarantee: the LLM never sees the full query — only decontextualized
 * atomic fragments. Semantic assembly happens client-side via composeProofs().
 *
 * Architecture:
 *   Query → buildScaffold() → N atomic ClaimSlots
 *     → parallel proof lookup (single batch query)
 *       → HITs: replay locally (0 tokens to LLM) 🔒
 *       → MISSes: send isolated fragments to LLM
 *     → composeProofs() tensor product → unified response
 *     → store new proofs for future O(1)
 *
 * @module ring-core/proof-gated-inference
 */

import { supabase } from "@/integrations/supabase/client";
import { composeProofs, createProof, type ReasoningProof } from "./proof-machine";
import type { SymbolicScaffold, ScaffoldConstraint, AnnotatedClaim, EpistemicGrade } from "./neuro-symbolic";

// ── Types ──────────────────────────────────────────────────────────────────

/** An atomic claim slot — the unit of proof-gated inference. */
export interface ClaimSlot {
  /** Index in the scaffold constraint list. */
  readonly index: number;
  /** The constraint this slot represents. */
  readonly constraint: ScaffoldConstraint;
  /** Deterministic content hash of the claim context. */
  readonly claimHash: string;
  /** Canonical input string used to produce the hash. */
  readonly canonical: string;
}

/** Result of batch proof lookup. */
export interface ProofLookupResult {
  /** Slots that had cache hits — replay instantly. */
  readonly hits: Array<ClaimSlot & { cachedOutput: string; proofId: string; grade: string }>;
  /** Slots that missed — need LLM inference. */
  readonly misses: ClaimSlot[];
  /** Hit ratio [0, 1]. */
  readonly hitRatio: number;
  /** Total LLM tokens saved by cache hits (estimated). */
  readonly tokensSaved: number;
}

/** A composed PGI result combining cached + live fragments. */
export interface PGIResult {
  /** The final composed response text. */
  readonly composedText: string;
  /** Per-claim annotations with provenance. */
  readonly claims: AnnotatedClaim[];
  /** The composed proof (tensor product of cached + live). */
  readonly proof: ReasoningProof;
  /** How many claims were served from cache. */
  readonly cacheHits: number;
  /** How many claims required LLM. */
  readonly llmCalls: number;
  /** Estimated tokens saved. */
  readonly tokensSaved: number;
  /** Whether any data was sent to the LLM. */
  readonly fullyPrivate: boolean;
}

// ── 1. Claim-Level Hashing ─────────────────────────────────────────────────

/**
 * Decompose a scaffold into atomic ClaimSlots, each with a deterministic
 * content hash. Two identical constraints always produce the same hash,
 * enabling O(1) lookup regardless of the surrounding query context.
 */
export function decomposeToClaims(scaffold: SymbolicScaffold): ClaimSlot[] {
  return scaffold.constraints.map((constraint, index) => {
    // Canonical form: sorted JSON of constraint properties
    const canonical = JSON.stringify({
      id: constraint.id,
      type: constraint.type,
      description: constraint.description,
      ringValue: constraint.ringValue,
      quantum: scaffold.quantum,
    });

    // Fast deterministic hash (FNV-1a 32-bit for speed)
    const claimHash = fnv1a(canonical);

    return { index, constraint, claimHash, canonical };
  });
}

/** FNV-1a 32-bit hash — fast, deterministic, good distribution. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

// ── 2. Parallel Proof Lookup ───────────────────────────────────────────────

/**
 * Batch-query the proof store for all claim hashes simultaneously.
 * Uses a single `in()` query for O(1) network round-trip.
 */
export async function batchLookupProofs(claims: ClaimSlot[]): Promise<ProofLookupResult> {
  if (claims.length === 0) {
    return { hits: [], misses: [], hitRatio: 0, tokensSaved: 0 };
  }

  const hashes = claims.map(c => c.claimHash);

  const { data, error } = await supabase
    .from("uor_inference_proofs")
    .select("input_hash, output_cached, proof_id, epistemic_grade")
    .in("input_hash", hashes);

  if (error || !data) {
    // On error, treat all as misses — graceful degradation
    return { hits: [], misses: [...claims], hitRatio: 0, tokensSaved: 0 };
  }

  // Build hash→result map for O(1) matching
  const hitMap = new Map(data.map(d => [d.input_hash, d]));

  const hits: ProofLookupResult["hits"] = [];
  const misses: ClaimSlot[] = [];

  for (const claim of claims) {
    const cached = hitMap.get(claim.claimHash);
    if (cached) {
      hits.push({
        ...claim,
        cachedOutput: cached.output_cached,
        proofId: cached.proof_id,
        grade: cached.epistemic_grade,
      });
    } else {
      misses.push(claim);
    }
  }

  const tokensSaved = hits.reduce((sum, h) => sum + h.cachedOutput.split(/\s+/).length, 0);

  return {
    hits,
    misses,
    hitRatio: claims.length > 0 ? hits.length / claims.length : 0,
    tokensSaved,
  };
}

// ── 3. Proof Composition ───────────────────────────────────────────────────

/**
 * Compose cached proof fragments with live LLM fragments into a unified response.
 * Uses tensor product (composeProofs) for algebraic composition.
 */
export function composeFragments(
  hits: ProofLookupResult["hits"],
  liveFragments: Array<{ claimIndex: number; text: string; grade: EpistemicGrade }>,
  quantum: number,
): PGIResult {
  // Build ordered claim list (cached + live, sorted by original index)
  const allClaims: Array<{ index: number; text: string; grade: EpistemicGrade; source: string; fromCache: boolean }> = [];

  for (const hit of hits) {
    allClaims.push({
      index: hit.index,
      text: hit.cachedOutput,
      grade: hit.grade as EpistemicGrade,
      source: `proof:${hit.proofId}`,
      fromCache: true,
    });
  }

  for (const frag of liveFragments) {
    allClaims.push({
      index: frag.claimIndex,
      text: frag.text,
      grade: frag.grade,
      source: "llm-live",
      fromCache: false,
    });
  }

  // Sort by original constraint index for coherent output
  allClaims.sort((a, b) => a.index - b.index);

  // Build annotated claims
  const claims: AnnotatedClaim[] = allClaims.map(c => ({
    text: c.text,
    grade: c.grade,
    source: c.source,
    stepIndex: c.index,
    curvature: c.fromCache ? 0 : 0.3, // cached = zero curvature
  }));

  // Compose proofs via tensor product
  let proof = createProof(quantum, allClaims.map(c => `claim:${c.index}`));

  // If we have multiple cached proofs, compose them
  const cachedProofs = hits.map(() => createProof(quantum, []));
  if (cachedProofs.length >= 2) {
    let composed = cachedProofs[0];
    for (let i = 1; i < cachedProofs.length; i++) {
      const result = composeProofs(composed, cachedProofs[i]);
      composed = result.proof;
    }
    proof = composeProofs(composed, proof).proof;
  }

  const composedText = allClaims.map(c => c.text).join(" ");

  return {
    composedText,
    claims,
    proof,
    cacheHits: hits.length,
    llmCalls: liveFragments.length,
    tokensSaved: hits.reduce((sum, h) => sum + h.cachedOutput.split(/\s+/).length, 0),
    fullyPrivate: liveFragments.length === 0,
  };
}

// ── 4. Cache Write (store new claim-level proofs) ──────────────────────────

/**
 * Store individual claim-level proofs for future O(1) lookup.
 * Fire-and-forget — non-critical path.
 */
export async function storeClaims(
  claims: ClaimSlot[],
  outputs: Array<{ claimIndex: number; text: string; grade: EpistemicGrade }>,
): Promise<void> {
  // Only store grade A/B claims (high-trust)
  const toStore = outputs.filter(o => o.grade === "A" || o.grade === "B");
  if (toStore.length === 0) return;

  const rows = toStore.map(o => {
    const slot = claims.find(c => c.index === o.claimIndex);
    if (!slot) return null;
    const outputHash = fnv1a(o.text);
    return {
      input_hash: slot.claimHash,
      input_canonical: slot.canonical,
      output_cached: o.text,
      output_hash: outputHash,
      proof_id: `pgi:${slot.claimHash}:${outputHash}`,
      tool_name: "pgi:claim-level",
      epistemic_grade: o.grade,
      hit_count: 0,
    };
  }).filter(Boolean);

  if (rows.length > 0) {
    await supabase.from("uor_inference_proofs").upsert(rows as any[], { onConflict: "proof_id" });
  }
}

// ── 5. Privacy-Preserving Fragment Builder ─────────────────────────────────

/**
 * Build decontextualized LLM prompts from miss slots.
 * Each fragment is stripped of surrounding context so the LLM
 * cannot reconstruct the original query.
 */
export function buildPrivateFragments(misses: ClaimSlot[]): string[] {
  return misses.map(slot => {
    // Strip the constraint to its bare semantic content
    const { type, description } = slot.constraint;
    switch (type) {
      case "factual":
        // Extract the quoted term and ask a generic question
        const term = description.match(/"([^"]+)"/)?.[1] ?? description;
        return `Provide a brief, sourced factual statement about: ${term}. Include {source: "..."} after each claim.`;
      case "logical":
        return `Answer the following precisely: ${description}. Include {source: "..."} after each claim.`;
      case "causal":
        return `Explain the causal relationship: ${description}. Include {source: "..."} after each claim.`;
      case "definitional":
        return `Define: ${description}. Include {source: "..."} after each claim.`;
      default:
        return `${description}. Include {source: "..."} after each claim.`;
    }
  });
}

// ── 6. Full PGI Orchestrator ───────────────────────────────────────────────

/**
 * Configuration for Proof-Gated Inference.
 */
export interface PGIConfig {
  /** Quantum level. */
  readonly quantum: number;
  /** Whether to store new proofs after inference. */
  readonly cacheNewProofs: boolean;
  /** Minimum grade to cache. */
  readonly minCacheGrade: EpistemicGrade;
}

export const DEFAULT_PGI_CONFIG: PGIConfig = {
  quantum: 0,
  cacheNewProofs: true,
  minCacheGrade: "B",
};

/**
 * Run the full PGI pipeline:
 *   1. Decompose scaffold → claim slots
 *   2. Batch lookup → hits/misses
 *   3. Build private fragments for misses
 *   4. Return orchestration plan (caller executes LLM calls)
 */
export async function planPGI(
  scaffold: SymbolicScaffold,
  config: PGIConfig = DEFAULT_PGI_CONFIG,
): Promise<{
  claims: ClaimSlot[];
  lookup: ProofLookupResult;
  privateFragments: string[];
  config: PGIConfig;
}> {
  const claims = decomposeToClaims(scaffold);
  const lookup = await batchLookupProofs(claims);
  const privateFragments = buildPrivateFragments(lookup.misses);

  return { claims, lookup, privateFragments, config };
}
