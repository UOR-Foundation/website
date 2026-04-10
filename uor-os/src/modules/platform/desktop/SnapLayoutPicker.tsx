/**
 * SnapLayoutPicker — Visual popover for snapping windows into preset grid layouts.
 */

import { useDesktopTheme } from "@/modules/platform/desktop/hooks/useDesktopTheme";
import type { WindowState, SnapZone } from "@/modules/platform/desktop/hooks/useWindowManager";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
} from "@/modules/platform/core/ui/dropdown-menu";
import { LayoutGrid } from "lucide-react";

interface LayoutPreset {
  label: string;
  /** Number of windows this layout needs */
  count: number;
  /** Grid dimensions for rendering the preview */
  previewCols: number;
  previewRows: number;
  /** Zones with optional custom grid size */
  zones: { col: number; row: number; colSpan: number; rowSpan: number; cols?: number; rows?: number }[];
}

const PRESETS: LayoutPreset[] = [
  {
    label: "Full",
    count: 1,
    previewCols: 1,
    previewRows: 1,
    zones: [{ col: 0, row: 0, colSpan: 4, rowSpan: 4 }],
  },
  {
    label: "Side by Side",
    count: 2,
    previewCols: 2,
    previewRows: 1,
    zones: [
      { col: 0, row: 0, colSpan: 2, rowSpan: 4 },
      { col: 2, row: 0, colSpan: 2, rowSpan: 4 },
    ],
  },
  {
    label: "1 + 2 Stack",
    count: 3,
    previewCols: 2,
    previewRows: 2,
    zones: [
      { col: 0, row: 0, colSpan: 2, rowSpan: 4 },
      { col: 2, row: 0, colSpan: 2, rowSpan: 2 },
      { col: 2, row: 2, colSpan: 2, rowSpan: 2 },
    ],
  },
  {
    label: "2×2 Grid",
    count: 4,
    previewCols: 2,
    previewRows: 2,
    zones: [
      { col: 0, row: 0, colSpan: 2, rowSpan: 2 },
      { col: 2, row: 0, colSpan: 2, rowSpan: 2 },
      { col: 0, row: 2, colSpan: 2, rowSpan: 2 },
      { col: 2, row: 2, colSpan: 2, rowSpan: 2 },
    ],
  },
  {
    label: "3×2 Grid",
    count: 6,
    previewCols: 3,
    previewRows: 2,
    zones: [
      { col: 0, row: 0, colSpan: 2, rowSpan: 2, cols: 6, rows: 4 },
      { col: 2, row: 0, colSpan: 2, rowSpan: 2, cols: 6, rows: 4 },
      { col: 4, row: 0, colSpan: 2, rowSpan: 2, cols: 6, rows: 4 },
      { col: 0, row: 2, colSpan: 2, rowSpan: 2, cols: 6, rows: 4 },
      { col: 2, row: 2, colSpan: 2, rowSpan: 2, cols: 6, rows: 4 },
      { col: 4, row: 2, colSpan: 2, rowSpan: 2, cols: 6, rows: 4 },
    ],
  },
];

interface Props {
  windows: WindowState[];
  onSnapMultiple: (assignments: { id: string; zone: SnapZone; cols?: number; rows?: number }[]) => void;
}

function PresetPreview({ preset, isLight }: { preset: LayoutPreset; isLight: boolean }) {
  const { previewCols, previewRows, zones } = preset;
  const w = 56;
  const h = 36;
  const gap = 2;
  const cellW = (w - gap * (previewCols - 1)) / previewCols;
  const cellH = (h - gap * (previewRows - 1)) / previewRows;

  // Map zones to preview rectangles
  const rects = zones.map((z, i) => {
    const zCol = z.cols ? z.col / (z.cols / previewCols) : z.col / (4 / previewCols);
    const zRow = z.rows ? z.row / (z.rows / previewRows) : z.row / (4 / previewRows);
    const zColSpan = z.cols ? z.colSpan / (z.cols / previewCols) : z.colSpan / (4 / previewCols);
    const zRowSpan = z.rows ? z.rowSpan / (z.rows / previewRows) : z.rowSpan / (4 / previewRows);
    
    return (
      <rect
        key={i}
        x={zCol * (cellW + gap)}
        y={zRow * (cellH + gap)}
        width={zColSpan * cellW + (zColSpan - 1) * gap}
        height={zRowSpan * cellH + (zRowSpan - 1) * gap}
        rx={2}
        fill={isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)"}
        stroke={isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)"}
        strokeWidth={0.5}
      />
    );
  });

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {rects}
    </svg>
  );
}

export default function SnapLayoutPicker({ windows, onSnapMultiple }: Props) {
  const { isLight } = useDesktopTheme();

  const visibleWindows = windows.filter(w => !w.mergedParent);

  const menuContentClass = isLight
    ? "border-black/[0.06] bg-white/97 backdrop-blur-lg text-black/70"
    : "border-white/[0.06] bg-[rgba(28,28,30,0.97)] backdrop-blur-lg text-white/70";

  const applyPreset = (preset: LayoutPreset) => {
    const available = visibleWindows.filter(w => !w.minimized);
    // If not enough visible, also pull in minimized
    const all = available.length >= preset.count
      ? available.slice(0, preset.count)
      : [...available, ...visibleWindows.filter(w => w.minimized)].slice(0, preset.count);

    const assignments = preset.zones.slice(0, all.length).map((zone, i) => ({
      id: all[i].id,
      zone: { col: zone.col, row: zone.row, colSpan: zone.colSpan, rowSpan: zone.rowSpan },
      cols: zone.cols,
      rows: zone.rows,
    }));
    onSnapMultiple(assignments);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center justify-center w-[28px] h-[28px] rounded-md shrink-0 transition-colors duration-150
            ${isLight ? "hover:bg-black/[0.05]" : "hover:bg-white/[0.06]"}
          `}
          title="Snap layouts"
        >
          <LayoutGrid className={`w-[14px] h-[14px] ${isLight ? "text-black/40" : "text-white/40"}`} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={`rounded-xl p-2 ${menuContentClass}`}
        align="end"
        sideOffset={4}
      >
        <div className={`text-[11px] font-medium px-1 pb-1.5 ${isLight ? "text-black/40" : "text-white/35"}`}>
          Snap Layout
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map(preset => {
            const hasEnough = visibleWindows.length >= preset.count;
            return (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                disabled={!hasEnough && visibleWindows.length === 0}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors duration-100
                  ${isLight ? "hover:bg-black/[0.04]" : "hover:bg-white/[0.06]"}
                  ${!hasEnough ? "opacity-40" : ""}
                `}
                title={`${preset.label} (${preset.count} window${preset.count > 1 ? "s" : ""})`}
              >
                <PresetPreview preset={preset} isLight={isLight} />
                <span className={`text-[9px] font-medium ${isLight ? "text-black/50" : "text-white/40"}`}>
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
