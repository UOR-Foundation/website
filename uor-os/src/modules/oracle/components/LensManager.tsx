/**
 * LensManager — Browse, create, edit, clone, and delete lenses.
 * Slide-over panel accessible from the lens bar.
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Copy, Trash2, Eye, Sparkles, Settings2,
  BookOpen, Newspaper, Baby, GraduationCap, BookText, Calculator, User,
} from "lucide-react";
import {
  type LensBlueprint,
  PRESET_BLUEPRINTS,
  loadCustomLenses,
  saveCustomLens,
  deleteCustomLens,
  cloneBlueprint,
} from "@/modules/oracle/lib/knowledge-lenses";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  BookOpen, Newspaper, Baby, GraduationCap, BookText, Calculator, User, Sparkles, Settings2,
};

interface LensManagerProps {
  open: boolean;
  onClose: () => void;
  activeLensId: string;
  onApplyLens: (bp: LensBlueprint) => void;
  onInspectLens: (bp: LensBlueprint) => void;
  immersive?: boolean;
}

const LensManager: React.FC<LensManagerProps> = ({
  open,
  onClose,
  activeLensId,
  onApplyLens,
  onInspectLens,
  immersive = false,
}) => {
  const [customLenses, setCustomLenses] = useState<LensBlueprint[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setCustomLenses(loadCustomLenses());
  }, [open]);

  useEffect(() => {
    if (editingId) nameInputRef.current?.focus();
  }, [editingId]);

  const allLenses = [...PRESET_BLUEPRINTS, ...customLenses];

  const handleClone = (bp: LensBlueprint) => {
    const cloned: LensBlueprint = {
      ...cloneBlueprint(bp),
      id: `custom-${Date.now()}`,
      label: `${bp.label} (copy)`,
      icon: "User",
      isPreset: false,
      generatedReason: undefined,
    };
    saveCustomLens(cloned);
    setCustomLenses(loadCustomLenses());
  };

  const handleDelete = (id: string) => {
    deleteCustomLens(id);
    setCustomLenses(loadCustomLenses());
    setConfirmDeleteId(null);
  };

  const handleRename = (bp: LensBlueprint) => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== bp.label) {
      const updated = { ...bp, label: trimmed };
      saveCustomLens(updated);
      setCustomLenses(loadCustomLenses());
    }
    setEditingId(null);
    setEditName("");
  };

  const handleNewLens = () => {
    const newBp: LensBlueprint = {
      id: `custom-${Date.now()}`,
      label: "New Lens",
      icon: "User",
      description: "A custom lens you can tune to your needs.",
      isPreset: false,
      params: {
        tone: "neutral",
        depth: "standard",
        audience: "curious",
        structure: "sections",
        citationDensity: "moderate",
        focusAreas: [],
        excludeAreas: [],
      },
    };
    saveCustomLens(newBp);
    setCustomLenses(loadCustomLenses());
    onInspectLens(newBp);
  };

  const cls = (base: string, immersiveClass: string, lightClass: string) =>
    `${base} ${immersive ? immersiveClass : lightClass}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: immersive ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.25)" }}
          />
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.97 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed right-4 top-16 bottom-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: immersive ? "rgba(10,14,18,0.95)" : "hsl(var(--card) / 0.97)",
              border: immersive ? "1px solid rgba(255,255,255,0.08)" : "1px solid hsl(var(--border) / 0.15)",
              backdropFilter: "blur(32px)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
              style={{ borderColor: immersive ? "rgba(255,255,255,0.06)" : "hsl(var(--border) / 0.1)" }}
            >
              <Settings2 className={`w-4 h-4 ${immersive ? "text-white/40" : "text-muted-foreground/40"}`} />
              <span className={`text-sm font-semibold flex-1 ${immersive ? "text-white/80" : "text-foreground/80"}`}>
                Lens Manager
              </span>
              <button
                onClick={handleNewLens}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  immersive
                    ? "bg-white/10 text-white/70 hover:bg-white/15"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
              >
                <Plus className="w-3 h-3" />
                New Lens
              </button>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg transition-colors ${immersive ? "text-white/30 hover:text-white/60 hover:bg-white/[0.06]" : "text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/10"}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lens list */}
            <div className="flex-1 overflow-y-auto py-2">
              {/* Presets */}
              <SectionLabel immersive={immersive}>Presets</SectionLabel>
              {PRESET_BLUEPRINTS.map((bp) => (
                <LensRow
                  key={bp.id}
                  bp={bp}
                  isActive={bp.id === activeLensId}
                  immersive={immersive}
                  editing={editingId === bp.id}
                  onApply={() => { onApplyLens(bp); onClose(); }}
                  onInspect={() => onInspectLens(bp)}
                  onClone={() => handleClone(bp)}
                />
              ))}

              {/* Custom */}
              {customLenses.length > 0 && (
                <>
                  <SectionLabel immersive={immersive} className="mt-3">Custom</SectionLabel>
                  {customLenses.map((bp) => (
                    <LensRow
                      key={bp.id}
                      bp={bp}
                      isActive={bp.id === activeLensId}
                      immersive={immersive}
                      editing={editingId === bp.id}
                      editName={editName}
                      nameInputRef={editingId === bp.id ? nameInputRef : undefined}
                      onEditNameChange={setEditName}
                      onStartRename={() => { setEditingId(bp.id); setEditName(bp.label); }}
                      onCommitRename={() => handleRename(bp)}
                      onCancelRename={() => { setEditingId(null); setEditName(""); }}
                      onApply={() => { onApplyLens(bp); onClose(); }}
                      onInspect={() => onInspectLens(bp)}
                      onClone={() => handleClone(bp)}
                      onDelete={() => setConfirmDeleteId(bp.id)}
                      confirmingDelete={confirmDeleteId === bp.id}
                      onConfirmDelete={() => handleDelete(bp.id)}
                      onCancelDelete={() => setConfirmDeleteId(null)}
                    />
                  ))}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/* ── Sub-components ── */

function SectionLabel({ children, immersive, className = "" }: { children: React.ReactNode; immersive: boolean; className?: string }) {
  return (
    <p className={`px-5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
      immersive ? "text-white/25" : "text-muted-foreground/35"
    } ${className}`}>
      {children}
    </p>
  );
}

interface LensRowProps {
  bp: LensBlueprint;
  isActive: boolean;
  immersive: boolean;
  editing: boolean;
  editName?: string;
  nameInputRef?: React.RefObject<HTMLInputElement>;
  onEditNameChange?: (v: string) => void;
  onStartRename?: () => void;
  onCommitRename?: () => void;
  onCancelRename?: () => void;
  onApply: () => void;
  onInspect: () => void;
  onClone: () => void;
  onDelete?: () => void;
  confirmingDelete?: boolean;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
}

function LensRow({
  bp, isActive, immersive, editing,
  editName, nameInputRef, onEditNameChange,
  onStartRename, onCommitRename, onCancelRename,
  onApply, onInspect, onClone, onDelete,
  confirmingDelete, onConfirmDelete, onCancelDelete,
}: LensRowProps) {
  const IconComp = ICON_MAP[bp.icon] || BookOpen;

  return (
    <div className={`group mx-2 px-3 py-2.5 rounded-xl transition-colors ${
      isActive
        ? immersive ? "bg-white/[0.08]" : "bg-primary/[0.06]"
        : immersive ? "hover:bg-white/[0.04]" : "hover:bg-muted/[0.06]"
    }`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
          isActive
            ? immersive ? "bg-white/10" : "bg-primary/10"
            : immersive ? "bg-white/[0.05]" : "bg-muted/10"
        }`}>
          <IconComp className={`w-4 h-4 ${
            isActive
              ? immersive ? "text-white/70" : "text-primary"
              : immersive ? "text-white/30" : "text-muted-foreground/40"
          }`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={nameInputRef as any}
              value={editName}
              onChange={(e) => onEditNameChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCommitRename?.();
                if (e.key === "Escape") onCancelRename?.();
              }}
              onBlur={() => onCommitRename?.()}
              className={`text-sm font-semibold w-full bg-transparent outline-none border-b ${
                immersive ? "text-white/80 border-white/20" : "text-foreground/80 border-primary/20"
              }`}
            />
          ) : (
            <p
              className={`text-sm font-semibold truncate ${
                isActive
                  ? immersive ? "text-white/90" : "text-primary"
                  : immersive ? "text-white/70" : "text-foreground/75"
              } ${!bp.isPreset ? "cursor-text" : ""}`}
              onDoubleClick={() => !bp.isPreset && onStartRename?.()}
              title={!bp.isPreset ? "Double-click to rename" : undefined}
            >
              {bp.label}
              {isActive && (
                <span className={`ml-1.5 text-[9px] font-medium uppercase tracking-wider ${
                  immersive ? "text-white/30" : "text-primary/40"
                }`}>Active</span>
              )}
            </p>
          )}
          <p className={`text-[11px] mt-0.5 leading-snug ${
            immersive ? "text-white/30" : "text-muted-foreground/40"
          }`}>
            {bp.description}
          </p>
          <p className={`text-[10px] mt-1 ${immersive ? "text-white/20" : "text-muted-foreground/30"}`}>
            {bp.params.tone} · {bp.params.depth} · {bp.params.audience}
          </p>
        </div>
      </div>

      {/* Actions row — visible on hover */}
      {confirmingDelete ? (
        <div className="flex items-center gap-2 mt-2 ml-11">
          <span className={`text-[11px] ${immersive ? "text-red-400/70" : "text-destructive/70"}`}>
            Delete this lens?
          </span>
          <button
            onClick={onConfirmDelete}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
              immersive ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-destructive/10 text-destructive hover:bg-destructive/20"
            } transition-colors`}
          >
            Delete
          </button>
          <button
            onClick={onCancelDelete}
            className={`px-2 py-0.5 rounded text-[10px] ${
              immersive ? "text-white/40 hover:text-white/60" : "text-muted-foreground/40 hover:text-muted-foreground/60"
            } transition-colors`}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className={`flex items-center gap-1 mt-2 ml-11 transition-opacity ${
          isActive ? "opacity-70" : "opacity-0 group-hover:opacity-100"
        }`}>
          {!isActive && (
            <ActionBtn immersive={immersive} onClick={onApply} title="Apply this lens">
              <Eye className="w-3 h-3" /> Apply
            </ActionBtn>
          )}
          <ActionBtn immersive={immersive} onClick={onInspect} title="Inspect & edit parameters">
            <Settings2 className="w-3 h-3" /> Edit
          </ActionBtn>
          <ActionBtn immersive={immersive} onClick={onClone} title="Clone as custom lens">
            <Copy className="w-3 h-3" /> Clone
          </ActionBtn>
          {onDelete && !bp.isPreset && (
            <ActionBtn immersive={immersive} onClick={onDelete} title="Delete custom lens" destructive>
              <Trash2 className="w-3 h-3" />
            </ActionBtn>
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  children, onClick, title, immersive, destructive = false,
}: {
  children: React.ReactNode; onClick: () => void; title: string; immersive: boolean; destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
        destructive
          ? immersive
            ? "text-red-400/50 hover:text-red-400/80 hover:bg-red-500/10"
            : "text-destructive/40 hover:text-destructive/70 hover:bg-destructive/5"
          : immersive
            ? "text-white/35 hover:text-white/65 hover:bg-white/[0.06]"
            : "text-muted-foreground/35 hover:text-foreground/55 hover:bg-muted/10"
      }`}
    >
      {children}
    </button>
  );
}

export default LensManager;
