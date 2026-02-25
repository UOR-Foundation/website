/**
 * AttentionToggle — Vertical Focus ↔ Diffuse Slider (Right Edge)
 * ══════════════════════════════════════════════════════════════
 *
 * A whisper-thin vertical slider fixed to the right edge of the viewport.
 * Always accessible, never imposing. Top = Diffuse, Bottom = Focus.
 *
 * Design: near-invisible at rest, reveals on hover/touch. The track is
 * a gossamer line with a warm gold thumb that breathes gently.
 *
 * @module hologram-ui/components/AttentionToggle
 */

import { useCallback, useRef, useState } from "react";
import { Settings } from "lucide-react";
import ContextPreferencesPanel from "./ContextPreferencesPanel";
import { useAttentionMode } from "@/modules/hologram-ui/hooks/useAttentionMode";

const TRACK_H = 160;
const THUMB_R = 4;
const SNAP_DETENTS = [0, 0.25, 0.5, 0.75, 1.0];
const SNAP_THRESHOLD = 0.045;

function snapToDetent(value: number): number {
  for (const d of SNAP_DETENTS) {
    if (Math.abs(value - d) < SNAP_THRESHOLD) return d;
  }
  return value;
}

export default function AttentionToggle() {
  const { aperture, setAperture, preset } = useAttentionMode();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const lastSnappedRef = useRef<number | null>(null);

  // Vertical: top = 0 (diffuse), bottom = 1 (focus)
  const updateFromPointer = useCallback(
    (clientY: number, snap = false) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      let ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      if (snap) {
        const snapped = snapToDetent(ratio);
        if (snapped !== ratio && snapped !== lastSnappedRef.current) {
          lastSnappedRef.current = snapped;
          setPulsing(true);
          setTimeout(() => setPulsing(false), 200);
          if (navigator.vibrate) navigator.vibrate(8);
        } else if (snapped === ratio) {
          lastSnappedRef.current = null;
        }
        ratio = snapped;
      }
      setAperture(ratio);
    },
    [setAperture],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      updateFromPointer(e.clientY, true);
    },
    [updateFromPointer],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      updateFromPointer(e.clientY, true);
    },
    [dragging, updateFromPointer],
  );

  const onPointerUp = useCallback(() => setDragging(false), []);

  // Derived visual values
  const thumbTop = aperture * (TRACK_H - THUMB_R * 2);
  const glowIntensity = 0.12 + aperture * 0.2;
  const labelOpacityDiffuse = Math.max(0, 1 - aperture * 2.2);
  const labelOpacityFocus = Math.max(0, (aperture - 0.45) * 2.2);
  const restOpacity = hovered || dragging ? 1 : 0.35;

  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center py-3 px-2 select-none touch-none"
      style={{
        opacity: restOpacity,
        transition: "opacity 0.6s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Attention: ${Math.round(aperture * 100)}% — ${preset}`}
    >
      {/* Diffuse label (top) */}
      <span
        className="cursor-pointer mb-2"
        onClick={() => setAperture(0.05)}
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 7,
          letterSpacing: "0.25em",
          textTransform: "uppercase" as const,
          color: `hsla(38, 15%, 80%, ${0.15 + labelOpacityDiffuse * 0.45})`,
          transition: dragging ? "none" : "color 0.5s ease",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
        }}
      >
        Open
      </span>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative cursor-pointer"
        style={{
          width: 10,
          height: TRACK_H,
          borderRadius: 5,
          background: `linear-gradient(180deg, hsla(38, 20%, 55%, 0.06), hsla(38, 25%, 40%, 0.1))`,
          border: `1px solid hsla(38, 20%, 55%, ${0.06 + aperture * 0.06})`,
          transition: dragging ? "none" : "border-color 0.5s ease",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Filled portion (from top) */}
        <div
          className="absolute top-0 left-0 w-full rounded-full pointer-events-none"
          style={{
            height: `${aperture * 100}%`,
            background: `hsla(38, 30%, 55%, ${0.04 + aperture * 0.06})`,
            transition: dragging ? "none" : "height 0.5s ease, background 0.5s ease",
          }}
        />

        {/* Snap detent ticks */}
        {SNAP_DETENTS.map((d) => (
          <div
            key={d}
            className="absolute left-[3px] w-[4px] h-px pointer-events-none"
            style={{
              top: d * (TRACK_H - 2) + 1,
              background: `hsla(38, 20%, 65%, ${Math.abs(aperture - d) < 0.06 ? 0.35 : 0.08})`,
              transition: "background 0.3s ease",
            }}
          />
        ))}

        {/* Thumb */}
        <div
          className="absolute left-[1px] rounded-full pointer-events-none"
          style={{
            width: THUMB_R * 2,
            height: THUMB_R * 2,
            top: thumbTop,
            background: `hsla(38, 35%, 65%, ${0.4 + aperture * 0.35})`,
            boxShadow: pulsing
              ? `0 0 10px 2px hsla(38, 50%, 65%, 0.45)`
              : `0 0 ${3 + aperture * 3}px ${1 + aperture * 0.5}px hsla(38, 40%, 60%, ${glowIntensity})`,
            transform: pulsing ? "scale(1.5)" : "scale(1)",
            transition: pulsing
              ? "transform 0.1s ease-out, box-shadow 0.1s ease-out"
              : dragging
                ? "box-shadow 0.15s ease"
                : "top 0.5s ease, background 0.5s ease, box-shadow 0.5s ease, transform 0.15s ease",
          }}
        />

        {/* Tooltip on drag/hover */}
        {(dragging || hovered) && (
          <div
            className="absolute pointer-events-none"
            style={{
              right: THUMB_R * 2 + 10,
              top: thumbTop - 2,
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: 8,
              letterSpacing: "0.05em",
              color: "hsla(38, 20%, 88%, 0.7)",
              background: "hsla(30, 8%, 10%, 0.85)",
              border: "1px solid hsla(38, 20%, 40%, 0.15)",
              borderRadius: 3,
              padding: "1px 5px",
              whiteSpace: "nowrap",
              animation: "fade-in 0.15s ease-out",
            }}
          >
            {Math.round(aperture * 100)}%
          </div>
        )}
      </div>

      {/* Focus label (bottom) */}
      <span
        className="cursor-pointer mt-2"
        onClick={() => setAperture(0.9)}
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 7,
          letterSpacing: "0.25em",
          textTransform: "uppercase" as const,
          color: `hsla(38, 15%, 80%, ${0.15 + labelOpacityFocus * 0.35})`,
          transition: dragging ? "none" : "color 0.5s ease",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
        }}
      >
        Focus
      </span>

      {/* Context preferences trigger */}
      <button
        onClick={() => setContextOpen(true)}
        className="mt-3 p-1 rounded-full transition-all"
        style={{
          opacity: hovered ? 0.5 : 0.15,
          color: "hsl(38, 15%, 75%)",
          transition: "opacity 0.4s ease",
        }}
        title="Signal context preferences"
      >
        <Settings size={10} />
      </button>

      <ContextPreferencesPanel open={contextOpen} onClose={() => setContextOpen(false)} />
    </div>
  );
}
