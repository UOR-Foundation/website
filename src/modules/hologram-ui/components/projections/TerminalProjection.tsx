/**
 * TerminalProjection — Keep-alive terminal panel with hover preloading
 */

import { lazy, Suspense } from "react";
import ProjectionShell from "../shell/ProjectionShell";

const QShellEmbed = lazy(() => import("@/hologram/usr/bin/QShellEmbed"));

interface TerminalProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
  onOpenJupyter?: () => void;
}

export default function TerminalProjection({ open, preload, onClose, onOpenJupyter }: TerminalProjectionProps) {
  return (
    <ProjectionShell
      open={open}
      preload={preload}
      keepAlive={false}
      onClose={onClose}
      id="terminal"
      backdropColor="hsla(0, 0%, 0%, 0.4)"
      beamGradient="linear-gradient(to bottom, hsla(120, 40%, 55%, 0.0), hsla(120, 40%, 55%, 0.2), hsla(120, 40%, 55%, 0.0))"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-full" style={{ background: "hsl(0, 0%, 8%)", color: "hsl(120, 40%, 55%)" }}>
          <span className="text-sm font-mono">Loading Terminal…</span>
        </div>
      }>
        <QShellEmbed onClose={onClose} onOpenJupyter={onOpenJupyter} />
      </Suspense>
    </ProjectionShell>
  );
}
