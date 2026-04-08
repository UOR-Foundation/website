/**
 * UOR Foundation v2.0.0 — user::state
 *
 * Parameterized address spaces: contexts, bindings, frames, transitions.
 * v0.2.0 additions: Session, SessionBoundary, SharedContext,
 * ContextLease, ContextMigration, StateCheckpoint, StateSnapshot.
 *
 * @see spec/src/namespaces/state.rs
 * @namespace state/
 */

// ── Core State Types ───────────────────────────────────────────────────────

/**
 * Binding — a name-to-address association within a context.
 */
export interface Binding {
  name(): string;
  address(): string;
  bindingType(): string;
}

/**
 * Frame — a snapshot of bindings within a context.
 */
export interface Frame {
  frameId(): string;
  contextId(): string;
  bindings(): Binding[];
  bindingCount(): number;
}

/**
 * Transition — a state change from one frame to another.
 */
export interface Transition {
  fromFrame(): Frame;
  toFrame(): Frame;
  added(): number;
  removed(): number;
  contextId(): string;
  traceId(): string | null;
}

/**
 * Context — a parameterized address space (directory-like container).
 */
export interface Context {
  contextId(): string;
  quantum(): number;
  capacity(): number;
  bindingCount(): number;
  currentFrame(): Frame;
  transitions(): Transition[];
}

// ══════════════════════════════════════════════════════════════════════════
// v0.2.0 ADDITIONS
// ══════════════════════════════════════════════════════════════════════════

/**
 * Session — a temporally bounded interaction context.
 * Sessions are the primary unit of computation in the OS —
 * every app window, every agent conversation, every ceremony
 * runs within a session.
 *
 * @see spec/src/namespaces/state.rs — Session
 */
export interface Session {
  /** Session CID (content-addressed identifier). */
  sessionCid(): string;
  /** Parent session CID (null for root sessions). */
  parentCid(): string | null;
  /** Sequence number within the session chain. */
  sequenceNumber(): number;
  /** Active context within this session. */
  context(): Context;
  /** Session creation timestamp. */
  createdAt(): string;
  /** Whether the session is currently active. */
  isActive(): boolean;
  /** Session state snapshot hash. */
  stateHash(): string;
}

/**
 * SessionBoundary — marks the start or end of a session.
 * Boundaries carry the state transition metadata needed
 * for audit trails and session chain integrity.
 *
 * @see spec/src/namespaces/state.rs — SessionBoundary
 */
export interface SessionBoundary {
  /** The session this boundary belongs to. */
  sessionCid(): string;
  /** "Open" or "Close". */
  boundaryType(): "Open" | "Close";
  /** Timestamp of the boundary event. */
  timestamp(): string;
  /** State hash at the boundary. */
  stateHash(): string;
  /** Bindings added (Open) or released (Close). */
  bindingDelta(): number;
}

/**
 * SharedContext — a context shared across multiple sessions.
 * Enables multi-agent collaboration with lease-based access control.
 *
 * @see spec/src/namespaces/state.rs — SharedContext
 */
export interface SharedContext extends Context {
  /** Session CIDs that share this context. */
  sharedWith(): string[];
  /** Maximum concurrent leaseholders. */
  maxLeases(): number;
  /** Active lease count. */
  activeLeases(): number;
  /** Access policy ("ReadOnly" | "ReadWrite" | "Exclusive"). */
  accessPolicy(): "ReadOnly" | "ReadWrite" | "Exclusive";
}

/**
 * ContextLease — a time-bounded, revocable lease on a shared context.
 * Implements the linear discipline from kernel::linear.
 *
 * @see spec/src/namespaces/state.rs — ContextLease
 */
export interface ContextLease {
  /** Lease identifier. */
  leaseId(): string;
  /** Context being leased. */
  contextId(): string;
  /** Session holding the lease. */
  holderSessionCid(): string;
  /** Lease grant timestamp. */
  grantedAt(): string;
  /** Lease expiration timestamp (null = indefinite). */
  expiresAt(): string | null;
  /** Whether the lease has been revoked. */
  isRevoked(): boolean;
  /** Access level granted by this lease. */
  accessLevel(): "ReadOnly" | "ReadWrite" | "Exclusive";
}

/**
 * ContextMigration — records the migration of bindings
 * from one context to another (e.g., session handoff).
 *
 * @see spec/src/namespaces/state.rs — ContextMigration
 */
export interface ContextMigration {
  /** Migration identifier. */
  migrationId(): string;
  /** Source context. */
  sourceContextId(): string;
  /** Target context. */
  targetContextId(): string;
  /** Number of bindings migrated. */
  bindingsMigrated(): number;
  /** Whether any bindings were lost. */
  lossless(): boolean;
  /** Timestamp of migration. */
  migratedAt(): string;
}

/**
 * StateCheckpoint — a verifiable checkpoint of context state.
 * Can be used to restore or audit state at a point in time.
 *
 * @see spec/src/namespaces/state.rs — StateCheckpoint
 */
export interface StateCheckpoint {
  /** Checkpoint identifier. */
  checkpointId(): string;
  /** Context this checkpoint captures. */
  contextId(): string;
  /** Frame captured at the checkpoint. */
  frame(): Frame;
  /** Merkle root of all bindings. */
  merkleRoot(): string;
  /** Checkpoint timestamp. */
  createdAt(): string;
}

/**
 * StateSnapshot — a complete serializable snapshot of a context's
 * state including all bindings, frames, and transition history.
 *
 * @see spec/src/namespaces/state.rs — StateSnapshot
 */
export interface StateSnapshot {
  /** Snapshot identifier. */
  snapshotId(): string;
  /** Context captured. */
  contextId(): string;
  /** All bindings at snapshot time. */
  bindings(): Binding[];
  /** All frames in the history. */
  frames(): Frame[];
  /** All transitions in the history. */
  transitions(): Transition[];
  /** Serialized size in bytes. */
  sizeBytes(): number;
  /** Snapshot timestamp. */
  createdAt(): string;
}
