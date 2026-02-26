/**
 * EpistemicBadge — Inline proof annotation for neuro-symbolic responses.
 *
 * By default, the response shows clean readable text. A toggle at the
 * bottom lets users reveal the full chain-of-thought with epistemic
 * grade badges and proof metadata.
 */

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { AnnotatedClaim, EpistemicGrade } from "@/modules/ring-core/neuro-symbolic";
import { ChevronDown, ChevronUp, Shield } from "lucide-react";

// ── Grade Styling (warm tones matching Hologram palette) ──────────────────

const GRADE_STYLES: Record<EpistemicGrade, { color: string; bg: string; label: string; icon: string }> = {
  A: {
    color: "hsl(160, 45%, 55%)",
    bg: "hsla(160, 45%, 55%, 0.1)",
    label: "Proven",
    icon: "◆",
  },
  B: {
    color: "hsl(200, 45%, 60%)",
    bg: "hsla(200, 45%, 60%, 0.1)",
    label: "Verified",
    icon: "◇",
  },
  C: {
    color: "hsl(38, 50%, 55%)",
    bg: "hsla(38, 50%, 55%, 0.1)",
    label: "Plausible",
    icon: "○",
  },
  D: {
    color: "hsl(30, 10%, 55%)",
    bg: "hsla(30, 10%, 55%, 0.08)",
    label: "Unverified",
    icon: "·",
  },
};

const P = {
  font: "'DM Sans', sans-serif",
  fontDisplay: "'Playfair Display', serif",
  text: "hsl(38, 20%, 85%)",
  textMuted: "hsl(30, 10%, 60%)",
  textDim: "hsl(30, 10%, 50%)",
  border: "hsla(38, 30%, 30%, 0.2)",
  goldLight: "hsl(38, 60%, 60%)",
} as const;

// ── Components ─────────────────────────────────────────────────────────────

function GradeBadge({ grade, onClick }: { grade: EpistemicGrade; onClick?: () => void }) {
  const style = GRADE_STYLES[grade];
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium cursor-pointer transition-all duration-200 hover:brightness-110"
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.color}22`,
        fontFamily: P.font,
        letterSpacing: "0.05em",
      }}
      title={`Grade ${grade}: ${style.label}`}
    >
      <span style={{ fontSize: "8px" }}>{style.icon}</span>
      {grade}
    </button>
  );
}

function ClaimTooltip({ claim, onClose }: { claim: AnnotatedClaim; onClose: () => void }) {
  const style = GRADE_STYLES[claim.grade];
  return (
    <div
      className="absolute z-50 bottom-full left-0 mb-2 w-72 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        background: "hsl(30, 8%, 16%)",
        border: `1px solid ${P.border}`,
        fontFamily: P.font,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ borderBottom: `1px solid ${P.border}` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: style.color }}>{style.icon}</span>
          <span className="text-xs font-medium" style={{ color: style.color }}>
            Grade {claim.grade} — {style.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs transition-colors hover:opacity-80"
          style={{ color: P.textDim }}
        >
          ✕
        </button>
      </div>
      <div className="px-3.5 py-2.5 space-y-1.5">
        <div className="text-[11px]" style={{ color: P.textMuted }}>
          <span style={{ color: P.text }}>Source:</span> {claim.source}
        </div>
        <div className="text-[11px]" style={{ color: P.textMuted }}>
          <span style={{ color: P.text }}>Curvature:</span> {(claim.curvature * 100).toFixed(1)}%
        </div>
        {claim.stepIndex !== null && (
          <div className="text-[11px]" style={{ color: P.textMuted }}>
            <span style={{ color: P.text }}>Proof step:</span> #{claim.stepIndex}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Annotated Claim ────────────────────────────────────────────────────────

export function AnnotatedClaimView({ claim, delay = 0 }: { claim: AnnotatedClaim; delay?: number }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span
      className="relative inline animate-in fade-in slide-in-from-bottom-1"
      style={{ animationDelay: `${delay}ms`, animationDuration: "500ms", animationFillMode: "both" }}
    >
      <ReactMarkdown
        components={{
          p: ({ children }) => <span>{children} </span>,
          strong: ({ children }) => (
            <strong style={{ color: P.text, fontWeight: 600 }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ color: P.goldLight, fontStyle: "italic" }}>{children}</em>
          ),
          code: ({ children }) => (
            <code
              style={{
                background: "hsla(38, 30%, 30%, 0.2)",
                padding: "1px 5px",
                borderRadius: "4px",
                fontSize: "0.9em",
                color: P.goldLight,
              }}
            >
              {children}
            </code>
          ),
          ul: ({ children }) => (
            <ul style={{ listStyle: "none", paddingLeft: "0.5em", margin: "0.3em 0" }}>{children}</ul>
          ),
          li: ({ children }) => (
            <li className="flex gap-1.5 items-start" style={{ color: P.textMuted }}>
              <span style={{ color: P.goldLight, fontSize: "8px", marginTop: "6px" }}>◆</span>
              <span>{children}</span>
            </li>
          ),
        }}
      >
        {claim.text}
      </ReactMarkdown>
      <GradeBadge grade={claim.grade} onClick={() => setShowTooltip(!showTooltip)} />
      {showTooltip && <ClaimTooltip claim={claim} onClose={() => setShowTooltip(false)} />}
      {" "}
    </span>
  );
}

// ── Plain Text View (no badges, clean reading) ───────────────────────────

function PlainClaimsView({ claims }: { claims: AnnotatedClaim[] }) {
  // Join all claim texts into a single readable block
  const fullText = claims.map((c) => c.text).join(" ");

  return (
    <div
      className="text-[15px] leading-[1.8]"
      style={{
        color: "hsl(30, 12%, 78%)",
        textRendering: "optimizeLegibility",
      }}
    >
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0" style={{ lineHeight: "1.8" }}>{children}</p>
          ),
          strong: ({ children }) => (
            <strong style={{ color: P.text, fontWeight: 600 }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ color: P.goldLight, fontStyle: "italic" }}>{children}</em>
          ),
          code: ({ children }) => (
            <code
              style={{
                background: "hsla(38, 30%, 30%, 0.2)",
                padding: "1px 5px",
                borderRadius: "4px",
                fontSize: "0.9em",
                color: P.goldLight,
              }}
            >
              {children}
            </code>
          ),
          ul: ({ children }) => (
            <ul style={{ listStyle: "none", paddingLeft: "0.5em", margin: "0.3em 0" }}>{children}</ul>
          ),
          li: ({ children }) => (
            <li className="flex gap-1.5 items-start" style={{ color: P.textMuted }}>
              <span style={{ color: P.goldLight, fontSize: "8px", marginTop: "6px" }}>◆</span>
              <span>{children}</span>
            </li>
          ),
        }}
      >
        {fullText}
      </ReactMarkdown>
    </div>
  );
}

// ── Annotated Response Renderer ───────────────────────────────────────────

interface AnnotatedResponseProps {
  claims: AnnotatedClaim[];
  overallGrade: EpistemicGrade;
  iterations: number;
  converged: boolean;
  curvature: number;
}

export default function AnnotatedResponse({
  claims,
  overallGrade: grade,
  iterations,
  converged,
  curvature,
}: AnnotatedResponseProps) {
  const [showChainOfThought, setShowChainOfThought] = useState(false);
  const style = GRADE_STYLES[grade];
  const groundedCount = claims.filter((c) => c.grade <= "B").length;

  return (
    <div className="space-y-3" style={{ fontFamily: P.font }}>
      {/* Response content — plain by default, annotated when toggled */}
      {showChainOfThought ? (
        <>
          <div
            className="text-[15px] leading-[1.8]"
            style={{
              color: "hsl(30, 12%, 78%)",
              textRendering: "optimizeLegibility",
            }}
          >
            {claims.map((claim, i) => (
              <AnnotatedClaimView key={i} claim={claim} delay={i * 80} />
            ))}
          </div>

          {/* Proof summary — minimal, warm, trustworthy */}
          <div
            className="flex items-center gap-4 text-[10px] tracking-wider pt-3"
            style={{
              borderTop: `1px solid ${P.border}`,
              fontFamily: P.font,
            }}
          >
            <span
              className="flex items-center gap-1.5 px-2 py-1 rounded-md font-medium"
              style={{
                background: style.bg,
                color: style.color,
                letterSpacing: "0.1em",
              }}
            >
              <span style={{ fontSize: "8px" }}>{style.icon}</span>
              Grade {grade}
            </span>
            <span style={{ color: P.textDim }}>
              {iterations} {iterations === 1 ? "pass" : "passes"}
            </span>
            <span style={{ color: P.textDim }}>
              κ {(curvature * 100).toFixed(0)}%
            </span>
            <span style={{ color: converged ? GRADE_STYLES.A.color : GRADE_STYLES.C.color }}>
              {converged ? "✓ converged" : "refining…"}
            </span>
            <span className="ml-auto" style={{ color: P.textDim }}>
              {groundedCount}/{claims.length} grounded
            </span>
          </div>
        </>
      ) : (
        <PlainClaimsView claims={claims} />
      )}

      {/* Toggle button — always visible at the bottom */}
      <button
        onClick={() => setShowChainOfThought((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-200 w-full justify-center group"
        style={{
          background: showChainOfThought
            ? "hsla(38, 30%, 40%, 0.12)"
            : "hsla(38, 15%, 30%, 0.08)",
          border: `1px solid ${showChainOfThought ? "hsla(38, 30%, 50%, 0.2)" : "hsla(38, 15%, 30%, 0.12)"}`,
          color: showChainOfThought ? P.goldLight : P.textMuted,
          fontFamily: P.font,
          letterSpacing: "0.03em",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "hsla(38, 30%, 40%, 0.15)";
          e.currentTarget.style.borderColor = "hsla(38, 30%, 50%, 0.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = showChainOfThought
            ? "hsla(38, 30%, 40%, 0.12)"
            : "hsla(38, 15%, 30%, 0.08)";
          e.currentTarget.style.borderColor = showChainOfThought
            ? "hsla(38, 30%, 50%, 0.2)"
            : "hsla(38, 15%, 30%, 0.12)";
        }}
      >
        <Shield
          className="w-3.5 h-3.5 transition-colors"
          style={{ color: showChainOfThought ? style.color : P.textDim }}
        />
        <span>
          {showChainOfThought ? "Hide" : "View"} chain of thought
        </span>
        <span
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
          style={{
            background: style.bg,
            color: style.color,
          }}
        >
          {style.icon} {grade}
        </span>
        <span style={{ color: P.textDim }}>
          · {groundedCount}/{claims.length} verified
        </span>
        {showChainOfThought ? (
          <ChevronUp className="w-3 h-3 ml-auto" style={{ color: P.textDim }} />
        ) : (
          <ChevronDown className="w-3 h-3 ml-auto" style={{ color: P.textDim }} />
        )}
      </button>
    </div>
  );
}
