/**
 * EngineStatusIndicator — Single status dot for aggregate system health.
 *
 * Clicking the dot dispatches a custom event to open the System Monitor.
 *
 * @module boot/EngineStatusIndicator
 */

import { useCompositeHealth } from "./useCompositeHealth";

interface EngineStatusIndicatorProps { isLight?: boolean; }

export default function EngineStatusIndicator({ isLight = false }: EngineStatusIndicatorProps) {
  const { color, label, pulse } = useCompositeHealth();

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("uor:open-app", { detail: "system-monitor" }));
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center w-[24px] h-[24px] rounded-full transition-all duration-150 ${isLight ? "bg-black/[0.08] hover:bg-black/[0.12] border border-black/[0.08]" : "bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08]"}`}
      title={`System: ${label}`}
    >
      <div className="relative">
        <div className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: color }} />
        {pulse && <div className="absolute inset-0 w-[7px] h-[7px] rounded-full animate-ping" style={{ backgroundColor: color, opacity: 0.4 }} />}
      </div>
    </button>
  );
}
