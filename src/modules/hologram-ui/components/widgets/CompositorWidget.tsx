/**
 * CompositorWidget — Multi-Kernel Compositor monitor.
 *
 * Shows child kernel layers, their Z-order, H-scores,
 * and the composite coherence across all active kernels.
 */

import { useState, useEffect, useMemo } from "react";
import {
  getProjectionCompositor,
  type CompositorProjection,
} from "@/hologram/kernel/surface/projection-compositor";

const ROLE_ICONS: Record<string, string> = {
  app: "◻",
  agent: "◈",
  service: "⬡",
  sandbox: "◇",
};

export function CompositorWidget() {
  const [projection, setProjection] = useState<CompositorProjection>(() =>
    getProjectionCompositor().project()
  );

  useEffect(() => {
    const compositor = getProjectionCompositor();
    const unsub = compositor.onComposite(() => {
      setProjection(compositor.project());
    });
    return unsub;
  }, []);

  if (!projection.active) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-mono">⊘</span>
        <span>No child kernels</span>
      </div>
    );
  }

  const gradeColor = projection.compositeH >= 0.85 ? "text-primary"
    : projection.compositeH >= 0.7 ? "text-accent-foreground"
    : projection.compositeH >= 0.5 ? "text-muted-foreground"
    : "text-destructive";

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-2 min-w-[160px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
          Compositor
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {projection.activeCount}/{projection.kernelCount} active
        </span>
      </div>

      {/* Layer stack */}
      <div className="flex flex-col gap-0.5">
        {projection.layers.slice(0, 5).map((layer, idx) => (
          <div
            key={layer.name}
            className="flex items-center gap-1 text-[10px]"
            style={{ opacity: 0.3 + 0.7 * Math.exp(-idx * 0.5) }}
          >
            <span className="font-mono text-muted-foreground">
              {ROLE_ICONS[layer.role] ?? "?"}
            </span>
            <span className="truncate max-w-[80px] text-foreground">
              {layer.name}
            </span>
            <span className={`ml-auto font-mono ${
              layer.hScore >= 0.85 ? "text-primary"
              : layer.hScore >= 0.7 ? "text-accent-foreground"
              : "text-muted-foreground"
            }`}>
              {(layer.hScore * 100).toFixed(0)}
            </span>
          </div>
        ))}
        {projection.layers.length > 5 && (
          <span className="text-[9px] text-muted-foreground/60 font-mono">
            +{projection.layers.length - 5} more
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-1">
        <span className={`font-mono ${gradeColor}`}>
          H:{(projection.compositeH * 100).toFixed(0)}%
        </span>
        <span className="font-mono">
          {projection.foreground || "—"}
        </span>
      </div>
    </div>
  );
}

export default CompositorWidget;
