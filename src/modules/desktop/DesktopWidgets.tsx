/**
 * DesktopWidgets — Clock + quote overlay for the desktop.
 * Fades out when any window is maximized.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ImmersiveQuote from "@/modules/oracle/components/ImmersiveQuote";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";

interface Props {
  windows: WindowState[];
}

export default function DesktopWidgets({ windows }: Props) {
  const [time, setTime] = useState(new Date());
  const hasMaximized = windows.some(w => w.maximized && !w.minimized);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hours = time.getHours() % 12 || 12;
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const period = time.getHours() >= 12 ? "PM" : "AM";
  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.div
      className="fixed inset-0 z-[5] flex flex-col items-center justify-center pointer-events-none"
      animate={{ opacity: hasMaximized ? 0 : 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Large clock */}
      <div className="text-center mb-4">
        <h1
          className="text-white/80 font-bold tracking-tight leading-none"
          style={{
            fontSize: "clamp(72px, 12vw, 140px)",
            fontFamily: "'DM Sans', -apple-system, sans-serif",
            textShadow: "0 4px 40px rgba(0,0,0,0.3)",
          }}
        >
          {hours}:{minutes}
        </h1>
        <p
          className="text-white/45 font-medium tracking-wide"
          style={{
            fontSize: "clamp(16px, 2vw, 24px)",
            fontFamily: "'DM Sans', -apple-system, sans-serif",
          }}
        >
          {dateStr}
        </p>
      </div>

      {/* Quote */}
      <div className="mt-6">
        <ImmersiveQuote />
      </div>
    </motion.div>
  );
}
