/**
 * TrustTrendBar — Compact conversation-level trust trend visualization.
 *
 * Shows a horizontal sequence of grade dots for each assistant message,
 * revealing how trust evolves across follow-ups. Collapses to a single
 * line when there are fewer than 2 graded messages.
 */

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import type { EpistemicGrade } from "@/modules/ring-core/neuro-symbolic";

const GRADE = {
  A: { color: "hsl(160, 45%, 55%)", bg: "hsla(160, 45%, 55%, 0.15)", label: "Proven", score: 4 },
  B: { color: "hsl(200, 45%, 60%)", bg: "hsla(200, 45%, 60%, 0.15)", label: "Verified", score: 3 },
  C: { color: "hsl(38, 50%, 55%)",  bg: "hsla(38, 50%, 55%, 0.15)",  label: "Plausible", score: 2 },
  D: { color: "hsl(15, 50%, 55%)",  bg: "hsla(15, 50%, 55%, 0.1)",   label: "Unverified", score: 1 },
} as const;

const P = {
  font: "'DM Sans', sans-serif",
  text: "hsl(38, 20%, 85%)",
  textMuted: "hsl(30, 10%, 60%)",
  textDim: "hsl(30, 10%, 50%)",
  border: "hsla(38, 30%, 30%, 0.15)",
  goldLight: "hsl(38, 60%, 60%)",
};

interface GradePoint {
  index: number;
  grade: EpistemicGrade;
  messageId: string;
}

interface TrustTrendBarProps {
  /** All messages in the conversation (we extract assistant grades) */
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    meta?: {
      neuroSymbolic?: {
        overallGrade: EpistemicGrade;
        curvature: number;
        converged: boolean;
        iterations: number;
      };
    };
  }>;
}

export default function TrustTrendBar({ messages }: TrustTrendBarProps) {
  const [expanded, setExpanded] = useState(false);

  const points: GradePoint[] = useMemo(() => {
    const pts: GradePoint[] = [];
    let idx = 0;
    for (const m of messages) {
      if (m.role === "assistant" && m.content) {
        const grade = m.meta?.neuroSymbolic?.overallGrade ?? "D";
        pts.push({ index: idx, grade, messageId: m.id });
        idx++;
      }
    }
    return pts;
  }, [messages]);

  // Need at least 2 graded responses to show a trend
  if (points.length < 2) return null;

  const scores = points.map((p) => GRADE[p.grade].score);
  const latest = scores[scores.length - 1];
  const first = scores[0];
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const trend = latest > first ? "up" : latest < first ? "down" : "flat";
  const latestGrade = points[points.length - 1].grade;
  const g = GRADE[latestGrade];

  // Bar height for each score (1-4 mapped to 4px-16px)
  const maxH = 16;
  const minH = 4;

  return (
    <div
      className="mx-5 mb-3 rounded-xl overflow-hidden animate-in fade-in duration-300"
      style={{
        background: "hsla(25, 10%, 10%, 0.5)",
        border: `1px solid ${P.border}`,
        fontFamily: P.font,
      }}
    >
      {/* Summary row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
      >
        {/* Trend icon */}
        {trend === "up" ? (
          <TrendingUp className="w-3.5 h-3.5 shrink-0" style={{ color: GRADE.A.color }} />
        ) : trend === "down" ? (
          <TrendingDown className="w-3.5 h-3.5 shrink-0" style={{ color: GRADE.D.color }} />
        ) : (
          <Minus className="w-3.5 h-3.5 shrink-0" style={{ color: P.textDim }} />
        )}

        {/* Mini sparkline */}
        <div className="flex items-end gap-[3px] h-4">
          {points.map((pt, i) => {
            const s = GRADE[pt.grade];
            const h = minH + ((s.score - 1) / 3) * (maxH - minH);
            return (
              <div
                key={i}
                className="rounded-sm transition-all duration-300"
                style={{
                  width: "4px",
                  height: `${h}px`,
                  background: s.color,
                  opacity: i === points.length - 1 ? 1 : 0.5,
                }}
              />
            );
          })}
        </div>

        {/* Text summary */}
        <span className="text-[11px] flex-1" style={{ color: P.textMuted }}>
          {trend === "up"
            ? "Trust improving"
            : trend === "down"
              ? "Trust declining"
              : "Trust stable"
          }
          {" · "}
          <span style={{ color: g.color }}>{g.label}</span>
          {" · "}
          {points.length} responses
        </span>

        {/* Average score */}
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{ background: g.bg, color: g.color, letterSpacing: "0.05em" }}
        >
          avg {avg.toFixed(1)}
        </span>

        {expanded
          ? <ChevronUp className="w-3 h-3 shrink-0" style={{ color: P.textDim }} />
          : <ChevronDown className="w-3 h-3 shrink-0" style={{ color: P.textDim }} />
        }
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="px-3.5 pb-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200"
          style={{ borderTop: `1px solid ${P.border}` }}
        >
          {/* Visual timeline */}
          <div className="flex items-center gap-1 pt-3 overflow-x-auto">
            {points.map((pt, i) => {
              const s = GRADE[pt.grade];
              const isLast = i === points.length - 1;
              const improved = i > 0 && GRADE[pt.grade].score > GRADE[points[i - 1].grade].score;
              const declined = i > 0 && GRADE[pt.grade].score < GRADE[points[i - 1].grade].score;

              return (
                <div key={i} className="flex items-center gap-1">
                  {/* Connector line */}
                  {i > 0 && (
                    <div
                      className="w-4 h-[1px]"
                      style={{
                        background: improved
                          ? GRADE.A.color
                          : declined
                            ? GRADE.D.color
                            : P.border,
                      }}
                    />
                  )}
                  {/* Grade node */}
                  <div
                    className="flex flex-col items-center gap-1"
                    title={`Response ${i + 1}: Grade ${pt.grade} (${s.label})`}
                  >
                    <div
                      className="flex items-center justify-center rounded-full text-[9px] font-bold transition-all"
                      style={{
                        width: isLast ? "24px" : "20px",
                        height: isLast ? "24px" : "20px",
                        background: s.bg,
                        color: s.color,
                        border: `1.5px solid ${s.color}`,
                        opacity: isLast ? 1 : 0.7,
                      }}
                    >
                      {pt.grade}
                    </div>
                    <span
                      className="text-[8px]"
                      style={{ color: isLast ? s.color : P.textDim }}
                    >
                      #{i + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats row */}
          <div
            className="flex items-center gap-4 pt-2 text-[10px] flex-wrap"
            style={{ borderTop: `1px solid ${P.border}` }}
          >
            <span style={{ color: P.textDim }}>
              Start: <span style={{ color: GRADE[points[0].grade].color }}>{points[0].grade}</span>
            </span>
            <span style={{ color: P.textDim }}>
              Current: <span style={{ color: g.color, fontWeight: 600 }}>{latestGrade}</span>
            </span>
            <span style={{ color: P.textDim }}>
              Best: <span style={{ color: GRADE[points.reduce((best, p) => GRADE[p.grade].score > GRADE[best.grade].score ? p : best).grade].color }}>
                {points.reduce((best, p) => GRADE[p.grade].score > GRADE[best.grade].score ? p : best).grade}
              </span>
            </span>
            <span
              className="ml-auto"
              style={{
                color: trend === "up" ? GRADE.A.color : trend === "down" ? GRADE.D.color : P.textDim,
              }}
            >
              {trend === "up"
                ? `↑ +${latest - first} since start`
                : trend === "down"
                  ? `↓ ${latest - first} since start`
                  : "→ unchanged"
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
