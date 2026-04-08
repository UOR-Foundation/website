/**
 * DesktopDock — macOS-style bottom dock with magnification.
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

  return (
    <div className="fixed bottom-3 inset-x-0 z-[190] flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex items-end gap-1.5 px-3 py-1.5 frosted-glass rounded-2xl border border-white/[0.12]">
        {DESKTOP_APPS.map((app) => (
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
  app,
  isOpen,
  isMinimized,
  onClick,
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
      {/* Tooltip */}
      <span className="dock-tooltip absolute -top-8 px-2 py-0.5 rounded-md text-[11px] font-medium text-white/90 bg-black/70 backdrop-blur-sm border border-white/10 whitespace-nowrap">
        {app.label}
      </span>

      {/* Icon tile */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
        style={{
          background: `linear-gradient(135deg, ${app.color}, ${app.color}88)`,
          boxShadow: `0 4px 16px -4px ${app.color}66`,
        }}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Open indicator dot */}
      {isOpen && (
        <div
          className="w-1 h-1 rounded-full mt-0.5"
          style={{
            background: isMinimized ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.7)",
          }}
        />
      )}
    </button>
  );
}
