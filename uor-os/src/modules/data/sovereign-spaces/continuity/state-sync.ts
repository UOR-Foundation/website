/**
 * Session Continuity — Cross-Device State Sync
 * ═════════════════════════════════════════════════════════════════
 *
 * Pushes session snapshots to the change-DAG so other devices can
 * reconstruct the exact environment. Pulls remote snapshots on boot
 * and applies them via the merge algorithm.
 *
 * @layer sovereign-spaces/continuity
 */

import type { SessionSnapshot } from "./session-state";
import { mergeSnapshots, advanceLamport } from "./session-state";
import { getSovereignStore } from "./native-store";

const SNAPSHOT_KEY = "session:snapshot";
const HISTORY_KEY = "session:history";
const MAX_HISTORY = 10;

// ── Local persistence ───────────────────────────────────────────────────

/**
 * Save a session snapshot to the local sovereign store.
 */
export async function saveSnapshot(snapshot: SessionSnapshot): Promise<void> {
  const store = getSovereignStore();
  await store.set(SNAPSHOT_KEY, snapshot);

  // Append to history ring buffer
  const history = (await store.get<SessionSnapshot[]>(HISTORY_KEY)) ?? [];
  history.push(snapshot);
  if (history.length > MAX_HISTORY) history.shift();
  await store.set(HISTORY_KEY, history);
}

/**
 * Load the most recent session snapshot from local store.
 */
export async function loadSnapshot(): Promise<SessionSnapshot | null> {
  const store = getSovereignStore();
  return store.get<SessionSnapshot>(SNAPSHOT_KEY);
}

/**
 * Load snapshot history for time-travel / undo.
 */
export async function loadSnapshotHistory(): Promise<SessionSnapshot[]> {
  const store = getSovereignStore();
  return (await store.get<SessionSnapshot[]>(HISTORY_KEY)) ?? [];
}

// ── Remote sync ─────────────────────────────────────────────────────────

/**
 * Attempt to reconcile a remote snapshot with the local one.
 * Returns the winning snapshot.
 */
export async function reconcileRemote(
  remote: SessionSnapshot,
): Promise<SessionSnapshot> {
  const local = await loadSnapshot();
  advanceLamport(remote.lamport);
  const winner = mergeSnapshots(local, remote);
  await saveSnapshot(winner);
  return winner;
}

/**
 * Get the current snapshot CID for sync protocol HEAD exchange.
 */
export async function getHeadCid(): Promise<string | null> {
  const snapshot = await loadSnapshot();
  return snapshot?.cid ?? null;
}
