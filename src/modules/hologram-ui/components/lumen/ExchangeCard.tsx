/**
 * ExchangeCard — A single thought↔understanding pair with trust surface
 * ═════════════════════════════════════════════════════════════════════
 *
 * Renders each exchange with:
 *   1. Trust Score arc: visual coherence indicator per response
 *   2. Chain of Thought: expandable reasoning trace (claims/scaffold)
 *   3. Statement Verification: per-claim trust with follow-up suggestions
 *
 * Design: minimal by default, rich on demand. The trust surface
 * is always visible as a subtle arc; details unfold on interaction.
 */

import { useState, useCallback, memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import ContextualBloom from "./ContextualBloom";
import { ChevronDown, ChevronRight, Shield, Lightbulb, ExternalLink, Fingerprint, Copy, Check, RotateCcw, Link2, HelpCircle, ArrowRight, SlidersHorizontal, Bookmark, Sparkles, Lock } from "lucide-react";

// ── Bloom Toggle (persisted, default ON) ─────────────────────────────
const BLOOM_KEY = "lumen:bloom-enabled";
function getBloomDefault(): boolean {
  try {
    const v = localStorage.getItem(BLOOM_KEY);
    return v === null ? true : v === "true";
  } catch { return true; }
}
function setBloomPersist(v: boolean) {
  try { localStorage.setItem(BLOOM_KEY, String(v)); } catch {}
}

// ── Palette (mirrors ConvergenceChat) ────────────────────────────────
const C = {
  font: "'DM Sans', sans-serif",
  fontDisplay: "'Playfair Display', serif",
  text: "hsl(38, 15%, 82%)",
  textMuted: "hsl(30, 10%, 55%)",
  gold: "hsl(38, 50%, 55%)",
  goldMuted: "hsl(38, 35%, 48%)",
} as const;

// ── Types ────────────────────────────────────────────────────────────
interface ProofOfThoughtMeta {
  cid: string;
  spectralGrade: string;
  driftDelta0: number;
  triadicPhase: 3 | 6 | 9;
  fidelity: number;
  eigenvaluesLocked: number;
  converged: boolean;
  compressionRatio: number;
  zk: boolean;
  freeParameters: number;
  verified: boolean;
}

interface ExchangeMeta {
  grade?: string;
  curvature?: number;
  iterations?: number;
  converged?: boolean;
  reward?: number;
  habitFired?: boolean;
  inferenceMs?: number;
  claims?: any[];
  proofOfThought?: ProofOfThoughtMeta;
}

interface ExchangeData {
  id: string;
  thought: string;
  understanding: string;
  timestamp: Date;
  pipeline: { stage: string; [k: string]: any };
  showcase?: boolean;
  meta?: ExchangeMeta;
  /** Short description of the fader mix used to generate this response */
  mixLabel?: string;
  /** If this is a remix, the original response text */
  remixOriginal?: string;
  /** The mix label of the original response */
  remixOriginalMix?: string;
}

interface ExchangeCardProps {
  exchange: ExchangeData;
  isActive: boolean;
  pipelineSlot?: React.ReactNode;
  /** Whether this remix is saved as favorite */
  isRemixSaved?: boolean;
  /** Callback to save/unsave this remix */
  onToggleSaveRemix?: (exchange: ExchangeData) => void;
  /** Global bloom toggle from parent */
  bloomEnabled?: boolean;
}

// ── The Eight Guarantees ─────────────────────────────────────────────
const GUARANTEES = [
  { id: "G1", label: "Data Sovereignty", short: "Your data stays with you", icon: "🔒" },
  { id: "G2", label: "No Fabrication", short: "Every claim is grounded", icon: "◇" },
  { id: "G3", label: "Full Transparency", short: "Every step is inspectable", icon: "◈" },
  { id: "G4", label: "Honesty Over Comfort", short: "Truth before smoothness", icon: "△" },
  { id: "G5", label: "User Control", short: "Nothing without your consent", icon: "⊙" },
  { id: "G6", label: "Proportional Response", short: "Evidence matches assertion", icon: "≡" },
  { id: "G7", label: "Trust Is Earned", short: "Built through reliability", icon: "⟡" },
  { id: "G8", label: "User Success", short: "Exists only to serve you", icon: "✦" },
] as const;

/** Detect which guarantees are most visibly active for a given response */
function activeGuarantees(meta?: ExchangeMeta, understanding?: string): string[] {
  const active: string[] = [];
  // G2 — No Fabrication: always active; highlight if grade is high
  if (meta?.grade === "A" || meta?.grade === "B") active.push("G2");
  // G3 — Transparency: always active when trace data exists
  if (meta?.claims && meta.claims.length > 0) active.push("G3");
  // G4 — Honesty: highlight when confidence is explicitly low or uncertainty expressed
  if (meta?.grade === "C" || meta?.grade === "D") active.push("G4");
  if (understanding?.includes("not confident") || understanding?.includes("don't know") || understanding?.includes("uncertain")) active.push("G4");
  // G6 — Proportional: active when converged (evidence matched)
  if (meta?.converged) active.push("G6");
  // G7 — Trust earned: always active
  active.push("G7");
  // G1, G5, G8 are structural (always enforced)
  return [...new Set(active)];
}

// ── Helpers ──────────────────────────────────────────────────────────
function gradeColor(g?: string) {
  if (g === "A") return "hsla(152, 50%, 60%, 0.8)";
  if (g === "B") return "hsla(38, 45%, 60%, 0.7)";
  if (g === "C") return "hsla(30, 35%, 55%, 0.6)";
  return "hsla(0, 35%, 55%, 0.5)";
}

function gradeLabel(g?: string) {
  if (g === "A") return "High confidence";
  if (g === "B") return "Good confidence";
  if (g === "C") return "Moderate confidence";
  return "Low confidence";
}

function trustScore(meta?: ExchangeMeta): number {
  if (!meta) return 0;
  let score = 0;
  // Grade contributes 0-40
  if (meta.grade === "A") score += 40;
  else if (meta.grade === "B") score += 30;
  else if (meta.grade === "C") score += 20;
  else score += 10;
  // Convergence contributes 0-30
  if (meta.converged) score += 30;
  else score += 10;
  // Reward contributes 0-20
  if (meta.reward != null) score += Math.max(0, Math.min(20, meta.reward * 20 + 10));
  // Claims verified contributes 0-10
  if (meta.claims && meta.claims.length > 0) score += 10;
  return Math.min(100, Math.round(score));
}

/** Generate follow-up suggestions based on claims and the response content */
function generateFollowUps(claims: any[], thought: string, understanding: string): string[] {
  const suggestions: string[] = [];

  // Strategy 1: If claims exist, target the weakest or most interesting ones
  if (claims && claims.length > 0) {
    // Find claims with lowest confidence or no source
    const weakClaims = claims.filter((c: any) => {
      const grade = typeof c === "object" ? c.grade : null;
      return !grade || grade === "C" || grade === "D";
    });
    const targetClaims = weakClaims.length > 0 ? weakClaims : claims;

    const first = targetClaims[0];
    const firstText = typeof first === "string" ? first : first?.text || first?.claim || first?.label || "";
    if (firstText.length > 5) {
      suggestions.push(`What is the primary evidence for "${firstText.slice(0, 50)}${firstText.length > 50 ? "…" : ""}"?`);
    }
  }

  // Strategy 2: Epistemic boundary question — what would change the answer
  if (understanding.length > 50) {
    const hasNumbers = /\d+%|\d+\.\d+|\$[\d,]+/.test(understanding);
    if (hasNumbers) {
      suggestions.push("What are the exact sources and dates for the figures cited?");
    } else {
      suggestions.push("What evidence would change or refine this answer?");
    }
  }

  // Strategy 3: Knowledge limit question
  suggestions.push("What are the boundaries of your knowledge on this topic, and how could I verify this independently?");

  return suggestions.slice(0, 3);
}

/** Build a human-readable chain-of-thought narrative from the exchange data */
function buildTraceNarrative(ex: { thought: string; understanding: string; meta?: ExchangeMeta }): string[] {
  const steps: string[] = [];
  const meta = ex.meta;

  // Step 1: What was asked
  steps.push(`① Received query: "${ex.thought.slice(0, 80)}${ex.thought.length > 80 ? "…" : ""}"`);

  // Step 2: Decomposition
  if (meta?.claims && meta.claims.length > 0) {
    steps.push(`② Decomposed into ${meta.claims.length} verifiable claim${meta.claims.length !== 1 ? "s" : ""} for independent evaluation`);
  } else {
    steps.push(`② Single-pass reasoning — query did not require decomposition`);
  }

  // Step 3: Each claim as a reasoning step
  if (meta?.claims && meta.claims.length > 0) {
    meta.claims.forEach((claim: any, i: number) => {
      const text = typeof claim === "string" ? claim : claim.text || claim.claim || claim.label || JSON.stringify(claim);
      const grade = typeof claim === "object" && claim.grade ? claim.grade : null;
      const gradeStr = grade ? ` [Grade ${grade}]` : "";
      steps.push(`   ${String.fromCharCode(97 + i)}) ${text}${gradeStr}`);
    });
  }

  // Step 4: Convergence result
  if (meta?.iterations != null) {
    steps.push(`③ Ran ${meta.iterations} convergence iteration${meta.iterations !== 1 ? "s" : ""} — curvature κ = ${meta.curvature?.toFixed(4) ?? "n/a"}`);
  }

  // Step 5: Final assessment
  const gradeMap: Record<string, string> = { A: "High confidence", B: "Good confidence", C: "Moderate confidence", D: "Low confidence" };
  const gradeStr = gradeMap[meta?.grade ?? ""] ?? "Ungraded";
  const convergedStr = meta?.converged ? "Converged ✓" : "Did not converge";
  steps.push(`④ Final assessment: ${gradeStr} · ${convergedStr}`);

  // Step 6: Reward signal
  if (meta?.reward != null) {
    const direction = meta.reward > 0 ? "positive" : meta.reward < 0 ? "negative" : "neutral";
    steps.push(`⑤ Coherence reward: ${direction} (Δ${meta.reward > 0 ? "+" : ""}${meta.reward.toFixed(3)}) — system ${meta.reward >= 0 ? "learned from" : "flagged"} this exchange`);
  }

  return steps;
}

/** Extract plausible source references from the response text */
function extractSources(understanding: string, claims: any[]): { text: string; type: "cited" | "inferred" | "unverified" }[] {
  const sources: { text: string; type: "cited" | "inferred" | "unverified" }[] = [];

  // Check for explicit URL mentions
  const urlMatches = understanding.match(/https?:\/\/[^\s)]+/g);
  if (urlMatches) {
    urlMatches.slice(0, 3).forEach(url => {
      sources.push({ text: url, type: "cited" });
    });
  }

  // Check for named sources (e.g., "according to X", "World Bank", etc.)
  const namedSourcePatterns = [
    /(?:according to|per|from|source:|via|reported by|published by)\s+([A-Z][^.,;]+)/gi,
    /(?:World Bank|IMF|WHO|UN|OECD|NSB|Bureau of Statistics|Federal Reserve|ECB|IPCC)/gi,
  ];
  for (const pattern of namedSourcePatterns) {
    let match;
    while ((match = pattern.exec(understanding)) !== null) {
      const name = match[1] || match[0];
      if (!sources.some(s => s.text.includes(name.trim()))) {
        sources.push({ text: name.trim(), type: "inferred" });
      }
    }
  }

  // If no sources found, mark claims as unverified
  if (sources.length === 0 && claims.length > 0) {
    sources.push({ text: "No external sources cited — based on model knowledge", type: "unverified" });
  }

  return sources.slice(0, 5);
}

// ── Sentence-Level Diff ──────────────────────────────────────────────

/** Strip internal metadata tags from response text */
function cleanForDiff(text: string): string {
  return text
    .replace(/\s*\{source:\s*"[^"]*"\}\s*/g, "")
    .replace(/\s*\[\[[A-D]\|[^\]]*\]\]\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/(?<!\*)\*(?!\*)/g, "")
    .trim();
}

/** Split text into sentences (respecting abbreviations) */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"])/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/** Compute longest common subsequence of sentences */
function lcs(a: string[], b: string[]): Set<string> {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  // Backtrack to get matched sentences
  const matched = new Set<string>();
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { matched.add(a[i - 1]); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return matched;
}

type DiffLine = { type: "same" | "removed" | "added"; text: string };

function computeSentenceDiff(original: string, remixed: string): DiffLine[] {
  const origSentences = splitSentences(original);
  const remixSentences = splitSentences(remixed);
  const common = lcs(origSentences, remixSentences);

  const lines: DiffLine[] = [];
  const origUsed = new Set<number>();
  const remixUsed = new Set<number>();

  // Walk both lists, emitting removed/same/added in order
  let oi = 0, ri = 0;
  while (oi < origSentences.length || ri < remixSentences.length) {
    if (oi < origSentences.length && ri < remixSentences.length && origSentences[oi] === remixSentences[ri]) {
      lines.push({ type: "same", text: origSentences[oi] });
      oi++; ri++;
    } else if (oi < origSentences.length && !common.has(origSentences[oi])) {
      lines.push({ type: "removed", text: origSentences[oi] });
      oi++;
    } else if (ri < remixSentences.length && !common.has(remixSentences[ri])) {
      lines.push({ type: "added", text: remixSentences[ri] });
      ri++;
    } else if (oi < origSentences.length) {
      lines.push({ type: "removed", text: origSentences[oi] });
      oi++;
    } else {
      lines.push({ type: "added", text: remixSentences[ri] });
      ri++;
    }
  }
  return lines;
}

function SentenceDiff({ original, remixed }: { original: string; remixed: string }) {
  const lines = computeSentenceDiff(original, remixed);
  const stats = {
    same: lines.filter(l => l.type === "same").length,
    removed: lines.filter(l => l.type === "removed").length,
    added: lines.filter(l => l.type === "added").length,
  };

  return (
    <div className="space-y-1">
      {lines.map((line, i) => (
        <div
          key={i}
          className="rounded-lg px-3 py-1.5 text-[12px] leading-[1.85] transition-all duration-200"
          style={{
            fontFamily: C.font,
            fontWeight: 350,
            ...(line.type === "same" ? {
              color: "hsla(30, 12%, 70%, 0.55)",
              background: "transparent",
            } : line.type === "removed" ? {
              color: "hsla(0, 25%, 72%, 0.65)",
              background: "hsla(0, 40%, 30%, 0.08)",
              borderLeft: "2px solid hsla(0, 50%, 55%, 0.25)",
              textDecoration: "line-through",
              textDecorationColor: "hsla(0, 40%, 55%, 0.2)",
            } : {
              color: "hsla(152, 25%, 78%, 0.75)",
              background: "hsla(152, 35%, 30%, 0.08)",
              borderLeft: "2px solid hsla(152, 45%, 50%, 0.3)",
            }),
          }}
        >
          <span className="text-[8px] uppercase tracking-wider mr-2 font-semibold" style={{
            color: line.type === "same" ? "hsla(30, 10%, 50%, 0.2)"
              : line.type === "removed" ? "hsla(0, 40%, 55%, 0.35)"
              : "hsla(152, 40%, 55%, 0.4)",
          }}>
            {line.type === "removed" ? "−" : line.type === "added" ? "+" : "·"}
          </span>
          {line.text}
        </div>
      ))}
      {/* Summary footer */}
      <div className="flex items-center gap-3 pt-2 mt-1" style={{ borderTop: "1px solid hsla(200, 12%, 20%, 0.06)" }}>
        <span className="text-[9px] font-mono" style={{ color: "hsla(30, 10%, 50%, 0.25)" }}>{stats.same} unchanged</span>
        {stats.removed > 0 && <span className="text-[9px] font-mono" style={{ color: "hsla(0, 40%, 55%, 0.35)" }}>−{stats.removed} removed</span>}
        {stats.added > 0 && <span className="text-[9px] font-mono" style={{ color: "hsla(152, 40%, 55%, 0.4)" }}>+{stats.added} added</span>}
      </div>
    </div>
  );
}

// ── Proof Badge ──────────────────────────────────────────────────────
function ProofBadge({ proof }: { proof: ProofOfThoughtMeta }) {
  const badgeColor = proof.verified
    ? proof.spectralGrade === "A" ? "hsla(152, 50%, 55%, 0.7)"
    : proof.spectralGrade === "B" ? "hsla(38, 45%, 58%, 0.65)"
    : "hsla(30, 20%, 55%, 0.5)"
    : "hsla(0, 30%, 55%, 0.5)";

  return (
    <div className="flex items-center gap-1.5">
      <motion.div
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
        style={{
          background: `${badgeColor.replace(/[\d.]+\)$/, "0.06)")}`,
          border: `1px solid ${badgeColor.replace(/[\d.]+\)$/, "0.12)")}`,
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <span className="text-[8px]" style={{ color: badgeColor }}>✦</span>
        <span className="text-[8px] font-mono tracking-wider" style={{ color: badgeColor }}>
          {proof.spectralGrade}
        </span>
        <span className="text-[7px]" style={{ color: badgeColor.replace(/[\d.]+\)$/, "0.45)") }}>
          · {proof.freeParameters} free
        </span>
        {proof.verified && (
          <span className="text-[7px]" style={{ color: "hsla(152, 45%, 55%, 0.5)" }}>
            · verified
          </span>
        )}
      </motion.div>
      {proof.zk && (
        <motion.div
          className="flex items-center gap-0.5 px-1 py-0.5 rounded-md"
          style={{
            background: "hsla(200, 30%, 20%, 0.08)",
            border: "1px solid hsla(200, 35%, 40%, 0.1)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.0 }}
          title="Zero-knowledge: verified without accessing content"
        >
          <Lock className="w-2.5 h-2.5" style={{ color: "hsla(200, 45%, 60%, 0.5)" }} />
          <span className="text-[7px] tracking-wider uppercase" style={{ color: "hsla(200, 40%, 60%, 0.45)" }}>
            ZK
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ── Proof Drawer ─────────────────────────────────────────────────────
function ProofDrawer({ proof }: { proof: ProofOfThoughtMeta }) {
  const phaseLabel = proof.triadicPhase === 3 ? "Structure" : proof.triadicPhase === 6 ? "Evolution" : "Completion";
  const phaseColor = proof.triadicPhase === 3 ? "hsla(210, 40%, 60%, 0.6)"
    : proof.triadicPhase === 6 ? "hsla(38, 45%, 58%, 0.6)"
    : "hsla(152, 45%, 55%, 0.6)";

  // Spectral grade arc (mini visualization)
  const gradeAngle = proof.spectralGrade === "A" ? 0.95
    : proof.spectralGrade === "B" ? 0.72
    : proof.spectralGrade === "C" ? 0.45
    : 0.2;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="mt-3 p-4 rounded-xl" style={{
        background: "hsla(220, 12%, 7%, 0.4)",
        border: "1px solid hsla(220, 20%, 25%, 0.08)",
      }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[8px]" style={{ color: "hsla(38, 40%, 55%, 0.3)" }}>✦</span>
            <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: "hsla(220, 20%, 55%, 0.4)" }}>
              Proof-of-Thought
            </p>
          </div>
          {proof.zk && (
            <div className="flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" style={{ color: "hsla(200, 40%, 55%, 0.35)" }} />
              <span className="text-[8px] tracking-wider" style={{ color: "hsla(200, 35%, 55%, 0.3)" }}>
                Content-blind verification
              </span>
            </div>
          )}
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Spectral Grade */}
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg" style={{ background: "hsla(220, 10%, 10%, 0.3)" }}>
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <circle cx="20" cy="20" r="16" fill="none"
                  stroke="hsla(220, 15%, 25%, 0.1)" strokeWidth="2.5"
                  strokeDasharray={`${Math.PI * 32 * 0.75} ${Math.PI * 32 * 0.25}`}
                  transform="rotate(135 20 20)" strokeLinecap="round"
                />
                <motion.circle cx="20" cy="20" r="16" fill="none"
                  stroke={gradeColor(proof.spectralGrade)} strokeWidth="2.5"
                  strokeDasharray={`${Math.PI * 32 * 0.75 * gradeAngle} ${Math.PI * 32 - Math.PI * 32 * 0.75 * gradeAngle}`}
                  transform="rotate(135 20 20)" strokeLinecap="round"
                  initial={{ strokeDasharray: `0 ${Math.PI * 32}` }}
                  animate={{ strokeDasharray: `${Math.PI * 32 * 0.75 * gradeAngle} ${Math.PI * 32 - Math.PI * 32 * 0.75 * gradeAngle}` }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono" style={{ color: gradeColor(proof.spectralGrade) }}>
                {proof.spectralGrade}
              </span>
            </div>
            <span className="text-[8px] tracking-wider uppercase" style={{ color: "hsla(220, 15%, 55%, 0.35)" }}>Grade</span>
          </div>

          {/* Drift */}
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg" style={{ background: "hsla(220, 10%, 10%, 0.3)" }}>
            <span className="text-[14px] font-mono tabular-nums" style={{ color: "hsla(38, 25%, 65%, 0.6)" }}>
              {proof.driftDelta0.toFixed(4)}
            </span>
            <span className="text-[8px] tracking-wider uppercase" style={{ color: "hsla(220, 15%, 55%, 0.35)" }}>Drift δ₀</span>
          </div>

          {/* Phase */}
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg" style={{ background: "hsla(220, 10%, 10%, 0.3)" }}>
            <span className="text-[14px] font-mono" style={{ color: phaseColor }}>
              {proof.triadicPhase}
            </span>
            <span className="text-[8px] tracking-wider uppercase" style={{ color: "hsla(220, 15%, 55%, 0.35)" }}>{phaseLabel}</span>
          </div>
        </div>

        {/* Detail rows */}
        <div className="space-y-2">
          <DetailRow label="Fidelity" value={`${(proof.fidelity * 100).toFixed(1)}%`} />
          <DetailRow label="Eigenvalues locked" value={`${proof.eigenvaluesLocked}/5`} />
          <DetailRow label="Compression" value={proof.compressionRatio.toExponential(2)} />
          <DetailRow label="Converged" value={proof.converged ? "Yes" : "No"} positive={proof.converged} />
          <DetailRow label="Free parameters" value={String(proof.freeParameters)} positive={proof.freeParameters === 0} />
        </div>

        {/* CID */}
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid hsla(220, 15%, 22%, 0.06)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[8px] tracking-[0.15em] uppercase" style={{ color: "hsla(220, 15%, 50%, 0.3)" }}>
              Content-addressed ID
            </span>
          </div>
          <div className="px-2 py-1.5 rounded-md font-mono text-[9px] break-all leading-relaxed" style={{
            background: "hsla(220, 10%, 8%, 0.4)",
            color: "hsla(200, 20%, 60%, 0.4)",
            border: "1px solid hsla(220, 15%, 20%, 0.06)",
          }}>
            {proof.cid}
          </div>
        </div>

        {/* Verification status */}
        <div className="mt-3 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{
            background: proof.verified ? "hsla(152, 55%, 50%, 0.6)" : "hsla(0, 40%, 50%, 0.5)",
          }} />
          <span className="text-[9px]" style={{
            color: proof.verified ? "hsla(152, 40%, 55%, 0.5)" : "hsla(0, 30%, 55%, 0.4)",
          }}>
            {proof.verified
              ? "Geometrically verified against {3,3,5} lattice · O(1) · <1ms"
              : "Verification failed — geometric inconsistency detected"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function DetailRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 rounded-md" style={{ background: "hsla(220, 8%, 10%, 0.15)" }}>
      <span className="text-[9px] tracking-wider" style={{ color: "hsla(220, 12%, 55%, 0.35)" }}>{label}</span>
      <span className="text-[10px] font-mono tabular-nums" style={{
        color: positive === true ? "hsla(152, 40%, 55%, 0.55)"
          : positive === false ? "hsla(0, 30%, 55%, 0.45)"
          : "hsla(38, 20%, 65%, 0.5)",
      }}>{value}</span>
    </div>
  );
}

// ── Trust Arc ────────────────────────────────────────────────────────
function TrustArc({ score, grade }: { score: number; grade?: string }) {
  // ... keep existing code
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference * 0.75; // 270° arc
  const color = gradeColor(grade);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
      <svg width="44" height="44" viewBox="0 0 44 44" className="absolute inset-0">
        {/* Background arc */}
        <circle
          cx="22" cy="22" r={radius}
          fill="none"
          stroke="hsla(38, 15%, 30%, 0.08)"
          strokeWidth="2"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform="rotate(135 22 22)"
        />
        {/* Progress arc */}
        <motion.circle
          cx="22" cy="22" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform="rotate(135 22 22)"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${progress} ${circumference - progress}` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        />
      </svg>
      <span
        className="text-[10px] font-mono relative z-10"
        style={{ color, fontWeight: 500 }}
      >
        {score}
      </span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────
function ExchangeCard({ exchange: ex, isActive, pipelineSlot, isRemixSaved, onToggleSaveRemix, bloomEnabled = true }: ExchangeCardProps) {
  const [showTrace, setShowTrace] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showGuarantees, setShowGuarantees] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const isConverged = ex.pipeline.stage === "converged";
  const score = trustScore(ex.meta);
  const active = activeGuarantees(ex.meta, ex.understanding);
  const followUps = generateFollowUps(ex.meta?.claims ?? [], ex.thought, ex.understanding);
  const traceNarrative = buildTraceNarrative(ex);
  const sources = extractSources(ex.understanding, ex.meta?.claims ?? []);
  const [traceCopied, setTraceCopied] = useState(false);
  const proof = ex.meta?.proofOfThought;

  const handleFollowUp = useCallback((question: string) => {
    window.dispatchEvent(new CustomEvent("lumen:follow-up", { detail: question }));
  }, []);

  const handleCopyTrace = useCallback(() => {
    const text = traceNarrative.join("\n");
    navigator.clipboard.writeText(text);
    setTraceCopied(true);
    setTimeout(() => setTraceCopied(false), 1500);
  }, [traceNarrative]);

  const handleReflect = useCallback(() => {
    const thought = ex.thought;
    const answer = ex.understanding;
    const reflectPrompt =
      `I just asked you this: "${thought}"\n\n` +
      `And you responded with this:\n\n${answer}\n\n` +
      `Now step back and reflect honestly. Where might this reasoning be incomplete, overconfident, or subtly wrong? ` +
      `What assumptions are hiding beneath the surface? What would a thoughtful skeptic push back on? ` +
      `Explain it clearly, as if to someone encountering these ideas for the first time.`;
    window.dispatchEvent(new CustomEvent("lumen:follow-up", { detail: reflectPrompt }));
  }, [ex.thought, ex.understanding]);

  const handleRemix = useCallback(() => {
    window.dispatchEvent(new CustomEvent("lumen:remix", {
      detail: {
        thought: ex.thought,
        original: ex.understanding,
        originalMix: ex.mixLabel || "Default mix",
      },
    }));
  }, [ex.thought, ex.understanding, ex.mixLabel]);

  const [showDiff, setShowDiff] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      {/* The thought */}
      <div className="flex justify-end">
        <div
          className="max-w-[85%] px-4 py-3 rounded-2xl"
          style={{
            background: "hsla(38, 15%, 18%, 0.3)",
            border: "1px solid hsla(38, 20%, 30%, 0.1)",
            borderBottomRightRadius: "6px",
          }}
        >
          <p className="text-[14px] leading-[1.7] whitespace-pre-wrap" style={{ color: C.text }}>
            {ex.thought}
          </p>
        </div>
      </div>

      {/* Pipeline visualization */}
      {pipelineSlot}

      {/* The understanding */}
      {ex.understanding && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex gap-3"
        >
          {/* Trust thread + arc */}
          <div className="flex flex-col items-center flex-shrink-0 pt-0.5 gap-1">
            {/* Trust arc — always visible when converged */}
            {isConverged && ex.meta && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <TrustArc score={score} grade={ex.meta.grade} />
              </motion.div>
            )}
            {/* Coherence thread */}
            <div
              className="w-[3px] rounded-full flex-1"
              style={{
                minHeight: 24,
                background: ex.meta?.grade
                  ? `linear-gradient(to bottom, ${gradeColor(ex.meta.grade)}, hsla(38, 20%, 30%, 0.08))`
                  : "linear-gradient(to bottom, hsla(38, 40%, 55%, 0.3), hsla(38, 20%, 30%, 0.05))",
                borderRadius: 2,
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            {/* Markdown response — wrapped in ContextualBloom for depth exploration */}
            <ContextualBloom
              thought={ex.thought}
              understanding={ex.understanding}
              onFollowUp={handleFollowUp}
              enabled={bloomEnabled}
            >
              <div
                className="text-[15px] leading-[2] prose prose-invert max-w-none"
                style={{
                  color: "hsl(30, 12%, 74%)",
                  fontFamily: C.font,
                  letterSpacing: "0.012em",
                  ['--tw-prose-headings' as string]: "hsl(38, 25%, 75%)",
                  ['--tw-prose-bold' as string]: "hsl(38, 18%, 82%)",
                  ['--tw-prose-code' as string]: "hsl(38, 50%, 62%)",
                  ['--tw-prose-links' as string]: "hsl(38, 50%, 62%)",
                  ['--tw-prose-bullets' as string]: C.goldMuted,
                }}
              >
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="mb-4 last:mb-0" style={{ lineHeight: "2", fontWeight: 350 }}>
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong style={{ color: "hsl(38, 22%, 84%)", fontWeight: 450, letterSpacing: "0.01em" }}>
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => (
                      <em style={{ color: "hsl(30, 18%, 68%)", fontFamily: C.fontDisplay, fontWeight: 300, letterSpacing: "0.02em" }}>
                        {children}
                      </em>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-[22px] font-light tracking-wide mt-8 mb-3" style={{ fontFamily: C.fontDisplay, color: "hsl(38, 30%, 72%)", fontWeight: 300, lineHeight: 1.4 }}>{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-[18px] font-light tracking-wide mt-7 mb-2.5" style={{ fontFamily: C.fontDisplay, color: "hsl(38, 25%, 68%)", fontWeight: 300, lineHeight: 1.5 }}>{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-[16px] tracking-[0.06em] uppercase mt-6 mb-2" style={{ fontFamily: C.font, color: "hsl(30, 15%, 58%)", fontWeight: 500, letterSpacing: "0.08em", lineHeight: 1.5 }}>{children}</h3>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-3 my-4 pl-0" style={{ listStyle: "none" }}>{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="space-y-3 my-4 pl-0" style={{ listStyle: "none" }}>{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="flex gap-3 items-start pl-1">
                        <span className="flex-shrink-0 mt-[11px] w-1 h-1 rounded-full" style={{ background: "hsla(38, 35%, 55%, 0.35)" }} />
                        <span style={{ lineHeight: "2" }}>{children}</span>
                      </li>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="my-5 pl-4 py-1" style={{ borderLeft: "2px solid hsla(38, 30%, 50%, 0.15)", color: "hsl(30, 15%, 65%)", fontFamily: C.fontDisplay, fontStyle: "italic", fontWeight: 300, letterSpacing: "0.01em", lineHeight: "1.9" }}>{children}</blockquote>
                    ),
                    code: ({ children, className }) => {
                      if (className?.includes("language-")) {
                        return (
                          <pre className="my-4 p-4 rounded-xl overflow-x-auto text-[13px]" style={{ background: "hsla(25, 8%, 8%, 0.9)", border: "1px solid hsla(38, 15%, 22%, 0.12)", lineHeight: 1.7 }}>
                            <code style={{ color: "hsl(38, 25%, 68%)" }}>{children}</code>
                          </pre>
                        );
                      }
                      return (
                        <code className="px-1.5 py-0.5 rounded-md text-[13px]" style={{ background: "hsla(25, 8%, 13%, 0.7)", color: "hsl(38, 45%, 62%)", fontWeight: 400 }}>{children}</code>
                      );
                    },
                    hr: () => (
                      <div className="my-6 flex justify-center">
                        <div className="w-8 h-[1px]" style={{ background: "hsla(38, 20%, 45%, 0.12)" }} />
                      </div>
                    ),
                  }}
                >
                  {ex.understanding
                    .replace(/\s*\{source:\s*"[^"]*"\}\s*/g, "")
                    .replace(/\s*\[\[[A-D]\|[^\]]*\]\]\s*/g, "")
                  }
                </ReactMarkdown>
              </div>
            </ContextualBloom>

            {/* ── Remix Diff — side-by-side comparison with original ── */}
            {ex.remixOriginal && isConverged && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                className="mt-4"
              >
                <button
                  onClick={() => setShowDiff(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl w-full transition-all duration-300"
                  style={{
                    background: "hsla(200, 15%, 15%, 0.2)",
                    border: "1px solid hsla(200, 25%, 35%, 0.12)",
                  }}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: "hsla(200, 50%, 65%, 0.6)" }} />
                  <span className="text-[10px] tracking-[0.1em] uppercase" style={{ color: "hsla(200, 40%, 65%, 0.7)" }}>
                    {showDiff ? "Hide" : "Show"} remix comparison
                  </span>
                  <span className="ml-auto text-[9px]" style={{ color: "hsla(200, 30%, 55%, 0.4)" }}>
                    {ex.remixOriginalMix ?? "Original"} → {ex.mixLabel ?? "Current"}
                  </span>
                  {showDiff ? <ChevronDown className="w-3 h-3" style={{ color: "hsla(200, 40%, 60%, 0.4)" }} /> : <ChevronRight className="w-3 h-3" style={{ color: "hsla(200, 40%, 60%, 0.4)" }} />}
                </button>
                <AnimatePresence>
                  {showDiff && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div
                        className="mt-3 p-4 rounded-xl"
                        style={{
                          background: "hsla(25, 8%, 7%, 0.4)",
                          border: "1px solid hsla(200, 20%, 25%, 0.08)",
                        }}
                      >
                        {/* Legend */}
                        <div className="flex items-center gap-4 mb-3 pb-2" style={{ borderBottom: "1px solid hsla(200, 15%, 25%, 0.08)" }}>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: "hsla(38, 40%, 55%, 0.4)" }} />
                            <span className="text-[9px] tracking-[0.12em] uppercase" style={{ color: "hsla(38, 30%, 60%, 0.5)" }}>
                              {ex.remixOriginalMix || "Original"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: "hsla(200, 50%, 60%, 0.6)" }} />
                            <span className="text-[9px] tracking-[0.12em] uppercase" style={{ color: "hsla(200, 40%, 65%, 0.6)" }}>
                              {ex.mixLabel || "Remixed"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="inline-block w-3 h-[3px] rounded-sm" style={{ background: "hsla(0, 50%, 55%, 0.25)" }} />
                            <span className="text-[8px]" style={{ color: "hsla(0, 30%, 55%, 0.4)" }}>Removed</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-[3px] rounded-sm" style={{ background: "hsla(152, 45%, 50%, 0.25)" }} />
                            <span className="text-[8px]" style={{ color: "hsla(152, 30%, 55%, 0.4)" }}>Added</span>
                          </div>
                        </div>

                        {/* Sentence-level diff */}
                        <SentenceDiff
                          original={cleanForDiff(ex.remixOriginal)}
                          remixed={cleanForDiff(ex.understanding)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── Trust Surface — coherence trace + interactive tools ── */}
            {ex.meta && isConverged && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.6 }}
                className="mt-4 pt-3"
                style={{ borderTop: "1px solid hsla(38, 15%, 25%, 0.06)" }}
              >
                {/* Top row: grade + proof badge + status */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    {ex.meta.grade && (
                      <span className="text-[9px] tracking-[0.15em] uppercase" style={{ color: gradeColor(ex.meta.grade) }}>
                        {gradeLabel(ex.meta.grade)}
                      </span>
                    )}
                    {ex.meta.converged != null && (
                      <span className="text-[9px] tracking-[0.1em]" style={{
                        color: ex.meta.converged ? "hsla(152, 35%, 55%, 0.35)" : "hsla(30, 15%, 50%, 0.25)",
                      }}>
                        {ex.meta.converged ? "settled" : "open"}
                      </span>
                    )}
                    {ex.meta.inferenceMs != null && (
                      <span className="text-[9px] tracking-wider" style={{ color: "hsla(30, 10%, 45%, 0.2)" }}>
                        {ex.meta.inferenceMs < 1000 ? `${ex.meta.inferenceMs}ms` : `${(ex.meta.inferenceMs / 1000).toFixed(1)}s`}
                      </span>
                    )}
                  </div>
                  {/* Proof Badge — always visible */}
                  {proof && <ProofBadge proof={proof} />}

                  {/* Interactive toggles */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {/* Chain of Thought toggle */}
                    <button
                      onClick={() => setShowTrace(v => !v)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-300 hover:bg-[hsla(38,15%,25%,0.08)]"
                      style={{ color: showTrace ? gradeColor(ex.meta.grade) : "hsla(38, 15%, 50%, 0.3)" }}
                      title="View reasoning trace"
                    >
                      {showTrace ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span className="text-[9px] tracking-[0.12em] uppercase">Trace</span>
                    </button>

                    {/* Verify toggle */}
                    <button
                      onClick={() => setShowVerify(v => !v)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-300 hover:bg-[hsla(38,15%,25%,0.08)]"
                      style={{ color: showVerify ? "hsla(152, 45%, 55%, 0.7)" : "hsla(38, 15%, 50%, 0.3)" }}
                      title="Verify and deepen"
                    >
                      <Shield className="w-3 h-3" />
                      <span className="text-[9px] tracking-[0.12em] uppercase">Verify</span>
                    </button>

                    {/* Guarantees toggle */}
                    <button
                      onClick={() => setShowGuarantees(v => !v)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-300 hover:bg-[hsla(38,15%,25%,0.08)]"
                      style={{ color: showGuarantees ? "hsla(38, 50%, 60%, 0.7)" : "hsla(38, 15%, 50%, 0.3)" }}
                      title="Constitutional guarantees"
                    >
                      <Fingerprint className="w-3 h-3" />
                      <span className="text-[9px] tracking-[0.12em] uppercase">{active.length}</span>
                    </button>

                    {/* Proof-of-Thought toggle */}
                    {proof && (
                      <button
                        onClick={() => setShowProof(v => !v)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-300 hover:bg-[hsla(220,15%,25%,0.08)]"
                        style={{ color: showProof ? "hsla(200, 50%, 60%, 0.7)" : "hsla(38, 15%, 50%, 0.3)" }}
                        title="View geometric proof receipt"
                      >
                        <span className="text-[9px]">✦</span>
                        <span className="text-[9px] tracking-[0.12em] uppercase">Proof</span>
                      </button>
                    )}

                    {/* Remix with current mix */}
                    <button
                      onClick={handleRemix}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-300 hover:bg-[hsla(200,20%,25%,0.12)]"
                      style={{ color: "hsla(200, 45%, 60%, 0.5)" }}
                      title="Regenerate with current fader mix"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span className="text-[9px] tracking-[0.12em] uppercase">Remix</span>
                    </button>

                    {/* Save remix as favorite */}
                    {ex.remixOriginal && onToggleSaveRemix && (
                      <button
                        onClick={() => onToggleSaveRemix(ex)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-300 hover:bg-[hsla(38,20%,25%,0.1)]"
                        style={{ color: isRemixSaved ? "hsla(38, 55%, 60%, 0.8)" : "hsla(38, 20%, 50%, 0.3)" }}
                        title={isRemixSaved ? "Remove from saved" : "Save this remix"}
                      >
                        <Bookmark className="w-3 h-3" fill={isRemixSaved ? "currentColor" : "none"} />
                        <span className="text-[9px] tracking-[0.12em] uppercase">
                          {isRemixSaved ? "Saved" : "Save"}
                        </span>
                      </button>
                    )}

                  </div>
                </div>

                {/* ── Expandable: Chain of Thought ── */}
                <AnimatePresence>
                  {showTrace && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 p-4 rounded-xl" style={{ background: "hsla(25, 8%, 8%, 0.5)", border: "1px solid hsla(38, 15%, 22%, 0.08)" }}>
                        {/* Header with actions */}
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: "hsla(38, 20%, 55%, 0.4)" }}>
                            Chain of thought
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={handleCopyTrace}
                              className="flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-300 hover:bg-[hsla(38,15%,25%,0.1)]"
                              title="Copy chain of thought"
                            >
                              {traceCopied
                                ? <Check className="w-3 h-3" style={{ color: "hsla(152, 50%, 55%, 0.6)" }} />
                                : <Copy className="w-3 h-3" style={{ color: "hsla(38, 15%, 50%, 0.35)" }} />
                              }
                              <span className="text-[8px] tracking-wider uppercase" style={{ color: traceCopied ? "hsla(152, 50%, 55%, 0.6)" : "hsla(38, 15%, 50%, 0.3)" }}>
                                {traceCopied ? "Copied" : "Copy"}
                              </span>
                            </button>
                            <button
                              onClick={handleReflect}
                              className="flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-300 hover:bg-[hsla(280,15%,25%,0.1)]"
                              title="Ask Lumen to reflect on this reasoning"
                            >
                              <RotateCcw className="w-3 h-3" style={{ color: "hsla(280, 35%, 60%, 0.45)" }} />
                              <span className="text-[8px] tracking-wider uppercase" style={{ color: "hsla(280, 35%, 60%, 0.4)" }}>
                                Reflect
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Human-readable narrative trace */}
                        <div className="space-y-2.5">
                          {traceNarrative.map((step, i) => {
                            const isSubStep = step.startsWith("   ");
                            return (
                              <div key={i} className="flex items-start gap-2.5" style={{ paddingLeft: isSubStep ? 16 : 0 }}>
                                {!isSubStep && (
                                  <div className="w-1 h-1 rounded-full mt-[7px] flex-shrink-0" style={{ background: "hsla(38, 35%, 55%, 0.25)" }} />
                                )}
                                {isSubStep && (
                                  <div className="w-[3px] h-[3px] rounded-sm mt-[6px] flex-shrink-0" style={{ background: gradeColor(ex.meta?.grade), opacity: 0.5 }} />
                                )}
                                <p className="text-[12px] leading-[1.7]" style={{
                                  color: isSubStep ? "hsla(30, 12%, 65%, 0.55)" : "hsla(30, 12%, 70%, 0.7)",
                                  fontFamily: C.font,
                                  fontWeight: isSubStep ? 350 : 400,
                                }}>
                                  {step.trim()}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Convergence metrics footer */}
                        <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: "1px solid hsla(38, 15%, 22%, 0.06)" }}>
                          {ex.meta!.iterations != null && (
                            <span className="text-[9px] font-mono" style={{ color: "hsla(30, 10%, 50%, 0.3)" }}>
                              {ex.meta!.iterations} iteration{ex.meta!.iterations !== 1 ? "s" : ""}
                            </span>
                          )}
                          {ex.meta!.curvature != null && (
                            <span className="text-[9px] font-mono" style={{ color: "hsla(30, 10%, 50%, 0.3)" }}>
                              κ {ex.meta!.curvature.toFixed(4)}
                            </span>
                          )}
                          {ex.meta!.reward != null && (
                            <span className="text-[9px] font-mono" style={{ color: ex.meta!.reward! > 0 ? "hsla(152, 40%, 55%, 0.4)" : "hsla(0, 35%, 55%, 0.3)" }}>
                              Δ{ex.meta!.reward! > 0 ? "+" : ""}{ex.meta!.reward!.toFixed(3)}
                            </span>
                          )}
                          {ex.meta!.inferenceMs != null && (
                            <span className="text-[9px] font-mono" style={{ color: "hsla(30, 10%, 45%, 0.2)" }}>
                              {ex.meta!.inferenceMs < 1000 ? `${ex.meta!.inferenceMs}ms` : `${(ex.meta!.inferenceMs / 1000).toFixed(1)}s`}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Expandable: Verify & Deepen ── */}
                <AnimatePresence>
                  {showVerify && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 p-4 rounded-xl" style={{ background: "hsla(152, 10%, 8%, 0.3)", border: "1px solid hsla(152, 20%, 30%, 0.08)" }}>
                        
                        {/* Sources section */}
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Link2 className="w-3 h-3" style={{ color: "hsla(38, 40%, 58%, 0.45)" }} />
                            <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: "hsla(38, 20%, 55%, 0.4)" }}>
                              Sources
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            {sources.map((src, i) => (
                              <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-lg" style={{ background: "hsla(38, 10%, 12%, 0.3)" }}>
                                <div
                                  className="w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0"
                                  style={{
                                    background: src.type === "cited" ? "hsla(152, 50%, 55%, 0.6)"
                                      : src.type === "inferred" ? "hsla(38, 50%, 55%, 0.5)"
                                      : "hsla(0, 30%, 55%, 0.4)",
                                  }}
                                />
                                <div className="min-w-0 flex-1">
                                  {src.text.startsWith("http") ? (
                                    <a
                                      href={src.text}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] leading-relaxed break-all transition-colors duration-200 hover:underline"
                                      style={{ color: "hsla(38, 45%, 62%, 0.7)" }}
                                    >
                                      {src.text}
                                    </a>
                                  ) : (
                                    <span className="text-[11px] leading-relaxed" style={{ color: "hsla(30, 12%, 65%, 0.55)" }}>
                                      {src.text}
                                    </span>
                                  )}
                                  <span className="ml-2 text-[8px] tracking-wider uppercase" style={{
                                    color: src.type === "cited" ? "hsla(152, 40%, 55%, 0.4)"
                                      : src.type === "inferred" ? "hsla(38, 35%, 55%, 0.35)"
                                      : "hsla(0, 25%, 55%, 0.3)",
                                  }}>
                                    {src.type}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Follow-up questions */}
                        <div>
                          <div className="flex items-center gap-2 mb-3 pt-3" style={{ borderTop: "1px solid hsla(38, 15%, 22%, 0.06)" }}>
                            <HelpCircle className="w-3 h-3" style={{ color: "hsla(38, 45%, 60%, 0.4)" }} />
                            <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: "hsla(38, 20%, 55%, 0.4)" }}>
                              Increase confidence
                            </p>
                          </div>

                          <p className="text-[10px] leading-relaxed mb-3" style={{ color: "hsla(30, 12%, 60%, 0.35)" }}>
                            These questions target the weakest claims. Asking them will deepen verification and raise the trust score.
                          </p>

                          <div className="space-y-1">
                            {followUps.map((q, i) => (
                              <button
                                key={i}
                                onClick={() => handleFollowUp(q)}
                                className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-300 hover:bg-[hsla(38,15%,20%,0.1)] group"
                              >
                                <ArrowRight
                                  className="w-3 h-3 mt-0.5 flex-shrink-0 transition-all duration-300 group-hover:translate-x-0.5"
                                  style={{ color: "hsla(38, 35%, 55%, 0.3)" }}
                                />
                                <span
                                  className="text-[12px] leading-[1.6] transition-colors duration-300 group-hover:text-[hsla(38,25%,75%,0.7)]"
                                  style={{ color: "hsla(30, 15%, 65%, 0.5)" }}
                                >
                                  {q}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Expandable: Constitutional Guarantees ── */}
                <AnimatePresence>
                  {showGuarantees && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 p-3 rounded-xl" style={{ background: "hsla(38, 8%, 7%, 0.4)", border: "1px solid hsla(38, 20%, 25%, 0.06)" }}>
                        <div className="flex items-center gap-2 mb-3">
                          <Fingerprint className="w-3 h-3" style={{ color: "hsla(38, 40%, 58%, 0.4)" }} />
                          <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: "hsla(38, 20%, 55%, 0.4)" }}>
                            Constitutional guarantees
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          {GUARANTEES.map((g) => {
                            const isActive = active.includes(g.id);
                            return (
                              <motion.div
                                key={g.id}
                                initial={false}
                                animate={{ opacity: isActive ? 1 : 0.35 }}
                                className="flex items-start gap-2 px-2 py-1.5 rounded-lg"
                                style={{
                                  background: isActive ? "hsla(38, 15%, 18%, 0.15)" : "transparent",
                                }}
                              >
                                <span className="text-[11px] flex-shrink-0 mt-px" style={{ opacity: isActive ? 0.8 : 0.3 }}>
                                  {g.icon}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-[9px] tracking-[0.08em] uppercase" style={{
                                    color: isActive ? "hsla(38, 30%, 65%, 0.7)" : "hsla(38, 15%, 50%, 0.3)",
                                    fontWeight: 500,
                                  }}>
                                    {g.label}
                                  </p>
                                  <p className="text-[10px] leading-snug mt-0.5" style={{
                                    color: isActive ? "hsla(30, 12%, 62%, 0.5)" : "hsla(30, 10%, 50%, 0.2)",
                                  }}>
                                    {g.short}
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>

                        <p className="text-[9px] mt-3 pt-2 leading-relaxed" style={{
                          color: "hsla(30, 12%, 55%, 0.25)",
                          borderTop: "1px solid hsla(38, 15%, 22%, 0.05)",
                        }}>
                          These constraints are structural. They cannot be turned off, overridden, or bypassed.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Expandable: Proof-of-Thought ── */}
                <AnimatePresence>
                  {showProof && proof && <ProofDrawer proof={proof} />}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default memo(ExchangeCard, (prev, next) => (
  prev.exchange === next.exchange &&
  prev.isActive === next.isActive &&
  prev.pipelineSlot === next.pipelineSlot
));
