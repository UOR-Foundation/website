/**
 * UOR v2.0.0 — Fiber Budget Engine
 *
 * Tracks bit-level type resolution progress.
 * A FiberBudget has `totalFibers` bits; each can be Free or Pinned.
 * When all fibers are pinned, the budget is closed (fully resolved).
 *
 * Pure functions. Immutable updates.
 */

import type {
  FiberBudget,
  FiberCoordinate,
  FiberPinning,
} from "@/types/uor-foundation/bridge/partition";

/**
 * Create a fresh FiberBudget with all fibers Free.
 * totalFibers = 8 × (quantum + 1).
 */
export function createFiberBudget(quantum: number): FiberBudget {
  const totalFibers = 8 * (quantum + 1);
  const fibers: FiberCoordinate[] = Array.from({ length: totalFibers }, (_, i) => ({
    bitIndex: i,
    state: "Free" as const,
    pinnedBy: null,
  }));
  return { totalFibers, pinnedCount: 0, isClosed: false, fibers, pinnings: [] };
}

/**
 * Pin a fiber at the given bit index. Returns a new budget (immutable).
 * No-op if already pinned.
 */
export function pinFiber(
  budget: FiberBudget,
  bitIndex: number,
  constraintId: string,
): FiberBudget {
  if (bitIndex < 0 || bitIndex >= budget.totalFibers) {
    throw new RangeError(`bitIndex ${bitIndex} out of range [0, ${budget.totalFibers})`);
  }
  const fiber = budget.fibers[bitIndex];
  if (fiber.state === "Pinned") return budget;

  const newFibers = budget.fibers.map((f, i) =>
    i === bitIndex ? { ...f, state: "Pinned" as const, pinnedBy: constraintId } : f
  );
  const pinning: FiberPinning = {
    coordinate: newFibers[bitIndex],
    constraintId,
    pinnedAt: new Date().toISOString(),
  };
  const pinnedCount = budget.pinnedCount + 1;
  return {
    totalFibers: budget.totalFibers,
    pinnedCount,
    isClosed: pinnedCount === budget.totalFibers,
    fibers: newFibers,
    pinnings: [...budget.pinnings, pinning],
  };
}

/** Count of free (unresolved) fibers. */
export function freeCount(budget: FiberBudget): number {
  return budget.totalFibers - budget.pinnedCount;
}

/** Resolution ratio [0, 1]. */
export function resolution(budget: FiberBudget): number {
  return budget.totalFibers === 0 ? 1 : budget.pinnedCount / budget.totalFibers;
}
