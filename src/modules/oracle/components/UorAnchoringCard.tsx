/**
 * UorAnchoringCard — Automatic UOR framework classification and grounding card.
 * Appears above every article to show domain, taxonomy mapping, depth, and novelty.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

/* ── Domain metadata ─────────────────────────────────────────────────── */

const DOMAIN_META: Record<string, { emoji: string; label: string; anchoring: string }> = {
  biomedical: { emoji: "🧬", label: "Biomedical Sciences", anchoring: "Sources dynamically rebalanced toward PubMed, NIH, and peer-reviewed clinical repositories." },
  physics: { emoji: "⚛️", label: "Physics", anchoring: "Sources dynamically rebalanced toward arXiv, Nature, and physics-authoritative repositories." },
  mathematics: { emoji: "📐", label: "Mathematics", anchoring: "Sources dynamically rebalanced toward MathWorld, arXiv, and formal proof repositories." },
  philosophy: { emoji: "🏛️", label: "Philosophy", anchoring: "Sources dynamically rebalanced toward Stanford Encyclopedia of Philosophy and humanities archives." },
  history: { emoji: "📜", label: "History", anchoring: "Sources dynamically rebalanced toward Library of Congress, Archive.org, and historiographic repositories." },
  law: { emoji: "⚖️", label: "Law", anchoring: "Sources dynamically rebalanced toward government legal databases and institutional law repositories." },
  technology: { emoji: "💻", label: "Technology", anchoring: "Sources dynamically rebalanced toward IEEE, ACM, and engineering-authoritative repositories." },
  environment: { emoji: "🌍", label: "Environmental Science", anchoring: "Sources dynamically rebalanced toward IPCC, EPA, and earth-science repositories." },
  economics: { emoji: "📊", label: "Economics", anchoring: "Sources dynamically rebalanced toward World Bank, OECD, and econometric repositories." },
  general: { emoji: "🔍", label: "General Knowledge", anchoring: "Sources evaluated across the full spectrum of authoritative web repositories." },
};

const SUBCATEGORY_MAP: Record<string, Record<string, string>> = {
  physics: {
    quantum: "Quantum Mechanics", relativity: "Relativity", particle: "Particle Physics",
    thermodynamic: "Thermodynamics", cosmolog: "Cosmology", astrophys: "Astrophysics",
    electro: "Electromagnetism", optic: "Optics", nuclear: "Nuclear Physics",
    semiconductor: "Semiconductor Physics", superconducti: "Superconductivity",
  },
  biomedical: {
    cancer: "Oncology", gene: "Genetics", neuron: "Neuroscience", brain: "Neuroscience",
    cardiac: "Cardiology", immun: "Immunology", virus: "Virology", vaccine: "Vaccinology",
    pharma: "Pharmacology", drug: "Pharmacology", psychiatr: "Psychiatry",
  },
  mathematics: {
    algebra: "Algebra", topology: "Topology", calculus: "Calculus", geometry: "Geometry",
    probability: "Probability Theory", statistic: "Statistics", number: "Number Theory",
    category: "Category Theory", differential: "Differential Equations",
  },
  technology: {
    machine: "Machine Learning", neural: "Neural Networks", blockchain: "Blockchain",
    cybersecurity: "Cybersecurity", cloud: "Cloud Computing", database: "Database Systems",
    algorithm: "Algorithms",
  },
};

function detectSubcategory(keyword: string, domain: string): string | null {
  const map = SUBCATEGORY_MAP[domain];
  if (!map) return null;
  const lower = keyword.toLowerCase();
  for (const [pattern, label] of Object.entries(map)) {
    if (lower.includes(pattern)) return label;
  }
  return null;
}

/* ── Component ───────────────────────────────────────────────────────── */

interface UorAnchoringCardProps {
  keyword: string;
  queryDomain?: string;
  domainSubcategory?: string;
  noveltyScore?: number;
  noveltyLabel?: string;
  domainDepth?: number;
  sessionCoherence?: number;
}

const UorAnchoringCard: React.FC<UorAnchoringCardProps> = ({
  keyword,
  queryDomain = "general",
  domainSubcategory,
  noveltyScore,
  noveltyLabel,
  domainDepth = 0,
  sessionCoherence,
}) => {
  const [expanded, setExpanded] = useState(false);

  const domain = queryDomain || "general";
  const meta = DOMAIN_META[domain] || DOMAIN_META.general;
  const subcategory = domainSubcategory || detectSubcategory(keyword, domain);
  const depthClamped = Math.min(10, Math.max(0, domainDepth));
  const noveltyPct = noveltyScore != null ? Math.round(noveltyScore * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="mb-5 rounded-xl border border-border/12 overflow-hidden"
      style={{
        background: "hsl(var(--card) / 0.5)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2">
        <span style={{ fontSize: 16, lineHeight: 1 }}>{meta.emoji}</span>
        <span className="text-foreground/85 font-semibold text-sm">
          {meta.label}
        </span>
        {subcategory && (
          <>
            <span className="text-foreground/20 text-xs">·</span>
            <span className="text-foreground/55 text-xs font-medium">{subcategory}</span>
          </>
        )}
      </div>

      {/* Key-value rows */}
      <div className="px-4 pb-3 grid gap-2" style={{ fontSize: 12 }}>
        {/* UOR Domain */}
        <Row label="UOR Domain" value={meta.label} />

        {/* Category */}
        <Row
          label="Category"
          value={
            <span className="inline-flex items-center gap-1.5">
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-primary/12 text-primary/80"
              >
                RESOLVE
              </span>
              <span className="text-muted-foreground/40">→</span>
              <span className="text-foreground/55">Query resolution</span>
            </span>
          }
        />

        {/* Anchoring */}
        <Row label="Anchoring" value="Content-addressed via R₈ ring arithmetic" />

        {/* Depth */}
        <Row
          label="Depth"
          value={
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex gap-px">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span
                    key={i}
                    className="rounded-sm"
                    style={{
                      width: 6,
                      height: 10,
                      background: i < depthClamped
                        ? "hsl(var(--primary) / 0.7)"
                        : "hsl(var(--foreground) / 0.08)",
                    }}
                  />
                ))}
              </span>
              <span className="text-foreground/45">
                {domainDepth} prior exploration{domainDepth !== 1 ? "s" : ""}
              </span>
            </span>
          }
        />

        {/* Novelty */}
        {noveltyPct != null && (
          <Row
            label="Novelty"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span className="font-semibold text-foreground/70">{noveltyPct}%</span>
                <span className="text-foreground/40">
                  {noveltyLabel ? `— ${noveltyLabel}` : noveltyPct >= 80 ? "— New territory" : noveltyPct >= 40 ? "— Familiar territory" : "— Well-explored"}
                </span>
              </span>
            }
          />
        )}
      </div>

      {/* Expandable section */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-1.5 px-4 py-2.5 border-t border-border/8 text-xs text-foreground/40 hover:text-foreground/60 transition-colors"
      >
        <ChevronRight
          className="w-3 h-3 transition-transform"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        />
        <span className="font-medium">How UOR anchors this topic</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 text-xs text-foreground/50 leading-relaxed" style={{ lineHeight: 1.7 }}>
              This topic is content-addressed through UOR's canonical identity system.
              The search term is decomposed into its prime factorization within R₈,
              producing a unique cryptographic address that is simultaneously routable
              and content-verifiable. {meta.anchoring}
              {sessionCoherence != null && (
                <span className="block mt-2 text-foreground/35">
                  Session coherence: {(sessionCoherence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ── Row helper ──────────────────────────────────────────────────────── */

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-muted-foreground/45 font-medium shrink-0 uppercase tracking-widest"
        style={{ fontSize: 10, minWidth: 72 }}
      >
        {label}
      </span>
      <span className="text-foreground/60">{value}</span>
    </div>
  );
}

export default UorAnchoringCard;