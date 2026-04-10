/**
 * UOR Foundation v2.0.0. kernel::cascade
 *
 * Sequential ψ-map composition (ψ₉ ∘ … ∘ ψ₁).
 *
 * @see foundation/src/kernel/cascade.rs
 * @namespace cascade/
 */

/** CascadeMap. a single ψ-map in a cascade. */
export interface CascadeMap {
  /** Map index in the cascade sequence. */
  index(): number;
  /** Input quantum level. */
  inputQuantum(): number;
  /** Output quantum level. */
  outputQuantum(): number;
  /** Apply this map to a value. */
  apply(value: number): number;
}

/** CascadeComposition. sequential composition of cascade maps. */
export interface CascadeComposition {
  /** Ordered maps (applied left-to-right). */
  maps(): CascadeMap[];
  /** Total number of maps. */
  depth(): number;
  /** Apply full cascade to a value. */
  evaluate(value: number): number;
}

/** CascadeEpoch. a bounded segment of cascade computation. */
export interface CascadeEpoch {
  /** Epoch index. */
  epochIndex(): number;
  /** Maps executed in this epoch. */
  maps(): CascadeMap[];
  /** Whether this epoch completed without error. */
  converged(): boolean;
}
