/**
 * SnapGuideOverlay — Renders alignment guide lines during drag
 * ════════════════════════════════════════════════════════════
 *
 * Listens to a global custom event dispatched by useDraggablePosition
 * and renders subtle guide lines when elements snap into alignment.
 */

import { useEffect, useState } from "react";
import type { SnapGuide } from "../../hooks/dragSnapRegistry";

export const SNAP_GUIDE_EVENT = "hologram:snap-guides";

export interface SnapGuidePayload {
  guides: SnapGuide[];
  active: boolean;
}

export default function SnapGuideOverlay() {
  const [guides, setGuides] = useState<SnapGuide[]>([]);

  useEffect(() => {
    const handler = (e: CustomEvent<SnapGuidePayload>) => {
      setGuides(e.detail.active ? e.detail.guides : []);
    };
    window.addEventListener(SNAP_GUIDE_EVENT, handler as EventListener);
    return () => window.removeEventListener(SNAP_GUIDE_EVENT, handler as EventListener);
  }, []);

  if (guides.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9997]">
      {guides.map((guide, i) => (
        <div
          key={`${guide.axis}-${guide.position}-${i}`}
          className="absolute"
          style={
            guide.axis === "x"
              ? {
                  left: guide.position,
                  top: 0,
                  width: 1,
                  height: "100%",
                  background: "hsla(38, 50%, 60%, 0.3)",
                  boxShadow: "0 0 6px hsla(38, 50%, 60%, 0.2)",
                  transition: "opacity 0.15s ease-out",
                }
              : {
                  top: guide.position,
                  left: 0,
                  height: 1,
                  width: "100%",
                  background: "hsla(38, 50%, 60%, 0.3)",
                  boxShadow: "0 0 6px hsla(38, 50%, 60%, 0.2)",
                  transition: "opacity 0.15s ease-out",
                }
          }
        />
      ))}
    </div>
  );
}
