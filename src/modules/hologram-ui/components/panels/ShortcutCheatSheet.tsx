/**
 * ShortcutCheatSheet — Keyboard Shortcut Overlay
 * ════════════════════════════════════════════════
 *
 * Clean modal showing all available shortcuts, organized by context.
 * Triggered by ⌘/ (or Ctrl+/ on Windows).
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KP } from "@/modules/hologram-os/kernel-palette";
import {
  IconHome, IconMessageCircle, IconEye, IconKeyboard,
  IconSettings, IconMail, IconSearch, IconTerminal2,
} from "@tabler/icons-react";

function detectMac(): boolean {
  if (typeof navigator === "undefined") return false;
  if ("userAgentData" in navigator && (navigator as any).userAgentData?.platform) {
    return /mac/i.test((navigator as any).userAgentData.platform);
  }
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Macintosh/i.test(navigator.userAgent);
}
const isMac = detectMac();
const MOD = isMac ? "⌘" : "Ctrl";
const SHIFT = isMac ? "⇧" : "Shift";

interface Shortcut {
  keys: string[];
  label: string;
  description?: string;
}

interface ShortcutSection {
  id: string;
  title: string;
  icon: typeof IconHome;
  shortcuts: Shortcut[];
}

const SECTIONS: ShortcutSection[] = [
  {
    id: "navigation",
    title: "Navigation",
    icon: IconHome,
    shortcuts: [
      { keys: [MOD, "."], label: "Go Home", description: "Close everything and return to desktop" },
      { keys: [MOD, "\\"], label: "Toggle Widgets", description: "Show or hide all desktop widgets" },
      { keys: [MOD, "K"], label: "Search", description: "Quick search across the system" },
    ],
  },
  {
    id: "communication",
    title: "Communication",
    icon: IconMessageCircle,
    shortcuts: [
      { keys: [MOD, ";"], label: "Open Lumen", description: "Start a conversation with Lumen" },
      { keys: [MOD, "'"], label: "Voice Input", description: "Speak to Lumen using your microphone" },
      { keys: [MOD, ","], label: "Messages", description: "Open the unified messenger inbox" },
    ],
  },
  {
    id: "view",
    title: "View & Style",
    icon: IconEye,
    shortcuts: [
      { keys: [MOD, "]"], label: "Focus Mode", description: "Toggle deep focus — hides distractions" },
      { keys: [MOD, "["], label: "Cycle Desktop Style", description: "Switch between Landscape, Light, and Dark" },
      { keys: [MOD, SHIFT, ";"], label: "Ambient Music", description: "Play or pause background soundscapes" },
    ],
  },
  {
    id: "messenger",
    title: "Messages",
    icon: IconMail,
    shortcuts: [
      { keys: ["↑", "↓"], label: "Navigate Messages", description: "Move between messages in the list" },
      { keys: ["J", "K"], label: "Navigate (Vim-style)", description: "Also moves up and down the list" },
      { keys: ["R"], label: "Reply", description: "Open reply to the selected message" },
      { keys: ["E"], label: "Archive", description: "Archive and advance to the next message" },
      { keys: ["S"], label: "Star", description: "Toggle star on the selected message" },
      { keys: ["Esc"], label: "Go Back", description: "Close reply, then reading pane, then messenger" },
    ],
  },
  {
    id: "terminal",
    title: "Terminal",
    icon: IconTerminal2,
    shortcuts: [
      { keys: ["Tab"], label: "Auto-Complete", description: "Complete the current command" },
      { keys: ["Tab", "Tab"], label: "Cycle Suggestions", description: "Cycle through completion options" },
      { keys: ["↑", "↓"], label: "Command History", description: "Browse previous commands" },
      { keys: ["Enter"], label: "Run Command", description: "Execute the current command" },
    ],
  },
  {
    id: "system",
    title: "System",
    icon: IconSettings,
    shortcuts: [
      { keys: [MOD, "/"], label: "This Shortcut Guide", description: "Show or hide this panel" },
      { keys: [MOD, SHIFT, "D"], label: "Task Manager", description: "Open system performance monitor" },
      { keys: [MOD, SHIFT, "F"], label: "Frame Inspector", description: "Show kernel frame debug overlay" },
      { keys: [MOD, SHIFT, ">"], label: "Reset Layout", description: "Reset all widget positions to defaults" },
    ],
  },
];

// ─── Sub-components ──────────────────────────────────────────────────

function KeyCap({ children }: { children: string }) {
  return (
    <kbd
      className="inline-flex items-center justify-center min-w-[26px] h-[24px] px-1.5 rounded-md text-[11px] font-medium leading-none select-none"
      style={{
        fontFamily: KP.font,
        background: "hsla(38, 10%, 100%, 0.07)",
        border: "1px solid hsla(38, 15%, 60%, 0.12)",
        color: "hsla(38, 15%, 90%, 0.8)",
        boxShadow: "0 1px 2px hsla(0, 0%, 0%, 0.2), inset 0 1px 0 hsla(0, 0%, 100%, 0.03)",
      }}
    >
      {children}
    </kbd>
  );
}

function SectionPanel({ section, expanded, onToggle }: { section: ShortcutSection; expanded: boolean; onToggle: () => void }) {
  const Icon = section.icon;
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left"
        style={{ background: expanded ? "hsla(38, 15%, 50%, 0.06)" : "transparent" }}
      >
        <Icon size={14} style={{ color: expanded ? KP.gold : KP.dim }} />
        <span className="text-xs font-medium flex-1" style={{ color: expanded ? KP.text : KP.muted }}>
          {section.title}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: KP.dim }}>
          {section.shortcuts.length}
        </span>
        <motion.span
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-[10px]"
          style={{ color: KP.dim }}
        >
          ›
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pl-3 pr-1 pb-2 space-y-0.5">
              {section.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.label}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors group"
                  onMouseEnter={(e) => { e.currentTarget.style.background = "hsla(38, 15%, 50%, 0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-light" style={{ color: "hsla(38, 15%, 85%, 0.8)" }}>
                      {shortcut.label}
                    </div>
                    {shortcut.description && (
                      <div className="text-[10px] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: KP.dim }}>
                        {shortcut.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    {shortcut.keys.map((key, i) => (
                      <KeyCap key={i}>{key}</KeyCap>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

interface ShortcutCheatSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function ShortcutCheatSheet({ open, onClose }: ShortcutCheatSheetProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["navigation", "communication", "view", "system"])
  );

  const toggle = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Reset expanded state when re-opening
  useEffect(() => {
    if (open) setExpandedSections(new Set(["navigation", "communication", "view", "system"]));
  }, [open]);

  const totalShortcuts = SECTIONS.reduce((sum, s) => sum + s.shortcuts.length, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[9998]"
            style={{ background: "hsla(25, 10%, 4%, 0.6)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed z-[9999] top-1/2 left-1/2 w-[420px] max-h-[80vh] overflow-hidden rounded-xl flex flex-col"
            style={{
              background: "hsla(25, 8%, 8%, 0.97)",
              border: `1px solid ${KP.cardBorder}`,
              boxShadow: "0 24px 80px hsla(0, 0%, 0%, 0.5), 0 0 1px hsla(38, 15%, 60%, 0.1)",
              fontFamily: KP.font,
            }}
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-48%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-48%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3.5 shrink-0"
              style={{ borderBottom: `1px solid ${KP.cardBorder}` }}
            >
              <div className="flex items-center gap-2">
                <IconKeyboard size={15} style={{ color: KP.gold }} />
                <h2 className="text-sm font-semibold tracking-wide" style={{ fontFamily: KP.serif, color: KP.text }}>
                  Keyboard Shortcuts
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: KP.dim }}>
                  {totalShortcuts} shortcuts
                </span>
                <button
                  onClick={onClose}
                  className="text-[11px] rounded-md px-2 py-0.5 transition-colors hover:bg-white/[0.06]"
                  style={{ color: KP.dim }}
                >
                  ESC
                </button>
              </div>
            </div>

            {/* Scrollable sections */}
            <div className="overflow-y-auto flex-1 px-2 py-2 space-y-0.5">
              {SECTIONS.map((section) => (
                <SectionPanel
                  key={section.id}
                  section={section}
                  expanded={expandedSections.has(section.id)}
                  onToggle={() => toggle(section.id)}
                />
              ))}
            </div>

            {/* Footer hint */}
            <div
              className="px-5 py-2 text-[10px] text-center shrink-0"
              style={{ borderTop: `1px solid ${KP.cardBorder}`, color: KP.dim }}
            >
              Shortcuts you use often will fade from the interface as you master them
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
