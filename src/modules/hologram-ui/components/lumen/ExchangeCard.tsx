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

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronRight, Shield, Lightbulb, ExternalLink, Fingerprint } from "lucide-react";

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
interface ExchangeMeta {
  grade?: string;
  curvature?: number;
  iterations?: number;
  converged?: boolean;
  reward?: number;
  habitFired?: boolean;
  inferenceMs?: number;
  claims?: any[];
}

interface ExchangeData {
  id: string;
  thought: string;
  understanding: string;
  timestamp: Date;
  pipeline: { stage: string; [k: string]: any };
  showcase?: boolean;
  meta?: ExchangeMeta;
}

interface ExchangeCardProps {
  exchange: ExchangeData;
  isActive: boolean;
  pipelineSlot?: React.ReactNode;
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

/** Generate follow-up suggestions based on claims */
function generateFollowUps(claims: any[], thought: string): string[] {
  const suggestions: string[] = [];
  if (!claims || claims.length === 0) {
    suggestions.push(`What evidence supports this?`);
    suggestions.push(`Can you explain your reasoning step by step?`);
    return suggestions;
  }

  // Pick up to 3 claims and generate verification questions
  const topClaims = claims.slice(0, 3);
  for (const claim of topClaims) {
    const text = typeof claim === "string" ? claim : claim.text || claim.claim || JSON.stringify(claim);
    if (text.length > 10) {
      suggestions.push(`How confident are you about: "${text.slice(0, 60)}${text.length > 60 ? "…" : ""}"?`);
    }
  }

  if (suggestions.length < 2) {
    suggestions.push("What are the limits of this understanding?");
  }
  suggestions.push("What would change this answer?");

  return suggestions.slice(0, 3);
}

// ── Trust Arc ────────────────────────────────────────────────────────
function TrustArc({ score, grade }: { score: number; grade?: string }) {
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
export default function ExchangeCard({ exchange: ex, isActive, pipelineSlot }: ExchangeCardProps) {
  const [showTrace, setShowTrace] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showGuarantees, setShowGuarantees] = useState(false);
  const isConverged = ex.pipeline.stage === "converged";
  const score = trustScore(ex.meta);
  const active = activeGuarantees(ex.meta, ex.understanding);
  const followUps = ex.meta?.claims
    ? generateFollowUps(ex.meta.claims, ex.thought)
    : generateFollowUps([], ex.thought);

  const handleFollowUp = useCallback((question: string) => {
    // Dispatch a custom event that ConvergenceChat can listen for
    window.dispatchEvent(new CustomEvent("lumen:follow-up", { detail: question }));
  }, []);

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
            {/* Markdown response */}
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
                {ex.understanding}
              </ReactMarkdown>
            </div>

            {/* ── Trust Surface — coherence trace + interactive tools ── */}
            {ex.meta && isConverged && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.6 }}
                className="mt-4 pt-3"
                style={{ borderTop: "1px solid hsla(38, 15%, 25%, 0.06)" }}
              >
                {/* Top row: grade + status + interactive toggles */}
                <div className="flex items-center justify-between">
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

                  {/* Interactive toggles */}
                  <div className="flex items-center gap-1">
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
                      <div className="mt-3 p-3 rounded-xl" style={{ background: "hsla(25, 8%, 8%, 0.5)", border: "1px solid hsla(38, 15%, 22%, 0.08)" }}>
                        <p className="text-[9px] tracking-[0.2em] uppercase mb-3" style={{ color: "hsla(38, 20%, 55%, 0.4)" }}>
                          Reasoning trace
                        </p>

                        {/* Scaffold claims */}
                        {ex.meta.claims && ex.meta.claims.length > 0 ? (
                          <div className="space-y-2">
                            {ex.meta.claims.map((claim, i) => {
                              const text = typeof claim === "string" ? claim : claim.text || claim.claim || claim.label || JSON.stringify(claim);
                              const claimGrade = typeof claim === "object" && claim.grade ? claim.grade : ex.meta!.grade;
                              return (
                                <div key={i} className="flex items-start gap-2">
                                  <div
                                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                                    style={{ background: gradeColor(claimGrade) }}
                                  />
                                  <p className="text-[12px] leading-relaxed" style={{ color: "hsla(30, 12%, 65%, 0.6)", fontFamily: C.font }}>
                                    {text}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: gradeColor(ex.meta.grade) }} />
                              <p className="text-[12px] leading-relaxed" style={{ color: "hsla(30, 12%, 65%, 0.5)" }}>
                                Direct response: single-pass reasoning without decomposition
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Convergence metrics */}
                        <div className="flex items-center gap-4 mt-3 pt-2" style={{ borderTop: "1px solid hsla(38, 15%, 22%, 0.06)" }}>
                          {ex.meta.iterations != null && (
                            <span className="text-[9px] font-mono" style={{ color: "hsla(30, 10%, 50%, 0.3)" }}>
                              {ex.meta.iterations} iteration{ex.meta.iterations !== 1 ? "s" : ""}
                            </span>
                          )}
                          {ex.meta.curvature != null && (
                            <span className="text-[9px] font-mono" style={{ color: "hsla(30, 10%, 50%, 0.3)" }}>
                              κ {ex.meta.curvature.toFixed(4)}
                            </span>
                          )}
                          {ex.meta.reward != null && (
                            <span className="text-[9px] font-mono" style={{ color: ex.meta.reward > 0 ? "hsla(152, 40%, 55%, 0.4)" : "hsla(0, 35%, 55%, 0.3)" }}>
                              Δ{ex.meta.reward > 0 ? "+" : ""}{ex.meta.reward.toFixed(3)}
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
                      <div className="mt-3 p-3 rounded-xl" style={{ background: "hsla(152, 10%, 8%, 0.3)", border: "1px solid hsla(152, 20%, 30%, 0.08)" }}>
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="w-3 h-3" style={{ color: "hsla(38, 45%, 60%, 0.5)" }} />
                          <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: "hsla(38, 20%, 55%, 0.4)" }}>
                            Deepen understanding
                          </p>
                        </div>

                        <p className="text-[11px] leading-relaxed mb-3" style={{ color: "hsla(30, 12%, 65%, 0.45)", fontFamily: C.font }}>
                          Ask a follow-up to verify or strengthen specific claims in this response.
                        </p>

                        <div className="space-y-1.5">
                          {followUps.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => handleFollowUp(q)}
                              className="w-full text-left flex items-start gap-2 px-2.5 py-2 rounded-lg transition-all duration-300 hover:bg-[hsla(38,15%,25%,0.08)] group"
                            >
                              <ExternalLink
                                className="w-3 h-3 mt-0.5 flex-shrink-0 transition-colors duration-300"
                                style={{ color: "hsla(38, 30%, 55%, 0.25)" }}
                              />
                              <span
                                className="text-[12px] leading-relaxed transition-colors duration-300"
                                style={{ color: "hsla(30, 15%, 65%, 0.5)" }}
                              >
                                {q}
                              </span>
                            </button>
                          ))}
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
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
