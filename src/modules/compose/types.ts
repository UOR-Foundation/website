/**
 * Sovereign Compose — Type Definitions.
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
  | "kernel:call"
  | "kernel:denied";

export interface ComposeEvent {
  type: ComposeEventType;
  timestamp: number;
  instanceId?: string;
  blueprintName?: string;
  detail?: Record<string, unknown>;
}
