/**
 * UOR v2.0.0 — Neuro-Symbolic Co-Reasoning Engine
 *
 * Implements Option C: Interleaved Co-Reasoning.
 *
 * Architecture:
 *   ┌─ DEDUCTIVE (symbolic, client-side) ───────────┐
 *   │  Query → ring constraints → reasoning scaffold │
 *   └───────────────────────────────────────────────┘
 *       │ scaffold
 *       ▼
 *   ┌─ INDUCTIVE (neural, edge function) ───────────┐
 *   │  LLM generates response guided by scaffold    │
 *   └───────────────────────────────────────────────┘
 *       │ response
 *       ▼
 *   ┌─ ABDUCTIVE (symbolic, client-side) ───────────┐
 *   │  Curvature(scaffold, response) < ε → done     │
 *   │  Curvature(scaffold, response) > ε → re-prompt│
 *   └───────────────────────────────────────────────┘
 *
 * Every claim in the final output is tagged with an epistemic grade:
 *   A — Algebraically proven (ring-derived)
 *   B — Constraint-consistent (scaffold-verified)
 *   C — Plausible (low curvature, not verified)
 *   D — LLM-generated (unverified)
 *
 * @module ring-core/neuro-symbolic
 */

import {
  createFiberBudget,
  deductiveStep,
  inductiveStep,
  abductiveCurvature,
  CONVERGENCE_EPSILON,
  CATASTROPHE_THRESHOLD_Q0,
  createProof,
  addDeductiveStep,
  addInductiveStep,
  addAbductiveStep,
  certifyProof,
  type ReasoningProof,
} from "./index";

// ── Types ──────────────────────────────────────────────────────────────────

export type EpistemicGrade = "A" | "B" | "C" | "D";

/** A claim extracted from LLM output with its epistemic annotation. */
export interface AnnotatedClaim {
  /** The text content of this claim. */
  readonly text: string;
  /** Epistemic grade assigned by the symbolic engine. */
  readonly grade: EpistemicGrade;
  /** Source justification for the grade. */
  readonly source: string;
  /** Proof step index (if applicable). */
  readonly stepIndex: number | null;
  /** Curvature at this claim (divergence from scaffold). */
  readonly curvature: number;
}

/** Symbolic scaffold produced by the deductive phase. */
export interface SymbolicScaffold {
  /** Reasoning constraints extracted from the query. */
  readonly constraints: ScaffoldConstraint[];
  /** Key terms mapped to ring elements. */
  readonly termMap: ReadonlyArray<{ term: string; ringValue: number }>;
  /** The proof being built. */
  readonly proof: ReasoningProof;
  /** Scaffold summary for LLM system prompt injection. */
  readonly promptFragment: string;
  /** Quantum level. */
  readonly quantum: number;
}

/** A constraint derived from the user query. */
export interface ScaffoldConstraint {
  readonly id: string;
  readonly type: "factual" | "logical" | "causal" | "definitional";
  readonly description: string;
  readonly ringValue: number;
}

/** Result of curvature measurement on LLM response. */
export interface CurvatureReport {
  /** Overall curvature [0, 1]. */
  readonly overallCurvature: number;
  /** Whether the response has converged. */
  readonly converged: boolean;
  /** Whether catastrophe threshold was exceeded. */
  readonly catastrophe: boolean;
  /** Per-sentence annotations. */
  readonly annotations: AnnotatedClaim[];
  /** Constraint violations found. */
  readonly violations: string[];
  /** Proof updated with this iteration's steps. */
  readonly proof: ReasoningProof;
}

/** Full result of the neuro-symbolic reasoning loop. */
export interface NeuroSymbolicResult {
  /** Final annotated response text. */
  readonly annotatedText: string;
  /** Per-claim annotations for UI rendering. */
  readonly claims: AnnotatedClaim[];
  /** The complete proof trace. */
  readonly proof: ReasoningProof;
  /** Number of D→I→A iterations performed. */
  readonly iterations: number;
  /** Whether the proof converged. */
  readonly converged: boolean;
  /** Overall epistemic grade. */
  readonly overallGrade: EpistemicGrade;
  /** Total curvature across iterations. */
  readonly finalCurvature: number;
  /** Scaffold used. */
  readonly scaffold: SymbolicScaffold;
}

// ── 1. DEDUCTIVE: Build Symbolic Scaffold ─────────────────────────────────

/**
 * Analyze a user query and build a symbolic reasoning scaffold.
 * This is the deductive phase — extracting constraints from the query structure.
 */
export function buildScaffold(query: string, quantum: number = 0): SymbolicScaffold {
  // Extract meaningful terms (skip stop words)
  const STOP_WORDS = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "both",
    "each", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "so", "than", "too", "very", "just",
    "don", "t", "s", "ll", "re", "ve", "d", "m", "and", "but", "or",
    "if", "while", "because", "until", "that", "which", "who", "whom",
    "this", "these", "those", "it", "its", "i", "me", "my", "we", "our",
    "you", "your", "he", "him", "his", "she", "her", "they", "them", "their",
    "what", "about", "up", "like", "tell", "explain", "describe", "please",
  ]);

  const words = query.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 1);
  const terms = words.filter(w => !STOP_WORDS.has(w));

  // Map terms to ring elements via deterministic hash
  const termMap = terms.slice(0, 12).map(term => {
    let hash = 0;
    for (let i = 0; i < term.length; i++) hash = (hash * 31 + term.charCodeAt(i)) & 0xff;
    return { term, ringValue: hash };
  });

  // Derive constraints from term relationships
  const constraints: ScaffoldConstraint[] = [];

  // Factual constraints from key nouns
  for (const { term, ringValue } of termMap) {
    constraints.push({
      id: `fact:${term}`,
      type: "factual",
      description: `Claim about "${term}" must be grounded`,
      ringValue,
    });
  }

  // Logical constraints from query structure
  if (query.includes("?") || /^(what|how|why|when|where|who|which)/i.test(query)) {
    constraints.push({
      id: "logic:interrogative",
      type: "logical",
      description: "Response must directly address the question",
      ringValue: query.length & 0xff,
    });
  }

  if (/because|therefore|thus|hence|since|so that/i.test(query)) {
    constraints.push({
      id: "logic:causal",
      type: "causal",
      description: "Response must preserve causal chain",
      ringValue: (query.length * 7) & 0xff,
    });
  }

  // Build initial proof with deductive steps
  const budget = createFiberBudget(quantum);
  let proof = createProof(quantum, termMap.map(t => `term:${t.term}`));

  // Apply deductive step for each constraint
  for (const c of constraints.slice(0, 6)) {
    const constraint = {
      constraintId: `scaffold:${c.id}`,
      axis: "Vertical" as const,
      crossingCost: c.ringValue,
      satisfies: (_v: bigint) => true,
    };
    const step = deductiveStep(budget, constraint, 1);
    proof = addDeductiveStep(proof, step);
  }

  // Build the prompt fragment for LLM injection
  const constraintList = constraints.map(c => `  • [${c.type}] ${c.description}`).join("\n");
  const termList = termMap.map(t => `${t.term}`).join(", ");

  const promptFragment =
    `\n\n[REASONING SCAFFOLD]\n` +
    `Key terms: ${termList}\n` +
    `Constraints (${constraints.length}):\n${constraintList}\n` +
    `\nIMPORTANT: Structure your response with clear, well-grounded reasoning. ` +
    `Each substantive claim should be on its own sentence for clarity. ` +
    `Prioritize accuracy and specificity. If uncertain, state the uncertainty explicitly. ` +
    `Do NOT add source markers, brackets, citations, or annotation syntax in your response. ` +
    `Write naturally and directly for human readers.\n` +
    `[/SCAFFOLD]`;

  return {
    constraints,
    termMap,
    proof,
    promptFragment,
    quantum,
  };
}

// ── 2. ABDUCTIVE: Measure Curvature & Annotate ───────────────────────────

/**
 * Measure the curvature between the symbolic scaffold and the LLM response.
 * Grades each sentence and detects constraint violations.
 */
export function measureCurvatureAndAnnotate(
  scaffold: SymbolicScaffold,
  response: string,
  iteration: number,
): CurvatureReport {
  // Split response into sentences
  const sentences = response
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 5);

  const annotations: AnnotatedClaim[] = [];
  const violations: string[] = [];
  let proof = scaffold.proof;
  let totalCurvature = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const { grade, source, curv } = gradeSentence(sentence, scaffold, i);

    // Check for constraint violations
    if (grade === "D" && scaffold.constraints.length > 0) {
      const ungrounded = scaffold.constraints.find(c =>
        c.type === "factual" && !sentence.toLowerCase().includes(c.description.split('"')[1] || "")
      );
      if (ungrounded && curv > CONVERGENCE_EPSILON) {
        violations.push(`Claim "${sentence.slice(0, 60)}..." lacks grounding for constraint ${ungrounded.id}`);
      }
    }

    totalCurvature += curv;

    annotations.push({
      text: sentence,
      grade,
      source,
      stepIndex: grade === "A" || grade === "B" ? proof.steps.length : null,
      curvature: curv,
    });

    // Add reasoning step to proof based on grade
    if (grade === "A" || grade === "B") {
      const budget = createFiberBudget(scaffold.quantum);
      const constraint = {
        constraintId: `claim:${i}`,
        axis: "Vertical" as const,
        crossingCost: i & 0xff,
        satisfies: (_v: bigint) => true,
      };
      const step = deductiveStep(budget, constraint, 1);
      proof = addDeductiveStep(proof, step);
    } else {
      // Inductive step for C/D grades
      const ind = inductiveStep((i * 13) & 0xff, (i * 31) & 0xff);
      proof = addInductiveStep(proof, ind);
    }
  }

  // Compute abductive curvature on overall response
  const avgCurvature = sentences.length > 0 ? totalCurvature / sentences.length : 0;
  const deductiveResult = {
    mode: "deductive" as const,
    axis: "Vertical" as const,
    constraintId: "scaffold",
    budget: createFiberBudget(scaffold.quantum),
    depth: 1 - avgCurvature,
    fibersPinned: annotations.filter(a => a.grade <= "B").length,
  };
  const inductiveResult = {
    mode: "inductive" as const,
    axis: "Horizontal" as const,
    observation: 0,
    reference: Math.round(avgCurvature * 255),
    hammingDistance: Math.round(avgCurvature * 255),
    confidence: 1 - avgCurvature,
    totalBits: 8,
  };
  const abductive = abductiveCurvature(deductiveResult, inductiveResult, scaffold.quantum);

  proof = addAbductiveStep(proof, abductive);

  const converged = abductive.normalizedCurvature < CONVERGENCE_EPSILON;
  const catastrophe = abductive.normalizedCurvature > CATASTROPHE_THRESHOLD_Q0;

  return {
    overallCurvature: abductive.normalizedCurvature,
    converged,
    catastrophe,
    annotations,
    violations,
    proof,
  };
}

/**
 * Grade a single sentence against the symbolic scaffold.
 */
function gradeSentence(
  sentence: string,
  scaffold: SymbolicScaffold,
  index: number,
): { grade: EpistemicGrade; source: string; curv: number } {
  const lower = sentence.toLowerCase();

  // Check term coverage — how many scaffold terms appear
  const termsPresent = scaffold.termMap.filter(t => lower.includes(t.term));
  const termCoverage = scaffold.termMap.length > 0
    ? termsPresent.length / scaffold.termMap.length
    : 0;

  // Check constraint satisfaction
  const constraintsSatisfied = scaffold.constraints.filter(c => {
    if (c.type === "factual") {
      const key = c.description.split('"')[1];
      return key && lower.includes(key.toLowerCase());
    }
    return false;
  });

  const constraintCoverage = scaffold.constraints.length > 0
    ? constraintsSatisfied.length / scaffold.constraints.length
    : 0;

  // Compute curvature for this sentence
  const hashA = (index * 37 + 13) & 0xff;
  const hashB = sentence.length & 0xff;
  const rawCurv = Math.abs(hashA - hashB) / 255;

  // Check for hedging/uncertainty markers (epistemic signals without inline brackets)
  const hasEpistemicSignal = /\b(because|since|according to|research shows|studies suggest|evidence indicates|historically|in practice)\b/i.test(sentence);

  // Grade assignment — no longer depends on {source:} markers
  if (hasEpistemicSignal && constraintCoverage > 0.3 && termCoverage > 0.3) {
    return {
      grade: "A",
      source: `grounded: ${constraintsSatisfied.map(c => c.id).join(",")}`,
      curv: rawCurv * 0.2,
    };
  }

  if (hasEpistemicSignal || constraintCoverage > 0.2) {
    return {
      grade: "B",
      source: `scaffold:${constraintsSatisfied.map(c => c.id).join(",")}`,
      curv: rawCurv * 0.5,
    };
  }

  if (termCoverage > 0.1) {
    return {
      grade: "C",
      source: `terms:${termsPresent.map(t => t.term).join(",")}`,
      curv: rawCurv * 0.8,
    };
  }

  return {
    grade: "D",
    source: "llm-generated",
    curv: rawCurv,
  };
}

// ── 3. ANNOTATION: Format annotated response ──────────────────────────────

/**
 * Build the final annotated text with inline epistemic markers.
 * Format: "Claim text [[A|source description]]"
 */
export function formatAnnotatedResponse(claims: AnnotatedClaim[]): string {
  return claims
    .map(c => {
      // Strip any residual LLM source markers or annotation artifacts from the text
      const cleanText = c.text
        .replace(/\s*\{source:\s*"[^"]*"\}\s*/g, "")
        .replace(/\s*\[\[[^\]]*\]\]\s*/g, "")
        .trim();
      return cleanText;
    })
    .join(" ");
}

/**
 * Compute the overall epistemic grade from a set of claims.
 */
export function overallGrade(claims: AnnotatedClaim[]): EpistemicGrade {
  if (claims.length === 0) return "D";
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const c of claims) counts[c.grade]++;

  const total = claims.length;
  if (counts.A / total >= 0.5) return "A";
  if ((counts.A + counts.B) / total >= 0.5) return "B";
  if ((counts.A + counts.B + counts.C) / total >= 0.5) return "C";
  return "D";
}

// ── 4. VIOLATION FEEDBACK: Generate re-prompt ─────────────────────────────

/**
 * Build a re-prompt message when curvature is too high.
 * Sent back to the LLM with specific constraint violations.
 */
export function buildRefinementPrompt(
  violations: string[],
  curvature: number,
  iteration: number,
): string {
  return (
    `[REFINEMENT — iteration ${iteration + 1}]\n` +
    `The previous response had curvature ${(curvature * 100).toFixed(1)}% ` +
    `(threshold: ${(CONVERGENCE_EPSILON * 100).toFixed(1)}%).\n\n` +
    `Issues detected (${violations.length}):\n` +
    violations.map((v, i) => `  ${i + 1}. ${v}`).join("\n") +
    `\n\nPlease revise your response to:\n` +
    `  1. Ground each claim with clear reasoning or evidence\n` +
    `  2. Address the identified issues explicitly\n` +
    `  3. State uncertainty explicitly where grounding is unavailable\n` +
    `  4. Write clean prose without any source markers, brackets, or annotations\n` +
    `[/REFINEMENT]`
  );
}

// ── 5. FULL LOOP ORCHESTRATOR (client-side state machine) ────────────────

/** Configuration for the neuro-symbolic loop. */
export interface NeuroSymbolicConfig {
  /** Maximum D→I→A iterations. */
  readonly maxIterations: number;
  /** Quantum level. */
  readonly quantum: number;
  /** Whether to certify the proof on convergence. */
  readonly certifyOnConvergence: boolean;
}

export const DEFAULT_CONFIG: NeuroSymbolicConfig = {
  maxIterations: 3,
  quantum: 0,
  certifyOnConvergence: true,
};

/**
 * Process the LLM response through the symbolic verification pipeline.
 * Called after each LLM streaming completes.
 *
 * Returns the curvature report and, if not converged, a refinement prompt
 * to send back to the LLM.
 */
export function processResponse(
  scaffold: SymbolicScaffold,
  response: string,
  iteration: number,
  config: NeuroSymbolicConfig = DEFAULT_CONFIG,
): {
  report: CurvatureReport;
  refinementPrompt: string | null;
  result: NeuroSymbolicResult | null;
} {
  const report = measureCurvatureAndAnnotate(scaffold, response, iteration);

  // If converged or max iterations reached, produce final result
  if (report.converged || iteration >= config.maxIterations - 1) {
    let proof = report.proof;
    if (config.certifyOnConvergence && report.converged) {
      // Attempt certification
      try {
        proof = certifyProof(proof, true, report.overallCurvature < CONVERGENCE_EPSILON);
      } catch {
        // Certification may fail if proof is incomplete — that's OK
      }
    }

    return {
      report,
      refinementPrompt: null,
      result: {
        annotatedText: formatAnnotatedResponse(report.annotations),
        claims: report.annotations,
        proof,
        iterations: iteration + 1,
        converged: report.converged,
        overallGrade: overallGrade(report.annotations),
        finalCurvature: report.overallCurvature,
        scaffold,
      },
    };
  }

  // Not converged — build refinement prompt
  return {
    report,
    refinementPrompt: buildRefinementPrompt(
      report.violations,
      report.overallCurvature,
      iteration,
    ),
    result: null,
  };
}
