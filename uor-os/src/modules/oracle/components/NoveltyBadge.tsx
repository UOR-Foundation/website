/**
 * NoveltyBadge — Displays a 0–100 novelty score with a color gradient.
 *
 * Grey (well-known) → amber (familiar) → green (fresh) → electric blue (novel)
 * Positioned alongside the epistemic grade — grade = trust, novelty = value.
 */

import React from "react";
import { motion } from "framer-motion";
import type { NoveltyResult } from "@/modules/oracle/lib/novelty-scorer";

interface NoveltyBadgeProps {
  novelty: NoveltyResult;
}

function getNoveltyColor(score: number): string {
  if (score >= 85) return "hsl(200, 90%, 55%)";  // electric blue — novel
  if (score >= 60) return "hsl(145, 65%, 48%)";  // green — fresh
  if (score >= 35) return "hsl(38, 85%, 55%)";   // amber — familiar
  return "hsl(var(--muted-foreground) / 0.5)";   // grey — well-explored
}

function getNoveltyBg(score: number): string {
  if (score >= 85) return "hsl(200 90% 55% / 0.12)";
  if (score >= 60) return "hsl(145 65% 48% / 0.12)";
  if (score >= 35) return "hsl(38 85% 55% / 0.12)";
  return "hsl(var(--muted-foreground) / 0.06)";
}

const NoveltyBadge: React.FC<NoveltyBadgeProps> = ({ novelty }) => {
  const color = getNoveltyColor(novelty.score);
  const bg = getNoveltyBg(novelty.score);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      title={`${novelty.score}% new to you — ${novelty.label}${novelty.closestMatch ? `. Closest prior: "${novelty.closestMatch}"` : ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 6,
        background: bg,
        cursor: "default",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "ui-monospace, monospace",
          color,
        }}
      >
        {novelty.score}%
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.04em",
          color,
          opacity: 0.8,
        }}
      >
        new
      </span>
    </motion.div>
  );
};

export default NoveltyBadge;
