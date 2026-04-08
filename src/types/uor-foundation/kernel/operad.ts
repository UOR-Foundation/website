/**
 * UOR Foundation v2.0.0. kernel::operad
 *
 * Structural type nesting via operad composition.
 *
 * @see foundation/src/kernel/operad.rs
 * @namespace operad/
 */

/** OperadOperation. an n-ary operation in the operad. */
export interface OperadOperation {
  /** Arity of this operation. */
  arity(): number;
  /** Operation identifier. */
  operationId(): string;
  /** Apply to operands. */
  apply(operands: number[]): number;
}

/** Operad. a collection of operations with composition. */
export interface Operad {
  /** All operations at a given arity. */
  operationsAt(arity: number): OperadOperation[];
  /** Compose operations. */
  compose(outer: OperadOperation, inners: OperadOperation[]): OperadOperation;
  /** The identity operation (arity 1). */
  identity(): OperadOperation;
}
