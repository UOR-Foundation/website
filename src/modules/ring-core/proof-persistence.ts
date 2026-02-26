/**
 * UOR v2.0.0 — Proof Persistence
 *
 * Phase 7: Save and load reasoning proofs to the database
 * so they survive across sessions. Every neuro-symbolic
 * co-reasoning result is persisted with its full proof trace,
 * claims, scaffold summary, and certificate.
 *
 * @module ring-core/proof-persistence
 */

import { supabase } from "@/integrations/supabase/client";
import type { ReasoningProof, ProofCertificate } from "./proof-machine";
import type { NeuroSymbolicResult, AnnotatedClaim, EpistemicGrade } from "./neuro-symbolic";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PersistedProof {
  id: string;
  proof_id: string;
  user_id: string;
  conversation_id: string | null;
  state: string;
  quantum: number;
  premises: string[];
  conclusion: string | null;
  steps: unknown[];
  is_complete: boolean;
  overall_grade: EpistemicGrade;
  iterations: number;
  converged: boolean;
  final_curvature: number;
  claims: AnnotatedClaim[];
  scaffold_summary: string | null;
  certificate: ProofCertificate | null;
  created_at: string;
  updated_at: string;
}

// ── Save ───────────────────────────────────────────────────────────────────

/**
 * Persist a neuro-symbolic reasoning result to the database.
 * Fire-and-forget safe — errors are logged, not thrown.
 */
export async function saveReasoningProof(
  nsResult: NeuroSymbolicResult,
  conversationId?: string | null,
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const proof = nsResult.proof;

    const row = {
      proof_id: proof.proofId,
      user_id: user.id,
      conversation_id: conversationId ?? null,
      state: proof.state,
      quantum: proof.quantum,
      premises: proof.premises,
      conclusion: proof.conclusion,
      steps: proof.steps as unknown as Record<string, unknown>[],
      is_complete: proof.isComplete,
      overall_grade: nsResult.overallGrade,
      iterations: nsResult.iterations,
      converged: nsResult.converged,
      final_curvature: nsResult.finalCurvature,
      claims: nsResult.claims as unknown as Record<string, unknown>[],
      scaffold_summary: nsResult.scaffold?.promptFragment?.slice(0, 2000) ?? null,
      certificate: proof.certificate as unknown as Record<string, unknown> | null,
    };

    const { data, error } = await supabase
      .from("reasoning_proofs")
      .upsert(row as any, { onConflict: "proof_id" })
      .select("id")
      .single();

    if (error) {
      console.error("[ProofPersistence] Save error:", error.message);
      return null;
    }

    return data?.id ?? null;
  } catch (e) {
    console.error("[ProofPersistence] Save failed:", e);
    return null;
  }
}

// ── Load ───────────────────────────────────────────────────────────────────

/**
 * Load all reasoning proofs for the current user, optionally filtered
 * by conversation.
 */
export async function loadReasoningProofs(
  conversationId?: string,
  limit: number = 50,
): Promise<PersistedProof[]> {
  try {
    let query = supabase
      .from("reasoning_proofs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (conversationId) {
      query = query.eq("conversation_id", conversationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[ProofPersistence] Load error:", error.message);
      return [];
    }

    return (data ?? []) as unknown as PersistedProof[];
  } catch (e) {
    console.error("[ProofPersistence] Load failed:", e);
    return [];
  }
}

/**
 * Load a single proof by its content-addressed proof_id.
 */
export async function loadProofById(proofId: string): Promise<PersistedProof | null> {
  try {
    const { data, error } = await supabase
      .from("reasoning_proofs")
      .select("*")
      .eq("proof_id", proofId)
      .maybeSingle();

    if (error || !data) return null;
    return data as unknown as PersistedProof;
  } catch {
    return null;
  }
}

/**
 * Get aggregate stats for the user's reasoning proofs.
 */
export async function getProofStats(): Promise<{
  total: number;
  gradeDistribution: Record<EpistemicGrade, number>;
  convergedRate: number;
  avgIterations: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from("reasoning_proofs")
      .select("overall_grade, converged, iterations");

    if (error || !data || data.length === 0) return null;

    const gradeDistribution: Record<EpistemicGrade, number> = { A: 0, B: 0, C: 0, D: 0 };
    let convergedCount = 0;
    let totalIterations = 0;

    for (const row of data) {
      const grade = row.overall_grade as EpistemicGrade;
      if (grade in gradeDistribution) gradeDistribution[grade]++;
      if (row.converged) convergedCount++;
      totalIterations += row.iterations ?? 1;
    }

    return {
      total: data.length,
      gradeDistribution,
      convergedRate: data.length > 0 ? convergedCount / data.length : 0,
      avgIterations: data.length > 0 ? totalIterations / data.length : 0,
    };
  } catch {
    return null;
  }
}
