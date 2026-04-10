/**
 * DesktopDock — Clean dock with separator, theme-aware.
 */

import { DESKTOP_APPS, type DesktopApp } from "@/modules/platform/desktop/lib/desktop-apps";
import type { WindowState } from "@/modules/platform/desktop/hooks/useWindowManager";
import { useDesktopTheme } from "@/modules/platform/desktop/hooks/useDesktopTheme";
import "@/modules/platform/desktop/desktop.css";

interface Props {
  windows: WindowState[];
  onOpenApp: (appId: string, title: string, defaultSize?: { w: number; h: number }) => void;
}

export default function DesktopDock({ windows, onOpenApp }: Props) {
  const { isLight } = useDesktopTheme();
  const openAppIds = new Set(windows.map(w => w.appId));
  const minimizedIds = new Set(windows.filter(w => w.minimized).map(w => w.appId));

  const apps = DESKTOP_APPS.slice(0, -1);
  const systemApps = DESKTOP_APPS.slice(-1);

  const dockBg = isLight ? "rgba(255,255,255,0.70)" : "rgba(0,0,0,0.40)";
  const dockBorder = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)";
  const sepColor = isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.08)";

  return (
    <div data-dock className="fixed bottom-3 inset-x-0 z-[190] flex justify-center pointer-events-none">
      <div
        className="pointer-events-auto flex items-end gap-1 px-2.5 py-1.5 rounded-2xl"
        style={{
          background: dockBg,
          backdropFilter: "blur(16px) saturate(1.4)",
          WebkitBackdropFilter: "blur(16px) saturate(1.4)",
          border: `1px solid ${dockBorder}`,
        }}
      >
        {apps.map((app) => (
          <DockIcon key={app.id} app={app} isOpen={openAppIds.has(app.id)} isMinimized={minimizedIds.has(app.id)} isLight={isLight}
            onClick={() => onOpenApp(app.id, app.label, app.defaultSize)} />
        ))}
        <div className="w-px h-6 mx-0.5 self-center" style={{ background: sepColor }} />
        {systemApps.map((app) => (
          <DockIcon key={app.id} app={app} isOpen={openAppIds.has(app.id)} isMinimized={minimizedIds.has(app.id)} isLight={isLight}
            onClick={() => onOpenApp(app.id, app.label, app.defaultSize)} />
        ))}
      </div>
    </div>
  );
}

function DockIcon({ app, isOpen, isMinimized, isLight, onClick }: {
  app: DesktopApp; isOpen: boolean; isMinimized: boolean; isLight: boolean; onClick: () => void;
}) {
  const Icon = app.icon;
  const iconBg = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";
  const iconColor = isLight ? "text-black/50 group-hover:text-black/80" : "text-white/60 group-hover:text-white/90";
  const dotActive = isLight ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.6)";
  const dotMinimized = isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)";

  return (
    <button onClick={onClick} className="desktop-dock-item relative flex flex-col items-center group" aria-label={`Open ${app.label}`}>
      <span className="dock-tooltip absolute -top-8 px-2 py-0.5 rounded-md text-[11px] font-medium text-white/90 bg-black/80 backdrop-blur-sm border border-white/[0.06] whitespace-nowrap">
        {app.label}
      </span>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors" style={{ background: iconBg }}>
        <Icon className={`w-[18px] h-[18px] ${iconColor} transition-colors`} />
      </div>
      {isOpen && (
        <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: isMinimized ? dotMinimized : dotActive }} />
      )}
    </button>
  );
}
