/**
 * LumenFloatingPill — Global Floating Lumen AI Access
 * ════════════════════════════════════════════════════
 *
 * A subtle, draggable pill that appears on every non-home page,
 * giving instant access to Lumen AI from anywhere in Hologram.
 * Position is persisted to localStorage.
 */

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDraggablePosition } from "@/modules/hologram-ui/hooks/useDraggablePosition";

/** Only hide on hologram-os which has its own Lumen CTA */
const HIDDEN_ROUTES = ["/hologram-os"];

export default function LumenFloatingPill() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const drag = useDraggablePosition({
    storageKey: "hologram-pos:lumen-global-pill",
    defaultPos: { x: 0, y: 0 },
    mode: "offset",
    snapSize: { width: 140, height: 40 },
  });

  // Hide on home / hologram-os (which has its own Lumen CTA)
  if (HIDDEN_ROUTES.includes(pathname)) return null;

  return (
    <div
      onPointerDown={drag.handlers.onPointerDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (!drag.wasDragged()) {
          navigate("/hologram-os");
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("lumen:open"));
          }, 300);
        }
      }}
      style={{
        position: "fixed",
        bottom: "64px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9000,
        cursor: drag.isDragging() ? "grabbing" : "pointer",
        userSelect: "none",
        touchAction: "none",
        ...drag.style,
      }}
    >
      <div
        className="flex items-center gap-2 transition-all duration-500"
        style={{
          padding: "8px 16px",
          borderRadius: "24px",
          background: hovered
            ? "hsla(0, 0%, 8%, 0.85)"
            : "hsla(0, 0%, 8%, 0.6)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          border: `1px solid ${hovered ? "hsla(38, 30%, 55%, 0.35)" : "hsla(0, 0%, 100%, 0.08)"}`,
          boxShadow: hovered
            ? "0 4px 24px hsla(38, 40%, 45%, 0.15), 0 0 0 1px hsla(38, 30%, 50%, 0.1)"
            : "0 2px 12px hsla(0, 0%, 0%, 0.2)",
          transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Breathing dot */}
        <div
          className="rounded-full"
          style={{
            width: "7px",
            height: "7px",
            background: "hsla(38, 50%, 60%, 0.8)",
            boxShadow: "0 0 12px hsla(38, 50%, 55%, 0.4)",
            animation: "heartbeat-love 2.4s ease-in-out infinite",
          }}
        />

        {/* Label */}
        <span
          className="tracking-[0.15em] transition-opacity duration-500"
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontWeight: 400,
            fontSize: "11px",
            color: hovered
              ? "hsla(38, 15%, 90%, 0.9)"
              : "hsla(38, 15%, 85%, 0.6)",
            textTransform: "uppercase" as const,
          }}
        >
          Lumen AI
        </span>
      </div>
    </div>
  );
}
