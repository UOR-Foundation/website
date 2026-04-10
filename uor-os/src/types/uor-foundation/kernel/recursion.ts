/**
 * UOR Foundation v2.0.0. kernel::recursion
 *
 * Well-founded descent measures, bounded recursion.
 *
 * @see foundation/src/kernel/recursion.rs
 * @namespace recursion/
 */

/** DescentMeasure. a well-founded measure for recursion termination. */
export interface DescentMeasure {
  /** Measure the descent value of a ring element. */
  measure(value: number): number;
  /** Whether this measure is well-founded. */
  isWellFounded(): boolean;
  /** Name of the measure. */
  name(): string;
}

/** RecursionBound. maximum recursion depth. */
export interface RecursionBound {
  /** Maximum depth allowed. */
  maxDepth(): number;
  /** Current depth. */
  currentDepth(): number;
  /** Whether the bound has been exceeded. */
  exceeded(): boolean;
}

/** RecursiveComputation. a bounded recursive computation. */
export interface RecursiveComputation {
  /** The descent measure used. */
  measure(): DescentMeasure;
  /** The recursion bound. */
  bound(): RecursionBound;
  /** Base case predicate. */
  isBaseCase(value: number): boolean;
  /** Recursive step. */
  step(value: number): number;
  /** Execute the full recursion. */
  evaluate(value: number): number;
}
