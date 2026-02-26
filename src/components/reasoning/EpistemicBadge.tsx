/**
 * EpistemicBadge — Inline proof annotation for neuro-symbolic responses.
 *
 * Renders a small colored badge next to each claim showing:
 *   A — Algebraically proven (emerald)
 *   B — Constraint-consistent (sky)
 *   C — Plausible (amber)
 *   D — LLM-generated (muted)
 *
 * Hovering reveals the source justification and proof step.
 */

import { useState } from "react";
import type { AnnotatedClaim, EpistemicGrade } from "@/modules/ring-core/neuro-symbolic";

// ── Grade Styling ──────────────────────────────────────────────────────────

const GRADE_STYLES: Record<EpistemicGrade, { bg: string; text: string; label: string; border: string }> = {
  A: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    label: "Proven",
  },
  B: {
    bg: "bg-sky-500/15",
    text: "text-sky-400",
    border: "border-sky-500/30",
    label: "Verified",
  },
  C: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
    label: "Plausible",
  },
  D: {
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    border: "border-border",
    label: "Unverified",
  },
};

// ── Components ─────────────────────────────────────────────────────────────

function GradeBadge({ grade, onClick }: { grade: EpistemicGrade; onClick?: () => void }) {
  const style = GRADE_STYLES[grade];
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-0.5 px-1 py-0 rounded text-[10px] font-mono font-semibold border cursor-pointer transition-opacity hover:opacity-80 ${style.bg} ${style.text} ${style.border}`}
      title={`Grade ${grade}: ${style.label}`}
    >
      {grade}
    </button>
  );
}

function ClaimTooltip({ claim, onClose }: { claim: AnnotatedClaim; onClose: () => void }) {
  const style = GRADE_STYLES[claim.grade];
  return (
    <div
      className="absolute z-50 bottom-full left-0 mb-1 w-64 rounded-lg border border-border bg-card shadow-lg p-2.5 text-xs animate-in fade-in slide-in-from-bottom-1 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`font-semibold ${style.text}`}>
          Grade {claim.grade} — {style.label}
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <div className="space-y-1 text-muted-foreground">
        <div><span className="text-foreground/70">Source:</span> {claim.source}</div>
        <div><span className="text-foreground/70">Curvature:</span> {(claim.curvature * 100).toFixed(1)}%</div>
        {claim.stepIndex !== null && (
          <div><span className="text-foreground/70">Proof step:</span> #{claim.stepIndex}</div>
        )}
      </div>
    </div>
  );
}

// ── Main: Annotated Claim ─────────────────────────────────────────────────

export function AnnotatedClaimView({ claim }: { claim: AnnotatedClaim }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span className="relative inline">
      {claim.text}{" "}
      <GradeBadge grade={claim.grade} onClick={() => setShowTooltip(!showTooltip)} />
      {showTooltip && <ClaimTooltip claim={claim} onClose={() => setShowTooltip(false)} />}
      {" "}
    </span>
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
  const style = GRADE_STYLES[grade];

  return (
    <div className="space-y-2">
      {/* Claim text with inline badges */}
      <div className="leading-relaxed">
        {claims.map((claim, i) => (
          <AnnotatedClaimView key={i} claim={claim} />
        ))}
      </div>

      {/* Proof summary bar */}
      <div className={`flex items-center gap-3 text-[10px] font-mono border-t border-border pt-1.5 mt-2 ${style.text}`}>
        <span className={`px-1.5 py-0.5 rounded ${style.bg} ${style.border} border font-semibold`}>
          Grade {grade}
        </span>
        <span className="text-muted-foreground">
          {iterations} iteration{iterations > 1 ? "s" : ""}
        </span>
        <span className="text-muted-foreground">
          κ = {(curvature * 100).toFixed(1)}%
        </span>
        <span className={converged ? "text-emerald-400" : "text-amber-400"}>
          {converged ? "✓ converged" : "⚠ partial"}
        </span>
        <span className="text-muted-foreground">
          {claims.filter(c => c.grade <= "B").length}/{claims.length} grounded
        </span>
      </div>
    </div>
  );
}
