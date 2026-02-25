/**
 * FrameDebugOverlay — Real-time FrameRegistry visualizer
 * ══════════════════════════════════════════════════════
 *
 * Floating dev panel showing all active hologram frames,
 * their layers, transforms, opacity, and registry stats.
 * Toggle with Ctrl+Shift+F or the ⬡ button.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { frameRegistry, type FrameDescriptor } from "./HologramFrame";

export default function FrameDebugOverlay() {
  const [open, setOpen] = useState(false);
  const [frames, setFrames] = useState<FrameDescriptor[]>([]);

  useEffect(() => {
    setFrames(frameRegistry.snapshot());
    return frameRegistry.subscribe(setFrames);
  }, []);

  // Keyboard shortcut: Ctrl+Shift+F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggle = useCallback(() => setOpen((p) => !p), []);

  const layerColor = (layer: number) => {
    const colors = [
      "hsl(220, 60%, 65%)",  // 0 canvas
      "hsl(160, 50%, 55%)",  // 1 chrome
      "hsl(38, 55%, 60%)",   // 2 content
      "hsl(340, 50%, 60%)",  // 3+ overlay
    ];
    return colors[Math.min(layer, 3)];
  };

  const layerLabel = (layer: number) => {
    const labels: Record<number, string> = { 0: "Canvas", 1: "Chrome", 2: "Content" };
    return labels[layer] ?? `Overlay ${layer}`;
  };

  const fmtVec = (v: number[]) => v.map((n) => (n % 1 === 0 ? n : n.toFixed(2))).join(", ");

  return (
    <>
      {/* Toggle button — bottom-left */}
      <button
        onClick={toggle}
        className="fixed bottom-4 left-4 z-[9999] w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 hover:scale-110"
        style={{
          background: open ? "hsl(220, 15%, 20%)" : "hsla(220, 15%, 15%, 0.7)",
          border: `1px solid ${open ? "hsl(220, 40%, 50%)" : "hsla(220, 15%, 30%, 0.6)"}`,
          color: open ? "hsl(220, 60%, 75%)" : "hsla(0, 0%, 100%, 0.5)",
          backdropFilter: "blur(12px)",
          fontFamily: "monospace",
          fontSize: "14px",
        }}
        title="Frame Debug (Ctrl+Shift+F)"
      >
        ⬡
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="fixed bottom-14 left-4 z-[9999] w-[340px] max-h-[70vh] overflow-y-auto rounded-xl"
            style={{
              background: "hsla(220, 18%, 10%, 0.92)",
              border: "1px solid hsla(220, 20%, 25%, 0.6)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 20px 60px hsla(0, 0%, 0%, 0.5), 0 0 1px hsla(220, 40%, 50%, 0.3)",
              fontFamily: "'DM Sans', monospace, system-ui",
              color: "hsla(0, 0%, 100%, 0.85)",
            }}
          >
            {/* Header */}
            <div
              className="sticky top-0 flex items-center justify-between px-4 py-3 rounded-t-xl"
              style={{
                background: "hsla(220, 18%, 12%, 0.95)",
                borderBottom: "1px solid hsla(220, 20%, 22%, 0.5)",
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: "hsl(220, 60%, 70%)", fontSize: "12px" }}>⬡</span>
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(220, 30%, 70%)" }}>
                  Frame Registry
                </span>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: "hsla(220, 40%, 50%, 0.15)",
                  color: "hsl(220, 50%, 70%)",
                  border: "1px solid hsla(220, 40%, 50%, 0.2)",
                }}
              >
                {frames.length} frame{frames.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Frame list */}
            <div className="px-3 py-2 space-y-2">
              {frames.length === 0 && (
                <p className="text-[11px] text-center py-4" style={{ color: "hsla(0, 0%, 100%, 0.35)" }}>
                  No frames registered
                </p>
              )}

              {frames.map((f) => {
                const c = layerColor(f.layer);
                const hasTransform =
                  f.transform.position.some((v) => v !== 0) ||
                  f.transform.rotation.some((v) => v !== 0) ||
                  f.transform.scale.some((v) => v !== 1);

                return (
                  <div
                    key={f.id}
                    className="rounded-lg p-3 space-y-1.5"
                    style={{
                      background: "hsla(220, 15%, 15%, 0.6)",
                      borderLeft: `3px solid ${c}`,
                    }}
                  >
                    {/* Title row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: c, color: "hsl(220, 15%, 8%)" }}
                        >
                          L{f.layer}
                        </span>
                        <span className="text-[11px] font-medium" style={{ color: "hsla(0, 0%, 100%, 0.9)" }}>
                          {f.label}
                        </span>
                      </div>
                      <span className="text-[10px]" style={{ color: layerColor(f.layer) }}>
                        {layerLabel(f.layer)}
                      </span>
                    </div>

                    {/* Properties */}
                    <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[10px]" style={{ color: "hsla(0, 0%, 100%, 0.5)" }}>
                      <div>
                        <span style={{ color: "hsla(0, 0%, 100%, 0.3)" }}>opacity </span>
                        <span style={{ color: "hsla(0, 0%, 100%, 0.7)" }}>{f.opacity}</span>
                      </div>
                      <div>
                        <span style={{ color: "hsla(0, 0%, 100%, 0.3)" }}>events </span>
                        <span style={{ color: f.interactive ? "hsl(160, 50%, 55%)" : "hsl(0, 50%, 55%)" }}>
                          {f.interactive ? "on" : "off"}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "hsla(0, 0%, 100%, 0.3)" }}>visible </span>
                        <span style={{ color: f.visible ? "hsl(160, 50%, 55%)" : "hsl(0, 50%, 55%)" }}>
                          {f.visible ? "yes" : "no"}
                        </span>
                      </div>
                    </div>

                    {/* Transform (only if non-identity) */}
                    {hasTransform && (
                      <div className="text-[10px] space-y-0.5 pt-1" style={{ borderTop: "1px solid hsla(220, 15%, 25%, 0.4)" }}>
                        <div>
                          <span style={{ color: "hsl(220, 50%, 65%)" }}>pos</span>
                          <span style={{ color: "hsla(0, 0%, 100%, 0.6)" }}> [{fmtVec(f.transform.position)}]</span>
                        </div>
                        <div>
                          <span style={{ color: "hsl(38, 50%, 65%)" }}>rot</span>
                          <span style={{ color: "hsla(0, 0%, 100%, 0.6)" }}> [{fmtVec(f.transform.rotation)}]°</span>
                        </div>
                        <div>
                          <span style={{ color: "hsl(160, 45%, 60%)" }}>scl</span>
                          <span style={{ color: "hsla(0, 0%, 100%, 0.6)" }}> [{fmtVec(f.transform.scale)}]</span>
                        </div>
                      </div>
                    )}

                    {/* Frame ID */}
                    <div className="text-[9px] truncate pt-0.5" style={{ color: "hsla(0, 0%, 100%, 0.2)" }}>
                      {f.id}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              className="px-4 py-2 text-[9px] flex justify-between"
              style={{
                borderTop: "1px solid hsla(220, 20%, 22%, 0.4)",
                color: "hsla(0, 0%, 100%, 0.25)",
              }}
            >
              <span>Ctrl+Shift+F to toggle</span>
              <span>z-band: 100</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
