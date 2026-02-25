/**
 * UOR v2.0.0 — Abductive Loop Engine
 *
 * Wires neural inference into the geometric resolver, creating
 * a closed-loop D→I→A reasoning cycle:
 *
 *   Neural output → Horizontal Observable → Resolver → Curvature → Hypothesis
 *         ↑                                                           │
 *         └───────────── new constraint from hypothesis ──────────────┘
 *
 * Phase 3 of the Geometric Reasoning Engine plan.
 *
 * Architecture:
 *   3.1 Neural → Observable (Horizontal)
 *       AI inference output CID bytes → HammingMetric observable
 *   3.2 Symbolic → Observable (Vertical)
 *       Resolver fiber budget → StratumObservable
 *   3.3 Curvature Measurement (Diagonal)
 *       Compare Vertical and Horizontal → abductiveCurvature
 *   3.4 Hypothesis Generation
 *       Non-zero curvature → RefinementSuggestion → new constraint
 *
 * Pure functions. No classes. No side effects.
 *
 * @module ring-core/abductive-loop
 * @see plan.md Phase 3
 */

import type { MetricAxis } from "@/types/uor-foundation/enums";
import type { FiberBudget } from "@/types/uor-foundation/bridge/partition";
import { createFiberBudget, resolution } from "./fiber-budget";
import { hammingMetric, stratum, curvature as curvatureObs } from "./observable-factory";
import {
  deductiveStep,
  inductiveStep,
  abductiveCurvature,
  CONVERGENCE_EPSILON,
  type DeductiveResult,
  type InductiveResult,
  type AbductiveResult,
  type AbductiveHypothesis,
} from "./reasoning";
import { residueConstraint, depthConstraint, compositeConstraint } from "./constraint";
import { deriveState } from "./resolver";
import type { ResolutionState } from "@/types/uor-foundation/bridge/resolver";

// ── Types ──────────────────────────────────────────────────────────────────

/** A neural inference observation projected onto the ring. */
export interface NeuralObservation {
  /** Raw output bytes (projected from CID or output). */
  readonly outputBytes: number;
  /** Model identifier. */
  readonly modelId: string;
  /** Inference time in ms. */
  readonly inferenceTimeMs: number;
  /** Whether GPU was used. */
  readonly gpuAccelerated: boolean;
}

/** A symbolic prediction from the resolver. */
export interface SymbolicPrediction {
  /** The resolved/predicted value from constraint propagation. */
  readonly predictedValue: number;
  /** Current fiber budget state. */
  readonly budget: FiberBudget;
  /** Current resolution state. */
  readonly state: ResolutionState;
}

/** Dashboard panel registration for the tri-axis display. */
export interface ObservableRegistration {
  readonly axis: MetricAxis;
  readonly typeName: string;
  readonly value: number;
  readonly quantum: number;
  readonly metadata: Record<string, number | string | boolean>;
}

/** A single iteration of the abductive loop. */
export interface AbductiveIteration {
  readonly index: number;
  /** Horizontal: neural observation as observable. */
  readonly neuralObservable: ObservableRegistration;
  /** Vertical: symbolic prediction as observable. */
  readonly symbolicObservable: ObservableRegistration;
  /** Diagonal: curvature between the two. */
  readonly curvatureObservable: ObservableRegistration;
  /** Deductive result from constraint application. */
  readonly deductive: DeductiveResult;
  /** Inductive result from neural observation. */
  readonly inductive: InductiveResult;
  /** Abductive result from curvature measurement. */
  readonly abductive: AbductiveResult;
  /** Resolution state after this iteration. */
  readonly resolutionState: ResolutionState;
  /** Whether this iteration converged (curvature ≈ 0). */
  readonly converged: boolean;
}

/** Complete abductive loop result. */
export interface AbductiveLoopResult {
  /** All iterations performed. */
  readonly iterations: AbductiveIteration[];
  /** Final fiber budget state. */
  readonly finalBudget: FiberBudget;
  /** Final resolution state. */
  readonly finalState: ResolutionState;
  /** Whether the loop converged overall. */
  readonly converged: boolean;
  /** Total iterations performed. */
  readonly totalIterations: number;
  /** All observable registrations for dashboard rendering. */
  readonly observables: ObservableRegistration[];
}

// ── 3.1 Neural → Observable (Horizontal) ───────────────────────────────────

/**
 * Project a neural inference result onto the Horizontal axis as a HammingMetric.
 *
 * The output bytes of the inference are treated as a ring element,
 * and Hamming distance measures similarity to a reference element.
 */
export function neuralToObservable(
  observation: NeuralObservation,
  reference: number,
  quantum = 0,
): ObservableRegistration {
  const hm = hammingMetric(observation.outputBytes, reference, quantum);
  return {
    axis: "Horizontal",
    typeName: "HammingMetric",
    value: observation.outputBytes,
    quantum,
    metadata: {
      distance: hm.distance(),
      reference: hm.reference(),
      modelId: observation.modelId,
      inferenceTimeMs: observation.inferenceTimeMs,
      gpuAccelerated: observation.gpuAccelerated,
    },
  };
}

// ── 3.2 Symbolic → Observable (Vertical) ───────────────────────────────────

/**
 * Project a symbolic prediction (resolver state) onto the Vertical axis
 * as a StratumObservable.
 *
 * The fiber budget's resolution depth becomes the stratum value.
 */
export function symbolicToObservable(
  prediction: SymbolicPrediction,
  quantum = 0,
): ObservableRegistration {
  const st = stratum(prediction.predictedValue, quantum);
  return {
    axis: "Vertical",
    typeName: "StratumObservable",
    value: prediction.predictedValue,
    quantum,
    metadata: {
      resolutionRatio: resolution(prediction.budget),
      pinnedCount: prediction.budget.pinnedCount,
      totalFibers: prediction.budget.totalFibers,
      state: prediction.state,
      stratumVector: st.stratumVector().join(","),
    },
  };
}

// ── 3.3 Curvature Measurement (Diagonal) ───────────────────────────────────

/**
 * Measure curvature between Vertical (symbolic) and Horizontal (neural)
 * observables. Returns a Diagonal observable registration.
 */
export function measureCurvature(
  deductive: DeductiveResult,
  inductive: InductiveResult,
  quantum = 0,
): { observable: ObservableRegistration; abductive: AbductiveResult } {
  const abductive = abductiveCurvature(deductive, inductive, quantum);

  const curv = curvatureObs(
    inductive.observation,
    abductive.curvatureValue,
    quantum,
  );

  const observable: ObservableRegistration = {
    axis: "Diagonal",
    typeName: "CurvatureObservable",
    value: inductive.observation,
    quantum,
    metadata: {
      curvature: curv.curvature(),
      normalizedCurvature: abductive.normalizedCurvature,
      isCatastrophe: abductive.isCatastrophe,
      holonomy: abductive.holonomyValue,
      hasHypothesis: abductive.hypothesis !== null,
    },
  };

  return { observable, abductive };
}

// ── 3.4 Hypothesis → Constraint ────────────────────────────────────────────

/**
 * Convert an abductive hypothesis into a constraint that can be applied
 * in the next deductive cycle. This closes the loop:
 *   hypothesis → constraint → deduction → new observation → ...
 */
export function hypothesisToConstraint(
  hypothesis: AbductiveHypothesis,
  iterationIndex: number,
) {
  const id = `hypothesis:abductive:iter${iterationIndex}`;

  switch (hypothesis.suggestedConstraintType) {
    case "ResidueConstraint":
      // Use expected resolutions to determine modulus
      return residueConstraint(
        Math.max(2, hypothesis.expectedResolutions),
        0,
        id,
      );
    case "DepthConstraint":
      return depthConstraint(0, hypothesis.expectedResolutions, id);
    case "CompositeConstraint":
      // Catastrophe-level: combine residue + depth for stronger refinement
      return compositeConstraint(
        "AND",
        [
          residueConstraint(2, 0, `${id}:residue`),
          depthConstraint(0, Math.max(2, hypothesis.expectedResolutions), `${id}:depth`),
        ],
        id,
      );
    default:
      return residueConstraint(2, 0, id);
  }
}

// ── Abductive Loop ─────────────────────────────────────────────────────────

/**
 * Run the complete abductive loop: D→I→A→D→... until convergence or max iterations.
 *
 * This is the core of Phase 3: the closed-loop reasoning engine where:
 * 1. Deductive step applies constraints (pins fibers)
 * 2. Inductive step observes neural output (measures similarity)
 * 3. Abductive step measures curvature (generates hypotheses)
 * 4. Hypothesis becomes a new constraint for the next cycle
 *
 * The loop converges when curvature → 0 (symbolic and neural agree).
 *
 * @param quantum Ring quantum level
 * @param neuralObservations Neural inference results (one per iteration)
 * @param initialConstraint Starting constraint for the first deductive step
 * @param referenceValue The symbolic "ground truth" to compare against
 * @param maxIterations Maximum iterations before forced stop
 */
export function abductiveLoop(
  quantum: number,
  neuralObservations: NeuralObservation[],
  initialConstraint: {
    constraintId: string;
    axis: MetricAxis;
    crossingCost: number;
    satisfies: (value: bigint) => boolean;
  },
  initialPins: number,
  referenceValue: number,
  maxIterations?: number,
): AbductiveLoopResult {
  const max = maxIterations ?? neuralObservations.length;
  const iterations: AbductiveIteration[] = [];
  const allObservables: ObservableRegistration[] = [];
  let budget = createFiberBudget(quantum);
  let currentConstraint = initialConstraint;
  let currentPins = initialPins;
  let converged = false;

  for (let i = 0; i < Math.min(max, neuralObservations.length); i++) {
    const obs = neuralObservations[i];

    // ── Step 1: Deductive (Vertical) ─────────────────────────────────
    const d = deductiveStep(budget, currentConstraint, currentPins);

    // ── Step 2: Inductive (Horizontal) ───────────────────────────────
    const ind = inductiveStep(obs.outputBytes, referenceValue, quantum);

    // ── Step 3: Curvature (Diagonal) ─────────────────────────────────
    const { observable: curvObs, abductive: abd } = measureCurvature(d, ind, quantum);

    // Register observables for dashboard
    const neuralObs = neuralToObservable(obs, referenceValue, quantum);
    const symbPred: SymbolicPrediction = {
      predictedValue: referenceValue,
      budget: d.budget,
      state: deriveState(d.budget),
    };
    const symbObs = symbolicToObservable(symbPred, quantum);

    allObservables.push(neuralObs, symbObs, curvObs);

    // Build iteration record
    const iterConverged = abd.normalizedCurvature < CONVERGENCE_EPSILON;
    iterations.push({
      index: i,
      neuralObservable: neuralObs,
      symbolicObservable: symbObs,
      curvatureObservable: curvObs,
      deductive: d,
      inductive: ind,
      abductive: abd,
      resolutionState: deriveState(d.budget),
      converged: iterConverged,
    });

    // Update budget for next cycle
    budget = d.budget;

    if (iterConverged) {
      converged = true;
      break;
    }

    // ── Step 4: Hypothesis → Constraint for next cycle ───────────────
    if (abd.hypothesis) {
      currentConstraint = hypothesisToConstraint(abd.hypothesis, i);
      currentPins = Math.max(1, abd.hypothesis.expectedResolutions);
    }
  }

  return {
    iterations,
    finalBudget: budget,
    finalState: deriveState(budget),
    converged,
    totalIterations: iterations.length,
    observables: allObservables,
  };
}

// ── Convenience: Single-shot inference → reasoning ─────────────────────────

/**
 * Project an AiInferenceResult-like object into a NeuralObservation.
 *
 * Takes the outputCid string, hashes it to a ring element, and wraps
 * it as a NeuralObservation ready for the abductive loop.
 */
export function inferenceToObservation(
  outputCid: string,
  modelId: string,
  inferenceTimeMs: number,
  gpuAccelerated: boolean,
  quantum = 0,
): NeuralObservation {
  // Project CID string onto ring: sum of char codes mod 2^(8*(q+1))
  const modulus = 1 << (8 * (quantum + 1));
  let hash = 0;
  for (let i = 0; i < outputCid.length; i++) {
    hash = (hash + outputCid.charCodeAt(i)) % modulus;
  }

  return {
    outputBytes: hash,
    modelId,
    inferenceTimeMs,
    gpuAccelerated,
  };
}
