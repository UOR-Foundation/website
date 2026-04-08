/**
 * DesktopDock — Clean monochrome dock with separator.
 */

import { DESKTOP_APPS, type DesktopApp } from "@/modules/desktop/lib/desktop-apps";
import type { WindowState } from "@/modules/desktop/hooks/useWindowManager";
import "@/modules/desktop/desktop.css";

interface Props {
  windows: WindowState[];
  onOpenApp: (appId: string, title: string, defaultSize?: { w: number; h: number }) => void;
}

export default function DesktopDock({ windows, onOpenApp }: Props) {
  const openAppIds = new Set(windows.map(w => w.appId));
  const minimizedIds = new Set(windows.filter(w => w.minimized).map(w => w.appId));

  const apps = DESKTOP_APPS.slice(0, -1);
  const systemApps = DESKTOP_APPS.slice(-1);

  return (
    <div data-dock className="fixed bottom-3 inset-x-0 z-[190] flex justify-center pointer-events-none">
      <div
        className="pointer-events-auto flex items-end gap-1 px-2.5 py-1.5 rounded-2xl"
        style={{
          background: "rgba(0,0,0,0.40)",
          backdropFilter: "blur(48px) saturate(1.4)",
          WebkitBackdropFilter: "blur(48px) saturate(1.4)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {apps.map((app) => (
          <DockIcon
            key={app.id}
            app={app}
            isOpen={openAppIds.has(app.id)}
            isMinimized={minimizedIds.has(app.id)}
            onClick={() => onOpenApp(app.id, app.label, app.defaultSize)}
          />
        ))}

        {/* Separator */}
        <div className="w-px h-6 mx-0.5 self-center" style={{ background: "rgba(255,255,255,0.08)" }} />

        {systemApps.map((app) => (
          <DockIcon
            key={app.id}
            app={app}
            isOpen={openAppIds.has(app.id)}
            isMinimized={minimizedIds.has(app.id)}
            onClick={() => onOpenApp(app.id, app.label, app.defaultSize)}
          />
        ))}
      </div>
    </div>
  );
}

function DockIcon({
  app, isOpen, isMinimized, onClick,
}: {
  app: DesktopApp;
  isOpen: boolean;
  isMinimized: boolean;
  onClick: () => void;
}) {
  const Icon = app.icon;

  return (
    <button
      onClick={onClick}
      className="desktop-dock-item relative flex flex-col items-center group"
      aria-label={`Open ${app.label}`}
    >
      <span className="dock-tooltip absolute -top-8 px-2 py-0.5 rounded-md text-[11px] font-medium text-white/90 bg-black/80 backdrop-blur-sm border border-white/[0.06] whitespace-nowrap">
        {app.label}
      </span>

      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <Icon className="w-[18px] h-[18px] text-white/60 group-hover:text-white/90 transition-colors" />
      </div>

      {isOpen && (
        <div
          className="w-1 h-1 rounded-full mt-0.5"
          style={{ background: isMinimized ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)" }}
        />
      )}
    </button>
  );
}
