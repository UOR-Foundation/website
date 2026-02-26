/**
 * ShortcutCheatSheet — Keyboard Shortcut Overlay
 * ════════════════════════════════════════════════
 *
 * Clean modal showing all available shortcuts.
 * Triggered by ⌘/ (or Ctrl+/ on Windows).
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

function detectMac(): boolean {
  if (typeof navigator === "undefined") return false;
  if ("userAgentData" in navigator && (navigator as any).userAgentData?.platform) {
    return /mac/i.test((navigator as any).userAgentData.platform);
  }
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Macintosh/i.test(navigator.userAgent);
}
const isMac = detectMac();
const MOD = isMac ? "⌘" : "Ctrl";

interface Shortcut {
  keys: string[];
  label: string;
  section: string;
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: [MOD, "H"], label: "Go Home", section: "Navigation" },
  { keys: [MOD, "B"], label: "Toggle Sidebar", section: "Navigation" },
  // Communication
  { keys: [MOD, "L"], label: "Open Lumen AI", section: "Communication" },
  { keys: [MOD, "M"], label: "Messages", section: "Communication" },
  // View
  { keys: [MOD, "F"], label: "Toggle Focus Mode", section: "View" },
  { keys: [MOD, "E"], label: "Cycle Style", section: "View" },
  // System
  { keys: [MOD, "/"], label: "Shortcut Cheat Sheet", section: "System" },
];

const sections = [...new Set(SHORTCUTS.map((s) => s.section))];

function KeyCap({ children }: { children: string }) {
  return (
    <kbd
      className="inline-flex items-center justify-center min-w-[28px] h-[26px] px-1.5 rounded-md text-[11px] font-medium leading-none select-none"
      style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: "hsla(38, 10%, 100%, 0.08)",
        border: "1px solid hsla(38, 15%, 60%, 0.15)",
        color: "hsla(38, 15%, 90%, 0.85)",
        boxShadow: "0 1px 2px hsla(0, 0%, 0%, 0.2), inset 0 1px 0 hsla(0, 0%, 100%, 0.04)",
      }}
    >
      {children}
    </kbd>
  );
}

interface ShortcutCheatSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function ShortcutCheatSheet({ open, onClose }: ShortcutCheatSheetProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[9998]"
            style={{ background: "hsla(0, 0%, 0%, 0.6)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed z-[9999] top-1/2 left-1/2 w-[380px] max-h-[80vh] overflow-y-auto rounded-2xl"
            style={{
              background: "hsla(30, 8%, 8%, 0.95)",
              border: "1px solid hsla(38, 15%, 40%, 0.15)",
              boxShadow: "0 24px 80px hsla(0, 0%, 0%, 0.5), 0 0 1px hsla(38, 15%, 60%, 0.1)",
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-48%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-48%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid hsla(38, 15%, 40%, 0.1)" }}
            >
              <h2
                className="text-[15px] font-medium tracking-wide"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "hsla(38, 15%, 90%, 0.9)",
                }}
              >
                Keyboard Shortcuts
              </h2>
              <button
                onClick={onClose}
                className="text-[12px] rounded-md px-2 py-1 transition-colors"
                style={{
                  color: "hsla(38, 15%, 70%, 0.5)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "hsla(38, 15%, 50%, 0.1)";
                  e.currentTarget.style.color = "hsla(38, 15%, 80%, 0.8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "hsla(38, 15%, 70%, 0.5)";
                }}
              >
                ESC
              </button>
            </div>

            {/* Shortcut list */}
            <div className="px-6 py-4 space-y-5">
              {sections.map((section) => (
                <div key={section} className="space-y-2">
                  <span
                    className="text-[10px] tracking-[0.2em] uppercase font-medium block"
                    style={{ color: "hsla(38, 15%, 65%, 0.45)" }}
                  >
                    {section}
                  </span>
                  <div className="space-y-1">
                    {SHORTCUTS.filter((s) => s.section === section).map((shortcut) => (
                      <div
                        key={shortcut.label}
                        className="flex items-center justify-between py-1.5 rounded-lg px-2 -mx-2 transition-colors"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "hsla(38, 15%, 50%, 0.06)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span
                          className="text-[13px] font-light"
                          style={{ color: "hsla(38, 15%, 85%, 0.75)" }}
                        >
                          {shortcut.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <KeyCap key={i}>{key}</KeyCap>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
