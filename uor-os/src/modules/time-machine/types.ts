/**
 * Time Machine — Type Definitions.
 * ═════════════════════════════════════════════════════════════════
 *
 * Complete type system for continuous auto-save, rollback, and forking.
 * Each SystemCheckpoint is content-addressed via singleProofHash.
 *
 * @module time-machine/types
 */

import type { SessionSnapshot, AppBufferState } from "@/modules/sovereign-spaces/continuity/session-state";

// ── Checkpoint Types ────────────────────────────────────────────────────

export interface SystemCheckpoint {
  /** Content-addressed ID (singleProofHash of checkpoint data). */
  id: string;
  /** Monotonic sequence number. */
  sequence: number;
  /** Previous checkpoint CID (chain). null for genesis. */
  parentId: string | null;
  /** Branch name — "main" or user-defined fork name. */
  branchName: string;
  /** ISO creation timestamp. */
  timestamp: string;
  /** How the checkpoint was created. */
  type: "auto" | "manual";
  /** User-defined label for manual checkpoints. */
  label?: string;

  // ── Desktop State ──────────────────────────────────────────────────
  desktop: SessionSnapshot;

  // ── Knowledge Graph ────────────────────────────────────────────────
  /** Full or delta N-Quads. */
  graphNQuads: string;
  /** If true, graphNQuads is a delta (additions only). */
  isDelta: boolean;
  /** If delta, the full snapshot it's relative to. */
  baseCheckpointId?: string;
  /** Quad count at snapshot time (for comparison). */
  quadCount: number;

  // ── Orchestrator ───────────────────────────────────────────────────
  orchestratorState: SerializedOrchestratorState;

  // ── Settings & Vault ───────────────────────────────────────────────
  settings: Record<string, unknown>;
  vaultManifest: string[];

  // ── Integrity ──────────────────────────────────────────────────────
  /** singleProofHash of the entire checkpoint (excluding id). */
  sealHash: string;
}

export interface SerializedOrchestratorState {
  instances: Array<{
    name: string;
    state: string;
    callCount: number;
    deniedCount: number;
    payloadBytes: number;
    lastSealHash?: string;
  }>;
  metrics: {
    totalBlueprints: number;
    runningInstances: number;
    totalCalls: number;
    uptimeMs: number;
  };
}

export interface CheckpointMeta {
  id: string;
  sequence: number;
  parentId: string | null;
  branchName: string;
  timestamp: string;
  type: "auto" | "manual";
  label?: string;
  quadCount: number;
  sealHash: string;
}

// ── Configuration ───────────────────────────────────────────────────────

export type AutoSaveInterval = 5 | 10 | 15 | 30 | 60;

export interface TimeMachineConfig {
  /** Auto-save interval in minutes. */
  intervalMinutes: AutoSaveInterval;
  /** Maximum number of checkpoints to retain. */
  maxCheckpoints: number;
  /** Whether auto-save is enabled. */
  enabled: boolean;
  /** Current branch name. */
  activeBranch: string;
}

export const DEFAULT_CONFIG: TimeMachineConfig = {
  intervalMinutes: 15,
  maxCheckpoints: 50,
  enabled: true,
  activeBranch: "main",
};

// ── Branch ──────────────────────────────────────────────────────────────

export interface BranchInfo {
  name: string;
  headId: string;
  headSequence: number;
  createdAt: string;
  checkpointCount: number;
}

// ── Diff ────────────────────────────────────────────────────────────────

export interface CheckpointDiff {
  fromId: string;
  toId: string;
  quadCountDelta: number;
  windowsAdded: number;
  windowsRemoved: number;
  settingsChanged: string[];
  timeDelta: number;
}
