/**
 * DesktopMenuBar — Slim top status bar, theme-aware.
 */

import { useState, useEffect } from "react";
import { Search, Wifi, Volume2 } from "lucide-react";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";
import { getApp } from "@/modules/desktop/lib/desktop-apps";
import { useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";

interface Props {
  activeWindowId: string | null;
  windows: WindowState[];
  onSpotlight?: () => void;
}

export default function DesktopMenuBar({ activeWindowId, windows, onSpotlight }: Props) {
  const [time, setTime] = useState(new Date());
  const { isLight } = useDesktopTheme();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const activeWin = windows.find(w => w.id === activeWindowId);
  const activeApp = activeWin ? getApp(activeWin.appId) : null;

  const formatted = time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const clock = time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const bg = isLight ? "rgba(245,245,245,0.85)" : "rgba(20,20,20,0.65)";
  const border = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const textPrimary = isLight ? "text-black/80" : "text-white/85";
  const textSecondary = isLight ? "text-black/45" : "text-white/50";
  const iconColor = isLight ? "text-black/30" : "text-white/30";
  const iconHover = isLight ? "text-black/55" : "text-white/55";
  const iconMuted = isLight ? "text-black/25" : "text-white/35";
  const clockColor = isLight ? "text-black/50" : "text-white/55";
  const kbdBorder = isLight ? "border-black/[0.06] bg-black/[0.03]" : "border-white/[0.06] bg-white/[0.03]";
  const kbdText = isLight ? "text-black/20" : "text-white/20";

  return (
    <div
      data-menubar
      className="fixed top-0 inset-x-0 z-[200] h-7 flex items-center justify-between px-4 select-none"
      style={{
        background: bg,
        backdropFilter: "blur(48px) saturate(1.5)",
        WebkitBackdropFilter: "blur(48px) saturate(1.5)",
        borderBottom: `1px solid ${border}`,
      }}
    >
      <div className="flex items-center gap-3">
        <span className={`text-[13px] font-bold tracking-tight ${textPrimary}`}>⬡ UOR</span>
        <span className={`text-[13px] font-semibold ${textSecondary}`}>
          {activeApp?.label || "Desktop"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSpotlight}
          className={`p-0.5 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors group`}
          title="Spotlight (⌘K)"
        >
          <Search className={`w-3 h-3 ${iconColor} group-hover:${iconHover} transition-colors`} />
        </button>
        <Volume2 className={`w-3.5 h-3.5 ${iconMuted}`} />
        <Wifi className={`w-3.5 h-3.5 ${iconMuted}`} />
        <span className={`text-[12px] ${clockColor} font-medium tabular-nums`}>
          {formatted}&ensp;{clock}
        </span>
      </div>
    </div>
  );
}
