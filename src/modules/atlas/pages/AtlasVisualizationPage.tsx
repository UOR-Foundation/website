/**
 * Atlas Visualization Page
 * ════════════════════════
 *
 * Full-screen interactive Atlas of Resonance Classes with panels for:
 * - Graph visualization (96 vertices, 256 edges)
 * - Universal Model Fingerprint
 * - Cross-Model Translation
 * - F₄ Quotient Compression
 *
 * Accessible at /atlas route.
 */

import React, { Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Network, ArrowLeftRight, Minimize2 } from "lucide-react";

const AtlasGraph = React.lazy(() => import("@/modules/atlas/components/AtlasGraph"));
const ModelFingerprintPanel = React.lazy(() => import("@/modules/atlas/components/ModelFingerprintCard"));
const TranslationPanel = React.lazy(() => import("@/modules/atlas/components/TranslationPanel"));
const CompressionPanel = React.lazy(() => import("@/modules/atlas/components/CompressionPanel"));

type Tab = "graph" | "fingerprint" | "translation" | "compression";

export default function AtlasVisualizationPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("graph");

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "graph", label: "Graph", icon: <Network size={12} /> },
    { key: "fingerprint", label: "Fingerprint", icon: <BarChart3 size={12} /> },
    { key: "translation", label: "Translation", icon: <ArrowLeftRight size={12} /> },
    { key: "compression", label: "Compression", icon: <Minimize2 size={12} /> },
  ];

  const loadingText: Record<Tab, string> = {
    graph: "Constructing 96-vertex Atlas…",
    fingerprint: "Computing model fingerprints…",
    translation: "Running cross-model translations…",
    compression: "Analyzing τ-mirror symmetry…",
  };

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
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded transition-colors ${
                tab === key
                  ? "bg-[hsla(38,50%,50%,0.2)] text-[hsl(38,50%,65%)]"
                  : "text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)]"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        <div className="ml-auto text-[10px] font-mono text-[hsl(210,10%,40%)]">
          G₂ ⊂ F₄ ⊂ E₆ ⊂ E₇ ⊂ E₈
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center text-[hsl(210,10%,45%)] text-sm font-mono">
            {loadingText[tab]}
          </div>
        }>
          {tab === "graph" ? (
            <AtlasGraph width={1200} height={800} />
          ) : (
            <div className="h-full overflow-y-auto">
              {tab === "fingerprint" ? <ModelFingerprintPanel /> :
               tab === "translation" ? <TranslationPanel /> :
               <CompressionPanel />}
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
