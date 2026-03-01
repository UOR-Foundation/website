/**
 * GlassPanel — Kernel-Aware Panel Wrapper (Phase 3)
 * ══════════════════════════════════════════════════
 *
 * A frosted-glass container that:
 *  1. Reads its process coherence zone from the kernel projection
 *  2. Uses proportional design tokens (spacing/radius/border scale with size)
 *  3. Supports magnetic snapping via the DragSnapRegistry
 *  4. Shows a subtle zone indicator strip
 *
 * Every widget panel in Hologram should wrap its content with GlassPanel.
 *
 * @module hologram-ui/components/GlassPanel
 */

import React, { useMemo, useRef, useEffect, useCallback } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { KP } from "@/modules/hologram-os/kernel-palette";
import { useKernel } from "@/modules/hologram-os/hooks/useKernel";
import type { WidgetType } from "@/modules/hologram-os/projection-engine";
import type { CoherenceZone } from "@/hologram/kernel/q-sched";
import { useDraggablePosition } from "../../hooks/useDraggablePosition";

// ── Zone visual mapping ───────────────────────────────────────────────

const ZONE_COLORS: Record<CoherenceZone, string> = {
  convergent: "hsla(152, 44%, 50%, 0.7)",
  exploring:  "hsla(38,  40%, 65%, 0.7)",
  divergent:  "hsla(0,   55%, 55%, 0.5)",
};

const ZONE_GLOW: Record<CoherenceZone, string> = {
  convergent: "0 0 12px hsla(152, 44%, 50%, 0.15)",
  exploring:  "0 0 12px hsla(38,  40%, 65%, 0.12)",
  divergent:  "0 0 12px hsla(0,   55%, 55%, 0.08)",
};

const ZONE_LABELS: Record<CoherenceZone, string> = {
  convergent: "C",
  exploring:  "E",
  divergent:  "D",
};

// ── Proportional token system ─────────────────────────────────────────

type PanelSize = "xs" | "sm" | "md" | "lg" | "xl";

interface ProportionalTokens {
  padding: string;
  borderRadius: string;
  borderWidth: number;
  headerSize: string;
  bodySize: string;
  gap: string;
  zoneStripWidth: number;
}

const SIZE_TOKENS: Record<PanelSize, ProportionalTokens> = {
  xs: { padding: "8px",  borderRadius: "10px", borderWidth: 0.5, headerSize: "11px", bodySize: "10px", gap: "4px",  zoneStripWidth: 2 },
  sm: { padding: "12px", borderRadius: "12px", borderWidth: 0.5, headerSize: "12px", bodySize: "11px", gap: "8px",  zoneStripWidth: 2 },
  md: { padding: "16px", borderRadius: "14px", borderWidth: 1,   headerSize: "13px", bodySize: "12px", gap: "12px", zoneStripWidth: 3 },
  lg: { padding: "20px", borderRadius: "16px", borderWidth: 1,   headerSize: "14px", bodySize: "13px", gap: "16px", zoneStripWidth: 3 },
  xl: { padding: "24px", borderRadius: "18px", borderWidth: 1,   headerSize: "15px", bodySize: "14px", gap: "20px", zoneStripWidth: 4 },
};

// ── Props ─────────────────────────────────────────────────────────────

export interface GlassPanelProps {
  /** Widget type — used to look up the kernel process and its coherence zone */
  widgetType?: WidgetType;
  /** Proportional size tier (default: "md") */
  size?: PanelSize;
  /** Panel title shown in the header strip */
  title?: string;
  /** Optional PID override (if not using widgetType lookup) */
  pid?: number;
  /** Whether the panel is draggable via magnetic snapping */
  draggable?: boolean;
  /** Storage key for drag position persistence */
  dragKey?: string;
  /** Default drag position */
  defaultPosition?: { x: number; y: number };
  /** Approximate panel dimensions for snap calculations */
  snapSize?: { width: number; height: number };
  /** Show the coherence zone indicator strip */
  showZone?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Custom inline style */
  style?: React.CSSProperties;
  /** Content */
  children: React.ReactNode;
  /** Header slot — rendered after title */
  headerActions?: React.ReactNode;
  /** Whether the glass effect is "heavy" (more blur, more opacity) */
  heavy?: boolean;
  /** onClick handler (suppressed during drag) */
  onClick?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────

export default function GlassPanel({
  widgetType,
  size = "md",
  title,
  pid: pidOverride,
  draggable = false,
  dragKey,
  defaultPosition = { x: 100, y: 100 },
  snapSize = { width: 320, height: 240 },
  showZone = true,
  className,
  style,
  children,
  headerActions,
  heavy = false,
  onClick,
}: GlassPanelProps) {
  const { frame, getWidgetPid } = useKernel();
  const tokens = SIZE_TOKENS[size];

  // ── Resolve kernel process ────────────────────────────────────────
  const pid = pidOverride ?? (widgetType ? getWidgetPid(widgetType) : undefined);

  const panelProjection = useMemo(() => {
    if (!frame || pid === undefined) return null;
    return frame.panels.find((p) => p.pid === pid) ?? null;
  }, [frame, pid]);

  const zone: CoherenceZone = panelProjection?.coherenceZone ?? "exploring";
  const hScore = panelProjection?.hScore ?? 0.7;

  // ── Draggable support ─────────────────────────────────────────────
  const dragResult = useDraggablePosition({
    storageKey: dragKey ?? `hologram-pos:glass:${widgetType ?? "panel"}`,
    defaultPos: defaultPosition,
    snapSize,
    mode: "absolute",
  });

  const panelRef = useRef<HTMLDivElement>(null);

  // ── Glass effect calibration ──────────────────────────────────────
  const glassBackground = heavy
    ? "hsla(25, 10%, 10%, 0.8)"
    : "hsla(25, 10%, 10%, 0.7)";
  const glassBlur = heavy ? "blur(56px) saturate(1.6)" : "blur(48px) saturate(1.5)";
  const borderColor = `hsla(38, 20%, 80%, ${tokens.borderWidth > 0.5 ? 0.12 : 0.09})`;

  // ── Compose styles ────────────────────────────────────────────────
  const composedStyle: React.CSSProperties = {
    background: glassBackground,
    backdropFilter: glassBlur,
    WebkitBackdropFilter: glassBlur,
    borderRadius: tokens.borderRadius,
    border: `${tokens.borderWidth}px solid ${borderColor}`,
    boxShadow: `0 8px 32px -8px hsla(25, 10%, 0%, 0.35), inset 0 1px 0 hsla(38, 25%, 90%, 0.08)`,
    padding: tokens.padding,
    fontFamily: KP.font,
    position: draggable ? "fixed" : undefined,
    ...(draggable ? dragResult.style : {}),
    ...style,
  };

  const handleClick = useCallback(() => {
    if (draggable && dragResult.wasDragged()) return;
    onClick?.();
  }, [draggable, dragResult, onClick]);

  return (
    <motion.div
      ref={panelRef}
      className={cn("relative overflow-hidden", className)}
      style={composedStyle}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={handleClick}
      {...(draggable ? dragResult.handlers : {})}
    >
      {/* ── Zone indicator strip ─────────────────────────────────── */}
      {showZone && (
        <div
          className="absolute top-0 left-0 h-full pointer-events-none"
          style={{
            width: tokens.zoneStripWidth,
            background: ZONE_COLORS[zone],
            borderRadius: `${tokens.borderRadius} 0 0 ${tokens.borderRadius}`,
            boxShadow: ZONE_GLOW[zone],
            opacity: 0.9,
            transition: "background 0.6s ease, box-shadow 0.6s ease",
          }}
          title={`Zone: ${zone} (H=${hScore.toFixed(2)})`}
        />
      )}

      {/* ── Header ───────────────────────────────────────────────── */}
      {(title || headerActions) && (
        <div
          className="flex items-center justify-between"
          style={{
            marginBottom: tokens.gap,
            paddingLeft: showZone ? `${tokens.zoneStripWidth + 4}px` : undefined,
          }}
        >
          {title && (
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontSize: tokens.headerSize,
                  color: KP.muted,
                  fontWeight: 500,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                {title}
              </span>
              {showZone && (
                <span
                  style={{
                    fontSize: "9px",
                    color: ZONE_COLORS[zone],
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    opacity: 0.8,
                  }}
                >
                  {ZONE_LABELS[zone]}
                </span>
              )}
            </div>
          )}
          {headerActions && (
            <div className="flex items-center gap-1">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div
        style={{
          fontSize: tokens.bodySize,
          paddingLeft: showZone ? `${tokens.zoneStripWidth + 4}px` : undefined,
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

// ── Exports for consumers ───────────────────────────────────────────

export { ZONE_COLORS, ZONE_LABELS, SIZE_TOKENS };
export type { PanelSize, ProportionalTokens, CoherenceZone };
