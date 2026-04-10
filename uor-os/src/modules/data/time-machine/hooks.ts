/**
 * Time Machine — React Hooks.
 * ═════════════════════════════════════════════════════════════════
 *
 * @module time-machine/hooks
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  SystemCheckpoint,
  CheckpointMeta,
  TimeMachineConfig,
  BranchInfo,
  CheckpointDiff,
} from "./types";
import { DEFAULT_CONFIG } from "./types";
import { checkpointStore } from "./checkpoint-store";
import { captureCheckpoint, type CaptureParams } from "./checkpoint-capture";
import {
  restoreCheckpoint,
  forkFromCheckpoint,
  type RestoreResult,
  type WindowStateSetter,
  type ActiveWindowSetter,
  type ThemeSetter,
} from "./checkpoint-restore";
import {
  startAutoSave,
  stopAutoSave,
  updateAutoSaveInterval,
  saveNow,
  isAutoSaveRunning,
} from "./auto-save";

// ── useTimeMachine ──────────────────────────────────────────────────────

export interface UseTimeMachineReturn {
  checkpoints: CheckpointMeta[];
  branches: BranchInfo[];
  config: TimeMachineConfig;
  loading: boolean;
  saving: boolean;

  createCheckpoint: (label?: string) => Promise<SystemCheckpoint | null>;
  restore: (id: string) => Promise<RestoreResult | null>;
  fork: (id: string, branchName: string) => Promise<RestoreResult | null>;
  deleteCheckpoint: (id: string) => Promise<void>;
  updateConfig: (config: Partial<TimeMachineConfig>) => Promise<void>;
  switchBranch: (name: string) => Promise<void>;
  compare: (fromId: string, toId: string) => Promise<CheckpointDiff | null>;
  refresh: () => Promise<void>;
}

export function useTimeMachine(
  getDesktopState: () => Omit<CaptureParams, "type">,
  setWindows: WindowStateSetter,
  setActiveWindow: ActiveWindowSetter,
  setTheme: ThemeSetter,
): UseTimeMachineReturn {
  const [checkpoints, setCheckpoints] = useState<CheckpointMeta[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [config, setConfig] = useState<TimeMachineConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const getStateRef = useRef(getDesktopState);
  getStateRef.current = getDesktopState;

  const refresh = useCallback(async () => {
    const [metas, branchList, cfg] = await Promise.all([
      checkpointStore.listMeta(config.activeBranch),
      checkpointStore.listBranches(),
      checkpointStore.loadConfig(),
    ]);
    setCheckpoints(metas);
    setBranches(branchList);
    setConfig(cfg);
  }, [config.activeBranch]);

  // Initial load + start auto-save
  useEffect(() => {
    let mounted = true;
    (async () => {
      const cfg = await checkpointStore.loadConfig();
      if (!mounted) return;
      setConfig(cfg);

      const [metas, branchList] = await Promise.all([
        checkpointStore.listMeta(cfg.activeBranch),
        checkpointStore.listBranches(),
      ]);
      if (!mounted) return;
      setCheckpoints(metas);
      setBranches(branchList);
      setLoading(false);

      // Start auto-save engine
      startAutoSave(
        () => getStateRef.current(),
        () => { if (mounted) refresh(); },
      );
    })();

    return () => {
      mounted = false;
      stopAutoSave();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createCheckpoint = useCallback(async (label?: string) => {
    setSaving(true);
    try {
      const state = getStateRef.current();
      const cp = await captureCheckpoint({ ...state, type: "manual", label });
      await refresh();
      return cp;
    } finally {
      setSaving(false);
    }
  }, [refresh]);

  const restore = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const cp = await checkpointStore.get(id);
      if (!cp) return null;
      const result = await restoreCheckpoint(cp, setWindows, setActiveWindow, setTheme);
      await refresh();
      return result;
    } finally {
      setSaving(false);
    }
  }, [refresh, setWindows, setActiveWindow, setTheme]);

  const fork = useCallback(async (id: string, branchName: string) => {
    setSaving(true);
    try {
      const cp = await checkpointStore.get(id);
      if (!cp) return null;
      const result = await forkFromCheckpoint(cp, branchName, setWindows, setActiveWindow, setTheme);
      await refresh();
      return result;
    } finally {
      setSaving(false);
    }
  }, [refresh, setWindows, setActiveWindow, setTheme]);

  const deleteCheckpoint = useCallback(async (id: string) => {
    await checkpointStore.delete(id);
    await refresh();
  }, [refresh]);

  const updateConfigCb = useCallback(async (partial: Partial<TimeMachineConfig>) => {
    const newConfig = { ...config, ...partial };
    await checkpointStore.saveConfig(newConfig);
    setConfig(newConfig);

    if (partial.intervalMinutes) {
      updateAutoSaveInterval(partial.intervalMinutes);
    }
    if (partial.enabled === false) {
      stopAutoSave();
    } else if (partial.enabled === true && !isAutoSaveRunning()) {
      startAutoSave(
        () => getStateRef.current(),
        () => refresh(),
      );
    }
  }, [config, refresh]);

  const switchBranch = useCallback(async (name: string) => {
    const newConfig = { ...config, activeBranch: name };
    await checkpointStore.saveConfig(newConfig);
    setConfig(newConfig);
    const metas = await checkpointStore.listMeta(name);
    setCheckpoints(metas);
  }, [config]);

  const compare = useCallback(async (fromId: string, toId: string): Promise<CheckpointDiff | null> => {
    const [from, to] = await Promise.all([
      checkpointStore.get(fromId),
      checkpointStore.get(toId),
    ]);
    if (!from || !to) return null;

    const fromWindowIds = new Set(from.desktop.windows.map((w) => w.id));
    const toWindowIds = new Set(to.desktop.windows.map((w) => w.id));

    const fromSettings = Object.keys(from.settings);
    const toSettings = Object.keys(to.settings);
    const changedSettings = toSettings.filter(
      (k) => JSON.stringify(to.settings[k]) !== JSON.stringify(from.settings[k])
    );

    return {
      fromId,
      toId,
      quadCountDelta: to.quadCount - from.quadCount,
      windowsAdded: [...toWindowIds].filter((id) => !fromWindowIds.has(id)).length,
      windowsRemoved: [...fromWindowIds].filter((id) => !toWindowIds.has(id)).length,
      settingsChanged: changedSettings,
      timeDelta: new Date(to.timestamp).getTime() - new Date(from.timestamp).getTime(),
    };
  }, []);

  return {
    checkpoints, branches, config, loading, saving,
    createCheckpoint, restore, fork, deleteCheckpoint,
    updateConfig: updateConfigCb, switchBranch, compare, refresh,
  };
}
