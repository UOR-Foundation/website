/**
 * Time Machine — Desktop App UI.
 * ═════════════════════════════════════════════════════════════════
 *
 * A standalone desktop app for browsing, restoring, forking,
 * and configuring system checkpoints.
 *
 * @module time-machine/pages/TimeMachinePage
 */

import { useState, useCallback, useMemo } from "react";
import { useTimeMachine } from "../hooks";
import type { CheckpointMeta, AutoSaveInterval, CheckpointDiff } from "../types";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Clock, Save, RotateCcw, GitBranch, Trash2, Settings, ChevronRight,
  CheckCircle2, AlertCircle, Timer, Database, Layout, Diff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Stub hooks for standalone rendering ─────────────────────────────────

function useDesktopStateForTimeMachine() {
  // In standalone mode, read from localStorage
  const getState = useCallback(() => {
    let windows: any[] = [];
    try {
      const raw = localStorage.getItem("uor:desktop-windows");
      if (raw) windows = JSON.parse(raw);
    } catch {}
    return {
      windows,
      activeWindowId: null as string | null,
      theme: localStorage.getItem("uor:theme") ?? "dark",
    };
  }, []);

  const setWindows = useCallback((w: any[]) => {
    localStorage.setItem("uor:desktop-windows", JSON.stringify(w));
  }, []);

  const setActiveWindow = useCallback((_id: string | null) => {}, []);
  const setTheme = useCallback((t: string) => {
    localStorage.setItem("uor:theme", t);
  }, []);

  return { getState, setWindows, setActiveWindow, setTheme };
}

// ── Interval Options ────────────────────────────────────────────────────

const INTERVAL_OPTIONS: { value: AutoSaveInterval; label: string }[] = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
];

// ── Main Component ──────────────────────────────────────────────────────

export default function TimeMachinePage() {
  const { getState, setWindows, setActiveWindow, setTheme } = useDesktopStateForTimeMachine();
  const tm = useTimeMachine(getState, setWindows, setActiveWindow, setTheme);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [compareResult, setCompareResult] = useState<CheckpointDiff | null>(null);
  const [forkName, setForkName] = useState("");
  const [showForkDialog, setShowForkDialog] = useState(false);
  const [checkpointLabel, setCheckpointLabel] = useState("");

  const selectedCheckpoint = useMemo(
    () => tm.checkpoints.find((c) => c.id === selectedId),
    [tm.checkpoints, selectedId],
  );

  // ── Actions ───────────────────────────────────────────────────────────

  const handleCreateCheckpoint = async () => {
    const cp = await tm.createCheckpoint(checkpointLabel || undefined);
    if (cp) {
      toast.success(`Checkpoint #${cp.sequence} saved`, { duration: 2000 });
      setCheckpointLabel("");
    } else {
      toast.info("No changes detected — checkpoint skipped");
    }
  };

  const handleRestore = async () => {
    if (!selectedId) return;
    const result = await tm.restore(selectedId);
    if (result?.success) {
      toast.success(`Restored to checkpoint #${selectedCheckpoint?.sequence}`, { duration: 3000 });
    } else {
      toast.error(`Restore failed: ${result?.errors.join(", ")}`);
    }
  };

  const handleFork = async () => {
    if (!selectedId || !forkName.trim()) return;
    const result = await tm.fork(selectedId, forkName.trim());
    if (result?.success) {
      toast.success(`Forked to branch "${forkName.trim()}"`, { duration: 3000 });
      setShowForkDialog(false);
      setForkName("");
    } else {
      toast.error(`Fork failed: ${result?.errors.join(", ")}`);
    }
  };

  const handleCompare = async () => {
    if (tm.checkpoints.length < 2 || !selectedId) return;
    const prev = tm.checkpoints.find((c) => c.id !== selectedId);
    if (!prev) return;
    const diff = await tm.compare(prev.id, selectedId);
    setCompareResult(diff);
    setShowCompare(true);
  };

  const handleDelete = async (id: string) => {
    await tm.deleteCheckpoint(id);
    if (selectedId === id) setSelectedId(null);
    toast("Checkpoint deleted");
  };

  // ── Loading ───────────────────────────────────────────────────────────

  if (tm.loading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Clock className="w-5 h-5 animate-spin" />
          <span>Loading Time Machine…</span>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden">
      {/* ── Left Panel: Timeline ──────────────────────────────────────── */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-sm">Time Machine</h2>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Quick Create */}
          <div className="flex gap-2">
            <input
              type="text"
              value={checkpointLabel}
              onChange={(e) => setCheckpointLabel(e.target.value)}
              placeholder="Checkpoint label…"
              className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-border bg-muted/50 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleCreateCheckpoint}
              disabled={tm.saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          </div>

          {/* Branch selector */}
          {tm.branches.length > 1 && (
            <div className="flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={tm.config.activeBranch}
                onChange={(e) => tm.switchBranch(e.target.value)}
                className="text-xs bg-muted/50 border border-border rounded px-2 py-1 flex-1"
              >
                {tm.branches.map((b) => (
                  <option key={b.name} value={b.name}>{b.name} ({b.checkpointCount})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Timeline List */}
        <div className="flex-1 overflow-y-auto">
          {tm.checkpoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2 px-6 text-center">
              <Clock className="w-8 h-8 opacity-30" />
              <p>No checkpoints yet.</p>
              <p>Create one to start tracking your system state.</p>
            </div>
          ) : (
            <div className="py-1">
              {tm.checkpoints.map((cp, i) => (
                <CheckpointRow
                  key={cp.id}
                  checkpoint={cp}
                  isSelected={cp.id === selectedId}
                  isLatest={i === 0}
                  onClick={() => setSelectedId(cp.id === selectedId ? null : cp.id)}
                  onDelete={() => handleDelete(cp.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="p-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{tm.checkpoints.length} checkpoint{tm.checkpoints.length !== 1 ? "s" : ""}</span>
          <span className="flex items-center gap-1">
            {tm.config.enabled ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Auto-save: {tm.config.intervalMinutes}m
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 inline-block" />
                Auto-save off
              </>
            )}
          </span>
        </div>
      </div>

      {/* ── Right Panel: Detail / Settings / Compare ─────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {showSettings ? (
            <SettingsPanel
              key="settings"
              config={tm.config}
              onUpdate={tm.updateConfig}
              onClose={() => setShowSettings(false)}
            />
          ) : showCompare && compareResult ? (
            <ComparePanel
              key="compare"
              diff={compareResult}
              onClose={() => setShowCompare(false)}
            />
          ) : selectedCheckpoint ? (
            <DetailPanel
              key={selectedCheckpoint.id}
              checkpoint={selectedCheckpoint}
              onRestore={handleRestore}
              onFork={() => setShowForkDialog(true)}
              onCompare={handleCompare}
              saving={tm.saving}
              hasMultiple={tm.checkpoints.length > 1}
            />
          ) : (
            <EmptyDetail key="empty" />
          )}
        </AnimatePresence>

        {/* Fork Dialog */}
        {showForkDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border rounded-xl p-6 w-96 shadow-xl"
            >
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                Fork from #{selectedCheckpoint?.sequence}
              </h3>
              <input
                type="text"
                value={forkName}
                onChange={(e) => setForkName(e.target.value)}
                placeholder="Branch name…"
                autoFocus
                className="w-full text-sm px-3 py-2 rounded-md border border-border bg-muted/50 mb-4 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowForkDialog(false); setForkName(""); }}
                  className="px-3 py-1.5 text-xs rounded-md hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFork}
                  disabled={!forkName.trim() || tm.saving}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  Fork & Restore
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────────

function CheckpointRow({
  checkpoint: cp,
  isSelected,
  isLatest,
  onClick,
  onDelete,
}: {
  checkpoint: CheckpointMeta;
  isSelected: boolean;
  isLatest: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const ts = new Date(cp.timestamp);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors group ${
        isSelected ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/50 border-l-2 border-transparent"
      }`}
    >
      {/* Timeline dot */}
      <div className="mt-1 relative">
        <div className={`w-2.5 h-2.5 rounded-full ${
          cp.type === "manual" ? "bg-primary" : "bg-muted-foreground/40"
        } ${isLatest ? "ring-2 ring-primary/30" : ""}`} />
        {!isLatest && (
          <div className="absolute top-3 left-1 w-px h-6 bg-border" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium text-foreground">
            #{cp.sequence}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            cp.type === "manual"
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}>
            {cp.type}
          </span>
          {isLatest && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 font-medium">
              latest
            </span>
          )}
        </div>
        {cp.label && (
          <p className="text-xs text-foreground/80 truncate mt-0.5">{cp.label}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {formatDistanceToNow(ts, { addSuffix: true })} · {cp.quadCount} quads
        </p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
      >
        <Trash2 className="w-3 h-3 text-destructive" />
      </button>
    </button>
  );
}

function DetailPanel({
  checkpoint: cp,
  onRestore,
  onFork,
  onCompare,
  saving,
  hasMultiple,
}: {
  checkpoint: CheckpointMeta;
  onRestore: () => void;
  onFork: () => void;
  onCompare: () => void;
  saving: boolean;
  hasMultiple: boolean;
}) {
  const ts = new Date(cp.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 space-y-6"
    >
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-semibold">Checkpoint #{cp.sequence}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            cp.type === "manual" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            {cp.type}
          </span>
        </div>
        {cp.label && <p className="text-sm text-muted-foreground">{cp.label}</p>}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3">
        <MetaCard icon={Timer} label="Created" value={format(ts, "MMM d, yyyy · h:mm:ss a")} />
        <MetaCard icon={Database} label="Graph Quads" value={cp.quadCount.toLocaleString()} />
        <MetaCard icon={GitBranch} label="Branch" value={cp.branchName} />
        <MetaCard icon={Layout} label="Seal Hash" value={cp.sealHash.slice(0, 16) + "…"} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onRestore}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Restore
        </button>
        <button
          onClick={onFork}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
        >
          <GitBranch className="w-4 h-4" />
          Fork
        </button>
        {hasMultiple && (
          <button
            onClick={onCompare}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <Diff className="w-4 h-4" />
            Compare
          </button>
        )}
      </div>

      {/* Chain Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          Parent: {cp.parentId ? cp.parentId.slice(0, 20) + "…" : "Genesis (no parent)"}
        </p>
        <p className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          ID: <code className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{cp.id}</code>
        </p>
      </div>
    </motion.div>
  );
}

function MetaCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}

function SettingsPanel({
  config,
  onUpdate,
  onClose,
}: {
  config: any;
  onUpdate: (c: any) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Settings
        </h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Close
        </button>
      </div>

      {/* Auto-save toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Auto-save</p>
            <p className="text-xs text-muted-foreground">Automatically save checkpoints at intervals</p>
          </div>
          <button
            onClick={() => onUpdate({ enabled: !config.enabled })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              config.enabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              config.enabled ? "translate-x-5" : ""
            }`} />
          </button>
        </div>

        {/* Interval */}
        <div>
          <p className="text-sm font-medium mb-2">Save interval</p>
          <div className="flex gap-2">
            {INTERVAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onUpdate({ intervalMinutes: opt.value })}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  config.intervalMinutes === opt.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Max checkpoints */}
        <div>
          <p className="text-sm font-medium mb-1">Max checkpoints</p>
          <p className="text-xs text-muted-foreground mb-2">
            Oldest auto-saves are pruned when limit is reached. Manual checkpoints are never auto-pruned.
          </p>
          <input
            type="number"
            value={config.maxCheckpoints}
            onChange={(e) => onUpdate({ maxCheckpoints: Math.max(5, parseInt(e.target.value) || 50) })}
            min={5}
            max={200}
            className="w-20 text-sm px-2.5 py-1.5 rounded-md border border-border bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
    </motion.div>
  );
}

function ComparePanel({ diff, onClose }: { diff: CheckpointDiff; onClose: () => void }) {
  const mins = Math.round(diff.timeDelta / 60000);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Diff className="w-5 h-5 text-primary" />
          Comparison
        </h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Close
        </button>
      </div>

      <div className="space-y-3">
        <DiffRow label="Quad Count Change" value={`${diff.quadCountDelta >= 0 ? "+" : ""}${diff.quadCountDelta}`} positive={diff.quadCountDelta >= 0} />
        <DiffRow label="Windows Added" value={`+${diff.windowsAdded}`} positive />
        <DiffRow label="Windows Removed" value={`-${diff.windowsRemoved}`} positive={false} />
        <DiffRow label="Settings Changed" value={diff.settingsChanged.length.toString()} positive={diff.settingsChanged.length === 0} />
        <DiffRow label="Time Between" value={mins < 60 ? `${mins} min` : `${(mins / 60).toFixed(1)} hrs`} positive />
      </div>

      {diff.settingsChanged.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1">Changed settings:</p>
          <div className="flex flex-wrap gap-1">
            {diff.settingsChanged.map((s) => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">{s}</span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function DiffRow({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-mono font-medium ${
        positive ? "text-green-500" : "text-orange-500"
      }`}>
        {value}
      </span>
    </div>
  );
}

function EmptyDetail() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3"
    >
      <Clock className="w-12 h-12 opacity-20" />
      <p className="text-sm">Select a checkpoint to view details</p>
      <p className="text-xs opacity-60">Or create a new one to start tracking</p>
    </motion.div>
  );
}
