/**
 * UOR Foundation v2.0.0. kernel::effect
 *
 * Typed endomorphisms, pinning/unbinding effects.
 *
 * @see foundation/src/kernel/effect.rs
 * @namespace effect/
 */

/** Effect. abstract base for typed side effects. */
export interface Effect {
  /** Effect identifier. */
  effectId(): string;
  /** Effect type discriminator. */
  effectType(): string;
  /** Whether this effect is reversible. */
  reversible(): boolean;
}

/** PinEffect. pins a fiber coordinate to a resolved value. */
export interface PinEffect extends Effect {
  effectType(): "Pin";
  /** Fiber bit index being pinned. */
  fiberIndex(): number;
  /** Value the fiber is pinned to. */
  pinnedValue(): number;
  /** Constraint that caused the pin. */
  constraintId(): string;
}

/** UnbindEffect. removes a binding from a context. */
export interface UnbindEffect extends Effect {
  effectType(): "Unbind";
  /** Name of the binding being removed. */
  bindingName(): string;
  /** Context from which the binding is removed. */
  contextId(): string;
}

/** EndomorphismEffect. applies an endomorphism to a ring element. */
export interface EndomorphismEffect extends Effect {
  effectType(): "Endomorphism";
  /** The operation applied. */
  operation(): string;
  /** Input value. */
  input(): number;
  /** Output value. */
  output(): number;
}

/** EffectChain. ordered sequence of effects. */
export interface EffectChain {
  /** Ordered effects. */
  effects(): Effect[];
  /** Whether all effects in the chain are reversible. */
  allReversible(): boolean;
  /** Total number of effects. */
  length(): number;
}
