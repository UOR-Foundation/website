/**
 * UorAnchoringCard — Minimal domain classification badge.
 * Shows the detected knowledge domain and subcategory for a query.
 */

import React from "react";
import { motion } from "framer-motion";

/* ── Domain metadata ─────────────────────────────────────────────────── */

const DOMAIN_META: Record<string, { emoji: string; label: string }> = {
  biomedical: { emoji: "🧬", label: "Biomedical Sciences" },
  physics: { emoji: "⚛️", label: "Physics" },
  mathematics: { emoji: "📐", label: "Mathematics" },
  philosophy: { emoji: "🏛️", label: "Philosophy" },
  history: { emoji: "📜", label: "History" },
  law: { emoji: "⚖️", label: "Law" },
  technology: { emoji: "💻", label: "Technology" },
  environment: { emoji: "🌍", label: "Environmental Science" },
  economics: { emoji: "📊", label: "Economics" },
  general: { emoji: "🔍", label: "General Knowledge" },
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
}) => {
  const domain = queryDomain || "general";
  const meta = DOMAIN_META[domain] || DOMAIN_META.general;
  const subcategory = domainSubcategory || detectSubcategory(keyword, domain);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="mb-5 flex items-center gap-2 px-1"
    >
      <span style={{ fontSize: 15, lineHeight: 1 }}>{meta.emoji}</span>
      <span className="text-foreground/70 font-medium text-[13px]">
        {meta.label}
      </span>
      {subcategory && (
        <>
          <span className="text-foreground/20 text-xs">·</span>
          <span className="text-foreground/50 text-[12px]">{subcategory}</span>
        </>
      )}
    </motion.div>
  );
};

export default UorAnchoringCard;
