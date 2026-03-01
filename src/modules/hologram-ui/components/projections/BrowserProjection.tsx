/**
 * BrowserProjection — Keep-alive browser panel with hover preloading
 */

import ProjectionShell from "../shell/ProjectionShell";
import HologramBrowser from "../panels/HologramBrowser";

interface BrowserProjectionProps {
  open: boolean;
  preload?: boolean;
  onClose: () => void;
  onSendToLumen?: (ctx: { title: string; url: string; markdown: string }) => void;
}

export default function BrowserProjection({ open, preload, onClose, onSendToLumen }: BrowserProjectionProps) {
  return (
    <ProjectionShell open={open} preload={preload} onClose={onClose} id="browser">
      <HologramBrowser onClose={onClose} onSendToLumen={onSendToLumen} />
    </ProjectionShell>
  );
}
