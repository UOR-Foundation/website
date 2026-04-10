/**
 * ModuleChecklist — Visual inventory of what gets installed in a local UOR OS instance.
 * Reused on the Download page and in LocalTwinWelcome first-boot overlay.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Circle, Loader2 } from "lucide-react";
import { usePlatform } from "@/modules/desktop/hooks/usePlatform";

export interface Module {
  id: string;
  name: string;
  description: string;
  included: boolean;
  comingSoon?: boolean;
}

export const UOR_MODULES: Module[] = [
  { id: "kernel",    name: "UOR Kernel",       description: "Ring R₈ computation engine",     included: true },
  { id: "graph",     name: "Knowledge Graph",  description: "Local SQLite + GrafeoDB store",  included: true },
  { id: "vault",     name: "Sovereign Vault",  description: "Encrypted local key storage",    included: true },
  { id: "bus",       name: "Content Bus",      description: "Event orchestration layer",      included: true },
  { id: "identity",  name: "Identity System",  description: "Content-addressed naming",       included: true },
  { id: "oracle",    name: "Oracle (Cloud)",   description: "AI reasoning via cloud API",     included: true },
  { id: "llm",       name: "Local LLM",        description: "On-device inference (Ollama)",   included: false, comingSoon: true },
];

type ModuleStatus = "pending" | "verifying" | "verified";

interface Props {
  /** If true, animate modules verifying one-by-one (for first-boot) */
  animated?: boolean;
  /** Compact layout for inline use */
  compact?: boolean;
  /** Callback when all included modules are verified */
  onComplete?: () => void;
}

export default function ModuleChecklist({ animated = false, compact = false, onComplete }: Props) {
  const { isMac } = usePlatform();
  const [statuses, setStatuses] = useState<Record<string, ModuleStatus>>(() => {
    const init: Record<string, ModuleStatus> = {};
    UOR_MODULES.forEach(m => { init[m.id] = animated ? "pending" : "verified"; });
    return init;
  });

  useEffect(() => {
    if (!animated) return;

    const includedModules = UOR_MODULES.filter(m => m.included);
    let cancelled = false;

    const run = async () => {
      for (let i = 0; i < includedModules.length; i++) {
        if (cancelled) return;
        const mod = includedModules[i];

        setStatuses(prev => ({ ...prev, [mod.id]: "verifying" }));
        await new Promise(r => setTimeout(r, 400 + Math.random() * 300));

        if (cancelled) return;
        setStatuses(prev => ({ ...prev, [mod.id]: "verified" }));
      }
      onComplete?.();
    };

    const timer = setTimeout(run, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [animated, onComplete]);

  const borderRadius = isMac ? "12px" : "8px";

  return (
    <div
      className="w-full"
      style={{
        background: compact ? "transparent" : "hsl(220 15% 8% / 0.6)",
        border: compact ? "none" : "1px solid hsl(220 15% 20% / 0.4)",
        borderRadius: compact ? 0 : borderRadius,
        padding: compact ? 0 : "20px",
      }}
    >
      {!compact && (
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-4"
          style={{ color: "hsl(210 30% 60%)" }}
        >
          Module Inventory
        </p>
      )}

      <div className={compact ? "space-y-2" : "space-y-3"}>
        {UOR_MODULES.map((mod, i) => {
          const status = statuses[mod.id];
          const isIncluded = mod.included;

          return (
            <motion.div
              key={mod.id}
              className="flex items-center gap-3"
              initial={animated ? { opacity: 0, x: -8 } : { opacity: 1 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: animated ? i * 0.08 : 0, duration: 0.3 }}
            >
              {/* Status icon */}
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                {!isIncluded ? (
                  <Circle size={14} style={{ color: "hsl(0 0% 35%)" }} />
                ) : status === "verifying" ? (
                  <Loader2 size={14} className="animate-spin" style={{ color: "hsl(210 100% 72%)" }} />
                ) : status === "verified" ? (
                  <motion.div
                    initial={animated ? { scale: 0 } : { scale: 1 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Check size={14} style={{ color: "hsl(150 70% 55%)" }} strokeWidth={3} />
                  </motion.div>
                ) : (
                  <Circle size={14} style={{ color: "hsl(0 0% 25%)" }} />
                )}
              </div>

              {/* Module info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${!isIncluded ? "opacity-40" : ""}`}
                    style={{ color: "hsl(0 0% 90%)" }}
                  >
                    {mod.name}
                  </span>
                  {mod.comingSoon && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5"
                      style={{
                        color: "hsl(40 80% 65%)",
                        background: "hsl(40 80% 65% / 0.1)",
                        borderRadius: "4px",
                      }}
                    >
                      Coming Soon
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs ${!isIncluded ? "opacity-30" : ""}`}
                  style={{ color: "hsl(0 0% 55%)" }}
                >
                  {mod.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
