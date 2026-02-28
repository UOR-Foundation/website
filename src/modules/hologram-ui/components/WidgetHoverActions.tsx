/**
 * WidgetHoverActions — Hover overlay for OS widgets
 * ══════════════════════════════════════════════════
 *
 * Wraps any widget and reveals small action icons on hover:
 *   ⠿ Move  |  ⇲ Resize  |  ⚙ Settings  |  ✕ Remove
 *
 * @module hologram-ui/components/WidgetHoverActions
 */

import { useState, type ReactNode } from "react";
import { X, GripVertical, Settings, Maximize2 } from "lucide-react";

interface WidgetHoverActionsProps {
  children: ReactNode;
  /** Widget identifier for removal persistence */
  widgetId: string;
  /** Called when user clicks remove */
  onRemove?: (widgetId: string) => void;
  /** Called when user clicks settings */
  onSettings?: (widgetId: string) => void;
  /** Called when user initiates resize */
  onResize?: (widgetId: string) => void;
  /** Drag handlers to attach to the move icon */
  dragHandlers?: Record<string, unknown>;
  /** Show move handle (some widgets already have their own drag) */
  showMove?: boolean;
  /** Show settings icon */
  showSettings?: boolean;
  /** Show resize icon */
  showResize?: boolean;
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
  onResize,
  dragHandlers,
  showMove = true,
  showSettings = true,
  showResize = true,
  position = "top-right",
  bgMode = "dark",
  className = "",
}: WidgetHoverActionsProps) {
  const [hovered, setHovered] = useState(false);

  const isWhite = bgMode === "white";
  const iconColor = isWhite ? "hsla(25, 8%, 30%, 0.7)" : "hsla(30, 8%, 80%, 0.7)";
  const iconHoverColor = isWhite ? "hsla(25, 8%, 10%, 1)" : "hsla(30, 8%, 95%, 1)";

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

      {/* Action bar — glass pill */}
      <div
        className={`absolute ${positionClasses[position]} flex items-center gap-0.5 rounded-full px-1.5 py-1 transition-all duration-250 pointer-events-auto`}
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translateY(-100%) scale(1)" : "translateY(-100%) scale(0.92)",
          background: isWhite ? "hsla(30, 10%, 96%, 0.8)" : "hsla(25, 10%, 12%, 0.65)",
          backdropFilter: "blur(24px) saturate(1.3)",
          WebkitBackdropFilter: "blur(24px) saturate(1.3)",
          border: `1px solid ${isWhite ? "hsla(30, 10%, 80%, 0.3)" : "hsla(38, 20%, 80%, 0.1)"}`,
          boxShadow: `0 4px 16px -4px hsla(25, 10%, 0%, 0.2), inset 0 1px 0 hsla(38, 25%, 90%, 0.06)`,
          pointerEvents: hovered ? "auto" : "none",
        }}
      >
        {showMove && (
          <button
            className="w-5 h-5 flex items-center justify-center rounded-full transition-colors cursor-grab active:cursor-grabbing"
            title="Move widget"
            {...(dragHandlers ?? {})}
            style={{ color: iconColor }}
            onMouseEnter={(e) => (e.currentTarget.style.color = iconHoverColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = iconColor)}
          >
            <GripVertical className="w-3 h-3" strokeWidth={1.5} />
          </button>
        )}
        {showResize && onResize && (
          <button
            className="w-5 h-5 flex items-center justify-center rounded-full transition-colors"
            title="Resize widget"
            onClick={() => onResize(widgetId)}
            style={{ color: iconColor }}
            onMouseEnter={(e) => (e.currentTarget.style.color = iconHoverColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = iconColor)}
          >
            <Maximize2 className="w-3 h-3" strokeWidth={1.5} />
          </button>
        )}
        {showSettings && onSettings && (
          <button
            className="w-5 h-5 flex items-center justify-center rounded-full transition-colors"
            title="Widget settings"
            onClick={() => onSettings(widgetId)}
            style={{ color: iconColor }}
            onMouseEnter={(e) => (e.currentTarget.style.color = iconHoverColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = iconColor)}
          >
            <Settings className="w-3 h-3" strokeWidth={1.5} />
          </button>
        )}
        {onRemove && (
          <button
            className="w-5 h-5 flex items-center justify-center rounded-full transition-colors"
            title="Remove widget"
            onClick={() => onRemove(widgetId)}
            style={{ color: iconColor }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "hsla(0, 70%, 60%, 1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = iconColor)}
          >
            <X className="w-3 h-3" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}
