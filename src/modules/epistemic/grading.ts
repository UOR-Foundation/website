/**
 * UOR Epistemic Grading — trust levels for every piece of knowledge.
 *
 * The four grades (UOR roadmap §6.2):
 *   A — Algebraically Proven: derivation_id from derive(), coherence verified
 *   B — Graph-Certified: cert:Certificate after SHACL validation
 *   C — Graph-Present: datum in graph with source, no derivation ID
 *   D — LLM-Generated / Unverified: no derivation, no certificate
 *
 * Zero duplication — this is the single source of truth for grade logic.
 */

import type { EpistemicGrade } from "@/types/uor";

// ── Grade metadata ──────────────────────────────────────────────────────────

export interface GradeInfo {
  grade: EpistemicGrade;
  label: string;
  description: string;
  agentBehavior: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const GRADE_INFO: Record<EpistemicGrade, GradeInfo> = {
  A: {
    grade: "A",
    label: "Algebraically Proven",
    description: "Derivation ID from derive(), ring coherence verified, SHA-256 committed.",
    agentBehavior: "Cite with full confidence, include derivation ID.",
    colorClass: "text-green-400",
    bgClass: "bg-green-500/20",
    borderClass: "border-green-500/30",
  },
  B: {
    grade: "B",
    label: "Graph-Certified",
    description: "Certificate issued after SHACL validation and resolver traversal.",
    agentBehavior: "Cite with high confidence, certificate IRI provided.",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/20",
    borderClass: "border-blue-500/30",
  },
  C: {
    grade: "C",
    label: "Graph-Present",
    description: "Datum in graph with source, no derivation ID.",
    agentBehavior: "Cite with moderate confidence, flag 'not algebraically verified'.",
    colorClass: "text-yellow-400",
    bgClass: "bg-yellow-500/20",
    borderClass: "border-yellow-500/30",
  },
  D: {
    grade: "D",
    label: "LLM-Generated / Unverified",
    description: "No derivation, no certificate. Hypothesis only.",
    agentBehavior: "Explicitly flag as unverified, route to derive() for verification.",
    colorClass: "text-red-400",
    bgClass: "bg-red-500/20",
    borderClass: "border-red-500/30",
  },
};

// ── Public API ──────────────────────────────────────────────────────────────

/** Get full metadata for a grade. */
export function gradeInfo(grade: EpistemicGrade): GradeInfo {
  return GRADE_INFO[grade];
}

/** Get display label for a grade. */
export function gradeToLabel(grade: EpistemicGrade): string {
  return GRADE_INFO[grade].label;
}

/** Get Tailwind class string for a grade badge. */
export function gradeToStyles(grade: EpistemicGrade): string {
  const info = GRADE_INFO[grade];
  return `${info.bgClass} ${info.colorClass} ${info.borderClass}`;
}

/**
 * Compute the epistemic grade for a datum based on available evidence.
 *
 * @param hasDerivation - datum has a derivation_id from derive()
 * @param hasCertificate - datum has a cert:Certificate
 * @param hasSource - datum exists in the knowledge graph with a source
 */
export function computeGrade(opts: {
  hasDerivation?: boolean;
  hasCertificate?: boolean;
  hasSource?: boolean;
}): EpistemicGrade {
  if (opts.hasDerivation) return "A";
  if (opts.hasCertificate) return "B";
  if (opts.hasSource) return "C";
  return "D";
}

/** All grade keys for iteration. */
export const ALL_GRADES: EpistemicGrade[] = ["A", "B", "C", "D"];
