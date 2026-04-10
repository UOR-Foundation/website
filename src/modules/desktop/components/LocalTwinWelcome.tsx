/**
 * LocalTwinWelcome — First-launch welcome overlay for Tauri (local twin).
 * Auto-advances through 3 panels in ~4s, then fades out.
 * Only renders when isLocal() is true and user hasn't been welcomed yet.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlatform } from "@/modules/desktop/hooks/usePlatform";
import { isLocal } from "@/lib/runtime";
import { Shield, Database, Sparkles } from "lucide-react";

const STORAGE_KEY = "uor:local-twin-welcomed";
const PANEL_DURATION = 1400; // ms per panel
const FADE_OUT_DURATION = 600;

interface Panel {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

const panels: Panel[] = [
  {
    icon: <Shield className="w-8 h-8" />,
    title: "Your Local Twin",
    subtitle: "Everything runs on your machine. Your data never leaves.",
  },
  {
    icon: <Database className="w-8 h-8" />,
    title: "Sovereign Storage",
    subtitle: "SQLite database, encrypted vault, delta-compressed graph.",
  },
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: "Ready",
    subtitle: "Your sovereign instance is live.",
  },
];

export default function LocalTwinWelcome({ onComplete }: { onComplete: () => void }) {
  const { isMac } = usePlatform();
  const [panelIndex, setPanelIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  const finish = useCallback(() => {
    setExiting(true);
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
    setTimeout(onComplete, FADE_OUT_DURATION);
  }, [onComplete]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPanelIndex(prev => {
        if (prev >= panels.length - 1) {
          clearInterval(timer);
          setTimeout(finish, PANEL_DURATION);
          return prev;
        }
        return prev + 1;
      });
    }, PANEL_DURATION);
    return () => clearInterval(timer);
  }, [finish]);

  const borderRadius = isMac ? "9999px" : "16px";

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "hsl(220 20% 6% / 0.97)" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: FADE_OUT_DURATION / 1000 }}
    >
      <div className="flex flex-col items-center gap-6 max-w-md px-8 text-center">
        {/* Progress dots */}
        <div className="flex gap-2 mb-2">
          {panels.map((_, i) => (
            <div
              key={i}
              className="h-1.5 transition-all duration-500"
              style={{
                width: i === panelIndex ? 32 : 8,
                borderRadius,
                background: i <= panelIndex
                  ? "hsl(210 100% 72%)"
                  : "hsl(0 0% 100% / 0.15)",
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={panelIndex}
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
              {panels[panelIndex].icon}
            </div>

            <h2
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "hsl(0 0% 95%)" }}
            >
              {panels[panelIndex].title}
            </h2>

            <p
              className="text-sm leading-relaxed max-w-xs"
              style={{ color: "hsl(0 0% 60%)" }}
            >
              {panels[panelIndex].subtitle}
            </p>
          </motion.div>
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
