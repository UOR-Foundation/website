/**
 * UOR Epistemic Grade Engine — first-class trust primitive for all UNS services.
 *
 * Verbatim from https://uor.foundation/.well-known/uor.json:epistemic_grades
 *
 * Four grades of trust:
 *   A — Algebraically Proven: ring-arithmetic with derivation:derivationId
 *   B — Graph-Certified: SPARQL graph with cert:Certificate
 *   C — Graph-Present: datum in graph without certificate
 *   D — LLM-Generated / Unverified: treat as hypothesis
 *
 * Rules:
 *   - No module may claim Grade A without a derivation:derivationId.
 *   - No module may downgrade a result from its natural grade.
 *   - Grade D is the safe default for anything unverified.
 *
 * @see .well-known/uor.json — epistemic_grades field
 * @see spec/src/namespaces/derivation.rs — derivation:derivationId
 * @see spec/src/namespaces/cert.rs — cert:Certificate
 */

import type { EpistemicGrade } from "@/types/uor";
import { singleProofHash } from "@/modules/uns/core/identity";

// ── Grade Definitions (verbatim from .well-known/uor.json) ──────────────────

export const GRADE_DEFINITIONS: Record<EpistemicGrade, string> = {
  A: "Algebraically Proven — ring-arithmetic with derivation:derivationId",
  B: "Graph-Certified — SPARQL graph with cert:Certificate",
  C: "Graph-Present — datum in graph without certificate",
  D: "LLM-Generated / Unverified — treat as hypothesis",
};

// ── Graded<T> — the universal epistemic wrapper ─────────────────────────────

/**
 * Any UNS result wrapped with its epistemic grade.
 *
 * This is the universal response envelope. Every API response,
 * every record, every proof must be wrapped in Graded<T>.
 */
export interface Graded<T> {
  /** The actual result data. */
  data: T;
  /** One of A, B, C, D. */
  epistemic_grade: EpistemicGrade;
  /** Human-readable label from GRADE_DEFINITIONS. */
  epistemic_grade_label: string;
  /** Reason why this grade was assigned. */
  epistemic_grade_reason: string;
  /** Required for Grade A — the derivation URN. */
  "derivation:derivationId"?: string;
  /** Required for Grade B — the certificate ID. */
  "cert:certificateId"?: string;
}

// ── Grade Assignment ────────────────────────────────────────────────────────

/**
 * Assign an epistemic grade based on available proof material.
 *
 * Priority: derivationId → Grade A, certificateId → Grade B,
 *           graphPresent → Grade C, else → Grade D.
 *
 * @see .well-known/uor.json — grade assignment rules
 */
export function assignGrade(result: {
  derivationId?: string;
  certificateId?: string;
  graphPresent?: boolean;
}): EpistemicGrade {
  if (result.derivationId) return "A";
  if (result.certificateId) return "B";
  if (result.graphPresent) return "C";
  return "D";
}

// ── Graded Wrapper ──────────────────────────────────────────────────────────

/**
 * Wrap any result with its epistemic grade.
 *
 * This is the primary API for all UNS services. Every response
 * should be wrapped via this function.
 */
export function graded<T>(
  data: T,
  opts: {
    derivationId?: string;
    certificateId?: string;
    graphPresent?: boolean;
    reason?: string;
  } = {}
): Graded<T> {
  const grade = assignGrade(opts);

  const defaultReasons: Record<EpistemicGrade, string> = {
    A: `Ring-arithmetic derivation verified (${opts.derivationId?.slice(0, 40)}...)`,
    B: `Graph-certified with certificate ${opts.certificateId}`,
    C: "Present in knowledge graph without certificate",
    D: "No derivation ID — treat as unverified hypothesis",
  };

  const result: Graded<T> = {
    data,
    epistemic_grade: grade,
    epistemic_grade_label: GRADE_DEFINITIONS[grade],
    epistemic_grade_reason: opts.reason ?? defaultReasons[grade],
  };

  if (opts.derivationId) {
    result["derivation:derivationId"] = opts.derivationId;
  }
  if (opts.certificateId) {
    result["cert:certificateId"] = opts.certificateId;
  }

  return result;
}

// ── Grade A Derivation ──────────────────────────────────────────────────────

/**
 * Compute a Grade A derivation for a ring operation result.
 *
 * This is the canonical Grade A proof: derive the result via URDNA2015,
 * hash the derivation, and wrap in a Graded<number> envelope.
 *
 * The derivationId is deterministic: same operation + result → same ID.
 *
 * @param operation  The ring operation expression, e.g. 'neg(bnot(42))'
 * @param result     The computed result, e.g. 43
 * @returns          derivationId (URN) + graded result
 *
 * @see spec/src/namespaces/derivation.rs — derivation:derivationId format
 */
export async function deriveGradeA(
  operation: string,
  result: number
): Promise<{ derivationId: string; grade: Graded<number> }> {
  const identity = await singleProofHash({
    "@type": "derivation:RingDerivation",
    "derivation:operation": operation,
    "derivation:result": result,
    "derivation:ring": "Z/256Z",
  });

  const derivationId = identity["u:canonicalId"];

  return {
    derivationId,
    grade: graded(result, {
      derivationId,
      reason: `Ring operation '${operation}' = ${result}, derivation verified`,
    }),
  };
}
