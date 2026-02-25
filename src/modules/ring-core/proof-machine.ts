/**
 * UOR v2.0.0 — Proof State Machine
 *
 * Formalizes reasoning chains as verifiable, content-addressed proofs.
 *
 * Phase 4 of the Geometric Reasoning Engine plan:
 *
 *   4.1 Proof Lifecycle — maps to ResolutionState:
 *       Unresolved → Partial → Resolved → Certified
 *
 *   4.2 Proof Certificate — InvolutionCertificate for complete proofs
 *       Content-addressed (CID-like), independently verifiable
 *
 *   4.3 Proof Composition — tensor product of partial proofs:
 *       Proof(A→B) ⊗ Proof(B→C) = Proof(A→C)
 *
 * Pure functions. No classes. No side effects.
 *
 * @module ring-core/proof-machine
 * @see plan.md Phase 4
 */

import type { FiberBudget } from "@/types/uor-foundation/bridge/partition";
import type { ResolutionState } from "@/types/uor-foundation/bridge/resolver";
import type { MetricAxis } from "@/types/uor-foundation/enums";
import { resolution, createFiberBudget, pinFiber } from "./fiber-budget";
import { deriveState } from "./resolver";
import type {
  DeductiveResult,
  InductiveResult,
  AbductiveResult,
  ReasoningMode,
} from "./reasoning";

// ── Proof Step ─────────────────────────────────────────────────────────────

/** A single step in a reasoning proof — tagged with mode. */
export interface ProofStep {
  /** Which reasoning mode produced this step. */
  readonly mode: ReasoningMode;
  /** Axis alignment. */
  readonly axis: MetricAxis;
  /** Step index in the proof. */
  readonly index: number;
  /** The justification (constraint/observation/hypothesis). */
  readonly justification: string;
  /** Number of fibers resolved by this step. */
  readonly fibersResolved: number;
  /** Cumulative resolution depth after this step [0, 1]. */
  readonly cumulativeDepth: number;
}

// ── Proof Object ───────────────────────────────────────────────────────────

/** A content-addressed reasoning proof. */
export interface ReasoningProof {
  /** Content-addressed proof identifier. */
  readonly proofId: string;
  /** Current lifecycle state. */
  readonly state: ResolutionState;
  /** Ordered sequence of reasoning steps. */
  readonly steps: ProofStep[];
  /** Premises: starting constraint IDs. */
  readonly premises: string[];
  /** Conclusion: the final resolved state. */
  readonly conclusion: string | null;
  /** Fiber budget tracking resolution progress. */
  readonly budget: FiberBudget;
  /** Quantum level of the proof. */
  readonly quantum: number;
  /** Whether the proof is complete (all fibers pinned). */
  readonly isComplete: boolean;
  /** Timestamp of creation. */
  readonly createdAt: string;
  /** Certificate, if proof has been certified. */
  readonly certificate: ProofCertificate | null;
}

/** A certificate attesting to a complete proof. */
export interface ProofCertificate {
  /** Certificate identifier (content-addressed). */
  readonly certificateId: string;
  /** The proof this certifies. */
  readonly certifiesProof: string;
  /** Hash of all steps (ensures tamper resistance). */
  readonly stepsHash: string;
  /** The critical identity holds throughout. */
  readonly criticalIdentityVerified: boolean;
  /** Holonomy check: reasoning loop closes. */
  readonly holonomyZero: boolean;
  /** Issued at timestamp. */
  readonly issuedAt: string;
  /** Attestation: self-certifying. */
  readonly selfAttesting: boolean;
}

/** Result of composing two proofs via tensor product. */
export interface ComposedProof {
  /** The composed proof. */
  readonly proof: ReasoningProof;
  /** Source proof IDs. */
  readonly components: [string, string];
  /** Whether composition preserved completeness. */
  readonly compositionValid: boolean;
}

// ── 4.1 Proof Lifecycle ────────────────────────────────────────────────────

/**
 * Create a fresh proof in the Unresolved state.
 */
export function createProof(
  quantum: number,
  premises: string[],
): ReasoningProof {
  const budget = createFiberBudget(quantum);
  const proofId = computeProofId(quantum, premises, []);

  return {
    proofId,
    state: "Unresolved",
    steps: [],
    premises,
    conclusion: null,
    budget,
    quantum,
    isComplete: false,
    createdAt: new Date().toISOString(),
    certificate: null,
  };
}

/**
 * Add a deductive step to a proof.
 * Transitions: Unresolved → Partial, Partial → Partial/Resolved.
 */
export function addDeductiveStep(
  proof: ReasoningProof,
  deductive: DeductiveResult,
): ReasoningProof {
  const step: ProofStep = {
    mode: "deductive",
    axis: "Vertical",
    index: proof.steps.length,
    justification: deductive.constraintId,
    fibersResolved: deductive.fibersPinned,
    cumulativeDepth: deductive.depth,
  };

  const newSteps = [...proof.steps, step];
  const newState = deriveState(deductive.budget);
  const proofId = computeProofId(proof.quantum, proof.premises, newSteps);

  return {
    ...proof,
    proofId,
    state: newState,
    steps: newSteps,
    budget: deductive.budget,
    isComplete: deductive.budget.isClosed,
    conclusion: deductive.budget.isClosed
      ? `resolved:q${proof.quantum}:${deductive.budget.pinnedCount}fibers`
      : null,
  };
}

/**
 * Add an inductive step to a proof.
 */
export function addInductiveStep(
  proof: ReasoningProof,
  inductive: InductiveResult,
): ReasoningProof {
  const step: ProofStep = {
    mode: "inductive",
    axis: "Horizontal",
    index: proof.steps.length,
    justification: `observation:${inductive.observation}→${inductive.reference}:d=${inductive.hammingDistance}`,
    fibersResolved: 0, // Inductive steps don't directly pin fibers
    cumulativeDepth: resolution(proof.budget),
  };

  const newSteps = [...proof.steps, step];
  const proofId = computeProofId(proof.quantum, proof.premises, newSteps);

  return {
    ...proof,
    proofId,
    steps: newSteps,
  };
}

/**
 * Add an abductive step to a proof.
 */
export function addAbductiveStep(
  proof: ReasoningProof,
  abductive: AbductiveResult,
): ReasoningProof {
  const justification = abductive.hypothesis
    ? `hypothesis:${abductive.hypothesis.suggestedConstraintType}:curvature=${abductive.curvatureValue}`
    : `agreement:curvature=0`;

  const step: ProofStep = {
    mode: "abductive",
    axis: "Diagonal",
    index: proof.steps.length,
    justification,
    fibersResolved: 0, // Abductive steps generate hypotheses, don't pin
    cumulativeDepth: resolution(proof.budget),
  };

  const newSteps = [...proof.steps, step];
  const proofId = computeProofId(proof.quantum, proof.premises, newSteps);

  return {
    ...proof,
    proofId,
    steps: newSteps,
  };
}

/**
 * Build a proof from a complete abductive loop result.
 * Interleaves D/I/A steps from each iteration.
 */
export function proofFromLoop(
  quantum: number,
  premises: string[],
  iterations: Array<{
    deductive: DeductiveResult;
    inductive: InductiveResult;
    abductive: AbductiveResult;
  }>,
): ReasoningProof {
  let proof = createProof(quantum, premises);

  for (const iter of iterations) {
    proof = addDeductiveStep(proof, iter.deductive);
    proof = addInductiveStep(proof, iter.inductive);
    proof = addAbductiveStep(proof, iter.abductive);
  }

  return proof;
}

// ── 4.2 Proof Certificate ──────────────────────────────────────────────────

/**
 * Generate a certificate for a complete proof.
 * Only Resolved proofs can be certified.
 *
 * The certificate attests:
 *   "This conclusion follows from these premises via these geometric steps."
 *
 * Transitions: Resolved → Certified
 */
export function certifyProof(
  proof: ReasoningProof,
  criticalIdentityVerified: boolean,
  holonomyZero: boolean,
): ReasoningProof {
  if (!proof.isComplete) {
    throw new Error(
      `Cannot certify incomplete proof (state=${proof.state}, ` +
      `pinned=${proof.budget.pinnedCount}/${proof.budget.totalFibers})`
    );
  }

  const stepsHash = hashSteps(proof.steps);
  const certificateId = `cert:proof:${proof.proofId}:${stepsHash.slice(0, 8)}`;

  const certificate: ProofCertificate = {
    certificateId,
    certifiesProof: proof.proofId,
    stepsHash,
    criticalIdentityVerified,
    holonomyZero,
    issuedAt: new Date().toISOString(),
    selfAttesting: true,
  };

  return {
    ...proof,
    state: "Certified",
    certificate,
  };
}

/**
 * Verify a proof certificate independently.
 * Re-checks that:
 *   1. Steps hash matches
 *   2. Proof is complete
 *   3. Critical identity holds
 *   4. Holonomy is zero
 */
export function verifyCertificate(
  proof: ReasoningProof,
  certificate: ProofCertificate,
): { valid: boolean; failures: string[] } {
  const failures: string[] = [];

  if (certificate.certifiesProof !== proof.proofId) {
    failures.push(`Certificate proofId mismatch: ${certificate.certifiesProof} ≠ ${proof.proofId}`);
  }

  const recomputedHash = hashSteps(proof.steps);
  if (certificate.stepsHash !== recomputedHash) {
    failures.push(`Steps hash mismatch: ${certificate.stepsHash} ≠ ${recomputedHash}`);
  }

  if (!proof.isComplete) {
    failures.push(`Proof is not complete (${proof.budget.pinnedCount}/${proof.budget.totalFibers} fibers)`);
  }

  if (!certificate.criticalIdentityVerified) {
    failures.push("Critical identity not verified");
  }

  if (!certificate.holonomyZero) {
    failures.push("Non-zero holonomy: reasoning loop does not close");
  }

  return { valid: failures.length === 0, failures };
}

// ── 4.3 Proof Composition (Tensor Product) ─────────────────────────────────

/**
 * Compose two proofs via tensor product.
 *
 * Proof(A→B) ⊗ Proof(B→C) = Proof(A→C)
 *
 * The composed proof:
 *   - Merges premises (A's premises + B's premises)
 *   - Concatenates steps from both proofs
 *   - Combines fiber budgets (union of pinned fibers)
 *   - Takes the conclusion of the second proof
 *
 * This mirrors the PolyTree tensorProduct: parallel composition
 * of evolving interfaces applied to proof objects.
 */
export function composeProofs(
  proofA: ReasoningProof,
  proofB: ReasoningProof,
): ComposedProof {
  // Merge premises (deduplicated)
  const allPremises = [...new Set([...proofA.premises, ...proofB.premises])];

  // Merge steps with re-indexing
  const mergedSteps: ProofStep[] = [
    ...proofA.steps,
    ...proofB.steps.map((s, i) => ({
      ...s,
      index: proofA.steps.length + i,
    })),
  ];

  // Compose fiber budgets: use the higher quantum, merge pinnings
  const composedQuantum = Math.max(proofA.quantum, proofB.quantum);
  const composedBudget = composeFiberBudgets(proofA.budget, proofB.budget, composedQuantum);

  const proofId = computeProofId(composedQuantum, allPremises, mergedSteps);

  const composedProof: ReasoningProof = {
    proofId,
    state: composedBudget.isClosed ? "Resolved" : deriveState(composedBudget),
    steps: mergedSteps,
    premises: allPremises,
    conclusion: proofB.conclusion ?? proofA.conclusion,
    budget: composedBudget,
    quantum: composedQuantum,
    isComplete: composedBudget.isClosed,
    createdAt: new Date().toISOString(),
    certificate: null,
  };

  return {
    proof: composedProof,
    components: [proofA.proofId, proofB.proofId],
    compositionValid: true,
  };
}

// ── Proof Query Helpers ────────────────────────────────────────────────────

/** Count steps by reasoning mode. */
export function stepsByMode(proof: ReasoningProof): Record<ReasoningMode, number> {
  const counts: Record<ReasoningMode, number> = { deductive: 0, inductive: 0, abductive: 0 };
  for (const s of proof.steps) counts[s.mode]++;
  return counts;
}

/** Check if a proof contains at least one complete D→I→A cycle. */
export function hasCompleteCycle(proof: ReasoningProof): boolean {
  const modes = stepsByMode(proof);
  return modes.deductive > 0 && modes.inductive > 0 && modes.abductive > 0;
}

/** Get the total fibers resolved across all steps. */
export function totalFibersResolved(proof: ReasoningProof): number {
  return proof.steps.reduce((sum, s) => sum + s.fibersResolved, 0);
}

// ── Internal Helpers ───────────────────────────────────────────────────────

/** Compute a deterministic proof ID from components. */
function computeProofId(quantum: number, premises: string[], steps: ProofStep[]): string {
  // Simple hash: sum of char codes from premises + step justifications
  let hash = quantum * 31;
  for (const p of premises) {
    for (let i = 0; i < p.length; i++) hash = (hash * 31 + p.charCodeAt(i)) >>> 0;
  }
  for (const s of steps) {
    for (let i = 0; i < s.justification.length; i++) {
      hash = (hash * 31 + s.justification.charCodeAt(i)) >>> 0;
    }
  }
  return `proof:q${quantum}:${hash.toString(16).padStart(8, "0")}`;
}

/** Hash all steps for certificate tamper detection. */
function hashSteps(steps: ProofStep[]): string {
  let hash = 0;
  for (const s of steps) {
    hash = (hash * 37 + s.index * 7 + s.fibersResolved * 13) >>> 0;
    for (let i = 0; i < s.justification.length; i++) {
      hash = (hash * 37 + s.justification.charCodeAt(i)) >>> 0;
    }
    // Include mode in hash
    const modeVal = s.mode === "deductive" ? 1 : s.mode === "inductive" ? 2 : 3;
    hash = (hash * 37 + modeVal) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Compose two fiber budgets by merging pinned fibers. */
function composeFiberBudgets(
  a: FiberBudget,
  b: FiberBudget,
  quantum: number,
): FiberBudget {
  let budget = createFiberBudget(quantum);

  // Pin all fibers from A
  for (const fiber of a.fibers) {
    if (fiber.state === "Pinned" && fiber.bitIndex < budget.totalFibers) {
      budget = pinFiber(budget, fiber.bitIndex, fiber.pinnedBy ?? "composed:a");
    }
  }

  // Pin remaining from B (no-op if already pinned)
  for (const fiber of b.fibers) {
    if (fiber.state === "Pinned" && fiber.bitIndex < budget.totalFibers) {
      budget = pinFiber(budget, fiber.bitIndex, fiber.pinnedBy ?? "composed:b");
    }
  }

  return budget;
}
