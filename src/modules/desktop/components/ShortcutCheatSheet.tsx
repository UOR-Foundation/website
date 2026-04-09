/**
 * ShortcutCheatSheet — Modal listing all UOR OS keyboard shortcuts.
 */

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import { usePlatform } from "@/modules/desktop/hooks/usePlatform";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string;
  label: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutEntry[];
}

function buildGroups(ringKey: string): ShortcutGroup[] {
  return [
    {
      title: "Navigation",
      items: [
        { keys: `${ringKey}  K`, label: "Spotlight search" },
        { keys: `${ringKey}  ?`, label: "This cheat sheet" },
      ],
    },
    {
      title: "Windows",
      items: [
        { keys: `${ringKey}  W`, label: "Close window" },
        { keys: `${ringKey}  M`, label: "Minimize window" },
        { keys: `${ringKey}  H`, label: "Hide all windows" },
        { keys: `${ringKey}  F`, label: "Toggle fullscreen" },
      ],
    },
    {
      title: "Appearance",
      items: [
        { keys: `${ringKey}  [`, label: "Previous theme" },
        { keys: `${ringKey}  ]`, label: "Next theme" },
      ],
    },
    {
      title: "Tools",
      items: [
        { keys: `${ringKey}  V`, label: "Voice input" },
      ],
    },
  ];
}

export default function ShortcutCheatSheet({ open, onClose }: Props) {
  const { isLight } = useDesktopTheme();
  const { ringKey } = usePlatform();
  const groups = buildGroups(ringKey);

  const bgClass = isLight
    ? "bg-white/95 border-black/[0.08] text-black/80"
    : "bg-[rgba(28,28,28,0.95)] border-white/[0.08] text-white/85";

  const kbdClass = isLight
    ? "bg-black/[0.06] text-black/60 border-black/[0.08]"
    : "bg-white/[0.06] text-white/60 border-white/[0.08]";

  const mutedClass = isLight ? "text-black/40" : "text-white/40";
  const headerClass = isLight ? "text-black/30" : "text-white/30";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[10000] bg-black/30"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10001] w-[420px] max-w-[90vw] max-h-[80vh] overflow-y-auto rounded-2xl border p-6 ${bgClass}`}
            style={{
              backdropFilter: "blur(16px) saturate(1.4)",
              WebkitBackdropFilter: "blur(16px) saturate(1.4)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold tracking-tight">Keyboard Shortcuts</h2>
              <button
                onClick={onClose}
                className={`p-1 rounded-md transition-colors ${isLight ? "hover:bg-black/[0.05]" : "hover:bg-white/[0.06]"}`}
              >
                <X className={`w-4 h-4 ${mutedClass}`} />
              </button>
            </div>

            <p className={`text-[11px] mb-5 ${mutedClass}`}>
              Press <kbd className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border ${kbdClass}`}>{ringKey}</kbd> to
              activate the Ring, then press the action key.
            </p>

            {groups.map(group => (
              <div key={group.title} className="mb-4">
                <h3 className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${headerClass}`}>
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.items.map(item => (
                    <div key={item.keys} className="flex items-center justify-between py-1.5">
                      <span className={`text-[12px] ${mutedClass}`}>{item.label}</span>
                      <kbd className={`text-[11px] font-mono px-2 py-0.5 rounded border ${kbdClass}`}>
                        {item.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
