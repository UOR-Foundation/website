/**
 * AttentionToggle — Focus ↔ Diffuse Continuous Slider
 * ════════════════════════════════════════════════════
 *
 * A minimal, elegant slider that sits near the ring. Dragging moves
 * smoothly across the 0–1 aperture spectrum. Labels fade between
 * "Focus" and "Diffuse" based on position.
 *
 * @module hologram-ui/components/AttentionToggle
 */

import { useCallback, useRef, useState } from "react";
import { useAttentionMode } from "@/modules/hologram-ui/hooks/useAttentionMode";

const TRACK_W = 48;
const THUMB_R = 5;
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
  const lastSnappedRef = useRef<number | null>(null);

  const updateFromPointer = useCallback(
    (clientX: number, snap = false) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      let ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (snap) {
        const snapped = snapToDetent(ratio);
        if (snapped !== ratio && snapped !== lastSnappedRef.current) {
          lastSnappedRef.current = snapped;
          setPulsing(true);
          setTimeout(() => setPulsing(false), 200);
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
      updateFromPointer(e.clientX, true);
    },
    [updateFromPointer],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      updateFromPointer(e.clientX, true);
    },
    [dragging, updateFromPointer],
  );

  const onPointerUp = useCallback(() => setDragging(false), []);

  // Derived visual values
  const thumbLeft = aperture * (TRACK_W - THUMB_R * 2);
  const glowIntensity = 0.15 + aperture * 0.25;
  const labelOpacityFocus = Math.max(0, 1 - aperture * 2.2);
  const labelOpacityDiffuse = Math.max(0, (aperture - 0.45) * 2.2);

  return (
    <div
      className="flex items-center gap-2.5 select-none touch-none"
      aria-label={`Attention: ${Math.round(aperture * 100)}% — ${preset}`}
    >
      {/* Focus label */}
      <span
        className="text-[8px] tracking-[0.3em] uppercase w-[38px] text-right cursor-pointer"
        onClick={() => setAperture(0.1)}
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: `hsla(38, 15%, 80%, ${0.2 + labelOpacityFocus * 0.4})`,
          transition: dragging ? "none" : "color 0.5s ease",
        }}
      >
        Focus
      </span>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative cursor-pointer"
        style={{
          width: TRACK_W,
          height: 14,
          borderRadius: 7,
          background: `linear-gradient(90deg, hsla(38, 25%, 40%, 0.18), hsla(38, 20%, 50%, 0.12))`,
          border: `1px solid hsla(38, 20%, 55%, ${0.1 + aperture * 0.1})`,
          transition: dragging ? "none" : "border-color 0.5s ease",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Filled portion */}
        <div
          className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
          style={{
            width: `${aperture * 100}%`,
            background: `hsla(38, 30%, 55%, ${0.06 + aperture * 0.08})`,
            transition: dragging ? "none" : "width 0.5s ease, background 0.5s ease",
          }}
        />

        {/* Snap detent ticks */}
        {SNAP_DETENTS.map((d) => (
          <div
            key={d}
            className="absolute top-[5px] w-px h-[4px] pointer-events-none"
            style={{
              left: d * (TRACK_W - 2) + 1,
              background: `hsla(38, 20%, 65%, ${Math.abs(aperture - d) < 0.06 ? 0.4 : 0.12})`,
              transition: "background 0.3s ease",
            }}
          />
        ))}

        {/* Thumb + Tooltip */}
        <div
          className="absolute top-[2px] rounded-full pointer-events-none"
          style={{
            width: THUMB_R * 2,
            height: THUMB_R * 2,
            left: thumbLeft,
            background: `hsla(38, 35%, 65%, ${0.5 + aperture * 0.35})`,
            boxShadow: pulsing
              ? `0 0 12px 3px hsla(38, 50%, 65%, 0.5)`
              : `0 0 ${4 + aperture * 4}px ${1 + aperture}px hsla(38, 40%, 60%, ${glowIntensity})`,
            transform: pulsing ? "scale(1.6)" : "scale(1)",
            transition: pulsing
              ? "transform 0.1s ease-out, box-shadow 0.1s ease-out"
              : dragging
                ? "box-shadow 0.15s ease"
                : "left 0.5s ease, background 0.5s ease, box-shadow 0.5s ease, transform 0.15s ease",
          }}
        >
          {(dragging || hovered) && (
            <div
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                bottom: THUMB_R * 2 + 4,
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: 9,
                letterSpacing: "0.05em",
                color: "hsla(38, 20%, 88%, 0.85)",
                background: "hsla(30, 8%, 14%, 0.9)",
                border: "1px solid hsla(38, 20%, 40%, 0.2)",
                borderRadius: 4,
                padding: "2px 5px",
                whiteSpace: "nowrap",
                animation: "fade-in 0.15s ease-out",
              }}
            >
              {Math.round(aperture * 100)}%
            </div>
          )}
        </div>
      </div>

      {/* Diffuse label */}
      <span
        className="text-[8px] tracking-[0.3em] uppercase w-[46px] cursor-pointer"
        onClick={() => setAperture(0.9)}
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: `hsla(38, 15%, 80%, ${0.2 + labelOpacityDiffuse * 0.3})`,
          transition: dragging ? "none" : "color 0.5s ease",
        }}
      >
        Diffuse
      </span>
    </div>
  );
}
