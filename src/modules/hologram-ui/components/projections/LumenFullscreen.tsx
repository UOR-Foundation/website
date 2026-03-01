/**
 * LumenFullscreen — Genesis-born full-screen reasoning interface
 * ═══════════════════════════════════════════════════════════════
 *
 * Expands from the Genesis dot with a radial clip-path animation,
 * filling the content area while keeping the sidebar visible.
 * Can collapse into a right-side panel via top-right toggle.
 */

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minimize2, X } from "lucide-react";
import ConvergenceChat from "../lumen/ConvergenceChat";

type LumenMode = "closed" | "expanding" | "fullscreen" | "collapsing" | "sidepanel";

interface LumenFullscreenProps {
  open: boolean;
  onClose: () => void;
  onCollapse: () => void;
}

export default memo(function LumenFullscreen({ open, onClose, onCollapse }: LumenFullscreenProps) {
  const [mode, setMode] = useState<LumenMode>("closed");
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Open → expanding → fullscreen
  useEffect(() => {
    if (open && mode === "closed") {
      setHasBeenOpened(true);
      setMode("expanding");
      const t = setTimeout(() => setMode("fullscreen"), 700);
      return () => clearTimeout(t);
    }
    if (!open && (mode === "fullscreen" || mode === "expanding")) {
      setMode("collapsing");
      const t = setTimeout(() => setMode("closed"), 500);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (mode === "closed") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, onClose]);

  if (!hasBeenOpened && mode === "closed") return null;

  const isVisible = mode !== "closed";
  const isFullyOpen = mode === "fullscreen";
  const isExpanding = mode === "expanding";
  const isCollapsing = mode === "collapsing";

  // Radial clip-path: expands from center
  const clipPath = isExpanding || isFullyOpen
    ? "circle(150% at 50% 40%)"
    : "circle(0% at 50% 40%)";

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[600]"
      style={{
        clipPath,
        transition: isExpanding
          ? "clip-path 700ms cubic-bezier(0.16, 1, 0.3, 1)"
          : isCollapsing
            ? "clip-path 500ms cubic-bezier(0.4, 0, 0.2, 1)"
            : "none",
        willChange: isVisible ? "clip-path" : "auto",
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      {/* Background — warm dark with subtle radial glow from center */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 35%,
              hsla(38, 30%, 18%, 0.15) 0%,
              hsla(25, 8%, 6%, 1) 70%
            )
          `,
        }}
      />

      {/* Genesis echo — fading golden ring at birth point */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          top: "38%",
          width: 200,
          height: 200,
          borderRadius: "50%",
          border: "1px solid hsla(38, 50%, 55%, 0.08)",
          boxShadow: "0 0 60px 20px hsla(38, 50%, 55%, 0.03), inset 0 0 30px hsla(38, 50%, 55%, 0.02)",
          opacity: isExpanding ? 1 : 0,
          transform: isExpanding ? "scale(3)" : "scale(0.5)",
          transition: "opacity 1.2s ease-out, transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      {/* Top-right controls */}
      <div
        className="absolute top-4 right-4 z-[610] flex items-center gap-2"
        style={{
          opacity: isFullyOpen ? 1 : 0,
          transform: isFullyOpen ? "translateY(0)" : "translateY(-8px)",
          transition: "opacity 400ms ease 300ms, transform 400ms ease 300ms",
        }}
      >
        <button
          onClick={onCollapse}
          className="group/btn flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: "hsla(25, 10%, 15%, 0.6)",
            border: "1px solid hsla(38, 20%, 40%, 0.15)",
            backdropFilter: "blur(12px)",
            color: "hsla(38, 15%, 75%, 0.7)",
          }}
          title="Collapse to side panel"
        >
          <Minimize2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span
            className="text-[10px] tracking-[0.15em] uppercase opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            Side panel
          </span>
        </button>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 hover:scale-110 active:scale-95"
          style={{
            background: "hsla(25, 10%, 15%, 0.4)",
            border: "1px solid hsla(38, 20%, 40%, 0.1)",
            color: "hsla(38, 15%, 70%, 0.5)",
          }}
          title="Close"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Content — ConvergenceChat fills the space */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          opacity: isExpanding || isFullyOpen ? 1 : 0,
          transition: "opacity 400ms ease 200ms",
        }}
      >
        <ConvergenceChat embedded onClose={onClose} />
      </div>
    </div>
  );
});
