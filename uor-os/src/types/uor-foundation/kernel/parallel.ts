/**
 * UOR Foundation v2.0.0. kernel::parallel
 *
 * Independent computations over disjoint fiber budgets.
 *
 * @see foundation/src/kernel/parallel.rs
 * @namespace parallel/
 */

/** ParallelTask. an independent computation. */
export interface ParallelTask {
  /** Task identifier. */
  taskId(): string;
  /** Fiber budget allocated to this task. */
  fiberBudget(): number;
  /** Current status. */
  status(): "Pending" | "Running" | "Completed" | "Failed";
  /** Result (null until completed). */
  result(): number | null;
}

/** ParallelComposition. independent tasks over disjoint budgets. */
export interface ParallelComposition {
  /** All tasks. */
  tasks(): ParallelTask[];
  /** Total fiber budget across all tasks. */
  totalBudget(): number;
  /** Whether all tasks have completed. */
  allCompleted(): boolean;
  /** Collect results (in task order). */
  results(): (number | null)[];
}

/** DisjointBudget. ensures no fiber overlap between parallel tasks. */
export interface DisjointBudget {
  /** Fiber ranges allocated to each task. */
  allocations(): Array<{ taskId: string; startBit: number; endBit: number }>;
  /** Whether all allocations are truly disjoint. */
  isDisjoint(): boolean;
}
