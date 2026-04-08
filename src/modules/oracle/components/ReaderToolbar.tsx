/**
 * ReaderToolbar — Minimal floating toolbar for full-screen reader mode.
 * Shows back button, triword label, type badge, lens switcher, and details toggle.
 */

import React from "react";
import { ArrowLeft, Info, BookOpen as ReaderIcon } from "lucide-react";
import { motion } from "framer-motion";
import { KNOWLEDGE_LENSES } from "@/modules/oracle/lib/knowledge-lenses";

interface ReaderToolbarProps {
  triwordDisplay: string;
  typeLabel: string;
  activeLens: string;
  onLensChange: (lensId: string) => void;
  onBack: () => void;
  onToggleDetails: () => void;
  synthesizing?: boolean;
}

const ReaderToolbar: React.FC<ReaderToolbarProps> = ({
  triwordDisplay,
  typeLabel,
  activeLens,
  onLensChange,
  onBack,
  onToggleDetails,
  synthesizing = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 py-2.5 backdrop-blur-xl border-b"
      style={{
        background: "hsl(var(--background) / 0.82)",
        borderColor: "hsl(var(--border) / 0.08)",
      }}
    >
      {/* Back */}
      <button
        onClick={onBack}
        className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground/80 hover:bg-muted/15 transition-all shrink-0"
        title="Back to search"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Triword + type */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="text-sm font-display font-medium text-foreground/70 truncate tracking-wide">
          {triwordDisplay}
        </span>
        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.1em] bg-accent/10 text-accent-foreground/60 border border-accent/10">
          {typeLabel}
        </span>
      </div>

      {/* Lens switcher (compact) */}
      <div className="hidden md:flex items-center gap-1">
        {KNOWLEDGE_LENSES.map((lens) => {
          const isActive = lens.id === activeLens;
          return (
            <button
              key={lens.id}
              onClick={() => !isActive && onLensChange(lens.id)}
              disabled={synthesizing && isActive}
              title={lens.description}
              className={`
                px-2.5 py-1 rounded-full text-[11px] font-medium transition-all
                ${isActive
                  ? "bg-primary/12 text-primary border border-primary/20"
                  : "text-muted-foreground/40 hover:text-foreground/60 hover:bg-muted/10 border border-transparent"
                }
                ${synthesizing && !isActive ? "opacity-30 cursor-wait" : "cursor-pointer"}
              `}
            >
              {lens.label}
            </button>
          );
        })}
      </div>

      {/* Details toggle */}
      <button
        onClick={onToggleDetails}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground/50 hover:text-foreground/70 hover:bg-muted/15 border border-border/15 hover:border-border/30 transition-all shrink-0"
        title="Show full details (profile view)"
      >
        <Info className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Details</span>
      </button>
    </motion.div>
  );
};

export default ReaderToolbar;
