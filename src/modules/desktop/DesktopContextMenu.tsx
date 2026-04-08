/**
 * DesktopContextMenu — Minimal right-click menu. Theme-aware.
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";

interface Props {
  open: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onNewSearch: () => void;
  onSpotlight: () => void;
}

export default function DesktopContextMenu({ open, position, onClose, onNewSearch, onSpotlight }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { isLight } = useDesktopTheme();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const bg = isLight ? "rgba(255,255,255,0.90)" : "rgba(30,30,30,0.85)";
  const border = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
  const shadow = isLight ? "0 12px 40px -8px rgba(0,0,0,0.12)" : "0 12px 40px -8px rgba(0,0,0,0.5)";
  const divider = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const itemHover = isLight ? "hover:bg-black/[0.05]" : "hover:bg-white/[0.08]";
  const labelColor = isLight ? "text-black/60" : "text-white/70";
  const shortcutColor = isLight ? "text-black/20" : "text-white/25";

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
          style={{ top: position.y, left: position.x, background: bg, backdropFilter: "blur(48px) saturate(1.4)", WebkitBackdropFilter: "blur(48px) saturate(1.4)", border: `1px solid ${border}`, boxShadow: shadow }}
        >
          <MenuItem label="New Search" onClick={() => { onNewSearch(); onClose(); }} hoverBg={itemHover} labelColor={labelColor} shortcutColor={shortcutColor} />
          <MenuItem label="Spotlight" shortcut="⌘K" onClick={() => { onSpotlight(); onClose(); }} hoverBg={itemHover} labelColor={labelColor} shortcutColor={shortcutColor} />
          <div className="mx-3 my-1 h-px" style={{ background: divider }} />
          <MenuItem label="About UOR OS" onClick={onClose} hoverBg={itemHover} labelColor={labelColor} shortcutColor={shortcutColor} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MenuItem({ label, shortcut, onClick, hoverBg, labelColor, shortcutColor }: {
  label: string; shortcut?: string; onClick: () => void; hoverBg: string; labelColor: string; shortcutColor: string;
}) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-3.5 py-1.5 text-left ${hoverBg} transition-colors`}>
      <span className={`text-[12px] font-medium ${labelColor}`}>{label}</span>
      {shortcut && <span className={`text-[10px] ${shortcutColor} font-medium`}>{shortcut}</span>}
    </button>
  );
}
