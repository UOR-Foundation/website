/**
 * UOR v2.0.0 — Reasoning Strategy Scheduler
 *
 * Phase 5: Coinductive PolyTrees as strategy schedulers for the
 * three geometric reasoning modes.
 *
 * Each traversal strategy is a PolyTree TransitionFn:
 *   - Depth-first deductive (Vertical) — dig deep along one constraint chain
 *   - Breadth-first inductive (Horizontal) — fan out across observations
 *   - Abductive spiral (Diagonal) — alternating D/I with increasing radius
 *
 * The composed scheduler uses tensorProduct to run strategies in parallel
 * and coproduct to select between them based on curvature signals.
 *
 * Pure functions. No classes. No side effects.
 *
 * @module ring-core/strategy-scheduler
 * @see plan.md Phase 5
 */

import type { MetricAxis } from "@/types/uor-foundation/enums";
import type { FiberBudget } from "@/types/uor-foundation/bridge/partition";
import type { Polynomial, PolyTree, TransitionContext, InteractionStep } from "@/modules/uns/core/hologram/polytree";
import type { HologramSpec, ProjectionInput } from "@/modules/uns/core/hologram/index";
import { constantTree, evolvingTree, tensorProduct, coproduct, ZERO_TREE } from "@/modules/uns/core/hologram/polytree";
import { createFiberBudget } from "./fiber-budget";
import { residueConstraint, depthConstraint } from "./constraint";
import {
  deductiveStep, inductiveStep, abductiveCurvature,
  CONVERGENCE_EPSILON,
  type DeductiveResult, type InductiveResult, type AbductiveResult,
  type ReasoningMode,
} from "./reasoning";
import { deriveState } from "./resolver";
import type { ResolutionState } from "@/types/uor-foundation/bridge/resolver";

// ── Strategy Types ─────────────────────────────────────────────────────────

/** A reasoning strategy node: what to execute at this step. */
export interface StrategyNode {
  /** Which reasoning mode this node schedules. */
  readonly mode: ReasoningMode;
  /** Axis alignment. */
  readonly axis: MetricAxis;
  /** Priority (lower = execute first within same depth). */
  readonly priority: number;
  /** Depth in the strategy tree. */
  readonly depth: number;
  /** Label for debugging/visualization. */
  readonly label: string;
}

/** Result of executing a strategy step. */
export interface StrategyStepResult {
  readonly node: StrategyNode;
  readonly deductive?: DeductiveResult;
  readonly inductive?: InductiveResult;
  readonly abductive?: AbductiveResult;
  readonly budget: FiberBudget;
  readonly resolutionState: ResolutionState;
}

/** Complete schedule execution result. */
export interface ScheduleResult {
  readonly steps: StrategyStepResult[];
  readonly finalBudget: FiberBudget;
  readonly finalState: ResolutionState;
  readonly converged: boolean;
  readonly strategyUsed: string;
  readonly totalSteps: number;
}

/** Configuration for a scheduling run. */
export interface ScheduleConfig {
  readonly quantum: number;
  readonly maxDepth: number;
  readonly observations: number[];
  readonly reference: number;
  readonly initialModulus: number;
}

// ── Polynomial Constructors for Reasoning ──────────────────────────────────

/** Build a Polynomial representing a deductive (Vertical) step. */
function deductivePoly(depth: number): Polynomial {
  return {
    label: `D:depth=${depth}`,
    positionCount: 1,       // One output: the pinned fibers
    directionCounts: [2],   // Feedback: converged(0) or continue(1)
    fidelity: "lossless",
  };
}

/** Build a Polynomial representing an inductive (Horizontal) step. */
function inductivePoly(breadth: number): Polynomial {
  return {
    label: `I:breadth=${breadth}`,
    positionCount: breadth,  // Fan-out: one per candidate observation
    directionCounts: Array(breadth).fill(1), // Each observation returns confidence
    fidelity: "lossless",
  };
}

/** Build a Polynomial representing an abductive (Diagonal) step. */
function abductivePoly(radius: number): Polynomial {
  return {
    label: `A:radius=${radius}`,
    positionCount: 1,       // One output: the curvature measurement
    directionCounts: [3],   // Feedback: converged(0), refine(1), catastrophe(2)
    fidelity: "lossy",      // Abduction is inherently lossy (hypothesis)
  };
}

// ── 5.1 Depth-First Deductive Strategy ─────────────────────────────────────

/**
 * Build a depth-first deductive PolyTree.
 *
 * Strategy: dig deep along one constraint chain. At each node:
 *   position 0 = apply constraint
 *   direction 0 = converged → stop (constant tree)
 *   direction 1 = continue → recurse deeper with tighter constraint
 *
 * This mirrors classical deduction: each step narrows the search space.
 * The tree is coinductive: it can be infinitely deep (truncated by maxDepth).
 */
export function depthFirstDeductive(maxDepth: number): PolyTree {
  return buildDFD(0, maxDepth);
}

function buildDFD(depth: number, maxDepth: number): PolyTree {
  if (depth >= maxDepth) {
    const terminalSpec: HologramSpec = {
      project: () => "terminal",
      fidelity: "lossless",
      spec: "urn:uor:strategy:terminal",
    };
    return constantTree("D:terminal", terminalSpec);
  }

  const poly = deductivePoly(depth);
  const transitions = new Map<number, (ctx: TransitionContext) => PolyTree>();

  // direction 0 = converged → terminal constant tree
  transitions.set(0, () => ZERO_TREE);

  // direction 1 = continue → go deeper
  transitions.set(1, () => buildDFD(depth + 1, maxDepth));

  return evolvingTree(poly, transitions, ZERO_TREE);
}

// ── 5.2 Breadth-First Inductive Strategy ───────────────────────────────────

/**
 * Build a breadth-first inductive PolyTree.
 *
 * Strategy: fan out across observations at each level.
 *   position i = compare observation i against reference
 *   direction 0 = accept (high confidence) → narrow search
 *
 * This mirrors induction: gather evidence breadth-first before concluding.
 * Each level widens or narrows the fan-out based on confidence scores.
 */
export function breadthFirstInductive(breadth: number, maxDepth: number): PolyTree {
  return buildBFI(breadth, 0, maxDepth);
}

function buildBFI(breadth: number, depth: number, maxDepth: number): PolyTree {
  if (depth >= maxDepth || breadth <= 0) return ZERO_TREE;

  const poly = inductivePoly(breadth);
  const transitions = new Map<number, (ctx: TransitionContext) => PolyTree>();

  // direction 0 = high confidence → narrow breadth for next level
  transitions.set(0, () => buildBFI(Math.max(1, Math.floor(breadth / 2)), depth + 1, maxDepth));

  return evolvingTree(poly, transitions, ZERO_TREE);
}

// ── 5.3 Abductive Spiral Strategy ──────────────────────────────────────────

/**
 * Build an abductive spiral PolyTree.
 *
 * Strategy: alternate between D and I steps with increasing radius.
 * At each spiral turn:
 *   - Even depth: deductive step (constrain)
 *   - Odd depth: inductive step (observe)
 *   - Curvature measurement at each turn
 *
 * direction 0 = converged (curvature ≈ 0) → stop
 * direction 1 = refine → continue spiral with tighter radius
 * direction 2 = catastrophe → phase transition (jump to depth-first)
 *
 * This mirrors abduction: spiral between evidence and theory until convergence.
 */
export function abductiveSpiral(maxRadius: number): PolyTree {
  return buildSpiral(1, 0, maxRadius);
}

function buildSpiral(radius: number, depth: number, maxRadius: number): PolyTree {
  if (depth >= maxRadius * 2) return ZERO_TREE;

  const poly = abductivePoly(radius);
  const transitions = new Map<number, (ctx: TransitionContext) => PolyTree>();

  // direction 0 = converged → terminal
  transitions.set(0, () => ZERO_TREE);

  // direction 1 = refine → continue spiral
  transitions.set(1, () => buildSpiral(radius + 1, depth + 1, maxRadius));

  // direction 2 = catastrophe → switch to depth-first deductive
  transitions.set(2, () => depthFirstDeductive(maxRadius - depth));

  return evolvingTree(poly, transitions, ZERO_TREE);
}

// ── 5.4 Composed Scheduler ─────────────────────────────────────────────────

/**
 * Build the composed reasoning scheduler.
 *
 * Uses PolyTree tensor product to run deductive and inductive strategies
 * in parallel, with the abductive spiral as the meta-strategy that selects
 * between them based on curvature signals.
 *
 * The composed tree: (DFS ⊗ BFS) + Spiral
 *   - Tensor product merges deductive pinning with inductive observation
 *   - Coproduct allows the spiral to override when curvature demands it
 */
export function composedScheduler(config: ScheduleConfig): PolyTree {
  const dfs = depthFirstDeductive(config.maxDepth);
  const bfs = breadthFirstInductive(
    Math.min(config.observations.length, 4),
    config.maxDepth,
  );
  const spiral = abductiveSpiral(config.maxDepth);

  // Parallel composition of DFS and BFS
  const parallel = tensorProduct(dfs, bfs);

  // Coproduct with spiral for curvature-driven override
  return coproduct(parallel, spiral);
}

// ── 5.5 Schedule Execution ─────────────────────────────────────────────────

/**
 * Execute a strategy tree against a fiber budget.
 *
 * Walks the PolyTree coinductively, executing reasoning steps at each node.
 * The traversal direction (which child to take) is determined by the result
 * of each reasoning step:
 *   - Deductive: direction = converged ? 0 : 1
 *   - Inductive: position = observation index, direction = 0 (always accept)
 *   - Abductive: direction = converged ? 0 : catastrophe ? 2 : 1
 */
export function executeSchedule(
  tree: PolyTree,
  config: ScheduleConfig,
): ScheduleResult {
  const steps: StrategyStepResult[] = [];
  let budget = createFiberBudget(config.quantum);
  let currentTree = tree;
  let converged = false;
  let obsIndex = 0;

  const dummyInput: ProjectionInput = {
    hashBytes: new Uint8Array(32),
    cid: "bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    hex: "0".repeat(64),
  };
  const ctx: TransitionContext = {
    input: dummyInput,
    depth: 0,
    maxDepth: config.maxDepth,
    history: [],
  };

  for (let i = 0; i < config.maxDepth * 3 && !converged; i++) {
    if (currentTree === ZERO_TREE || currentTree.root.positionCount === 0) break;
    if (budget.isClosed) { converged = true; break; }

    const label = currentTree.root.label;
    const node = classifyNode(label, i);

    let stepResult: StrategyStepResult;
    let position = 0;
    let direction = 0;

    if (node.mode === "deductive") {
      // Apply constraint
      const modulus = Math.max(2, config.initialModulus + i);
      const c = residueConstraint(modulus, 0, `sched:d:${i}`);
      const pins = Math.max(1, Math.min(3, budget.totalFibers - budget.pinnedCount));
      const d = deductiveStep(budget, c, pins);
      budget = d.budget;
      const state = deriveState(budget);
      direction = state === "Resolved" ? 0 : 1;
      stepResult = { node, deductive: d, budget, resolutionState: state };

    } else if (node.mode === "inductive") {
      // Observe
      const obs = config.observations[obsIndex % config.observations.length];
      obsIndex++;
      const ind = inductiveStep(obs, config.reference, config.quantum);
      const state = deriveState(budget);
      position = Math.min(obsIndex - 1, currentTree.root.positionCount - 1);
      direction = 0;
      stepResult = { node, inductive: ind, budget, resolutionState: state };

    } else {
      // Abductive: measure curvature between last D and I
      const lastD = [...steps].reverse().find(s => s.deductive)?.deductive;
      const lastI = [...steps].reverse().find(s => s.inductive)?.inductive;

      if (lastD && lastI) {
        const abd = abductiveCurvature(lastD, lastI, config.quantum);
        const state = deriveState(budget);
        direction = abd.normalizedCurvature < CONVERGENCE_EPSILON ? 0
                  : abd.isCatastrophe ? 2 : 1;
        converged = direction === 0;
        stepResult = { node, abductive: abd, budget, resolutionState: state };
      } else {
        // No prior D/I steps, skip
        direction = 1;
        stepResult = { node, budget, resolutionState: deriveState(budget) };
      }
    }

    steps.push(stepResult);

    // Transition to next tree node
    const interactionStep: InteractionStep = {
      position,
      direction,
      timestamp: Date.now(),
    };
    const childCtx: TransitionContext = {
      ...ctx,
      depth: ctx.depth + 1,
      history: [...ctx.history, interactionStep],
    };
    currentTree = currentTree.rest(position, direction, childCtx);
  }

  return {
    steps,
    finalBudget: budget,
    finalState: deriveState(budget),
    converged,
    strategyUsed: tree.nodeId,
    totalSteps: steps.length,
  };
}

// ── Strategy Queries ───────────────────────────────────────────────────────

/** Extract the sequence of reasoning modes from a schedule result. */
export function modeSequence(result: ScheduleResult): ReasoningMode[] {
  return result.steps.map(s => s.node.mode);
}

/** Count steps by mode in a schedule result. */
export function scheduleStepsByMode(result: ScheduleResult): Record<ReasoningMode, number> {
  const counts: Record<ReasoningMode, number> = { deductive: 0, inductive: 0, abductive: 0 };
  for (const s of result.steps) counts[s.node.mode]++;
  return counts;
}

/** Check if a schedule produced at least one complete D→I→A cycle. */
export function hasScheduledCycle(result: ScheduleResult): boolean {
  const modes = scheduleStepsByMode(result);
  return modes.deductive > 0 && modes.inductive > 0 && modes.abductive > 0;
}

// ── Internal Helpers ───────────────────────────────────────────────────────

/** Classify a PolyTree node label into a reasoning mode. */
function classifyNode(label: string, depth: number): StrategyNode {
  if (label.startsWith("D:")) {
    return { mode: "deductive", axis: "Vertical", priority: 0, depth, label };
  }
  if (label.startsWith("I:")) {
    return { mode: "inductive", axis: "Horizontal", priority: 1, depth, label };
  }
  if (label.startsWith("A:")) {
    return { mode: "abductive", axis: "Diagonal", priority: 2, depth, label };
  }

  // Composed labels (tensor/coproduct): determine from depth parity
  // In the spiral pattern: even=deductive, odd=inductive, every 3rd=abductive
  const phase = depth % 3;
  if (phase === 0) return { mode: "deductive", axis: "Vertical", priority: 0, depth, label };
  if (phase === 1) return { mode: "inductive", axis: "Horizontal", priority: 1, depth, label };
  return { mode: "abductive", axis: "Diagonal", priority: 2, depth, label };
}
