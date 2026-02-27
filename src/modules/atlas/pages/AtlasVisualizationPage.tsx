/**
 * Atlas Visualization Page
 * ════════════════════════
 *
 * Full-screen interactive Atlas of Resonance Classes.
 * Accessible at /atlas route.
 */

import React, { Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const AtlasGraph = React.lazy(() => import("@/modules/atlas/components/AtlasGraph"));

export default function AtlasVisualizationPage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen flex flex-col bg-[hsl(230,15%,8%)]">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="h-12 shrink-0 flex items-center px-4 border-b border-[hsla(210,15%,30%,0.3)] gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-[hsl(210,10%,55%)] hover:text-white transition-colors p-1.5 rounded-md hover:bg-[hsla(210,20%,30%,0.3)]"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-mono tracking-wide text-[hsl(38,50%,60%)]">
            ATLAS
          </span>
          <span className="text-[11px] text-[hsl(210,10%,45%)] font-mono">
            of Resonance Classes
          </span>
        </div>
        <div className="ml-auto text-[10px] font-mono text-[hsl(210,10%,40%)]">
          G₂ ⊂ F₄ ⊂ E₆ ⊂ E₇ ⊂ E₈
        </div>
      </div>

      {/* ── Graph ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center text-[hsl(210,10%,45%)] text-sm font-mono">
            Constructing 96-vertex Atlas…
          </div>
        }>
          <AtlasGraph width={1200} height={800} />
        </Suspense>
      </div>
    </div>
  );
}
