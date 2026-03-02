/**
 * BrowserProjection — Keep-alive browser panel with hover preloading
 */

import { lazy, Suspense } from "react";
import ProjectionShell from "../shell/ProjectionShell";

const HologramBrowser = lazy(() => import("../panels/HologramBrowser"));

interface BrowserProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
  onSendToLumen?: (ctx: { title: string; url: string; markdown: string }) => void;
}

export default function BrowserProjection({ open, preload, onClose, onSendToLumen }: BrowserProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="browser">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full" style={{ background: "hsl(25, 8%, 7%)", color: "hsl(30, 8%, 75%)" }}>
          <span className="text-sm font-mono">Loading Browser…</span>
        </div>
      }>
        <HologramBrowser onClose={onClose} onSendToLumen={onSendToLumen} />
      </Suspense>
    </ProjectionShell>
  );
}
