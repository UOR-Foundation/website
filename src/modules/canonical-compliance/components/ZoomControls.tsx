/**
 * ZoomControls — Discrete 4-stop zoom slider for compliance layers.
 * Primitives (L0) → Pipelines (L1) → Modules (L2) → System (L3)
 */

import { Minus, Plus } from "lucide-react";

export type ZoomLevel = 0 | 1 | 2 | 3;

export const ZOOM_LABELS: Record<ZoomLevel, string> = {
  0: "Primitives",
  1: "Pipelines",
  2: "Modules",
  3: "System",
};

const ZOOM_DESCRIPTIONS: Record<ZoomLevel, string> = {
  0: "Atomic operations & types",
  1: "Export chains of primitives",
  2: "Logical module groups",
  3: "Architectural layers",
};

interface ZoomControlsProps {
  level: ZoomLevel;
  onChange: (level: ZoomLevel) => void;
}

export default function ZoomControls({ level, onChange }: ZoomControlsProps) {
  const zoomIn = () => { if (level > 0) onChange((level - 1) as ZoomLevel); };
  const zoomOut = () => { if (level < 3) onChange((level + 1) as ZoomLevel); };

  return (
    <div className="flex items-center gap-2">
      {/* Zoom In (more granular) */}
      <button
        onClick={zoomIn}
        disabled={level === 0}
        className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        title="Zoom in (more granular)"
      >
        <Plus size={14} />
      </button>

      {/* Discrete stops */}
      <div className="flex items-center gap-0">
        {([3, 2, 1, 0] as ZoomLevel[]).map((l) => (
          <button
            key={l}
            onClick={() => onChange(l)}
            className="flex flex-col items-center group relative"
            title={`${ZOOM_LABELS[l]}: ${ZOOM_DESCRIPTIONS[l]}`}
          >
            {/* Track segment */}
            <div className="flex items-center">
              {l < 3 && <div className={`w-6 h-[2px] ${level <= l ? "bg-zinc-400" : "bg-zinc-800"}`} />}
              <div
                className={`w-3 h-3 rounded-full border-2 transition-all ${
                  level === l
                    ? "bg-zinc-200 border-zinc-200 scale-125"
                    : level <= l
                      ? "bg-zinc-600 border-zinc-500 hover:bg-zinc-400"
                      : "bg-zinc-800 border-zinc-700 hover:bg-zinc-600"
                }`}
              />
              {l > 0 && <div className={`w-6 h-[2px] ${level < l ? "bg-zinc-400" : "bg-zinc-800"}`} />}
            </div>
            {/* Label */}
            <span className={`text-[8px] font-mono uppercase tracking-wide mt-1 ${
              level === l ? "text-zinc-200" : "text-zinc-600"
            }`}>
              {ZOOM_LABELS[l].slice(0, 4)}
            </span>
          </button>
        ))}
      </div>

      {/* Zoom Out (more composed) */}
      <button
        onClick={zoomOut}
        disabled={level === 3}
        className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        title="Zoom out (more composed)"
      >
        <Minus size={14} />
      </button>

      {/* Current level label */}
      <div className="ml-2 text-[10px] font-mono text-zinc-500">
        <span className="text-zinc-300">{ZOOM_LABELS[level]}</span>
        <span className="mx-1">·</span>
        <span>{ZOOM_DESCRIPTIONS[level]}</span>
      </div>
    </div>
  );
}
