/**
 * LiveSearchToggle — "Live" mode toggle pill for type-to-stream.
 * When active, typing triggers debounced streaming search.
 */

import { motion } from "framer-motion";

interface Props {
  active: boolean;
  onToggle: () => void;
  streaming?: boolean;
}

export default function LiveSearchToggle({ active, onToggle, streaming = false }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
        transition-all duration-300 border
        ${active
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
          : "bg-muted/5 text-muted-foreground/40 border-border/10 hover:text-muted-foreground/60 hover:border-border/20"
        }
      `}
      title={active ? "Live mode on — content streams as you type" : "Enable live mode"}
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2">
        {active && streaming && (
          <motion.span
            className="absolute inset-0 rounded-full bg-emerald-400/60"
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${active ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
      </span>
      <span>Live</span>
    </button>
  );
}
