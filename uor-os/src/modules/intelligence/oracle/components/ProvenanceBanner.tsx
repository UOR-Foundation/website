/**
 * ProvenanceBanner — Transparent "how this was generated" provenance bar.
 * Perplexity-style: subtle badges showing sources, personalization, and UOR synthesis.
 * Expandable for full provenance explanation.
 */

import React, { useState } from "react";

interface ProvenanceBannerProps {
  sourceCount: number;
  model?: string;
  personalized?: boolean;
  personalizedTopics?: string[];
  queryDomain?: string;
}

const DOMAIN_LABELS: Record<string, string> = {
  biomedical: "🧬 Biomedical",
  physics: "⚛️ Physics",
  mathematics: "📐 Mathematics",
  philosophy: "🏛️ Philosophy",
  history: "📜 History",
  law: "⚖️ Law",
  technology: "💻 Technology",
  environment: "🌍 Environment",
  economics: "📊 Economics",
};

const ProvenanceBanner: React.FC<ProvenanceBannerProps> = ({
  sourceCount,
  model: _model,
  personalized = false,
  personalizedTopics = [],
  queryDomain,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="border border-border/10 bg-muted/8 rounded-lg mb-4"
      style={{ fontSize: 11 }}
    >
      {/* Badge row */}
      <div
        className="flex items-center gap-3 px-3 py-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Web sources */}
        <span className="inline-flex items-center gap-1 text-muted-foreground/60">
          <span style={{ fontSize: 12 }}>🌐</span>
          <span className="font-medium">{sourceCount} source{sourceCount !== 1 ? "s" : ""}</span>
        </span>

        <span className="text-border/30">·</span>

        {/* UOR Synthesis */}
        <span className="inline-flex items-center gap-1 text-muted-foreground/60">
          <span style={{ fontSize: 12 }}>⚙</span>
          <span className="font-medium">UOR Synthesis</span>
        </span>

        {/* Personalized */}
        {personalized && (
          <>
            <span className="text-border/30">·</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground/60">
              <span style={{ fontSize: 12 }}>👤</span>
              <span className="font-medium">Personalized</span>
            </span>
          </>
        )}

        {/* Research domain */}
        {queryDomain && DOMAIN_LABELS[queryDomain] && (
          <>
            <span className="text-border/30">·</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground/60">
              <span className="font-medium">{DOMAIN_LABELS[queryDomain]}</span>
            </span>
          </>
        )}

        <span className="ml-auto text-muted-foreground/30 text-[10px]">
          {expanded ? "▾" : "▸"} How this was generated
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="px-3 pb-3 text-muted-foreground/50 border-t border-border/10"
          style={{ fontSize: 11, lineHeight: 1.6, paddingTop: 8 }}
        >
          <p>
            This article was synthesized by <strong className="text-muted-foreground/70">UOR</strong> using{" "}
            <strong className="text-muted-foreground/70">{sourceCount} web source{sourceCount !== 1 ? "s" : ""}</strong>
            {" "}(Wikipedia, Wikidata){personalized && personalizedTopics.length > 0 && (
              <> and personalized based on your recent exploration of{" "}
                <strong className="text-muted-foreground/70">
                  {personalizedTopics.slice(0, 3).join(", ")}
                  {personalizedTopics.length > 3 && ` +${personalizedTopics.length - 3} more`}
                </strong>
              </>
            )}.
          </p>
          <p className="mt-1">
            Facts marked with superscript numbers link to their original source for verification.
            Every source is content-addressed via UOR for provenance integrity.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProvenanceBanner;
