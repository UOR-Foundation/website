/**
 * DesktopContextMenu — Minimal right-click menu for the desktop wallpaper.
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onNewSearch: () => void;
  onSpotlight: () => void;
}

export default function DesktopContextMenu({ open, position, onClose, onNewSearch, onSpotlight }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.12 }}
          className="fixed z-[250] py-1.5 rounded-xl overflow-hidden min-w-[180px]"
          style={{
            top: position.y,
            left: position.x,
            background: "rgba(30,30,30,0.85)",
            backdropFilter: "blur(48px) saturate(1.4)",
            WebkitBackdropFilter: "blur(48px) saturate(1.4)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 12px 40px -8px rgba(0,0,0,0.5)",
          }}
        >
          <MenuItem label="New Search" onClick={() => { onNewSearch(); onClose(); }} />
          <MenuItem label="Spotlight" shortcut="⌘K" onClick={() => { onSpotlight(); onClose(); }} />
          <div className="mx-3 my-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <MenuItem label="About UOR OS" onClick={onClose} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MenuItem({ label, shortcut, onClick }: { label: string; shortcut?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3.5 py-1.5 text-left hover:bg-white/[0.08] transition-colors"
    >
      <span className="text-[12px] font-medium text-white/70">{label}</span>
      {shortcut && <span className="text-[10px] text-white/25 font-medium">{shortcut}</span>}
    </button>
  );
}
