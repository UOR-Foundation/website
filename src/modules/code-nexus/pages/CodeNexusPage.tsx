/**
 * CodeNexusPage — Phase 0 Shell
 * ═════════════════════════════
 *
 * Minimal scaffold for the Code Nexus Lens.
 * Provides the route target and PageShell wrapper.
 * Future phases will add ingestion, graph, and intelligence.
 */

import { PageShell } from "@/modules/hologram-ui/components/PageShell";
import { GitBranch } from "lucide-react";

export default function CodeNexusPage() {
  return (
    <PageShell
      title="Code Nexus"
      subtitle="Holographic Lens · Isometry"
      icon={<GitBranch size={16} />}
      backTo="/"
      badge="Phase 0"
    >
      {/* Placeholder — replaced in Phase 1 with RepoInput + GraphExplorer */}
      <div className="flex flex-col items-center justify-center py-32 gap-6 animate-fade-in">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: "hsla(38, 20%, 50%, 0.08)",
            border: "1px solid hsla(38, 15%, 60%, 0.12)",
          }}
        >
          <GitBranch
            className="w-8 h-8"
            strokeWidth={1.2}
            style={{ color: "hsl(38, 35%, 62%)" }}
          />
        </div>

        <div className="text-center space-y-2 max-w-md">
          <h2
            className="text-2xl font-light"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "hsl(38, 10%, 88%)",
            }}
          >
            Code Nexus
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              color: "hsl(38, 8%, 55%)",
              fontWeight: 300,
            }}
          >
            Transform any repository into an interactive knowledge graph.
            <br />
            Drop a GitHub URL or ZIP file to begin.
          </p>
        </div>

        {/* Future: RepoInput component goes here */}
        <div
          className="mt-4 px-8 py-4 rounded-xl border border-dashed cursor-not-allowed opacity-50"
          style={{
            borderColor: "hsla(38, 15%, 60%, 0.15)",
            color: "hsl(38, 8%, 50%)",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: "13px",
            letterSpacing: "0.15em",
          }}
        >
          Coming in Phase 1
        </div>
      </div>
    </PageShell>
  );
}
