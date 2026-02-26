/**
 * WidgetHoverActions — Hover overlay for OS widgets
 * ══════════════════════════════════════════════════
 *
 * Wraps any widget and reveals small action icons on hover:
 *   ✕ Remove  |  ⠿ Move  |  ⚙ Settings
 *
 * @module hologram-ui/components/WidgetHoverActions
 */

import { useState, type ReactNode } from "react";
import { X, GripVertical, Settings } from "lucide-react";

interface WidgetHoverActionsProps {
  children: ReactNode;
  /** Widget identifier for removal persistence */
  widgetId: string;
  /** Called when user clicks remove */
  onRemove?: (widgetId: string) => void;
  /** Called when user clicks settings */
  onSettings?: (widgetId: string) => void;
  /** Drag handlers to attach to the move icon */
  dragHandlers?: Record<string, unknown>;
  /** Show move handle (some widgets already have their own drag) */
  showMove?: boolean;
  /** Show settings icon */
  showSettings?: boolean;
  /** Position of the action bar relative to the widget */
  position?: "top-right" | "top-left" | "top-center";
  /** Override the background style for light/dark modes */
  bgMode?: "image" | "white" | "dark";
  className?: string;
}

export default function WidgetHoverActions({
  children,
  widgetId,
  onRemove,
  onSettings,
  dragHandlers,
  showMove = true,
  showSettings = true,
  position = "top-right",
  bgMode = "dark",
  className = "",
}: WidgetHoverActionsProps) {
  const [hovered, setHovered] = useState(false);

  const isWhite = bgMode === "white";
  const iconColor = isWhite ? "hsla(0, 0%, 20%, 0.7)" : "hsla(0, 0%, 90%, 0.7)";
  const iconHoverColor = isWhite ? "hsla(0, 0%, 10%, 1)" : "hsla(0, 0%, 100%, 1)";
  const barBg = isWhite ? "hsla(0, 0%, 95%, 0.85)" : "hsla(0, 0%, 10%, 0.75)";
  const barBorder = isWhite ? "hsla(0, 0%, 80%, 0.4)" : "hsla(0, 0%, 40%, 0.3)";

  const positionClasses: Record<string, string> = {
    "top-right": "right-0 -top-1 translate-y-[-100%]",
    "top-left": "left-0 -top-1 translate-y-[-100%]",
    "top-center": "left-1/2 -translate-x-1/2 -top-1 translate-y-[-100%]",
  };

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}

      {/* Action bar */}
      <div
        className={`absolute ${positionClasses[position]} flex items-center gap-0.5 rounded-lg px-1 py-0.5 transition-all duration-200 pointer-events-auto`}
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translateY(-100%) scale(1)" : "translateY(-100%) scale(0.9)",
          background: barBg,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${barBorder}`,
          boxShadow: "0 2px 8px hsla(0, 0%, 0%, 0.2)",
          pointerEvents: hovered ? "auto" : "none",
        }}
      >
        {showMove && (
          <button
            className="w-5 h-5 flex items-center justify-center rounded transition-colors cursor-grab active:cursor-grabbing"
            title="Move widget"
            {...(dragHandlers ?? {})}
            style={{ color: iconColor }}
            onMouseEnter={(e) => (e.currentTarget.style.color = iconHoverColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = iconColor)}
          >
            <GripVertical className="w-3 h-3" />
          </button>
        )}
        {showSettings && onSettings && (
          <button
            className="w-5 h-5 flex items-center justify-center rounded transition-colors"
            title="Widget settings"
            onClick={() => onSettings(widgetId)}
            style={{ color: iconColor }}
            onMouseEnter={(e) => (e.currentTarget.style.color = iconHoverColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = iconColor)}
          >
            <Settings className="w-3 h-3" />
          </button>
        )}
        {onRemove && (
          <button
            className="w-5 h-5 flex items-center justify-center rounded transition-colors"
            title="Remove widget"
            onClick={() => onRemove(widgetId)}
            style={{ color: iconColor }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "hsla(0, 70%, 60%, 1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = iconColor)}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
