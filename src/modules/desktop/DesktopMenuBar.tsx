/**
 * DesktopMenuBar — Slim, crisp top status bar for UOR OS.
 */

import { useState, useEffect } from "react";
import { Search, Wifi, Volume2 } from "lucide-react";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";
import { getApp } from "@/modules/desktop/lib/desktop-apps";

interface Props {
  activeWindowId: string | null;
  windows: WindowState[];
  onSpotlight?: () => void;
}

export default function DesktopMenuBar({ activeWindowId, windows, onSpotlight }: Props) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const activeWin = windows.find(w => w.id === activeWindowId);
  const activeApp = activeWin ? getApp(activeWin.appId) : null;

  const formatted = time.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const clock = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      data-menubar
      className="fixed top-0 inset-x-0 z-[200] h-7 flex items-center justify-between px-4 select-none"
      style={{
        background: "rgba(20,20,20,0.65)",
        backdropFilter: "blur(48px) saturate(1.5)",
        WebkitBackdropFilter: "blur(48px) saturate(1.5)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Left — Logo + Active app */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-bold text-white/85 tracking-tight">⬡ UOR</span>
        <span className="text-[13px] font-semibold text-white/50">
          {activeApp?.label || "Desktop"}
        </span>
      </div>

      {/* Right — Status icons + Spotlight + Clock */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSpotlight}
          className="p-0.5 rounded hover:bg-white/[0.06] transition-colors group"
          title="Spotlight (⌘K)"
        >
          <Search className="w-3 h-3 text-white/30 group-hover:text-white/55 transition-colors" />
        </button>
        <Volume2 className="w-3.5 h-3.5 text-white/35" />
        <Wifi className="w-3.5 h-3.5 text-white/35" />
        <span className="text-[12px] text-white/55 font-medium tabular-nums">
          {formatted}&ensp;{clock}
        </span>
      </div>
    </div>
  );
}
