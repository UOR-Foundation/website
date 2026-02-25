/**
 * Executable Blueprint — Self-Evolving Programs for the Hologram OS
 * ═══════════════════════════════════════════════════════════════════
 *
 * The fusion of LensBlueprint (instruction set) and PolyTree (scheduler)
 * into a single content-addressed, self-evolving program.
 *
 * Holographic Principle:
 *   A physical hologram encodes a 3D volume on a 2D boundary surface.
 *   An Executable Blueprint encodes an N-dimensional digital system
 *   (OS, app, protocol, AI model) on a 256-bit SHA-256 boundary.
 *
 *   Boundary (hash) = identity on the holographic surface
 *   Volume (system)  = the full computational content
 *   Projection       = a viewing angle of the running system
 *   Lens             = the optical path from boundary → projection
 *   PolyTree         = the time-evolution of that optical path
 *
 * The key insight: a program is a lens that evolves. A LensBlueprint
 * describes WHAT to compute; a PolyTree describes HOW the computation
 * changes through interaction. Together they form an Executable Blueprint:
 * a content-addressed, deterministic, self-evolving program that can
 * emulate any digital system.
 *
 * Lifecycle:
 *   1. create   → define elements, wiring, I/O channels, scheduler
 *   2. grind    → compute permanent UOR address (content = identity)
 *   3. boot     → instantiate live lens + start scheduler loop
 *   4. interact → user/system input transitions the PolyTree
 *   5. suspend  → dehydrate full state to canonical bytes (hibernate)
 *   6. resume   → rehydrate from bytes to live session (wake)
 *
 * Equivalences to traditional OS concepts:
 *   fork()     = forkBlueprint()    — copy-on-write clone, new CID
 *   exec()     = boot()             — instantiate and run
 *   kill()     = session.stop()     — halt the scheduler
 *   suspend    = dehydrateSession() — serialize state to boundary
 *   resume     = rehydrateSession() — restore state from boundary
 *   pipe       = LensWire           — connect element outputs to inputs
 *   scheduler  = PolyTree           — coinductive state evolution
 *
 * UOR Compliance:
 *   - Every blueprint enters through singleProofHash() (URDNA2015 → SHA-256)
 *   - Every session state is content-addressed
 *   - Every transition produces an auditable trace
 *   - I/O channels are projections of the system's canonical identity
 *   - Suspend/resume is lossless by construction (dehydrate/rehydrate)
 *
 * @module uns/core/hologram/executable-blueprint
 */

import { singleProofHash, type SingleProofResult } from "@/lib/uor-canonical";
import { project, PROJECTIONS, type ProjectionInput, type Hologram, type Fidelity, type HologramSpec } from "./index";
import {
  composeLens,
  element,
  focusLens,
  dehydrate,
  rehydrate,
  type HolographicLens,
  type LensElement,
  type RefractionModality,
} from "./lens";
import {
  type LensBlueprint,
  type ElementSpec,
  type GroundBlueprint,
  type InstantiatedLens,
  createBlueprint,
  grindBlueprint,
  instantiateBlueprint,
  forkBlueprint,
} from "./lens-blueprint";
import {
  type PolyTree,
  type Polynomial,
  type TransitionContext,
  type InteractionStep,
  type PolyTreeSnapshot,
  constantTree,
  evolvingTree,
  executeInteraction,
  truncate,
  DIRECTIONS,
  ZERO_TREE,
  UNIT_TREE,
} from "./polytree";

// ── I/O Channel Specification ──────────────────────────────────────────────

/**
 * An I/O channel maps a system capability to a hologram projection.
 *
 * In the holographic metaphor:
 *   - Each channel is a "viewing angle" of the running system
 *   - The display channel projects the system onto the 2D browser surface
 *   - The input channel captures interactions from the surface
 *   - The network channel projects external communication
 *   - The storage channel projects persistence
 *
 * Every channel is a projection — the holographic principle in action.
 */
export interface IOChannel {
  /** Channel identifier. */
  readonly id: string;
  /** Which hologram projection renders this channel. */
  readonly projection: string;
  /** Channel direction. */
  readonly direction: "in" | "out" | "bidirectional";
  /** Human-readable description. */
  readonly description?: string;
}

/**
 * Standard I/O channel set for Hologram OS processes.
 * Mirrors POSIX stdin/stdout/stderr/fs/net but through projections.
 */
export interface IOChannelSet {
  /** Visual output — projects the system onto the browser surface. */
  readonly display: IOChannel;
  /** User input — captures interactions from the surface. */
  readonly input: IOChannel;
  /** Network — projects external communication. */
  readonly network: IOChannel;
  /** Storage — projects persistence (dehydrate/rehydrate). */
  readonly storage: IOChannel;
  /** Additional custom channels. */
  readonly custom?: readonly IOChannel[];
}

// ── Runtime Constraints ────────────────────────────────────────────────────

/**
 * Constraints governing execution — the "cgroup" equivalent.
 */
export interface RuntimeConstraints {
  /** Memory limit in MB. */
  readonly memoryLimitMb: number;
  /** Allowed network origins for sandboxing. */
  readonly allowedOrigins: readonly string[];
  /** Maximum concurrent lens elements. */
  readonly maxConcurrentElements: number;
  /** Maximum PolyTree depth before truncation. */
  readonly maxTreeDepth: number;
  /** Execution timeout in ms (0 = unlimited). */
  readonly timeoutMs: number;
}

/** Sensible defaults for runtime constraints. */
const DEFAULT_CONSTRAINTS: RuntimeConstraints = {
  memoryLimitMb: 64,
  allowedOrigins: ["https://uor.foundation", "https://*.supabase.co"],
  maxConcurrentElements: 32,
  maxTreeDepth: 64,
  timeoutMs: 0,
};

// ── Executable Blueprint Type ──────────────────────────────────────────────

/**
 * The Executable Blueprint — a self-evolving, content-addressed program.
 *
 * This is the merger of LensBlueprint (instruction set) and PolyTree (scheduler)
 * into a single UOR object. One hash, one program, one identity.
 *
 * The holographic principle demands that the boundary (hash) fully determines
 * the volume (system behavior). This is achieved by making the blueprint
 * fully deterministic: same elements + same scheduler + same channels = same CID.
 */
export interface ExecutableBlueprint {
  readonly "@type": "uor:ExecutableBlueprint";
  /** Human-readable name. */
  readonly name: string;
  /** Semantic version. */
  readonly version: string;
  /** Description of what this executable does. */
  readonly description?: string;
  /** Searchable tags. */
  readonly tags?: readonly string[];

  // ── The Lens (WHAT to compute) ────────────────────────────────────────
  /** The underlying lens blueprint — the instruction set. */
  readonly lens: LensBlueprint;

  // ── The Scheduler (HOW computation evolves) ───────────────────────────
  /**
   * Serializable scheduler specification.
   * Describes the PolyTree transition rules declaratively.
   * At boot time, this is compiled into a live PolyTree.
   */
  readonly scheduler: SchedulerSpec;

  // ── I/O Channels (WHERE input/output flows) ───────────────────────────
  /** I/O channel mappings — projections used for system I/O. */
  readonly channels: IOChannelSet;

  // ── Execution Configuration ───────────────────────────────────────────
  /** Which lens element is the entry point. */
  readonly entrypoint: string;
  /** Runtime constraints (memory, network, timeouts). */
  readonly constraints: RuntimeConstraints;
  /** Parent blueprint CID (if forked). */
  readonly parentCid?: string;
}

// ── Scheduler Specification (Serializable PolyTree) ────────────────────────

/**
 * Declarative scheduler specification — serializable PolyTree description.
 *
 * PolyTrees contain functions (non-serializable), so we describe
 * transitions declaratively. At boot time, the spec is compiled
 * into a live PolyTree using the same pattern as ElementSpec → LensElement.
 *
 * This mirrors how LensBlueprint makes lenses serializable:
 *   ElementSpec  → LensElement   (lens-blueprint.ts)
 *   SchedulerSpec → PolyTree      (this file)
 */
export interface SchedulerSpec {
  /** Initial interface label. */
  readonly initialLabel: string;
  /** Initial position count (output cardinality). */
  readonly initialPositions: number;
  /** Direction vocabulary size. */
  readonly directionCount: number;
  /** Fidelity of the initial polynomial. */
  readonly fidelity: Fidelity;
  /** Whether this is a constant (non-evolving) scheduler. */
  readonly isConstant: boolean;
  /**
   * Transition rules: direction → transition effect.
   * Each rule describes what happens when a particular direction is received.
   */
  readonly transitions: readonly TransitionRule[];
}

/**
 * A declarative transition rule: "when direction D is received, apply effect E."
 */
export interface TransitionRule {
  /** The direction index that triggers this transition. */
  readonly direction: number;
  /** Human-readable direction name (e.g., "VERIFIED", "EXPIRED"). */
  readonly directionName?: string;
  /** What effect this transition has on the interface. */
  readonly effect: TransitionEffect;
}

/**
 * The effect of a transition on the polynomial interface.
 */
export type TransitionEffect =
  | { readonly type: "grow"; readonly positionDelta: number }     // Add positions (capabilities)
  | { readonly type: "shrink"; readonly positionDelta: number }   // Remove positions
  | { readonly type: "reset" }                                      // Return to initial
  | { readonly type: "halt" }                                       // Transition to ZERO_TREE
  | { readonly type: "scale"; readonly factor: number }            // Multiply positions
  | { readonly type: "constant" };                                  // Remain unchanged

// ── Session State (Running Executable) ─────────────────────────────────────

/**
 * A live session — the "running process" of an Executable Blueprint.
 *
 * Holographic property: the full session state can be dehydrated
 * to a single canonical hash (suspend) and rehydrated back (resume)
 * with zero information loss.
 */
export interface HologramSession {
  /** Unique session ID (content-addressed from blueprint CID + start time). */
  readonly sessionId: string;
  /** The blueprint being executed. */
  readonly blueprint: ExecutableBlueprint;
  /** The ground (content-addressed) blueprint identity. */
  readonly ground: GroundBlueprint;
  /** The live instantiated lens. */
  readonly instance: InstantiatedLens;
  /** Current PolyTree state (evolves through interaction). */
  currentTree: PolyTree;
  /** Interaction history. */
  readonly history: InteractionStep[];
  /** Session status. */
  status: "booting" | "running" | "suspended" | "halted";
  /** Start timestamp. */
  readonly bootedAt: string;
  /** Last interaction timestamp. */
  lastInteractionAt: string;

  // ── Lifecycle Controls ──────────────────────────────────────────────────

  /** Execute the lens pipeline with input data. */
  execute: (input: unknown) => Promise<unknown>;
  /** Send an interaction to the scheduler (evolve the PolyTree). */
  interact: (position: number, direction: number) => InteractionResult;
  /** Suspend the session — dehydrate full state to canonical bytes. */
  suspend: () => Promise<SuspendedSession>;
  /** Stop the session permanently. */
  stop: () => void;
  /** Get the current scheduler state snapshot. */
  snapshot: () => PolyTreeSnapshot;
}

/**
 * The result of a single interaction round.
 */
export interface InteractionResult {
  /** The PolyTree before the interaction. */
  readonly previousTree: PolyTree;
  /** The PolyTree after the interaction. */
  readonly currentTree: PolyTree;
  /** Whether the interface changed (non-constant transition). */
  readonly interfaceChanged: boolean;
  /** The interaction step recorded. */
  readonly step: InteractionStep;
  /** Whether the session has halted (reached ZERO_TREE). */
  readonly halted: boolean;
}

/**
 * A suspended (dehydrated) session — the holographic boundary encoding.
 *
 * This is the 2D surface encoding of the full N-dimensional session state.
 * Contains everything needed to rehydrate the session exactly as it was.
 */
export interface SuspendedSession {
  /** Content-addressed identity of the suspended state. */
  readonly proof: SingleProofResult;
  /** The session state envelope. */
  readonly envelope: SessionEnvelope;
}

/**
 * The serializable envelope containing full session state.
 */
interface SessionEnvelope {
  readonly "@type": "uor:SuspendedSession";
  /** Blueprint CID (the program identity). */
  readonly blueprintCid: string;
  /** Interaction history (deterministic replay). */
  readonly history: readonly InteractionStep[];
  /** Last known tree snapshot. */
  readonly treeSnapshot: PolyTreeSnapshot;
  /** Session metadata. */
  readonly bootedAt: string;
  readonly suspendedAt: string;
  readonly sessionId: string;
  /** Execution count. */
  readonly executionCount: number;
}

// ── Core API ───────────────────────────────────────────────────────────────

/**
 * Default I/O channel set — standard holographic I/O.
 */
function defaultChannels(): IOChannelSet {
  return {
    display: {
      id: "display",
      projection: "cid",
      direction: "out",
      description: "Visual output — projects system state to browser surface",
    },
    input: {
      id: "input",
      projection: "webfinger",
      direction: "in",
      description: "User interaction — captures input from the surface",
    },
    network: {
      id: "network",
      projection: "activitypub",
      direction: "bidirectional",
      description: "Network I/O — federated communication channel",
    },
    storage: {
      id: "storage",
      projection: "ipfs-cid",
      direction: "bidirectional",
      description: "Persistence — content-addressed state storage",
    },
  };
}

/**
 * Default scheduler — a constant (non-evolving) scheduler.
 * Suitable for static applications that don't change interface over time.
 */
function defaultScheduler(): SchedulerSpec {
  return {
    initialLabel: "static",
    initialPositions: 1,
    directionCount: Object.keys(DIRECTIONS).length,
    fidelity: "lossless",
    isConstant: true,
    transitions: [],
  };
}

/**
 * Create an Executable Blueprint from a specification.
 *
 * This is the primary constructor. It composes a LensBlueprint with
 * a SchedulerSpec and I/O channels into a single content-addressed program.
 */
export function createExecutableBlueprint(spec: {
  name: string;
  version?: string;
  description?: string;
  tags?: string[];
  /** Lens elements — the instruction set. */
  elements: ElementSpec[];
  /** Optional wiring between elements. */
  wires?: { from: string; to: string }[];
  /** Scheduler specification (defaults to constant/static). */
  scheduler?: Partial<SchedulerSpec>;
  /** I/O channels (defaults to standard set). */
  channels?: Partial<IOChannelSet>;
  /** Entry point element ID. */
  entrypoint?: string;
  /** Runtime constraints. */
  constraints?: Partial<RuntimeConstraints>;
  /** Parent blueprint CID if forking. */
  parentCid?: string;
}): ExecutableBlueprint {
  // Build the underlying lens blueprint
  const lens = createBlueprint({
    name: `${spec.name}:lens`,
    version: spec.version,
    morphism: "transform",
    description: `Lens pipeline for ${spec.name}`,
    tags: spec.tags,
    elements: spec.elements,
    wires: spec.wires,
  });

  // Merge scheduler with defaults
  const scheduler: SchedulerSpec = {
    ...defaultScheduler(),
    ...spec.scheduler,
    transitions: spec.scheduler?.transitions ?? [],
  };

  // Merge channels with defaults
  const defaults = defaultChannels();
  const channels: IOChannelSet = {
    display: spec.channels?.display ?? defaults.display,
    input: spec.channels?.input ?? defaults.input,
    network: spec.channels?.network ?? defaults.network,
    storage: spec.channels?.storage ?? defaults.storage,
    custom: spec.channels?.custom,
  };

  // Merge constraints with defaults
  const constraints: RuntimeConstraints = {
    ...DEFAULT_CONSTRAINTS,
    ...spec.constraints,
  };

  // Resolve entrypoint (first element if not specified)
  const entrypoint = spec.entrypoint ?? spec.elements[0]?.id ?? "entry";

  return {
    "@type": "uor:ExecutableBlueprint",
    name: spec.name,
    version: spec.version ?? "1.0.0",
    description: spec.description,
    tags: spec.tags,
    lens,
    scheduler,
    channels,
    entrypoint,
    constraints,
    parentCid: spec.parentCid,
  };
}

// ── Grinding (Content-Addressing) ──────────────────────────────────────────

/**
 * A ground (content-addressed) executable blueprint with its UOR identity.
 */
export interface GroundExecutableBlueprint {
  readonly executable: ExecutableBlueprint;
  readonly proof: SingleProofResult;
  readonly hologram: Hologram;
  /** The underlying ground lens blueprint. */
  readonly groundLens: GroundBlueprint;
}

/**
 * Grind an executable blueprint — compute its permanent UOR address.
 *
 * The holographic principle in action:
 *   Full program (N-dimensional volume) → 256-bit hash (2D boundary)
 *   Same program = same hash. Forever. Universally.
 */
export async function grindExecutableBlueprint(
  executable: ExecutableBlueprint,
): Promise<GroundExecutableBlueprint> {
  // Content-address the full executable (includes lens + scheduler + channels)
  const proof = await singleProofHash(executable);
  const input: ProjectionInput = {
    hashBytes: proof.hashBytes,
    cid: proof.cid,
    hex: proof.hashHex,
  };
  const hologram = project(input);

  // Also grind the underlying lens blueprint
  const groundLens = await grindBlueprint(executable.lens);

  return { executable, proof, hologram, groundLens };
}

// ── Scheduler Compilation ──────────────────────────────────────────────────

/**
 * Compile a declarative SchedulerSpec into a live PolyTree.
 *
 * This mirrors how ElementSpec → LensElement works in lens-blueprint.ts:
 *   SchedulerSpec (serializable) → PolyTree (executable)
 *
 * The compilation is deterministic — same spec = same PolyTree behavior.
 */
export function compileScheduler(spec: SchedulerSpec): PolyTree {
  const basePoly: Polynomial = {
    label: spec.initialLabel,
    positionCount: spec.initialPositions,
    directionCounts: Array(spec.initialPositions).fill(spec.directionCount),
    fidelity: spec.fidelity,
  };

  // Constant scheduler — return a constant tree
  if (spec.isConstant || spec.transitions.length === 0) {
    const dummySpec: HologramSpec = {
      project: (input) => input.cid,
      fidelity: spec.fidelity,
      spec: "https://uor.foundation/specs/executable-v1",
    };
    return constantTree(spec.initialLabel, dummySpec);
  }

  // Build a constant fallback tree (no HologramSpec needed)
  const fallback: PolyTree = {
    root: basePoly,
    rest: function self() { return fallback; },
    isConstant: true,
    nodeId: `const:${spec.initialLabel}`,
  };

  // Build transition map from declarative rules
  const transitions = new Map<number, (ctx: TransitionContext) => PolyTree>();

  for (const rule of spec.transitions) {
    transitions.set(rule.direction, (ctx) =>
      applyEffect(rule.effect, basePoly, spec, ctx),
    );
  }

  return evolvingTree(basePoly, transitions, fallback);
}

/**
 * Apply a transition effect to produce the next PolyTree.
 */
/** Build a constant fallback tree from a polynomial (no HologramSpec needed). */
function makeFallback(poly: Polynomial): PolyTree {
  const fb: PolyTree = {
    root: poly,
    rest: () => fb,
    isConstant: true,
    nodeId: `const:${poly.label}`,
  };
  return fb;
}

function applyEffect(
  effect: TransitionEffect,
  basePoly: Polynomial,
  spec: SchedulerSpec,
  ctx: TransitionContext,
): PolyTree {
  switch (effect.type) {
    case "halt":
      return ZERO_TREE;

    case "reset":
      return compileScheduler(spec);

    case "constant":
      return UNIT_TREE;

    case "grow": {
      const newCount = basePoly.positionCount + effect.positionDelta * (ctx.depth + 1);
      const grown: Polynomial = {
        label: `${basePoly.label}:grow-${ctx.depth}`,
        positionCount: newCount,
        directionCounts: Array(newCount).fill(spec.directionCount),
        fidelity: basePoly.fidelity,
      };
      const transitions = new Map<number, (ctx: TransitionContext) => PolyTree>();
      for (const rule of spec.transitions) {
        transitions.set(rule.direction, (innerCtx) =>
          applyEffect(rule.effect, grown, spec, innerCtx),
        );
      }
      return evolvingTree(grown, transitions, makeFallback(grown));
    }

    case "shrink": {
      const newCount = Math.max(0, basePoly.positionCount - effect.positionDelta);
      if (newCount === 0) return ZERO_TREE;
      const shrunk: Polynomial = {
        label: `${basePoly.label}:shrink-${ctx.depth}`,
        positionCount: newCount,
        directionCounts: Array(newCount).fill(spec.directionCount),
        fidelity: basePoly.fidelity,
      };
      const transitions = new Map<number, (ctx: TransitionContext) => PolyTree>();
      for (const rule of spec.transitions) {
        transitions.set(rule.direction, (innerCtx) =>
          applyEffect(rule.effect, shrunk, spec, innerCtx),
        );
      }
      return evolvingTree(shrunk, transitions, makeFallback(shrunk));
    }

    case "scale": {
      const newCount = Math.min(
        Math.max(1, Math.floor(basePoly.positionCount * effect.factor)),
        1000,
      );
      const scaled: Polynomial = {
        label: `${basePoly.label}:scale-${ctx.depth}`,
        positionCount: newCount,
        directionCounts: Array(newCount).fill(spec.directionCount),
        fidelity: basePoly.fidelity,
      };
      const transitions = new Map<number, (ctx: TransitionContext) => PolyTree>();
      for (const rule of spec.transitions) {
        transitions.set(rule.direction, (innerCtx) =>
          applyEffect(rule.effect, scaled, spec, innerCtx),
        );
      }
      return evolvingTree(scaled, transitions, makeFallback(scaled));
    }
  }
}

// ── Boot (Instantiation + Scheduler Start) ─────────────────────────────────

/**
 * Boot an Executable Blueprint — create a live HologramSession.
 *
 * This is the `exec()` syscall of the Hologram OS.
 *
 * Pipeline:
 *   1. Grind the blueprint (compute content-addressed identity)
 *   2. Instantiate the lens (compile elements to live functions)
 *   3. Compile the scheduler (build live PolyTree from spec)
 *   4. Create session with lifecycle controls
 *   5. Return the running session
 */
export async function boot(
  executable: ExecutableBlueprint,
): Promise<HologramSession> {
  // 1. Content-address the blueprint
  const ground = await grindExecutableBlueprint(executable);

  // 2. Instantiate the lens pipeline
  const instance = instantiateBlueprint(executable.lens);

  // 3. Compile the scheduler
  const initialTree = compileScheduler(executable.scheduler);

  // 4. Generate session ID
  const sessionProof = await singleProofHash({
    "@type": "uor:Session",
    blueprintCid: ground.proof.cid,
    bootedAt: new Date().toISOString(),
    entropy: Math.random().toString(36),
  });

  const now = new Date().toISOString();
  let executionCount = 0;

  // 5. Build the session
  const session: HologramSession = {
    sessionId: sessionProof.derivationId,
    blueprint: executable,
    ground: ground.groundLens,
    instance,
    currentTree: initialTree,
    history: [],
    status: "running",
    bootedAt: now,
    lastInteractionAt: now,

    // ── Execute: run data through the lens pipeline ────────────────────
    execute: async (input: unknown) => {
      if (session.status !== "running") {
        throw new Error(`[HologramSession] Cannot execute: session is ${session.status}`);
      }
      executionCount++;
      // Focus the lens (dehydrate input through the pipeline)
      const { output } = await focusLens(instance.lens, input);
      return output;
    },

    // ── Interact: evolve the PolyTree scheduler ────────────────────────
    interact: (position: number, direction: number) => {
      if (session.status !== "running") {
        throw new Error(`[HologramSession] Cannot interact: session is ${session.status}`);
      }

      const previousTree = session.currentTree;
      const step: InteractionStep = {
        position,
        direction,
        timestamp: Date.now(),
      };

      // Build transition context from session state
      const ctx: TransitionContext = {
        input: {
          hashBytes: ground.proof.hashBytes,
          cid: ground.proof.cid,
          hex: ground.proof.hashHex,
        },
        depth: session.history.length,
        maxDepth: executable.constraints.maxTreeDepth,
        history: session.history,
      };

      // Execute the transition
      const nextTree = previousTree.rest(position, direction, ctx);
      session.currentTree = nextTree;
      session.history.push(step);
      session.lastInteractionAt = new Date().toISOString();

      // Check for halt
      const halted = nextTree.root.positionCount === 0;
      if (halted) {
        session.status = "halted";
      }

      return {
        previousTree,
        currentTree: nextTree,
        interfaceChanged: previousTree.nodeId !== nextTree.nodeId,
        step,
        halted,
      };
    },

    // ── Suspend: dehydrate session to canonical bytes ──────────────────
    suspend: async () => {
      const envelope: SessionEnvelope = {
        "@type": "uor:SuspendedSession",
        blueprintCid: ground.proof.cid,
        history: [...session.history],
        treeSnapshot: truncate(session.currentTree, 4),
        bootedAt: session.bootedAt,
        suspendedAt: new Date().toISOString(),
        sessionId: session.sessionId,
        executionCount,
      };

      const proof = await singleProofHash(envelope);
      session.status = "suspended";

      return { proof, envelope };
    },

    // ── Stop: halt permanently ────────────────────────────────────────
    stop: () => {
      session.status = "halted";
      session.currentTree = ZERO_TREE;
    },

    // ── Snapshot: introspect current scheduler state ───────────────────
    snapshot: () => truncate(session.currentTree, 4),
  };

  return session;
}

// ── Resume (Rehydrate from Suspended State) ────────────────────────────────

/**
 * Resume a suspended session — rehydrate from canonical bytes.
 *
 * This is the holographic principle applied to session management:
 *   suspend → 256-bit boundary encoding (dehydrate)
 *   resume  → full session reconstruction (rehydrate)
 *
 * The session is reconstructed by replaying the interaction history
 * on a freshly booted instance. This guarantees lossless restoration
 * because the blueprint is deterministic and the history is ordered.
 */
export async function resume(
  executable: ExecutableBlueprint,
  suspended: SuspendedSession,
): Promise<HologramSession> {
  // Boot a fresh session
  const session = await boot(executable);

  // Replay interaction history to restore PolyTree state
  for (const step of suspended.envelope.history) {
    if (session.status !== "running") break;
    session.interact(step.position, step.direction);
  }

  return session;
}

// ── Fork (Copy-on-Write Clone) ─────────────────────────────────────────────

/**
 * Fork an executable blueprint — create a copy with modifications.
 *
 * This IS the POSIX fork() syscall:
 *   - New identity (different hash = different process)
 *   - Shared structure (same elements unless overridden)
 *   - Lineage tracking (parentCid links to original)
 */
export function forkExecutableBlueprint(
  base: ExecutableBlueprint,
  overrides: {
    name?: string;
    version?: string;
    description?: string;
    tags?: string[];
    appendElements?: ElementSpec[];
    removeElements?: string[];
    scheduler?: Partial<SchedulerSpec>;
    constraints?: Partial<RuntimeConstraints>;
  },
): ExecutableBlueprint {
  // Fork the underlying lens
  const forkedLens = forkBlueprint(base.lens, {
    name: overrides.name ? `${overrides.name}:lens` : undefined,
    version: overrides.version,
    appendElements: overrides.appendElements,
    removeElements: overrides.removeElements,
    tags: overrides.tags,
  });

  return {
    "@type": "uor:ExecutableBlueprint",
    name: overrides.name ?? `${base.name} (fork)`,
    version: overrides.version ?? base.version,
    description: overrides.description ?? base.description,
    tags: overrides.tags ?? base.tags,
    lens: forkedLens,
    scheduler: overrides.scheduler
      ? { ...base.scheduler, ...overrides.scheduler, transitions: overrides.scheduler.transitions ?? base.scheduler.transitions }
      : base.scheduler,
    channels: base.channels,
    entrypoint: base.entrypoint,
    constraints: overrides.constraints
      ? { ...base.constraints, ...overrides.constraints }
      : base.constraints,
    parentCid: undefined, // Will be set after grinding the base
  };
}

// ── Serialization ──────────────────────────────────────────────────────────

/**
 * Serialize an executable blueprint to portable JSON.
 */
export function serializeExecutable(executable: ExecutableBlueprint): string {
  return JSON.stringify(executable, null, 2);
}

/**
 * Deserialize JSON back into an ExecutableBlueprint.
 */
export function deserializeExecutable(json: string): ExecutableBlueprint {
  const parsed = JSON.parse(json);
  if (parsed["@type"] !== "uor:ExecutableBlueprint") {
    throw new Error(
      `[ExecutableBlueprint] Invalid: expected @type "uor:ExecutableBlueprint", got "${parsed["@type"]}"`
    );
  }
  return parsed as ExecutableBlueprint;
}

// ── Pre-built Scheduler Templates ──────────────────────────────────────────

/**
 * Static scheduler — the app never changes interface.
 * Equivalent to a constant PolyTree.
 */
export const STATIC_SCHEDULER: SchedulerSpec = defaultScheduler();

/**
 * Adaptive scheduler — grows capabilities on verification, halts on revocation.
 * Models a system that gains features as trust is established.
 */
export const ADAPTIVE_SCHEDULER: SchedulerSpec = {
  initialLabel: "adaptive",
  initialPositions: 1,
  directionCount: Object.keys(DIRECTIONS).length,
  fidelity: "lossless",
  isConstant: false,
  transitions: [
    { direction: DIRECTIONS.VERIFIED, directionName: "VERIFIED", effect: { type: "grow", positionDelta: 1 } },
    { direction: DIRECTIONS.EXPIRED, directionName: "EXPIRED", effect: { type: "reset" } },
    { direction: DIRECTIONS.REVOKED, directionName: "REVOKED", effect: { type: "halt" } },
    { direction: DIRECTIONS.UPGRADED, directionName: "UPGRADED", effect: { type: "scale", factor: 2 } },
    { direction: DIRECTIONS.DEGRADED, directionName: "DEGRADED", effect: { type: "shrink", positionDelta: 1 } },
  ],
};

/**
 * Lifecycle scheduler — models a process with distinct lifecycle phases.
 * boot → running → scaling → winding down → halt
 */
export const LIFECYCLE_SCHEDULER: SchedulerSpec = {
  initialLabel: "lifecycle-boot",
  initialPositions: 1,
  directionCount: Object.keys(DIRECTIONS).length,
  fidelity: "lossless",
  isConstant: false,
  transitions: [
    { direction: DIRECTIONS.VERIFIED, directionName: "VERIFIED", effect: { type: "grow", positionDelta: 2 } },
    { direction: DIRECTIONS.UPGRADED, directionName: "UPGRADED", effect: { type: "scale", factor: 3 } },
    { direction: DIRECTIONS.DEGRADED, directionName: "DEGRADED", effect: { type: "shrink", positionDelta: 1 } },
    { direction: DIRECTIONS.DIED, directionName: "DIED", effect: { type: "halt" } },
    { direction: DIRECTIONS.EXPIRED, directionName: "EXPIRED", effect: { type: "reset" } },
  ],
};
