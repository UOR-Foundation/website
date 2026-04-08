/**
 * LensSuggestion — Adaptive lens recommendation pill.
 *
 * When the coherence engine detects a lens preference pattern,
 * shows a subtle glowing suggestion the user can accept or dismiss.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

interface LensSuggestionProps {
  suggestedLens: string;
  reason: string;
  onAccept: () => void;
  onDismiss: () => void;
}

const LensSuggestion: React.FC<LensSuggestionProps> = ({
  suggestedLens,
  reason,
  onAccept,
  onDismiss,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 20,
        border: "1px solid hsl(var(--primary) / 0.15)",
      }}
      className="bg-primary/[0.06] backdrop-blur-sm"
    >
      <Sparkles size={12} className="text-primary/60 shrink-0" />
      <span style={{ fontSize: 12, lineHeight: 1.3 }} className="text-foreground/60">
        Try{" "}
        <button
          onClick={onAccept}
          style={{
            fontWeight: 600,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
          className="text-primary/80 hover:text-primary transition-colors"
        >
          {suggestedLens}
        </button>{" "}
        <span className="text-muted-foreground/40">— {reason}</span>
      </span>
      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 2,
          display: "flex",
        }}
        className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
};

export default LensSuggestion;
