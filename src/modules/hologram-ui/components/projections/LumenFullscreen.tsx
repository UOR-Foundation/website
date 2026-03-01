/**
 * LumenFullscreen — Genesis-born full-screen reasoning interface
 * ═══════════════════════════════════════════════════════════════
 *
 * Expands from the Genesis dot with a radial clip-path animation,
 * filling the content area while keeping the sidebar visible.
 * The projection originates from and collapses back to the
 * Genesis monad's center point (tracked via CSS custom property).
 */

import { useState, useEffect, useRef, memo } from "react";
import { Minimize2, X } from "lucide-react";
import ConvergenceChat from "../lumen/ConvergenceChat";

type LumenMode = "closed" | "expanding" | "fullscreen" | "collapsing";

interface LumenFullscreenProps {
  open: boolean;
  onClose: () => void;
  onCollapse: () => void;
}

/**
 * Read the Genesis dot's center position relative to its
 * offset parent (the content area). Falls back to golden-ratio center.
 */
function getGenesisOrigin(container: HTMLElement | null): string {
  const dot = document.querySelector<HTMLElement>('[aria-label="Open Lumen AI"]');
  if (!dot || !container) return "50% 58%";

  const dotRect = dot.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const x = ((dotRect.left + dotRect.width / 2 - containerRect.left) / containerRect.width) * 100;
  const y = ((dotRect.top + dotRect.height / 2 - containerRect.top) / containerRect.height) * 100;

  return `${x.toFixed(1)}% ${y.toFixed(1)}%`;
}

export default memo(function LumenFullscreen({ open, onClose, onCollapse }: LumenFullscreenProps) {
  const [mode, setMode] = useState<LumenMode>("closed");
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [origin, setOrigin] = useState("50% 58%");
  const containerRef = useRef<HTMLDivElement>(null);

  // Capture genesis dot position and begin expansion
  useEffect(() => {
    if (open && mode === "closed") {
      setHasBeenOpened(true);
      // Snapshot the Genesis dot position at moment of click
      setOrigin(getGenesisOrigin(containerRef.current));
      setMode("expanding");
      const t = setTimeout(() => setMode("fullscreen"), 600);
      return () => clearTimeout(t);
    }
    if (!open && (mode === "fullscreen" || mode === "expanding")) {
      // Re-snapshot origin for collapse (dot may have shifted)
      setOrigin(getGenesisOrigin(containerRef.current));
      setMode("collapsing");
      const t = setTimeout(() => setMode("closed"), 450);
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

  // Radial clip-path anchored to genesis dot center
  const clipPath = isExpanding || isFullyOpen
    ? `circle(150% at ${origin})`
    : `circle(0% at ${origin})`;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[600]"
      style={{
        clipPath,
        transition: isExpanding
          ? "clip-path 600ms cubic-bezier(0.16, 1, 0.3, 1)"
          : isCollapsing
            ? "clip-path 450ms cubic-bezier(0.4, 0, 0.2, 1)"
            : "none",
        willChange: isVisible ? "clip-path" : "auto",
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      {/* Background — warm dark with subtle radial glow from genesis origin */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at ${origin},
              hsla(38, 30%, 18%, 0.18) 0%,
              hsla(25, 8%, 6%, 1) 65%
            )
          `,
        }}
      />

      {/* Genesis echo — fading golden ring at birth point */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: origin.split(" ")[0],
          top: origin.split(" ")[1],
          width: 0,
          height: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -100,
            top: -100,
            width: 200,
            height: 200,
            borderRadius: "50%",
            border: "1.5px solid hsla(38, 50%, 55%, 0.12)",
            boxShadow: "0 0 60px 20px hsla(38, 50%, 55%, 0.04), inset 0 0 30px hsla(38, 50%, 55%, 0.03)",
            opacity: isExpanding ? 1 : 0,
            transform: isExpanding ? "scale(4)" : "scale(0.3)",
            transition: "opacity 1s ease-out, transform 1s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>

      {/* Top-right controls */}
      <div
        className="absolute top-4 right-4 z-[610] flex items-center gap-2"
        style={{
          opacity: isFullyOpen ? 1 : 0,
          transform: isFullyOpen ? "translateY(0)" : "translateY(-8px)",
          transition: "opacity 300ms ease 250ms, transform 300ms ease 250ms",
        }}
      >
        <button
          onClick={onCollapse}
          className="group/btn flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
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
          className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
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
          transition: "opacity 350ms ease 150ms",
        }}
      >
        <ConvergenceChat embedded onClose={onClose} />
      </div>
    </div>
  );
});
