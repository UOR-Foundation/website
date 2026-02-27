/**
 * Atlas Visualization Page
 * ════════════════════════
 *
 * Full-screen interactive Atlas of Resonance Classes
 * with Universal Model Fingerprint panel.
 * Accessible at /atlas route.
 */

import React, { Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Network } from "lucide-react";

const AtlasGraph = React.lazy(() => import("@/modules/atlas/components/AtlasGraph"));
const ModelFingerprintPanel = React.lazy(() => import("@/modules/atlas/components/ModelFingerprintCard"));

type Tab = "graph" | "fingerprint";

export default function AtlasVisualizationPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("graph");

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

        {/* Tab switcher */}
        <div className="flex items-center gap-1 ml-4 bg-[hsla(210,10%,15%,0.5)] rounded-md p-0.5">
          <button
            onClick={() => setTab("graph")}
            className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded transition-colors ${
              tab === "graph"
                ? "bg-[hsla(38,50%,50%,0.2)] text-[hsl(38,50%,65%)]"
                : "text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)]"
            }`}
          >
            <Network size={12} /> Graph
          </button>
          <button
            onClick={() => setTab("fingerprint")}
            className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded transition-colors ${
              tab === "fingerprint"
                ? "bg-[hsla(38,50%,50%,0.2)] text-[hsl(38,50%,65%)]"
                : "text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)]"
            }`}
          >
            <BarChart3 size={12} /> Fingerprint
          </button>
        </div>

        <div className="ml-auto text-[10px] font-mono text-[hsl(210,10%,40%)]">
          G₂ ⊂ F₄ ⊂ E₆ ⊂ E₇ ⊂ E₈
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center text-[hsl(210,10%,45%)] text-sm font-mono">
            {tab === "graph" ? "Constructing 96-vertex Atlas…" : "Computing model fingerprints…"}
          </div>
        }>
          {tab === "graph" ? (
            <AtlasGraph width={1200} height={800} />
          ) : (
            <div className="h-full overflow-y-auto">
              <ModelFingerprintPanel />
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}