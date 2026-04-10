/**
 * Scheduling & Orchestration — Type Definitions.
 * @ontology uor:Scheduler
 * ═════════════════════════════════════════════════════════════════
 *
 * Content-addressed application blueprints, per-app kernels,
 * and orchestrator state types.
 *
 * Inspired by:
 *   Docker   → content-addressed layered images
 *   Unikraft → single-purpose kernels with minimal attack surface
 *   K8s      → declarative desired-state reconciliation
 *   FlexOS   → fine-grained compartmentalization & call budgets
 *
 * @version 2.0.0
 */

import type { ComponentType } from "react";
import type { OsCategory } from "@/modules/desktop/lib/os-taxonomy";

// ── AppBlueprint — The "Pod Spec" ─────────────────────────────────────────

/** A morphism interface that an app exposes to other apps via the bus. */
export interface MorphismInterface {
  /** Bus method name this app registers (e.g. "oracle/ask") */
  method: string;
  /** Human-readable description */
  description: string;
  /** JSON Schema for params (optional) */
  paramsSchema?: Record<string, unknown>;
}

/** Call-rate budget for FlexOS-style compartmentalization. */
export interface CallBudget {
  /** Max calls per second (sliding window). Exceeding degrades the kernel. */
  maxPerSecond?: number;
  /** Max total calls over the kernel's lifetime. Exceeding stops the kernel. */
  maxTotal?: number;
}

/** Resource constraints for a running app instance. */
export interface AppResources {
  /** Max JS heap hint (e.g. "64mb") — advisory, not enforced in browser */
  memory?: string;
  /** Max Web Workers this app may spawn */
  workers?: number;
  /** Whether this app needs SharedArrayBuffer */
  requiresSAB?: boolean;
  /** Call-rate budget (FlexOS compartmentalization) */
  callBudget?: CallBudget;
}

/** Health check definition. */
export interface AppHealthcheck {
  /** Bus operation to call for health (e.g. "graph/ping") */
  op: string;
  /** Interval in seconds between checks */
  intervalSec: number;
}

/**
 * AppBlueprint — a declarative, content-addressed application definition.
 *
 * Every application in the system is described by a blueprint.
 * The blueprint is hashed via singleProofHash to produce a canonical ID,
 * making it verifiable and tamper-evident.
 */
export interface AppBlueprint {
  "@context": "https://uor.foundation/contexts/compose-v1.jsonld";
  "@type": "uor:AppBlueprint";

  /** Human-readable application name */
  name: string;
  /** Semver version */
  version: string;
  /** Content-addressed canonical ID (computed, not user-supplied) */
  canonicalId?: string;

  // ── Composition ───────────────────────────────────────────────────────

  /** Bus operations this app requires (e.g. ["graph/query", "cert/issue"]) */
  requires: string[];
  /** Namespace prefixes this app may access (e.g. ["graph/", "cert/"]) */
  permissions: string[];
  /** Morphisms this app exposes to other apps */
  morphisms: MorphismInterface[];

  // ── Performance ──────────────────────────────────────────────────────

  /**
   * Operations eligible for fast-path dispatch (bypass bus middleware).
   * Only local, non-remote operations should be listed here.
   * Inspired by Unikraft's zero-overhead syscall inlining.
   */
  fastPath?: string[];

  /**
   * Whether to start this app during orchestrator.init().
   * false = lazy start on first access (sub-ms boot).
   * Default: true for backward compat.
   */
  autoStart?: boolean;

  // ── UI ────────────────────────────────────────────────────────────────

  /** Lazy-loaded React component path */
  ui: {
    /** Module path for dynamic import (e.g. "@/modules/oracle/pages/OraclePage") */
    component: string;
    /** Always true — all app UIs are lazy-loaded */
    lazy: true;
  };
  /** Default window size in the desktop shell */
  defaultSize?: { w: number; h: number };
  /** Accent color for taskbar / app hub */
  color: string;
  /** OS taxonomy category */
  category: OsCategory;
  /** Short description for App Hub cards */
  description: string;
  /** Keywords for Spotlight search */
  keywords: string[];
  /** Icon component name from lucide-react */
  iconName: string;

  // ── Runtime ───────────────────────────────────────────────────────────

  /** Resource constraints */
  resources: AppResources;
  /** Health check definition */
  healthcheck?: AppHealthcheck;
  /** If true, app is hidden from App Hub (e.g. internal search) */
  hidden?: boolean;
}

// ── AppKernel — Per-App Isolated Runtime ──────────────────────────────────

/** Lifecycle state of an app instance. */
export type AppInstanceState =
  | "pending"            // blueprint accepted, deps resolving
  | "starting"           // UI component loading
  | "running"            // active and healthy
  | "degraded"           // healthcheck failing but still rendering
  | "stopped"            // intentionally stopped
  | "crashed"            // unrecoverable error
  | "callBudgetExhausted";  // rate-limited, no further calls accepted

/** Runtime metadata for a running app instance. */
export interface AppInstance {
  /** Unique instance ID (uuid) */
  instanceId: string;
  /** The blueprint this instance was created from */
  blueprint: AppBlueprint;
  /** Current lifecycle state */
  state: AppInstanceState;
  /** Timestamp when instance was created */
  createdAt: number;
  /** Timestamp of last successful healthcheck */
  lastHealthy?: number;
  /** Number of bus calls made by this instance */
  callCount: number;
  /** Number of permission-denied calls */
  deniedCount: number;
  /** Error message if crashed */
  error?: string;

  // ── Unikraft-inspired additions ────────────────────────────────────

  /** Time in ms from schedule to running state */
  bootTimeMs?: number;
  /** Cumulative serialized payload bytes across all calls */
  payloadBytes: number;
  /** Number of Web Worker slots allocated from the pool */
  workersAllocated: number;
  /** Content-addressed hash of the last runtime-state seal */
  lastSealHash?: string;
  /** Consecutive healthcheck failures (circuit breaker counter) */
  consecutiveFailures: number;
}

// ── Orchestrator State ───────────────────────────────────────────────────

/** Orchestrator-level metrics. */
export interface OrchestratorMetrics {
  /** Total blueprints registered */
  totalBlueprints: number;
  /** Currently running instances */
  runningInstances: number;
  /** Total bus calls across all app kernels */
  totalCalls: number;
  /** Total permission denials */
  totalDenied: number;
  /** Uptime in ms */
  uptimeMs: number;

  // ── Unikraft-inspired additions ────────────────────────────────────

  /** Sum of payloadBytes across all instances */
  totalPayloadBytes: number;
  /** Worker slots currently in use */
  workerSlotsUsed: number;
  /** Total worker slots available in the pool */
  workerSlotsTotal: number;
}

/** The full orchestrator state, exposed to UI via hooks. */
export interface OrchestratorState {
  /** All registered blueprints by name */
  blueprints: Map<string, AppBlueprint>;
  /** All running instances by instanceId */
  instances: Map<string, AppInstance>;
  /** Aggregate metrics */
  metrics: OrchestratorMetrics;
  /** Whether the orchestrator is initialized */
  ready: boolean;
}

// ── Events ───────────────────────────────────────────────────────────────

export type ComposeEventType =
  | "blueprint:registered"
  | "blueprint:removed"
  | "instance:started"
  | "instance:stopped"
  | "instance:crashed"
  | "instance:healthcheck"
  | "instance:sealed"
  | "instance:budgetExhausted"
  | "instance:updated"
  | "kernel:call"
  | "kernel:denied"
  | "reconciler:drift"
  | "reconciler:corrected"
  | "reconciler:epoch"
  | "scaler:adjusted";

export interface ComposeEvent {
  type: ComposeEventType;
  timestamp: number;
  instanceId?: string;
  blueprintName?: string;
  detail?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════
// SOVEREIGN RECONCILER — Kubernetes-Equivalent Control Plane
// ══════════════════════════════════════════════════════════════════════════
//
// The Sovereign Reconciler is the declarative control plane for the
// Sovereign Compose orchestrator. It provides the three missing Kubernetes
// primitives: Desired-State Store, Reconciliation Loop, and Rolling Updates.
//
// Every type below is canonically mapped to a UOR Foundation kernel type,
// grounding high-level orchestration concepts in the algebraic substrate.
//
// K8s Component          → UOR Kernel Type
// ─────────────────────────────────────────
// Desired-State Store    → kernel::region::RegionPartition
// Reconciliation Loop    → kernel::recursion::RecursiveComputation
// Drift Detection        → kernel::predicate::MatchExpression
// Corrective Actions     → kernel::effect::EffectChain
// Circuit Breaker        → kernel::failure::RecoveryStrategy
// Scheduler              → kernel::parallel::DisjointBudget
// Rolling Update         → kernel::cascade::CascadeComposition
// Auto-Scaling           → kernel::stream::StreamTransform
// Reconciler Tick        → kernel::reduction::ReductionEpoch
// Full Pipeline          → kernel::reduction::ReductionPipeline
//
// Atomic operations decompose to PrimitiveOps:
//   Comparison (desired vs actual) → Xor (HypercubeTranslation)
//   Correction (apply action)      → Succ/Pred (Rotation)
//   Composition (chain actions)    → And (HypercubeProjection)
//   Identity verification (seal)   → Neg ∘ Bnot = Succ (Critical Identity)
// ══════════════════════════════════════════════════════════════════════════

// ── Scaling Configuration (AppBlueprint extension) ──────────────────────

/** Auto-scaling configuration for a blueprint. Maps to kernel::stream::StreamTransform. */
export interface ScalingConfig {
  /** Minimum worker slots to maintain. */
  minWorkers: number;
  /** Maximum worker slots to scale up to. */
  maxWorkers: number;
  /** Target calls/sec — scaler adjusts workers to maintain this rate headroom. */
  targetCallRate: number;
}

// ── Desired-State Store — kernel::region::RegionPartition ───────────────

/**
 * DesiredState — a single entry in the desired-state store.
 *
 * UOR mapping: Each DesiredState occupies a Region in the blueprint
 * address space. The full store is a RegionPartition that must be
 * isComplete() (all blueprints accounted for) and isDisjoint()
 * (no duplicate instances of the same blueprint).
 */
export interface DesiredState {
  /** Blueprint name — the region identifier. */
  blueprintName: string;
  /** Whether this blueprint should be running. */
  shouldRun: boolean;
  /** Target worker slot count. */
  desiredWorkers: number;
  /** Expected blueprint version (for rolling update detection). */
  version: string;
}

// ── Drift Detection — kernel::predicate::MatchExpression ────────────────

/**
 * DriftKind — discriminator for the type of drift detected.
 *
 * UOR mapping: Each drift kind corresponds to a MatchArm in a
 * MatchExpression. The match must be isExhaustive() — every
 * possible state difference is classified.
 */
export type DriftKind =
  | "missing"           // should run but isn't → start
  | "unexpected"        // shouldn't run but is → stop
  | "version_mismatch"  // running but wrong version → rolling update
  | "state_degraded"    // running but unhealthy → restart
  | "worker_mismatch";  // wrong worker count → scale

/**
 * DriftRecord — a single detected drift between desired and actual state.
 *
 * UOR mapping: The output of evaluating a MatchExpression arm.
 */
export interface DriftRecord {
  kind: DriftKind;
  blueprintName: string;
  desired: Partial<DesiredState>;
  actual: {
    running: boolean;
    version?: string;
    state?: AppInstanceState;
    workers?: number;
  };
}

// ── Corrective Actions — kernel::effect::EffectChain ────────────────────

/**
 * CorrectionAction — a typed corrective effect.
 *
 * UOR mapping:
 *   "start"   → PinEffect (pin a blueprint to running state)
 *   "stop"    → UnbindEffect (remove binding from instance map)
 *   "restart" → EndomorphismEffect (apply restart endomorphism)
 *   "update"  → CascadeMap (two-step version transition)
 *   "scale"   → StreamTransform (adjust worker allocation)
 */
export type CorrectionAction = "start" | "stop" | "restart" | "update" | "scale";

export interface Correction {
  action: CorrectionAction;
  blueprintName: string;
  drift: DriftRecord;
  /** Whether this correction is reversible (all are). */
  reversible: true;
}

// ── Reconciler Epoch — kernel::reduction::ReductionEpoch ────────────────

/**
 * ReconcilerEpoch — a single tick of the reconciliation loop.
 *
 * UOR mapping: A ReductionEpoch where:
 *   - rules() = the corrections applied
 *   - reductionCount() = number of corrections
 *   - normalized() = no more drift detected
 *   - gate() = health invariant (all corrections succeeded)
 */
export interface ReconcilerEpoch {
  /** Epoch index (monotonically increasing). */
  index: number;
  /** Timestamp of this epoch. */
  timestamp: number;
  /** Drifts detected in this epoch. */
  drifts: DriftRecord[];
  /** Corrections applied. */
  corrections: Correction[];
  /** Whether the system reached a stable state (no drift). */
  normalized: boolean;
  /** Duration of this epoch in ms. */
  durationMs: number;
}

// ── Reconciler Status — kernel::reduction::ReductionPipeline ────────────

/**
 * ReconcilerStatus — the full state of the reconciliation pipeline.
 *
 * UOR mapping: A ReductionPipeline where:
 *   - epochs() = all completed epochs
 *   - totalReductions() = total corrections applied
 *   - converged() = system is stable (last epoch normalized)
 *   - finalState() = current orchestrator state
 */
export interface ReconcilerStatus {
  /** Whether the reconciler is actively running. */
  active: boolean;
  /** Total epochs completed. */
  totalEpochs: number;
  /** Total corrections applied across all epochs. */
  totalCorrections: number;
  /** Whether the system is currently converged (no drift). */
  converged: boolean;
  /** Last N epochs for observability. */
  recentEpochs: ReconcilerEpoch[];
  /** Reconciler tick interval in ms. */
  intervalMs: number;
  /** Current desired-state store snapshot. */
  desiredState: DesiredState[];
}

// ── Rolling Update — kernel::cascade::CascadeComposition ────────────────

/**
 * RollingUpdateState — tracks a version transition in progress.
 *
 * UOR mapping: A CascadeComposition with two CascadeMaps:
 *   map₁ = start new version instance
 *   map₂ = stop old version instance (after health gate passes)
 *
 * The CascadeEpoch.converged() check maps to "new instance healthy".
 */
export interface RollingUpdateState {
  blueprintName: string;
  oldVersion: string;
  newVersion: string;
  oldInstanceId: string;
  newInstanceId?: string;
  phase: "starting_new" | "health_check" | "stopping_old" | "completed" | "rolled_back";
  startedAt: number;
  completedAt?: number;
}

// ── Auto-Scaler — kernel::stream::StreamTransform ───────────────────────

/**
 * ScalerDecision — a single scaling decision.
 *
 * UOR mapping: The output of a StreamTransform applied to a
 * Stream of call-rate samples. lengthPreserving: true (one
 * decision per sample).
 */
export interface ScalerDecision {
  blueprintName: string;
  currentWorkers: number;
  targetWorkers: number;
  reason: string;
  callRate: number;
  timestamp: number;
}
