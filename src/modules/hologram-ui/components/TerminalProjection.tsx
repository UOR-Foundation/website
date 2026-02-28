/**
 * TerminalProjection — Keep-alive terminal panel with hover preloading
 */

import ProjectionShell from "./ProjectionShell";
import QShellEmbed from "@/modules/qkernel/pages/QShellEmbed";

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
      onClose={onClose}
      id="terminal"
      backdropColor="hsla(0, 0%, 0%, 0.4)"
      beamGradient="linear-gradient(to bottom, hsla(120, 40%, 55%, 0.0), hsla(120, 40%, 55%, 0.2), hsla(120, 40%, 55%, 0.0))"
    >
      <QShellEmbed onClose={onClose} onOpenJupyter={onOpenJupyter} />
    </ProjectionShell>
  );
}
