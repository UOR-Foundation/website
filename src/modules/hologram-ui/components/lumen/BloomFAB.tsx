/**
 * BloomFAB — Floating Action Button for bloom projections
 * ════════════════════════════════════════════════════════
 *
 * Positioned at bottom-right of the projection area.
 * Expands on tap to reveal a quick-action sheet.
 *
 * @module hologram-ui/components/lumen/BloomFAB
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, type LucideIcon } from "lucide-react";
import { PP } from "@/modules/hologram-ui/theme/portal-palette";

export interface FABAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onTap: () => void;
}

interface BloomFABProps {
  actions: FABAction[];
}

const ORGANIC_EASE = [0.23, 1, 0.32, 1] as const;

export default function BloomFAB({ actions }: BloomFABProps) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen(p => !p), []);

  return (
    <div className="absolute bottom-4 right-4 z-30 flex flex-col items-end gap-2">
      {/* Expanded actions */}
      <AnimatePresence>
        {open && actions.map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 10 }}
            transition={{ delay: (actions.length - 1 - i) * 0.04, ease: ORGANIC_EASE }}
            onClick={() => { action.onTap(); setOpen(false); }}
            className="flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-xl active:scale-95 transition-transform"
            style={{
              background: PP.canvasSubtle,
              border: `1px solid ${PP.bloomCardBorder}`,
              boxShadow: PP.bloomCardShadow,
            }}
          >
            <action.icon className="w-4 h-4" strokeWidth={1.5} style={{ color: PP.accent }} />
            <span
              style={{
                fontFamily: PP.font,
                fontSize: "12px",
                fontWeight: 500,
                color: PP.text,
                whiteSpace: "nowrap",
              }}
            >
              {action.label}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        onClick={toggle}
        animate={{ rotate: open ? 135 : 0 }}
        transition={{ duration: 0.25, ease: ORGANIC_EASE }}
        className="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{
          background: PP.accent,
          boxShadow: `0 4px 20px ${PP.accent}40`,
        }}
      >
        <Plus className="w-5 h-5" strokeWidth={2} style={{ color: PP.canvas }} />
      </motion.button>
    </div>
  );
}
