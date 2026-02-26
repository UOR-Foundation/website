/**
 * TrustScoreBar — Persistent trust grade indicator for every AI response.
 *
 * Shows a single trust grade (A–D) on every response. Expandable to reveal:
 *   1. Chain of thought (per-claim grades + sources)
 *   2. "Improve Trust" actions (suggest sources, alternatives, refine question)
 *
 * Grade A/B responses can be bookmarked for future reference.
 */

import { useState, useCallback } from "react";
import type { AnnotatedClaim, EpistemicGrade } from "@/modules/ring-core/neuro-symbolic";
import {
  Shield, ShieldAlert, ChevronDown, ChevronUp,
  Search, RefreshCw, Lightbulb, ExternalLink, BookOpen,
  Bookmark, BookmarkCheck,
} from "lucide-react";

// ── Grade Palette ──────────────────────────────────────────────────────────

const GRADE = {
  A: { color: "hsl(160, 45%, 55%)", bg: "hsla(160, 45%, 55%, 0.1)", border: "hsla(160, 45%, 55%, 0.2)", label: "Proven", icon: "◆" },
  B: { color: "hsl(200, 45%, 60%)", bg: "hsla(200, 45%, 60%, 0.1)", border: "hsla(200, 45%, 60%, 0.2)", label: "Verified", icon: "◇" },
  C: { color: "hsl(38, 50%, 55%)", bg: "hsla(38, 50%, 55%, 0.1)", border: "hsla(38, 50%, 55%, 0.2)", label: "Plausible", icon: "○" },
  D: { color: "hsl(15, 50%, 55%)", bg: "hsla(15, 50%, 55%, 0.08)", border: "hsla(15, 50%, 55%, 0.2)", label: "Unverified", icon: "·" },
} as const;

const P = {
  font: "'DM Sans', sans-serif",
  text: "hsl(38, 20%, 85%)",
  textMuted: "hsl(30, 10%, 60%)",
  textDim: "hsl(30, 10%, 50%)",
  border: "hsla(38, 30%, 30%, 0.2)",
  goldLight: "hsl(38, 60%, 60%)",
};

// ── Types ──────────────────────────────────────────────────────────────────

interface TrustScoreBarProps {
  grade: EpistemicGrade;
  claims?: AnnotatedClaim[];
  iterations?: number;
  converged?: boolean;
  curvature?: number;
  onSendFollowUp?: (prompt: string) => void;
  userQuery?: string;
  /** Content of the AI message (needed for bookmarking) */
  messageContent?: string;
  /** Whether this response is already bookmarked */
  isBookmarked?: boolean;
  /** Callback to save/unsave this response */
  onToggleBookmark?: () => void;
}

// ── Improve Trust Suggestions ──────────────────────────────────────────────

function getImprovementActions(
  grade: EpistemicGrade,
  claims?: AnnotatedClaim[],
  userQuery?: string,
): Array<{ id: string; icon: typeof Search; label: string; description: string; prompt: string }> {
  const actions: Array<{ id: string; icon: typeof Search; label: string; description: string; prompt: string }> = [];
  const q = userQuery || "the previous question";

  if (grade === "D" || grade === "C") {
    actions.push({
      id: "cite-sources",
      icon: BookOpen,
      label: "Request sources",
      description: "Ask Lumen to cite specific, verifiable sources for each claim",
      prompt: `Please provide specific, verifiable sources for each claim in your previous answer about "${q.slice(0, 80)}". For each key point, cite the original research, documentation, or authoritative reference.`,
    });
  }

  if (grade !== "A") {
    actions.push({
      id: "alternatives",
      icon: RefreshCw,
      label: "Suggest alternatives",
      description: "Get alternative perspectives or competing viewpoints",
      prompt: `What are the alternative perspectives or competing viewpoints on "${q.slice(0, 80)}"? Present at least 2-3 different approaches with their supporting evidence.`,
    });
  }

  if (grade === "D" || grade === "C") {
    actions.push({
      id: "narrow-scope",
      icon: Search,
      label: "Narrow the question",
      description: "Break it into smaller, more verifiable sub-questions",
      prompt: `Break down "${q.slice(0, 80)}" into 3-5 smaller, more specific sub-questions that would each be easier to verify with concrete evidence.`,
    });
  }

  if (grade === "C" || grade === "B") {
    actions.push({
      id: "verify-claims",
      icon: Lightbulb,
      label: "Verify key claims",
      description: "Ask Lumen to double-check the most important claims",
      prompt: `Please re-examine the key claims in your previous answer about "${q.slice(0, 80)}". For each claim, state your confidence level and what evidence would be needed to fully verify it.`,
    });
  }

  return actions;
}

// ── Claim Detail Row ───────────────────────────────────────────────────────

function ClaimRow({ claim, index }: { claim: AnnotatedClaim; index: number }) {
  const g = GRADE[claim.grade];
  return (
    <div
      className="flex items-start gap-2.5 py-2 px-3 rounded-lg transition-colors hover:bg-white/[0.02]"
      style={{ borderBottom: `1px solid ${P.border}` }}
    >
      {/* Grade badge */}
      <span
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 mt-0.5"
        style={{ background: g.bg, color: g.color, border: `1px solid ${g.border}`, letterSpacing: "0.06em" }}
      >
        <span style={{ fontSize: "7px" }}>{g.icon}</span>
        {claim.grade}
      </span>

      {/* Claim text + source */}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-relaxed" style={{ color: P.text }}>
          {claim.text.replace(/\s*\{source:\s*"[^"]*"\}\s*/g, "").slice(0, 200)}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px]" style={{ color: P.textDim }}>
            Source: {claim.source}
          </span>
          <span className="text-[10px]" style={{ color: P.textDim }}>
            κ {(claim.curvature * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function TrustScoreBar({
  grade,
  claims,
  iterations,
  converged,
  curvature,
  onSendFollowUp,
  userQuery,
  messageContent,
  isBookmarked,
  onToggleBookmark,
}: TrustScoreBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"chain" | "improve">("chain");

  const g = GRADE[grade];
  const isLow = grade === "C" || grade === "D";
  const isHighTrust = grade === "A" || grade === "B";
  const hasClaims = claims && claims.length > 0;
  const groundedCount = claims?.filter((c) => c.grade <= "B").length ?? 0;
  const totalClaims = claims?.length ?? 0;
  const improvementActions = getImprovementActions(grade, claims, userQuery);

  const handleAction = useCallback((prompt: string) => {
    onSendFollowUp?.(prompt);
  }, [onSendFollowUp]);

  return (
    <div className="mt-2" style={{ fontFamily: P.font }}>
      {/* ── Compact trust bar — always visible ──────────────────── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all duration-200 group"
        style={{
          background: isLow ? g.bg : "hsla(38, 15%, 30%, 0.06)",
          border: `1px solid ${isLow ? g.border : "hsla(38, 15%, 30%, 0.1)"}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isLow
            ? `${g.color}15`
            : "hsla(38, 15%, 30%, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isLow
            ? g.bg
            : "hsla(38, 15%, 30%, 0.06)";
        }}
      >
        {/* Trust icon */}
        {isLow ? (
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" style={{ color: g.color }} />
        ) : (
          <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: g.color }} />
        )}

        {/* Grade pill */}
        <span
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
          style={{ background: g.bg, color: g.color, border: `1px solid ${g.border}`, letterSpacing: "0.06em" }}
        >
          <span style={{ fontSize: "7px" }}>{g.icon}</span>
          {g.label}
        </span>

        {/* Summary text */}
        <span className="text-[11px] flex-1" style={{ color: P.textMuted }}>
          {hasClaims
            ? `${groundedCount}/${totalClaims} claims verified`
            : isLow ? "Ungraded response — tap to learn more" : "Trust score available"
          }
        </span>

        {/* Bookmark (Grade A/B only) */}
        {isHighTrust && onToggleBookmark && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleBookmark(); }}
            className="p-0.5 rounded transition-colors hover:bg-white/[0.06]"
            title={isBookmarked ? "Remove bookmark" : "Save this response"}
          >
            {isBookmarked
              ? <BookmarkCheck className="w-3.5 h-3.5" style={{ color: GRADE.A.color }} />
              : <Bookmark className="w-3.5 h-3.5" style={{ color: P.textDim }} />
            }
          </button>
        )}

        {/* Expand chevron */}
        {expanded
          ? <ChevronUp className="w-3 h-3 shrink-0" style={{ color: P.textDim }} />
          : <ChevronDown className="w-3 h-3 shrink-0" style={{ color: P.textDim }} />
        }
      </button>

      {/* ── Expanded panel ─────────────────────────────────────── */}
      {expanded && (
        <div
          className="mt-1.5 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200"
          style={{
            background: "hsla(25, 10%, 10%, 0.6)",
            border: `1px solid ${P.border}`,
          }}
        >
          {/* Tab switcher */}
          <div className="flex" style={{ borderBottom: `1px solid ${P.border}` }}>
            {([
              { id: "chain" as const, label: "Chain of thought", disabled: false },
              { id: "improve" as const, label: "Improve trust", disabled: false },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 py-2.5 text-[11px] font-medium tracking-wider uppercase transition-colors"
                style={{
                  color: activeTab === tab.id ? P.goldLight : P.textDim,
                  background: activeTab === tab.id ? "hsla(38, 30%, 40%, 0.08)" : "transparent",
                  borderBottom: activeTab === tab.id ? `2px solid ${P.goldLight}` : "2px solid transparent",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Chain of Thought Tab ─────────────────────────────── */}
          {activeTab === "chain" && (
            <div className="p-3 space-y-1 max-h-[300px] overflow-y-auto lumen-scroll">
              {hasClaims ? (
                <>
                  {/* Reasoning trace header */}
                  <div className="flex items-center gap-2 pb-2 mb-1" style={{ borderBottom: `1px solid ${P.border}` }}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GRADE.A.color }} />
                      <span className="text-[10px] tracking-wider uppercase font-medium" style={{ color: P.textDim }}>
                        Symbolic Decomposition
                      </span>
                    </div>
                    <span className="text-[10px] ml-auto" style={{ color: P.textDim }}>
                      {claims!.length} claims extracted
                    </span>
                  </div>

                  {/* Grade distribution bar */}
                  <div className="flex items-center gap-1 py-1.5">
                    {(["A", "B", "C", "D"] as const).map((gr) => {
                      const count = claims!.filter(c => c.grade === gr).length;
                      if (count === 0) return null;
                      const pct = (count / totalClaims) * 100;
                      const s = GRADE[gr];
                      return (
                        <div
                          key={gr}
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: s.color,
                            opacity: 0.7,
                            minWidth: "8px",
                          }}
                          title={`Grade ${gr}: ${count} claim${count > 1 ? "s" : ""} (${pct.toFixed(0)}%)`}
                        />
                      );
                    })}
                  </div>

                  {/* Claim rows */}
                  {claims!.map((claim, i) => (
                    <ClaimRow key={i} claim={claim} index={i} />
                  ))}

                  {/* Proof summary */}
                  <div className="flex items-center gap-3 pt-2 mt-2 text-[10px] flex-wrap" style={{ borderTop: `1px solid ${P.border}` }}>
                    <span className="flex items-center gap-1 px-2 py-1 rounded font-medium" style={{ background: g.bg, color: g.color }}>
                      <span style={{ fontSize: "7px" }}>{g.icon}</span>
                      Grade {grade}
                    </span>
                    {iterations !== undefined && (
                      <span style={{ color: P.textDim }}>{iterations} {iterations === 1 ? "pass" : "passes"}</span>
                    )}
                    {curvature !== undefined && (
                      <span style={{ color: P.textDim }}>κ {(curvature * 100).toFixed(0)}%</span>
                    )}
                    {converged !== undefined && (
                      <span style={{ color: converged ? GRADE.A.color : GRADE.C.color }}>
                        {converged ? "✓ converged" : "refining…"}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-6 text-center space-y-2">
                  <Shield className="w-8 h-8 mx-auto" style={{ color: P.textDim }} />
                  <p className="text-[12px]" style={{ color: P.textMuted }}>
                    This response was not processed through the reasoning engine.
                  </p>
                  <p className="text-[11px]" style={{ color: P.textDim }}>
                    Use the <strong style={{ color: P.goldLight }}>Improve trust</strong> tab to request verified sources or alternative viewpoints.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Improve Trust Tab ────────────────────────────────── */}
          {activeTab === "improve" && (
            <div className="p-3 space-y-2">
              <p className="text-[11px] px-1 mb-3" style={{ color: P.textMuted }}>
                Take action to raise the trust score of this response:
              </p>
              {improvementActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action.prompt)}
                    className="w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group"
                    style={{
                      background: "hsla(38, 15%, 30%, 0.05)",
                      border: `1px solid hsla(38, 15%, 30%, 0.08)`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "hsla(38, 30%, 40%, 0.1)";
                      e.currentTarget.style.borderColor = "hsla(38, 30%, 40%, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "hsla(38, 15%, 30%, 0.05)";
                      e.currentTarget.style.borderColor = "hsla(38, 15%, 30%, 0.08)";
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "hsla(38, 30%, 40%, 0.1)", border: `1px solid hsla(38, 30%, 40%, 0.12)` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: P.goldLight }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] font-medium block" style={{ color: P.text }}>
                        {action.label}
                      </span>
                      <span className="text-[11px] block mt-0.5" style={{ color: P.textDim }}>
                        {action.description}
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: P.goldLight }} />
                  </button>
                );
              })}

              {/* Grade scale */}
              <div className="flex items-center gap-2 pt-3 mt-1 flex-wrap" style={{ borderTop: `1px solid ${P.border}` }}>
                <span className="text-[10px] tracking-wider" style={{ color: P.textDim }}>TRUST SCALE</span>
                {(["A", "B", "C", "D"] as EpistemicGrade[]).map((g2) => {
                  const s = GRADE[g2];
                  const active = g2 === grade;
                  return (
                    <span
                      key={g2}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                      style={{
                        background: active ? s.bg : "transparent",
                        border: active ? `1px solid ${s.border}` : "1px solid transparent",
                        color: active ? s.color : P.textDim,
                        fontWeight: active ? 600 : 400,
                        opacity: active ? 1 : 0.5,
                      }}
                    >
                      <span style={{ fontSize: "7px" }}>{s.icon}</span>
                      {s.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
