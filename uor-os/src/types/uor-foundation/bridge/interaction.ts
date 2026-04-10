/**
 * UOR Foundation v2.0.0. bridge::interaction
 *
 * Multi-entity interaction, commutator/associator states.
 *
 * @see foundation/src/bridge/interaction.rs
 * @namespace interaction/
 */

/** Participant. an entity in an interaction. */
export interface Participant {
  /** Participant identifier. */
  participantId(): string;
  /** Current state value. */
  stateValue(): number;
  /** Quantum level. */
  quantum(): number;
}

/** Interaction. a multi-entity interaction event. */
export interface Interaction {
  /** Interaction identifier. */
  interactionId(): string;
  /** Participating entities. */
  participants(): Participant[];
  /** Result value. */
  result(): number;
  /** Timestamp. */
  timestamp(): string;
}

/** Commutator. measures non-commutativity [a, b] = ab - ba. */
export interface Commutator {
  /** Left operand. */
  left(): number;
  /** Right operand. */
  right(): number;
  /** Commutator value (0 if commutative). */
  value(): number;
  /** Whether the commutator vanishes. */
  commutes(): boolean;
}

/** Associator. measures non-associativity [a, b, c] = (ab)c - a(bc). */
export interface Associator {
  /** First operand. */
  a(): number;
  /** Second operand. */
  b(): number;
  /** Third operand. */
  c(): number;
  /** Associator value (0 if associative). */
  value(): number;
  /** Whether the associator vanishes. */
  associates(): boolean;
}

/** InteractionState. aggregate state of an interaction. */
export interface InteractionState {
  /** Current commutator value. */
  commutator(): Commutator;
  /** Current associator value (if applicable). */
  associator(): Associator | null;
  /** Whether the interaction is in equilibrium. */
  inEquilibrium(): boolean;
}
