/**
 * LensInspector — Transparent, editable lens recipe panel.
 *
 * Shows every parameter of a lens blueprint as interactive controls,
 * letting users understand exactly what filters shape their content
 * and tune them in real time.
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Sparkles, Save, RotateCcw, Eye, Globe } from "lucide-react";
import {
  type LensBlueprint,
  type LensTone,
  type LensDepth,
  type LensAudience,
  type LensStructure,
  type LensCitationDensity,
  TONE_OPTIONS,
  DEPTH_OPTIONS,
  AUDIENCE_OPTIONS,
  STRUCTURE_OPTIONS,
  cloneBlueprint,
  saveCustomLens,
} from "@/modules/oracle/lib/knowledge-lenses";
import { explainBlueprint } from "@/modules/oracle/lib/lens-intelligence";

interface LensInspectorProps {
  blueprint: LensBlueprint;
  open: boolean;
  onClose: () => void;
  onApply: (bp: LensBlueprint) => void;
  /** When provided, shows a Delete button (only for non-preset lenses) */
  onDelete?: (id: string) => void;
  /** When provided, makes the header label editable */
  onRename?: (id: string, newName: string) => void;
}

/* ── Segmented control for parameter selection ── */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
}: {
  options: Array<{ value: T; label: string; emoji?: string }>;
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "xs";
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`
              inline-flex items-center gap-1 rounded-full border transition-all duration-200
              ${size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"}
              ${isActive
                ? "bg-primary/15 text-primary border-primary/25 shadow-sm font-semibold"
                : "bg-muted/5 text-muted-foreground/50 border-border/10 hover:bg-muted/15 hover:text-foreground/70"
              }
            `}
          >
            {opt.emoji && <span>{opt.emoji}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Tag chip list with add/remove ── */
function TagChips({
  tags,
  onRemove,
  onAdd,
  placeholder,
  color = "primary",
}: {
  tags: string[];
  onRemove: (tag: string) => void;
  onAdd: (tag: string) => void;
  placeholder: string;
  color?: "primary" | "destructive";
}) {
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const commitTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
    }
    setNewTag("");
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
            ${color === "primary"
              ? "bg-primary/10 text-primary/80 border border-primary/15"
              : "bg-destructive/10 text-destructive/80 border border-destructive/15"
            }
          `}
        >
          {tag}
          <button
            onClick={() => onRemove(tag)}
            className="hover:text-foreground transition-colors"
          >
            <X size={8} />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          ref={inputRef}
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTag();
            if (e.key === "Escape") { setAdding(false); setNewTag(""); }
          }}
          onBlur={commitTag}
          placeholder={placeholder}
          className="bg-transparent text-[10px] text-foreground/70 focus:outline-none border-b border-primary/20 px-1 py-0.5 w-24"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] text-muted-foreground/40 hover:text-primary/60 border border-dashed border-border/20 hover:border-primary/30 transition-all"
        >
          <Plus size={8} />
          Add
        </button>
      )}
    </div>
  );
}

/* ── Source card ── */
function SourceCard({ source, onToggle }: {
  source: { domain: string; reason: string; qualityScore: number; enabled: boolean };
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`
        w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left
        ${source.enabled
          ? "bg-primary/[0.04] border-primary/15 hover:border-primary/25"
          : "bg-muted/5 border-border/10 opacity-50 hover:opacity-70"
        }
      `}
    >
      <Globe size={12} className="text-muted-foreground/40 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-foreground/70 truncate">{source.domain}</div>
        <div className="text-[9px] text-muted-foreground/40 truncate">{source.reason}</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-10 h-1 rounded-full bg-muted/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/50"
            style={{ width: `${source.qualityScore}%` }}
          />
        </div>
        <span className="text-[9px] font-mono text-muted-foreground/30">{source.qualityScore}</span>
      </div>
    </button>
  );
}

/* ── Main LensInspector ── */

const LensInspector: React.FC<LensInspectorProps> = ({
  blueprint: initialBlueprint,
  open,
  onClose,
  onApply,
  onDelete,
  onRename,
}) => {
  const [bp, setBp] = useState<LensBlueprint>(() => cloneBlueprint(initialBlueprint));
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState("");
  const labelInputRef = useRef<HTMLInputElement>(null);

  // Reset when blueprint changes
  useEffect(() => {
    setBp(cloneBlueprint(initialBlueprint));
    setShowSave(false);
    setSaveName("");
  }, [initialBlueprint.id, open]);

  const updateParam = <K extends keyof LensBlueprint["params"]>(
    key: K,
    value: LensBlueprint["params"][K]
  ) => {
    setBp(prev => ({
      ...prev,
      params: { ...prev.params, [key]: value },
    }));
  };

  const handleApply = () => {
    onApply(bp);
    onClose();
  };

  const handleSave = () => {
    if (!saveName.trim()) return;
    const saved: LensBlueprint = {
      ...bp,
      id: `custom-${Date.now()}`,
      label: saveName.trim(),
      icon: "User",
      isPreset: false,
      generatedReason: undefined,
    };
    saveCustomLens(saved);
    onApply(saved);
    onClose();
  };

  const handleReset = () => {
    setBp(cloneBlueprint(initialBlueprint));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.98 }}
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          className="w-full max-w-sm bg-card/95 backdrop-blur-xl border border-border/20 rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/10">
            {bp.generatedReason && (
              <Sparkles size={12} className="text-primary/60 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground/80 truncate">{bp.label}</div>
              <div className="text-[10px] text-muted-foreground/40">{bp.description}</div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Why Suggested badge */}
          {bp.generatedReason && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-primary/[0.04] border border-primary/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Eye size={10} className="text-primary/50" />
                <span className="text-[9px] uppercase tracking-[0.12em] font-semibold text-primary/50">Why suggested</span>
              </div>
              <p className="text-[11px] text-foreground/50 leading-relaxed">{bp.generatedReason}</p>
            </div>
          )}

          {/* Plain-English Summary */}
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-muted/[0.06] border border-border/10">
            <p className="text-[10px] text-muted-foreground/50 leading-relaxed italic">
              {explainBlueprint(bp)}
            </p>
          </div>

          {/* Parameters */}
          <div className="px-4 py-3 space-y-3.5 max-h-[50vh] overflow-y-auto">
            {/* Tone */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/40 mb-1.5 block">
                Tone
              </label>
              <SegmentedControl
                options={TONE_OPTIONS}
                value={bp.params.tone}
                onChange={(v) => updateParam("tone", v)}
              />
            </div>

            {/* Depth */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/40 mb-1.5 block">
                Depth
              </label>
              <SegmentedControl
                options={DEPTH_OPTIONS}
                value={bp.params.depth}
                onChange={(v) => updateParam("depth", v)}
              />
            </div>

            {/* Audience */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/40 mb-1.5 block">
                Audience
              </label>
              <SegmentedControl
                options={AUDIENCE_OPTIONS}
                value={bp.params.audience}
                onChange={(v) => updateParam("audience", v)}
              />
            </div>

            {/* Structure */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/40 mb-1.5 block">
                Structure
              </label>
              <SegmentedControl
                options={STRUCTURE_OPTIONS}
                value={bp.params.structure}
                onChange={(v) => updateParam("structure", v)}
              />
            </div>

            {/* Citation Density */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/40 mb-1.5 block">
                Citations
              </label>
              <SegmentedControl
                options={[
                  { value: "minimal" as LensCitationDensity, label: "Minimal" },
                  { value: "moderate" as LensCitationDensity, label: "Moderate" },
                  { value: "thorough" as LensCitationDensity, label: "Thorough" },
                ]}
                value={bp.params.citationDensity}
                onChange={(v) => updateParam("citationDensity", v)}
                size="xs"
              />
            </div>

            {/* Focus Areas */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/40 mb-1.5 block">
                Focus on
              </label>
              <TagChips
                tags={bp.params.focusAreas}
                onRemove={(t) => updateParam("focusAreas", bp.params.focusAreas.filter(a => a !== t))}
                onAdd={(t) => updateParam("focusAreas", [...bp.params.focusAreas, t])}
                placeholder="e.g. practical uses"
              />
            </div>

            {/* Exclude Areas */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/40 mb-1.5 block">
                Exclude
              </label>
              <TagChips
                tags={bp.params.excludeAreas}
                onRemove={(t) => updateParam("excludeAreas", bp.params.excludeAreas.filter(a => a !== t))}
                onAdd={(t) => updateParam("excludeAreas", [...bp.params.excludeAreas, t])}
                placeholder="e.g. math proofs"
                color="destructive"
              />
            </div>

            {/* Recommended Sources */}
            {bp.recommendedSources && bp.recommendedSources.length > 0 && (
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/40 mb-1.5 block">
                  Recommended Sources
                </label>
                <div className="space-y-1">
                  {bp.recommendedSources.map((src, i) => (
                    <SourceCard
                      key={src.domain}
                      source={src}
                      onToggle={() => {
                        const updated = [...(bp.recommendedSources || [])];
                        updated[i] = { ...updated[i], enabled: !updated[i].enabled };
                        setBp(prev => ({ ...prev, recommendedSources: updated }));
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 py-3 border-t border-border/10 space-y-2">
            {showSave ? (
              <div className="flex gap-1.5">
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder="Lens name…"
                  className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-muted/10 border border-border/15 text-foreground/70 placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors disabled:opacity-30"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <button
                  onClick={handleApply}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                >
                  <Eye size={12} />
                  Apply
                </button>
                <button
                  onClick={() => setShowSave(true)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-muted-foreground/50 hover:text-foreground/70 border border-border/15 hover:border-border/25 transition-all"
                >
                  <Save size={11} />
                  Save
                </button>
                <button
                  onClick={handleReset}
                  className="p-2 rounded-lg text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
                  title="Reset to defaults"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LensInspector;
