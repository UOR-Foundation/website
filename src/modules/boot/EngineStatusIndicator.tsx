/**
 * EngineStatusIndicator — Status dot trigger for the System Monitor app.
 *
 * Clicking the dot dispatches a custom event to open the System Monitor
 * as a desktop app window.
 *
 * @module boot/EngineStatusIndicator
 */

import { useBootStatus } from "./useBootStatus";
import type { SealStatus } from "./types";

// ── Status config ───────────────────────────────────────────────────────

interface StatusConfig {
  color: string;
  label: string;
  pulse: boolean;
}

const STATUS_CONFIG: Record<SealStatus | "booting" | "failed", StatusConfig> = {
  sealed:   { color: "#22c55e", label: "Healthy",           pulse: false },
  degraded: { color: "#f59e0b", label: "Degraded",          pulse: true  },
  unsealed: { color: "#ef4444", label: "Integrity Failure",  pulse: true  },
  broken:   { color: "#ef4444", label: "Compromised",        pulse: true  },
  booting:  { color: "#6b7280", label: "Starting",           pulse: true  },
  failed:   { color: "#ef4444", label: "Boot Failed",        pulse: true  },
};

// ── Component ───────────────────────────────────────────────────────────

interface EngineStatusIndicatorProps { isLight?: boolean; }

export default function EngineStatusIndicator({ isLight = false }: EngineStatusIndicatorProps) {
  const { status } = useBootStatus();
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.booting;

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("uor:open-app", { detail: "system-monitor" }));
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center w-[24px] h-[24px] rounded-full transition-all duration-150 ${isLight ? "bg-black/[0.08] hover:bg-black/[0.12] border border-black/[0.08]" : "bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08]"}`}
      title={`System: ${config.label}`}
    >
      <div className="relative">
        <div className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: config.color }} />
        {config.pulse && <div className="absolute inset-0 w-[7px] h-[7px] rounded-full animate-ping" style={{ backgroundColor: config.color, opacity: 0.4 }} />}
      </div>
    </button>
  );
}
