/**
 * ContextPreferencesPanel — User Signal Context Editor
 * ════════════════════════════════════════════════════
 *
 * A slide-out panel for editing the private UserContextProfile
 * (interest tags, active tasks, phase affinities).
 * All data stays in localStorage — never transmitted.
 *
 * @module hologram-ui/components/ContextPreferencesPanel
 */

import { useState, useEffect, useCallback } from "react";
import { X, Plus, Tag, ListChecks, Gauge, Trash2, Info } from "lucide-react";
import {
  loadContextProfile,
  saveContextProfile,
  type UserContextProfile,
} from "../../engine/signalRelevance";

interface ContextPreferencesPanelProps {
  open: boolean;
  onClose: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  learn: "Learn",
  work: "Work",
  play: "Play",
};

const SUGGESTED_TAGS = [
  "ai", "crypto", "design", "privacy", "dev", "music",
  "health", "finance", "science", "writing", "community", "data",
];

export default function ContextPreferencesPanel({ open, onClose }: ContextPreferencesPanelProps) {
  const [profile, setProfile] = useState<UserContextProfile>(loadContextProfile);
  const [newInterest, setNewInterest] = useState("");
  const [newTask, setNewTask] = useState("");

  // Reload when opened
  useEffect(() => {
    if (open) setProfile(loadContextProfile());
  }, [open]);

  const persist = useCallback((p: UserContextProfile) => {
    setProfile(p);
    saveContextProfile(p);
  }, []);

  // ── Interest tags ──
  const addInterest = useCallback((tag: string) => {
    const t = tag.trim().toLowerCase();
    if (!t || profile.interests[t] !== undefined) return;
    persist({ ...profile, interests: { ...profile.interests, [t]: 0.5 } });
    setNewInterest("");
  }, [profile, persist]);

  const removeInterest = useCallback((tag: string) => {
    const next = { ...profile.interests };
    delete next[tag];
    persist({ ...profile, interests: next });
  }, [profile, persist]);

  const setInterestWeight = useCallback((tag: string, w: number) => {
    persist({ ...profile, interests: { ...profile.interests, [tag]: w } });
  }, [profile, persist]);

  // ── Active tasks ──
  const addTask = useCallback(() => {
    const t = newTask.trim();
    if (!t || profile.activeTasks.includes(t)) return;
    persist({ ...profile, activeTasks: [...profile.activeTasks, t] });
    setNewTask("");
  }, [newTask, profile, persist]);

  const removeTask = useCallback((task: string) => {
    persist({ ...profile, activeTasks: profile.activeTasks.filter((t) => t !== task) });
  }, [profile, persist]);

  // ── Phase affinity ──
  const setPhase = useCallback((phase: string, val: number) => {
    // Normalize so all three sum to 1
    const raw = { ...profile.phaseAffinity, [phase]: val };
    const total = Object.values(raw).reduce((s, v) => s + v, 0) || 1;
    const normalized: Record<string, number> = {};
    for (const k of Object.keys(raw)) normalized[k] = raw[k] / total;
    persist({ ...profile, phaseAffinity: normalized });
  }, [profile, persist]);

  const suggestionsLeft = SUGGESTED_TAGS.filter((t) => profile.interests[t] === undefined);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-foreground text-base font-semibold">Signal Context</h2>
            <p className="text-muted-foreground text-xs mt-0.5">Private · never leaves your device</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {/* ── Interests ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Tag size={14} className="text-primary" />
              <h3 className="text-foreground text-sm font-semibold">Interest Tags</h3>
            </div>
            <p className="text-muted-foreground text-xs mb-3 leading-relaxed">
              Tags matching inbound signals boost relevance. Drag the slider to set weight (0 = ignore, 1 = high priority).
            </p>

            {/* Existing interests */}
            <div className="space-y-2 mb-3">
              {Object.entries(profile.interests)
                .sort(([, a], [, b]) => b - a)
                .map(([tag, weight]) => (
                  <div key={tag} className="flex items-center gap-2 group">
                    <span className="text-xs font-mono text-foreground bg-secondary/40 px-2 py-0.5 rounded min-w-[64px] text-center">{tag}</span>
                    <input
                      type="range"
                      min={0} max={1} step={0.05}
                      value={weight}
                      onChange={(e) => setInterestWeight(tag, parseFloat(e.target.value))}
                      className="flex-1 h-1 accent-primary cursor-pointer"
                    />
                    <span className="text-[10px] text-muted-foreground font-mono w-7 text-right">{weight.toFixed(2)}</span>
                    <button onClick={() => removeInterest(tag)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
            </div>

            {/* Add new */}
            <div className="flex gap-2">
              <input
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addInterest(newInterest)}
                placeholder="Add tag…"
                className="flex-1 bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button onClick={() => addInterest(newInterest)} className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-lg hover:bg-primary/20 transition-colors">
                <Plus size={12} />
              </button>
            </div>

            {/* Suggestions */}
            {suggestionsLeft.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {suggestionsLeft.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => addInterest(tag)}
                    className="px-2 py-0.5 text-[10px] font-mono rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ── Active Tasks ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ListChecks size={14} className="text-primary" />
              <h3 className="text-foreground text-sm font-semibold">Active Tasks</h3>
            </div>
            <p className="text-muted-foreground text-xs mb-3 leading-relaxed">
              Signals matching your current tasks get a +30% relevance boost.
            </p>

            <div className="space-y-1.5 mb-3">
              {profile.activeTasks.map((task) => (
                <div key={task} className="flex items-center gap-2 group">
                  <span className="flex-1 text-xs text-foreground">{task}</span>
                  <button onClick={() => removeTask(task)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {profile.activeTasks.length === 0 && (
                <p className="text-muted-foreground text-xs italic">No active tasks set.</p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="e.g. shipping v2 launch…"
                className="flex-1 bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button onClick={addTask} className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-lg hover:bg-primary/20 transition-colors">
                <Plus size={12} />
              </button>
            </div>
          </section>

          {/* ── Phase Affinity ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Gauge size={14} className="text-primary" />
              <h3 className="text-foreground text-sm font-semibold">Phase Affinity</h3>
            </div>
            <p className="text-muted-foreground text-xs mb-3 leading-relaxed">
              Your current mode preference. Signals aligned with your dominant phase score higher. Values auto-normalize.
            </p>

            <div className="space-y-3">
              {Object.entries(PHASE_LABELS).map(([key, label]) => {
                const val = profile.phaseAffinity[key] ?? 0.33;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-foreground w-12">{label}</span>
                    <input
                      type="range"
                      min={0.05} max={0.9} step={0.01}
                      value={val}
                      onChange={(e) => setPhase(key, parseFloat(e.target.value))}
                      className="flex-1 h-1 accent-primary cursor-pointer"
                    />
                    <span className="text-[10px] text-muted-foreground font-mono w-10 text-right">{(val * 100).toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Privacy notice ── */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/20 border border-border">
            <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your context profile is stored exclusively in your browser's localStorage. It is never transmitted to any server. Signal relevance scoring happens entirely on-device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
