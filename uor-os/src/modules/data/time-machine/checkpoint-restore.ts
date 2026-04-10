/**
 * Time Machine — Checkpoint Restore.
 * ═════════════════════════════════════════════════════════════════
 *
 * Restores the entire system state from a checkpoint:
 *   1. Knowledge graph (clear + reload N-Quads)
 *   2. Desktop layout (window state injection)
 *   3. User settings (localStorage)
 *   4. Orchestrator state (informational — instances auto-restart)
 *
 * @module time-machine/checkpoint-restore
 */

import type { SystemCheckpoint } from "./types";
import { checkpointStore } from "./checkpoint-store";
import { grafeoStore } from "@/modules/data/knowledge-graph/grafeo-store";

// ── Types ───────────────────────────────────────────────────────────────

export interface RestoreResult {
  success: boolean;
  checkpoint: SystemCheckpoint;
  restoredAt: string;
  quadsLoaded: number;
  windowsRestored: number;
  settingsRestored: number;
  errors: string[];
}

export type WindowStateSetter = (windows: any[]) => void;
export type ActiveWindowSetter = (id: string | null) => void;
export type ThemeSetter = (theme: string) => void;

// ── Restore Engine ──────────────────────────────────────────────────────

/**
 * Restore the system to a checkpoint state.
 *
 * @param checkpoint - The checkpoint to restore to.
 * @param setWindows - Callback to set window layout state.
 * @param setActiveWindow - Callback to set the active window.
 * @param setTheme - Callback to set the theme.
 */
export async function restoreCheckpoint(
  checkpoint: SystemCheckpoint,
  setWindows: WindowStateSetter,
  setActiveWindow: ActiveWindowSetter,
  setTheme: ThemeSetter,
): Promise<RestoreResult> {
  const errors: string[] = [];
  let quadsLoaded = 0;
  let settingsRestored = 0;

  // ── 1. Resolve full N-Quads (handle deltas) ────────────────────────
  let fullNQuads: string;
  try {
    fullNQuads = await checkpointStore.resolveFullNQuads(checkpoint);
  } catch (err) {
    errors.push(`Failed to resolve N-Quads: ${(err as Error).message}`);
    fullNQuads = checkpoint.graphNQuads;
  }

  // ── 2. Restore Knowledge Graph ─────────────────────────────────────
  if (fullNQuads.length > 0) {
    try {
      await grafeoStore.clear();
      quadsLoaded = await grafeoStore.loadNQuads(fullNQuads);
      console.log(`[TimeMachine] Restored ${quadsLoaded} quads`);
    } catch (err) {
      errors.push(`Graph restore failed: ${(err as Error).message}`);
    }
  }

  // ── 3. Restore Desktop Layout ──────────────────────────────────────
  try {
    const { windows, activeWindowId, theme } = checkpoint.desktop;
    setWindows(windows);
    setActiveWindow(activeWindowId);
    setTheme(theme);
    // Also persist to localStorage for next load
    localStorage.setItem("uor:desktop-windows", JSON.stringify(windows));
  } catch (err) {
    errors.push(`Desktop restore failed: ${(err as Error).message}`);
  }

  // ── 4. Restore Settings ────────────────────────────────────────────
  try {
    for (const [key, value] of Object.entries(checkpoint.settings)) {
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
      settingsRestored++;
    }
  } catch (err) {
    errors.push(`Settings restore failed: ${(err as Error).message}`);
  }

  return {
    success: errors.length === 0,
    checkpoint,
    restoredAt: new Date().toISOString(),
    quadsLoaded,
    windowsRestored: checkpoint.desktop.windows.length,
    settingsRestored,
    errors,
  };
}

/**
 * Fork from a checkpoint: save the current state as a branch,
 * then restore to the selected checkpoint under a new branch name.
 */
export async function forkFromCheckpoint(
  checkpoint: SystemCheckpoint,
  newBranchName: string,
  setWindows: WindowStateSetter,
  setActiveWindow: ActiveWindowSetter,
  setTheme: ThemeSetter,
): Promise<RestoreResult> {
  // Update config to track the new active branch
  const config = await checkpointStore.loadConfig();
  config.activeBranch = newBranchName;
  await checkpointStore.saveConfig(config);

  // Restore the checkpoint (the next auto-save will use the new branch name)
  return restoreCheckpoint(checkpoint, setWindows, setActiveWindow, setTheme);
}
