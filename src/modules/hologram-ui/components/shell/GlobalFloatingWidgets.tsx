/**
 * GlobalFloatingWidgets — Persistent overlay widgets on every page
 * ════════════════════════════════════════════════════════════════
 *
 * Renders DayProgressRing (bottom-right) and AttentionToggle (right edge)
 * on all pages except the home page and hologram-os (which have their own).
 */

import { useLocation } from "react-router-dom";
import DayProgressRing from "@/modules/hologram-ui/components/DayProgressRing";
import AttentionToggle from "@/modules/hologram-ui/components/AttentionToggle";

/** Show on /hologram console only — /hologram-os has its own widgets in DesktopSurface */
const ALLOWED_ROUTES = ["/hologram"];

export default function GlobalFloatingWidgets() {
  const { pathname } = useLocation();

  if (!ALLOWED_ROUTES.includes(pathname)) return null;

  return (
    <>
      {/* Day Progress Ring — bottom right */}
      <div
        style={{
          position: "fixed",
          bottom: "28px",
          right: "68px",
          zIndex: 8500,
          pointerEvents: "auto",
        }}
      >
        <DayProgressRing bgMode="dark" />
      </div>

      {/* Attention / Focus Toggle — right edge, vertically centered */}
      <div
        style={{
          position: "fixed",
          right: "56px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 8500,
          pointerEvents: "auto",
        }}
      >
        <AttentionToggle bgMode="dark" />
      </div>
    </>
  );
}
