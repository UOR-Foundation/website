/**
 * NotebookVersionHistory — Browse & restore cloud snapshots
 * ═══════════════════════════════════════════════════════════
 *
 * Stores notebook snapshots in the Data Bank (encrypted, cloud-synced).
 * Developers can browse previous versions, preview diffs, and restore.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  History, RotateCcw, GitCompare, Trash2, X,
  Clock, Save, ChevronRight, FileText, Loader2,
} from "../../platform/bridge";
import { useNbTheme } from "./notebook-theme";
import { useDataBank } from "../hooks/useDataBank";
import type { NotebookDocument } from "./notebook-engine";

// ── Snapshot shape ─────────────────────────────────────────────────────────

export interface NotebookSnapshot {
  id: string;
  name: string;
  cellCount: number;
  timestamp: string;
  label?: string;           // optional user label
  autoSave: boolean;        // true = auto-save, false = manual checkpoint
}

const SLOT_PREFIX = "notebook:snapshot:";
const INDEX_SLOT = "notebook:snapshot-index";
const MAX_SNAPSHOTS = 50;

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useNotebookVersioning(notebookId: string) {
  const dataBank = useDataBank();
  const [snapshots, setSnapshots] = useState<NotebookSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // Load snapshot index
  const loadIndex = useCallback(async () => {
    const raw = await dataBank.getJSON<NotebookSnapshot[]>(INDEX_SLOT);
    const filtered = (raw ?? []).filter(s => s.name);
    setSnapshots(filtered);
    setLoading(false);
  }, [dataBank]);

  useEffect(() => {
    loadIndex();
  }, [loadIndex]);

  // Save a snapshot
  const saveSnapshot = useCallback(
    async (notebook: NotebookDocument, auto = false, label?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const snap: NotebookSnapshot = {
        id,
        name: notebook.name,
        cellCount: notebook.cells.length,
        timestamp: new Date().toISOString(),
        label,
        autoSave: auto,
      };

      // Store the full notebook in its own slot
      await dataBank.setJSON(`${SLOT_PREFIX}${id}`, notebook);

      // Update index (trim to max)
      const updated = [snap, ...snapshots].slice(0, MAX_SNAPSHOTS);
      await dataBank.setJSON(INDEX_SLOT, updated);
      setSnapshots(updated);

      return snap;
    },
    [dataBank, snapshots]
  );

  // Load a full snapshot
  const loadSnapshot = useCallback(
    async (snapshotId: string): Promise<NotebookDocument | null> => {
      return dataBank.getJSON<NotebookDocument>(`${SLOT_PREFIX}${snapshotId}`);
    },
    [dataBank]
  );

  // Delete a snapshot
  const deleteSnapshot = useCallback(
    async (snapshotId: string) => {
      await dataBank.remove(`${SLOT_PREFIX}${snapshotId}`);
      const updated = snapshots.filter(s => s.id !== snapshotId);
      await dataBank.setJSON(INDEX_SLOT, updated);
      setSnapshots(updated);
    },
    [dataBank, snapshots]
  );

  return {
    snapshots,
    loading,
    saveSnapshot,
    loadSnapshot,
    deleteSnapshot,
    authenticated: dataBank.authenticated,
    syncing: dataBank.syncing,
  };
}

// ── Panel Component ────────────────────────────────────────────────────────

interface VersionHistoryPanelProps {
  notebookId: string;
  currentNotebook: NotebookDocument;
  onRestore: (notebook: NotebookDocument) => void;
  onDiff: (remote: NotebookDocument) => void;
  onClose: () => void;
}

export function VersionHistoryPanel({
  notebookId,
  currentNotebook,
  onRestore,
  onDiff,
  onClose,
}: VersionHistoryPanelProps) {
  const t = useNbTheme();
  const {
    snapshots,
    loading,
    saveSnapshot,
    loadSnapshot,
    deleteSnapshot,
    authenticated,
    syncing,
  } = useNotebookVersioning(notebookId);

  const [saving, setSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [showLabelInput, setShowLabelInput] = useState(false);

  const createCheckpoint = useCallback(async () => {
    setSaving(true);
    await saveSnapshot(currentNotebook, false, labelInput || undefined);
    setLabelInput("");
    setShowLabelInput(false);
    setSaving(false);
  }, [currentNotebook, saveSnapshot, labelInput]);

  const handleRestore = useCallback(async (id: string) => {
    setLoadingId(id);
    const nb = await loadSnapshot(id);
    if (nb) onRestore(nb);
    setLoadingId(null);
  }, [loadSnapshot, onRestore]);

  const handleDiff = useCallback(async (id: string) => {
    setLoadingId(id);
    const nb = await loadSnapshot(id);
    if (nb) onDiff(nb);
    setLoadingId(null);
  }, [loadSnapshot, onDiff]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: t.bgToolbar, borderLeft: `1px solid ${t.border}`, width: 300 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${t.border}` }}
      >
        <History size={16} style={{ color: t.gold }} />
        <span className="text-sm font-semibold flex-1" style={{ color: t.textStrong }}>
          Version History
        </span>
        <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: t.textMuted }}>
          <X size={16} />
        </button>
      </div>

      {/* Create checkpoint */}
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${t.border}` }}>
        {!authenticated ? (
          <p className="text-xs" style={{ color: t.textDim }}>
            Sign in to save snapshots to the Data Bank.
          </p>
        ) : showLabelInput ? (
          <div className="space-y-2">
            <input
              className="w-full px-2 py-1.5 rounded-md text-sm outline-none"
              style={{ background: t.bg, border: `1px solid ${t.border}`, color: t.text }}
              placeholder="Checkpoint label (optional)"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createCheckpoint()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={createCheckpoint}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{ background: t.green, color: "#fff", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save
              </button>
              <button
                onClick={() => setShowLabelInput(false)}
                className="px-2 py-1.5 rounded-md text-xs"
                style={{ color: t.textMuted }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLabelInput(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ background: t.blueBg, color: t.blue, border: `1px solid ${t.blue}33` }}
          >
            <Save size={13} /> Create Checkpoint
          </button>
        )}
      </div>

      {/* Snapshot list */}
      <div className="flex-1 overflow-y-auto">
        {loading || syncing ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin" style={{ color: t.textDim }} />
          </div>
        ) : snapshots.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <History size={24} className="mx-auto mb-2 opacity-30" style={{ color: t.textDim }} />
            <p className="text-xs" style={{ color: t.textDim }}>
              No snapshots yet. Create a checkpoint or enable auto-save.
            </p>
          </div>
        ) : (
          <div className="py-1">
            {snapshots.map((snap, idx) => (
              <div
                key={snap.id}
                className="group px-4 py-3 transition-colors hover:opacity-90"
                style={{
                  borderBottom: idx < snapshots.length - 1 ? `1px solid ${t.border}` : undefined,
                  background: loadingId === snap.id ? t.bgHover : "transparent",
                }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: snap.autoSave ? t.bgHover : t.goldBg,
                      color: snap.autoSave ? t.textDim : t.gold,
                    }}
                  >
                    {snap.autoSave ? <Clock size={12} /> : <Save size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate" style={{ color: t.textStrong }}>
                        {snap.label || snap.name}
                      </span>
                      {snap.autoSave && (
                        <span className="text-[10px] px-1 rounded" style={{ background: t.bgHover, color: t.textDim }}>
                          auto
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px]" style={{ color: t.textDim }}>
                        {formatTime(snap.timestamp)}
                      </span>
                      <span className="text-[11px]" style={{ color: t.textDim }}>
                        · {snap.cellCount} cells
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-2 ml-8">
                  <button
                    onClick={() => handleDiff(snap.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors hover:opacity-80"
                    style={{ color: t.blue, background: t.blueBg }}
                    title="Compare with current"
                  >
                    <GitCompare size={11} /> Diff
                  </button>
                  <button
                    onClick={() => handleRestore(snap.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors hover:opacity-80"
                    style={{ color: t.green, background: t.greenBg }}
                    title="Restore this version"
                  >
                    <RotateCcw size={11} /> Restore
                  </button>
                  <button
                    onClick={() => deleteSnapshot(snap.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors hover:opacity-80 ml-auto"
                    style={{ color: t.textDim }}
                    title="Delete snapshot"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2 text-center shrink-0"
        style={{ borderTop: `1px solid ${t.border}` }}
      >
        <p className="text-[10px]" style={{ color: t.textDim }}>
          {authenticated ? "Encrypted & synced via Data Bank" : "Local only — sign in to sync"}
        </p>
      </div>
    </div>
  );
}
