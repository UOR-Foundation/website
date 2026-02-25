/**
 * UOR Foundation v2.0.0 — user::state
 *
 * Parameterized address spaces: contexts, bindings, frames, transitions.
 *
 * @see spec/src/namespaces/state.rs
 * @namespace state/
 */

/**
 * Binding — a name-to-address association within a context.
 */
export interface Binding {
  /** The bound name. */
  name(): string;
  /** The address this name resolves to. */
  address(): string;
  /** Binding type (e.g., "value", "function", "type"). */
  bindingType(): string;
}

/**
 * Frame — a snapshot of bindings within a context.
 */
export interface Frame {
  /** Frame identifier. */
  frameId(): string;
  /** The context this frame belongs to. */
  contextId(): string;
  /** Active bindings in this frame. */
  bindings(): Binding[];
  /** Number of bindings. */
  bindingCount(): number;
}

/**
 * Transition — a state change from one frame to another.
 */
export interface Transition {
  /** Source frame. */
  fromFrame(): Frame;
  /** Target frame. */
  toFrame(): Frame;
  /** Bindings added. */
  added(): number;
  /** Bindings removed. */
  removed(): number;
  /** The context in which this transition occurs. */
  contextId(): string;
  /** Associated trace ID (for auditing). */
  traceId(): string | null;
}

/**
 * Context — a parameterized address space (directory-like container).
 */
export interface Context {
  /** Context identifier. */
  contextId(): string;
  /** Quantum level. */
  quantum(): number;
  /** Maximum binding capacity. */
  capacity(): number;
  /** Current binding count. */
  bindingCount(): number;
  /** Current active frame. */
  currentFrame(): Frame;
  /** Transition history. */
  transitions(): Transition[];
}
