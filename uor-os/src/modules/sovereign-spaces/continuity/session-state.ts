/**
 * Session Continuity — State Serialization
 * ═════════════════════════════════════════════════════════════════
 *
 * Captures the complete desktop environment state into a content-addressed
 * snapshot. Includes window layout, active apps, scroll positions, draft
 * buffers, and theme — enabling "pick up where you left off" across devices.
 *
 * @layer sovereign-spaces/continuity
 */

import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";

// ── Types ───────────────────────────────────────────────────────────────

export interface AppBufferState {
  appId: string;
  windowId: string;
  scrollTop?: number;
  scrollLeft?: number;
  draftContent?: string;
  cursorPosition?: number;
  activeTab?: string;
  meta?: Record<string, unknown>;
}

export interface SessionSnapshot {
  /** Content-addressed ID (SHA-256 of canonical JSON) */
  cid: string;
  /** ISO timestamp of creation */
  timestamp: string;
  /** Device that created this snapshot */
  deviceId: string;
  /** Lamport clock for causal ordering */
  lamport: number;
  /** Complete window layout */
  windows: WindowState[];
  /** Active window ID at snapshot time */
  activeWindowId: string | null;
  /** Per-app buffer state (drafts, scroll positions, etc.) */
  appBuffers: AppBufferState[];
  /** Desktop theme at snapshot time */
  theme: string;
  /** Spotlight was open */
  spotlightOpen: boolean;
  /** Any quick-capture content in progress */
  quickCaptureContent?: string;
}

// ── Serialization ───────────────────────────────────────────────────────

let _lamport = 0;

/**
 * Create a session snapshot from the current desktop state.
 */
export function createSnapshot(params: {
  windows: WindowState[];
  activeWindowId: string | null;
  theme: string;
  deviceId: string;
  appBuffers?: AppBufferState[];
  spotlightOpen?: boolean;
  quickCaptureContent?: string;
}): SessionSnapshot {
  _lamport++;
  const snapshot: SessionSnapshot = {
    cid: "", // computed after serialization
    timestamp: new Date().toISOString(),
    deviceId: params.deviceId,
    lamport: _lamport,
    windows: params.windows,
    activeWindowId: params.activeWindowId,
    appBuffers: params.appBuffers ?? [],
    theme: params.theme,
    spotlightOpen: params.spotlightOpen ?? false,
    quickCaptureContent: params.quickCaptureContent,
  };

  // Compute CID from canonical serialization (excluding cid field)
  snapshot.cid = computeSnapshotCid(snapshot);
  return snapshot;
}

/**
 * Merge a remote snapshot into the current state.
 * Strategy: if remote lamport > local lamport, adopt remote state.
 * Otherwise, keep local (last-writer-wins by Lamport clock).
 */
export function mergeSnapshots(
  local: SessionSnapshot | null,
  remote: SessionSnapshot,
): SessionSnapshot {
  if (!local) return remote;
  if (remote.lamport > local.lamport) {
    _lamport = remote.lamport;
    return remote;
  }
  // Tie-break by timestamp
  if (remote.lamport === local.lamport && remote.timestamp > local.timestamp) {
    return remote;
  }
  return local;
}

/**
 * Update the Lamport clock when receiving a remote event.
 */
export function advanceLamport(remoteLamport: number): void {
  _lamport = Math.max(_lamport, remoteLamport) + 1;
}

// ── CID computation ─────────────────────────────────────────────────────

function computeSnapshotCid(snapshot: SessionSnapshot): string {
  const { cid: _, ...rest } = snapshot;
  const canonical = JSON.stringify(rest, Object.keys(rest).sort());
  // Simple FNV-1a 64-bit hash for fast content addressing
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < canonical.length; i++) {
    h ^= BigInt(canonical.charCodeAt(i));
    h = BigInt.asUintN(64, h * 0x100000001b3n);
  }
  return `snap:${h.toString(36)}`;
}
