/**
 * Time Machine — Auto-Save Engine.
 * ═════════════════════════════════════════════════════════════════
 *
 * Configurable interval-based auto-save using requestIdleCallback
 * to avoid blocking the UI. Only creates checkpoints when state
 * has actually changed.
 *
 * @module time-machine/auto-save
 */

import type { TimeMachineConfig } from "./types";
import { captureCheckpoint, type CaptureParams } from "./checkpoint-capture";
import { checkpointStore } from "./checkpoint-store";

// ── State ───────────────────────────────────────────────────────────────

let _timer: ReturnType<typeof setInterval> | null = null;
let _running = false;
let _lastSaveAttempt = 0;
let _captureInProgress = false;
let _stateGetter: (() => Omit<CaptureParams, "type">) | null = null;
let _onCheckpointSaved: ((id: string, sequence: number) => void) | null = null;

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Start the auto-save engine.
 *
 * @param getState - Function that returns the current desktop state.
 * @param onSaved - Callback when a checkpoint is successfully saved.
 */
export function startAutoSave(
  getState: () => Omit<CaptureParams, "type">,
  onSaved?: (id: string, sequence: number) => void,
): void {
  _stateGetter = getState;
  _onCheckpointSaved = onSaved ?? null;
  _running = true;

  // Load config and start timer
  checkpointStore.loadConfig().then((config) => {
    if (!config.enabled) {
      _running = false;
      return;
    }
    _scheduleTimer(config.intervalMinutes);
  });
}

/**
 * Stop the auto-save engine.
 */
export function stopAutoSave(): void {
  _running = false;
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

/**
 * Update the auto-save interval. Restarts the timer.
 */
export function updateAutoSaveInterval(minutes: number): void {
  if (_timer) clearInterval(_timer);
  _scheduleTimer(minutes);
}

/**
 * Trigger an immediate auto-save (e.g., before a risky operation).
 * Returns the checkpoint ID or null if no change.
 */
export async function saveNow(): Promise<string | null> {
  if (!_stateGetter) return null;
  return _doSave();
}

/**
 * Whether the auto-save engine is currently running.
 */
export function isAutoSaveRunning(): boolean {
  return _running;
}

// ── Internal ────────────────────────────────────────────────────────────

function _scheduleTimer(minutes: number): void {
  if (_timer) clearInterval(_timer);
  const ms = minutes * 60 * 1000;
  _timer = setInterval(() => {
    if (!_running || _captureInProgress) return;
    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => _doSave(), { timeout: 5000 });
    } else {
      setTimeout(() => _doSave(), 0);
    }
  }, ms);
}

async function _doSave(): Promise<string | null> {
  if (_captureInProgress || !_stateGetter) return null;
  _captureInProgress = true;
  _lastSaveAttempt = Date.now();

  try {
    const state = _stateGetter();
    const checkpoint = await captureCheckpoint({
      ...state,
      type: "auto",
    });

    if (checkpoint) {
      console.debug(`[TimeMachine] Auto-save #${checkpoint.sequence} saved (${checkpoint.id})`);
      _onCheckpointSaved?.(checkpoint.id, checkpoint.sequence);
      return checkpoint.id;
    }
    return null;
  } catch (err) {
    console.warn("[TimeMachine] Auto-save failed:", (err as Error).message);
    return null;
  } finally {
    _captureInProgress = false;
  }
}

export { _lastSaveAttempt as lastSaveAttempt };
