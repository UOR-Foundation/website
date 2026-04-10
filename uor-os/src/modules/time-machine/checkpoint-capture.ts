/**
 * Time Machine — Checkpoint Capture.
 * ═════════════════════════════════════════════════════════════════
 *
 * Captures a complete atomic snapshot of the entire system state:
 *   - Desktop layout (windows, theme, active window)
 *   - Knowledge graph (N-Quads)
 *   - Orchestrator state (instances, metrics)
 *   - User settings (localStorage KV)
 *   - Vault manifest (slot keys)
 *
 * @module time-machine/checkpoint-capture
 */

import type { SystemCheckpoint, SerializedOrchestratorState } from "./types";
import { createSnapshot, type SessionSnapshot } from "@/modules/sovereign-spaces/continuity/session-state";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";
import { grafeoStore } from "@/modules/knowledge-graph/grafeo-store";
import { orchestrator } from "@/modules/compose/orchestrator";
import { checkpointStore } from "./checkpoint-store";
import { sha256hex } from "@/lib/crypto";

// ── Device ID ───────────────────────────────────────────────────────────

function getDeviceId(): string {
  const key = "uor:device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `device-${crypto.randomUUID?.() ?? Date.now().toString(36)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

// ── Settings Snapshot ───────────────────────────────────────────────────

function captureSettings(): Record<string, unknown> {
  const settings: Record<string, unknown> = {};
  const prefixes = ["uor:", "sovereign:", "tm:"];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (prefixes.some((p) => key.startsWith(p))) {
      try {
        settings[key] = JSON.parse(localStorage.getItem(key)!);
      } catch {
        settings[key] = localStorage.getItem(key);
      }
    }
  }
  return settings;
}

// ── Vault Manifest ──────────────────────────────────────────────────────

function captureVaultManifest(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("vault:")) keys.push(key);
  }
  return keys.sort();
}

// ── Orchestrator Serialization ──────────────────────────────────────────

function captureOrchestratorState(): SerializedOrchestratorState {
  const state = orchestrator.state();
  const instances: SerializedOrchestratorState["instances"] = [];

  for (const [, inst] of state.instances) {
    instances.push({
      name: inst.blueprint.name,
      state: inst.state,
      callCount: inst.callCount,
      deniedCount: inst.deniedCount,
      payloadBytes: inst.payloadBytes,
      lastSealHash: inst.lastSealHash,
    });
  }

  return {
    instances,
    metrics: {
      totalBlueprints: state.metrics.totalBlueprints,
      runningInstances: state.metrics.runningInstances,
      totalCalls: state.metrics.totalCalls,
      uptimeMs: state.metrics.uptimeMs,
    },
  };
}

// ── Desktop State ───────────────────────────────────────────────────────

function captureDesktop(
  windows: WindowState[],
  activeWindowId: string | null,
  theme: string,
): SessionSnapshot {
  return createSnapshot({
    windows,
    activeWindowId,
    theme,
    deviceId: getDeviceId(),
  });
}

// ── Seal Hash ───────────────────────────────────────────────────────────

async function computeSealHash(data: Omit<SystemCheckpoint, "id" | "sealHash">): Promise<string> {
  const canonical = JSON.stringify(data, Object.keys(data as any).sort());
  return sha256hex(canonical);
}

// ── Public API ──────────────────────────────────────────────────────────

export interface CaptureParams {
  windows: WindowState[];
  activeWindowId: string | null;
  theme: string;
  type: "auto" | "manual";
  label?: string;
  branchName?: string;
}

/**
 * Capture a full system checkpoint.
 *
 * For auto-saves: if the last checkpoint was recent and nothing changed
 * (same seal hash), returns null (no checkpoint created).
 */
export async function captureCheckpoint(params: CaptureParams): Promise<SystemCheckpoint | null> {
  const config = await checkpointStore.loadConfig();
  const branch = params.branchName ?? config.activeBranch;
  const lastCheckpoint = await checkpointStore.getLatest(branch);

  // ── Capture all layers ──────────────────────────────────────────────
  const desktop = captureDesktop(params.windows, params.activeWindowId, params.theme);
  const orchestratorState = captureOrchestratorState();
  const settings = captureSettings();
  const vaultManifest = captureVaultManifest();

  // ── Graph N-Quads ──────────────────────────────────────────────────
  let graphNQuads: string;
  let isDelta = false;
  let baseCheckpointId: string | undefined;
  let quadCount: number;

  try {
    quadCount = await grafeoStore.quadCount();
  } catch {
    quadCount = 0;
  }

  if (params.type === "manual" || !lastCheckpoint) {
    // Full snapshot for manual checkpoints or first checkpoint
    try {
      graphNQuads = await grafeoStore.dumpNQuads();
    } catch {
      graphNQuads = "";
    }
  } else {
    // Incremental delta for auto-saves: only dump if quad count changed
    if (quadCount !== lastCheckpoint.quadCount) {
      try {
        graphNQuads = await grafeoStore.dumpNQuads();
      } catch {
        graphNQuads = "";
      }
      isDelta = false; // Store full for now; true delta requires change tracking
      // Find the nearest full snapshot as base
      const baseId = lastCheckpoint.isDelta ? lastCheckpoint.baseCheckpointId : lastCheckpoint.id;
      baseCheckpointId = baseId ?? undefined;
    } else {
      graphNQuads = ""; // No change
      isDelta = true;
      baseCheckpointId = lastCheckpoint.isDelta ? lastCheckpoint.baseCheckpointId : lastCheckpoint.id;
    }
  }

  // ── Assemble checkpoint (without id and sealHash) ──────────────────
  const sequence = await checkpointStore.getNextSequence();
  const partialCheckpoint = {
    sequence,
    parentId: lastCheckpoint?.id ?? null,
    branchName: branch,
    timestamp: new Date().toISOString(),
    type: params.type,
    label: params.label,
    desktop,
    graphNQuads,
    isDelta,
    baseCheckpointId,
    quadCount,
    orchestratorState,
    settings,
    vaultManifest,
  };

  // ── Compute seal hash ──────────────────────────────────────────────
  const sealHash = await computeSealHash(partialCheckpoint as any);

  // ── Skip if nothing changed (auto-save only) ──────────────────────
  if (params.type === "auto" && lastCheckpoint?.sealHash === sealHash) {
    return null; // No change detected
  }

  // ── Compute content-addressed ID ───────────────────────────────────
  const id = `cp:${sealHash.slice(0, 16)}:${sequence}`;

  const checkpoint: SystemCheckpoint = {
    id,
    ...partialCheckpoint,
    sealHash,
  };

  // ── Persist & prune ────────────────────────────────────────────────
  await checkpointStore.save(checkpoint);
  await checkpointStore.prune(config.maxCheckpoints);

  return checkpoint;
}

/**
 * Compute a quick "state fingerprint" without creating a checkpoint.
 * Used by the auto-save engine to check if state has changed.
 */
export async function currentStateFingerprint(
  windows: WindowState[],
  theme: string,
): Promise<string> {
  let qc = 0;
  try { qc = await grafeoStore.quadCount(); } catch {}
  const data = JSON.stringify({ wc: windows.length, theme, qc });
  return sha256hex(data);
}
