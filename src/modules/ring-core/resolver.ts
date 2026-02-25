/**
 * UOR v2.0.0 — Resolver State Machine
 *
 * Implements the resolution lifecycle:
 *   Unresolved → Partial → Resolved → Certified
 *
 * The IterativeRefinementResolver applies constraints to a FiberBudget,
 * pinning fibers until closure (all resolved) or max iterations.
 *
 * Pure functions. Immutable state transitions.
 */

import type { ResolutionState } from "@/types/uor-foundation/bridge/resolver";
import type { FiberBudget } from "@/types/uor-foundation/bridge/partition";
import { createFiberBudget } from "@/modules/ring-core/fiber-budget";
import { applyConstraint } from "@/modules/ring-core/constraint";
import type { MetricAxis } from "@/types/uor-foundation/enums";

// ── Refinement Suggestion ──────────────────────────────────────────────────

export interface Suggestion {
  description: string;
  expectedPinCount: number;
  constraintType: string;
}

// ── Resolution snapshot ────────────────────────────────────────────────────

export interface ResolutionSnapshot {
  state: ResolutionState;
  budget: FiberBudget;
  iteration: number;
  suggestions: Suggestion[];
}

// ── State derivation ───────────────────────────────────────────────────────

export function deriveState(budget: FiberBudget): ResolutionState {
  if (budget.pinnedCount === 0) return "Unresolved";
  if (budget.isClosed) return "Resolved";
  return "Partial";
}

// ── Suggestion generator ───────────────────────────────────────────────────

function suggest(budget: FiberBudget): Suggestion[] {
  if (budget.isClosed) return [];
  const free = budget.totalFibers - budget.pinnedCount;
  const suggestions: Suggestion[] = [];

  if (free >= 4) {
    suggestions.push({
      description: `Apply residue constraint to pin ~${Math.ceil(free / 2)} fibers`,
      expectedPinCount: Math.ceil(free / 2),
      constraintType: "ResidueConstraint",
    });
  }
  if (free >= 2) {
    suggestions.push({
      description: `Apply depth constraint to pin ~${Math.min(free, 3)} fibers`,
      expectedPinCount: Math.min(free, 3),
      constraintType: "DepthConstraint",
    });
  }
  if (free >= 1) {
    suggestions.push({
      description: `Apply carry constraint to pin remaining ${free} fiber(s)`,
      expectedPinCount: free,
      constraintType: "CarryConstraint",
    });
  }
  return suggestions;
}

// ── IterativeRefinementResolver ────────────────────────────────────────────

export interface ConstraintStep {
  constraintId: string;
  axis: MetricAxis;
  crossingCost: number;
  satisfies: (value: bigint) => boolean;
  pinsPerStep: number;
}

/**
 * Run the iterative refinement resolver.
 * Applies each constraint step in order, yielding snapshots.
 * Converges when budget is closed or maxIterations reached.
 */
export function resolve(
  quantum: number,
  steps: ConstraintStep[],
  maxIterations?: number,
): ResolutionSnapshot[] {
  const max = maxIterations ?? steps.length;
  const snapshots: ResolutionSnapshot[] = [];
  let budget = createFiberBudget(quantum);

  // Initial snapshot
  snapshots.push({
    state: deriveState(budget),
    budget,
    iteration: 0,
    suggestions: suggest(budget),
  });

  for (let i = 0; i < Math.min(max, steps.length); i++) {
    if (budget.isClosed) break;
    const step = steps[i];
    budget = applyConstraint(budget, step, step.pinsPerStep);
    snapshots.push({
      state: deriveState(budget),
      budget,
      iteration: i + 1,
      suggestions: suggest(budget),
    });
  }

  return snapshots;
}
