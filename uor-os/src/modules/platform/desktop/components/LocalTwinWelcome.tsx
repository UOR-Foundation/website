/**
 * LocalTwinWelcome — First-launch welcome overlay for Tauri (local twin).
 * Shows module verification sequence, then fades out.
 * Only renders when isLocal() is true and user hasn't been welcomed yet.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlatform } from "@/modules/platform/desktop/hooks/usePlatform";
import { isLocal } from "@/lib/runtime";
import { Shield, Sparkles } from "lucide-react";
import ModuleChecklist from "./ModuleChecklist";

const STORAGE_KEY = "uor:local-twin-welcomed";
const FADE_OUT_DURATION = 600;

type Phase = "intro" | "modules" | "ready";

export default function LocalTwinWelcome({ onComplete }: { onComplete: () => void }) {
  const { isMac } = usePlatform();
  const [phase, setPhase] = useState<Phase>("intro");
  const [exiting, setExiting] = useState(false);

  const finish = useCallback(() => {
    setExiting(true);
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
    setTimeout(onComplete, FADE_OUT_DURATION);
  }, [onComplete]);

  // Phase transitions
  useEffect(() => {
    if (phase === "intro") {
      const t = setTimeout(() => setPhase("modules"), 1800);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const handleModulesComplete = useCallback(() => {
    setPhase("ready");
    setTimeout(finish, 1600);
  }, [finish]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "hsl(220 20% 6% / 0.97)" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: FADE_OUT_DURATION / 1000 }}
    >
      <div className="flex flex-col items-center gap-6 max-w-md px-8 text-center w-full">
        {/* Phase indicator */}
        <div className="flex gap-2 mb-2">
          {(["intro", "modules", "ready"] as Phase[]).map((p, i) => (
            <div
              key={p}
              className="h-1.5 transition-all duration-500"
              style={{
                width: p === phase ? 32 : 8,
                borderRadius: isMac ? "9999px" : "6px",
                background:
                  (["intro", "modules", "ready"].indexOf(phase) >= i)
                    ? "hsl(210 100% 72%)"
                    : "hsl(0 0% 100% / 0.15)",
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div
              key="intro"
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <div
                className="flex items-center justify-center w-16 h-16"
                style={{
                  borderRadius: isMac ? "50%" : "16px",
                  background: "linear-gradient(135deg, hsl(210 100% 72% / 0.15), hsl(280 80% 65% / 0.1))",
                  border: "1px solid hsl(210 100% 72% / 0.2)",
                  color: "hsl(210 100% 80%)",
                }}
              >
                <Shield className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "hsl(0 0% 95%)" }}>
                Your Local Twin
              </h2>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: "hsl(0 0% 60%)" }}>
                Everything runs on your machine. Your data never leaves.
              </p>
            </motion.div>
          )}

          {phase === "modules" && (
            <motion.div
              key="modules"
              className="flex flex-col items-center gap-4 w-full"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <h2 className="text-lg font-semibold tracking-tight" style={{ color: "hsl(0 0% 90%)" }}>
                Initializing Modules
              </h2>
              <ModuleChecklist animated onComplete={handleModulesComplete} />
            </motion.div>
          )}

          {phase === "ready" && (
            <motion.div
              key="ready"
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <div
                className="flex items-center justify-center w-16 h-16"
                style={{
                  borderRadius: isMac ? "50%" : "16px",
                  background: "linear-gradient(135deg, hsl(150 70% 55% / 0.15), hsl(210 100% 72% / 0.1))",
                  border: "1px solid hsl(150 70% 55% / 0.2)",
                  color: "hsl(150 70% 55%)",
                }}
              >
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "hsl(0 0% 95%)" }}>
                Ready
              </h2>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: "hsl(0 0% 60%)" }}>
                Your sovereign instance is live.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** Check if welcome should be shown */
export function shouldShowLocalTwinWelcome(): boolean {
  if (!isLocal()) return false;
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}
