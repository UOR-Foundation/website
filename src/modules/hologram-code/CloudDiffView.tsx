/**
 * CloudDiffView — Per-Cell Accept/Reject Diff Panel
 * ══════════════════════════════════════════════════
 *
 * Shows a per-file diff between local Q-FS and the cloud version,
 * letting developers cherry-pick individual changes.
 *
 * Each file change is a "cell" with:
 *   ✓ Accept  — apply this change from cloud
 *   ✗ Reject  — keep local version
 *
 * @module hologram-code/CloudDiffView
 */

import React, { useState, useMemo, useCallback, memo } from "react";
import {
  X, Check, Ban, FilePlus, FileX, FileCode, ChevronDown, ChevronRight,
  CheckCheck, XCircle, CloudDownload, ArrowLeft,
} from "lucide-react";
import type { FileDiff, FileDiffStatus } from "./useQFs";

// ── VS Code Dark+ tokens (reuse from HologramCode) ─────────────────────────
const C = {
  bg:           "#1e1e1e",
  sidebarBg:    "#252526",
  panelBg:      "#1e1e1e",
  text:         "#cccccc",
  textMuted:    "#858585",
  textDim:      "#6a6a6a",
  border:       "#3c3c3c",
  accent:       "#007acc",
  error:        "#f14c4c",
  success:      "#89d185",
  warning:      "#cca700",
  addedBg:      "rgba(35, 134, 54, 0.15)",
  addedGutter:  "rgba(35, 134, 54, 0.40)",
  deletedBg:    "rgba(248, 81, 73, 0.15)",
  deletedGutter:"rgba(248, 81, 73, 0.40)",
  modifiedBg:   "rgba(187, 128, 9, 0.12)",
  listHover:    "#2a2d2e",
  listActive:   "#37373d",
} as const;

interface CloudDiffViewProps {
  diffs: FileDiff[];
  onApply: (selected: FileDiff[]) => void;
  onCancel: () => void;
}

// ── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: FileDiffStatus }) {
  const config = {
    added:    { label: "Added",    color: C.success, icon: FilePlus },
    modified: { label: "Modified", color: C.warning, icon: FileCode },
    deleted:  { label: "Deleted",  color: C.error,   icon: FileX },
    unchanged:{ label: "Same",     color: C.textDim, icon: FileCode },
  }[status];
  const Icon = config.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{ color: config.color, background: `${config.color}18` }}
    >
      <Icon size={10} />
      {config.label}
    </span>
  );
}

// ── Inline line diff ────────────────────────────────────────────────────────

function LineDiff({ localContent, cloudContent }: { localContent: string | null; cloudContent: string | null }) {
  const localLines = (localContent ?? "").split("\n");
  const cloudLines = (cloudContent ?? "").split("\n");

  // Simple LCS-style diff: show changed lines with +/- markers
  // For brevity, show a unified view with deletions then additions for each diff hunk
  const maxLines = Math.max(localLines.length, cloudLines.length);
  const diffLines: { type: "same" | "add" | "del"; text: string }[] = [];

  // Simple approach: line-by-line comparison
  let li = 0, ci = 0;
  while (li < localLines.length || ci < cloudLines.length) {
    const l = li < localLines.length ? localLines[li] : undefined;
    const c = ci < cloudLines.length ? cloudLines[ci] : undefined;

    if (l === c) {
      diffLines.push({ type: "same", text: l ?? "" });
      li++; ci++;
    } else if (l !== undefined && (c === undefined || li < localLines.length)) {
      // Check if this local line appears nearby in cloud
      const lookahead = cloudLines.indexOf(l, ci);
      if (lookahead !== -1 && lookahead - ci < 5) {
        // Insert cloud additions until we reach the matching line
        while (ci < lookahead) {
          diffLines.push({ type: "add", text: cloudLines[ci] });
          ci++;
        }
        diffLines.push({ type: "same", text: l });
        li++; ci++;
      } else {
        diffLines.push({ type: "del", text: l });
        li++;
      }
    } else if (c !== undefined) {
      diffLines.push({ type: "add", text: c });
      ci++;
    } else {
      break;
    }
  }

  // Limit display to first 200 lines
  const truncated = diffLines.length > 200;
  const visible = truncated ? diffLines.slice(0, 200) : diffLines;

  return (
    <div
      className="font-mono text-[11px] leading-[18px] overflow-auto"
      style={{ maxHeight: 280, scrollbarWidth: "thin", scrollbarColor: `${C.textDim} transparent` }}
    >
      {visible.map((line, i) => (
        <div
          key={i}
          className="flex"
          style={{
            background: line.type === "add" ? C.addedBg : line.type === "del" ? C.deletedBg : "transparent",
          }}
        >
          <span
            className="w-5 shrink-0 text-center select-none"
            style={{
              color: line.type === "add" ? C.success : line.type === "del" ? C.error : C.textDim,
              background: line.type === "add" ? C.addedGutter : line.type === "del" ? C.deletedGutter : "transparent",
            }}
          >
            {line.type === "add" ? "+" : line.type === "del" ? "−" : " "}
          </span>
          <pre className="pl-2 whitespace-pre" style={{ color: C.text }}>
            {line.text}
          </pre>
        </div>
      ))}
      {truncated && (
        <div className="text-center py-1" style={{ color: C.textDim }}>
          … {diffLines.length - 200} more lines
        </div>
      )}
    </div>
  );
}

// ── Diff Cell (one per file) ────────────────────────────────────────────────

const DiffCell = memo(function DiffCell({
  diff,
  accepted,
  onToggle,
}: {
  diff: FileDiff;
  accepted: boolean | null; // null = undecided
  onToggle: (path: string, accept: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: `1px solid ${accepted === true ? C.success + "50" : accepted === false ? C.error + "30" : C.border}`,
        background: accepted === true ? `${C.success}08` : accepted === false ? `${C.error}06` : C.sidebarBg,
      }}
    >
      {/* Cell header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded
          ? <ChevronDown size={12} style={{ color: C.textMuted }} />
          : <ChevronRight size={12} style={{ color: C.textMuted }} />
        }
        <StatusBadge status={diff.status} />
        <span className="flex-1 text-xs font-mono truncate" style={{ color: C.text }}>
          {diff.path}
        </span>

        {/* Accept / Reject buttons */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(diff.path, true); }}
          className="flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-medium transition-all"
          style={{
            background: accepted === true ? C.success : "transparent",
            color: accepted === true ? "#1e1e1e" : C.success,
            border: `1px solid ${accepted === true ? C.success : C.success + "50"}`,
          }}
          title="Accept this change"
        >
          <Check size={10} />
          Accept
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(diff.path, false); }}
          className="flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-medium transition-all"
          style={{
            background: accepted === false ? C.error : "transparent",
            color: accepted === false ? "#1e1e1e" : C.error,
            border: `1px solid ${accepted === false ? C.error : C.error + "50"}`,
          }}
          title="Reject this change (keep local)"
        >
          <Ban size={10} />
          Reject
        </button>
      </div>

      {/* Expanded diff body */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          {diff.status === "added" ? (
            <LineDiff localContent={null} cloudContent={diff.cloudContent} />
          ) : diff.status === "deleted" ? (
            <LineDiff localContent={diff.localContent} cloudContent={null} />
          ) : (
            <LineDiff localContent={diff.localContent} cloudContent={diff.cloudContent} />
          )}
        </div>
      )}
    </div>
  );
});

// ── Main Component ──────────────────────────────────────────────────────────

export default function CloudDiffView({ diffs, onApply, onCancel }: CloudDiffViewProps) {
  // Track accept/reject per path: true = accept, false = reject, undefined = undecided
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});

  const handleToggle = useCallback((path: string, accept: boolean) => {
    setDecisions(prev => {
      // If already set to same value, toggle to undecided
      if (prev[path] === accept) {
        const next = { ...prev };
        delete next[path];
        return next;
      }
      return { ...prev, [path]: accept };
    });
  }, []);

  const acceptAll = useCallback(() => {
    const all: Record<string, boolean> = {};
    diffs.forEach(d => { all[d.path] = true; });
    setDecisions(all);
  }, [diffs]);

  const rejectAll = useCallback(() => {
    const all: Record<string, boolean> = {};
    diffs.forEach(d => { all[d.path] = false; });
    setDecisions(all);
  }, [diffs]);

  const acceptedDiffs = useMemo(
    () => diffs.filter(d => decisions[d.path] === true),
    [diffs, decisions],
  );

  const undecidedCount = diffs.filter(d => decisions[d.path] === undefined).length;

  const handleApply = useCallback(() => {
    if (acceptedDiffs.length > 0) {
      onApply(acceptedDiffs);
    } else {
      onCancel();
    }
  }, [acceptedDiffs, onApply, onCancel]);

  const counts = useMemo(() => ({
    added: diffs.filter(d => d.status === "added").length,
    modified: diffs.filter(d => d.status === "modified").length,
    deleted: diffs.filter(d => d.status === "deleted").length,
  }), [diffs]);

  return (
    <div className="absolute inset-0 flex flex-col z-50" style={{ background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${C.border}`, background: C.sidebarBg }}
      >
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
          style={{ color: C.textMuted }}
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <CloudDownload size={16} style={{ color: C.accent }} />
        <span className="text-sm font-semibold" style={{ color: C.text }}>
          Cloud Changes
        </span>
        <span className="text-xs" style={{ color: C.textMuted }}>
          {diffs.length} file{diffs.length !== 1 ? "s" : ""} changed
        </span>

        {/* Summary badges */}
        <div className="flex items-center gap-2 ml-2">
          {counts.added > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: C.success, background: `${C.success}18` }}>
              +{counts.added}
            </span>
          )}
          {counts.modified > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: C.warning, background: `${C.warning}18` }}>
              ~{counts.modified}
            </span>
          )}
          {counts.deleted > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: C.error, background: `${C.error}18` }}>
              −{counts.deleted}
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* Bulk actions */}
        <button
          onClick={acceptAll}
          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded transition-all hover:opacity-90"
          style={{ color: C.success, border: `1px solid ${C.success}40` }}
        >
          <CheckCheck size={12} />
          Accept All
        </button>
        <button
          onClick={rejectAll}
          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded transition-all hover:opacity-90"
          style={{ color: C.error, border: `1px solid ${C.error}40` }}
        >
          <XCircle size={12} />
          Reject All
        </button>
      </div>

      {/* ── Diff List ─────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
        style={{ scrollbarWidth: "thin", scrollbarColor: `${C.textDim} transparent` }}
      >
        {diffs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: C.textMuted }}>
            <Check size={32} />
            <span className="text-sm">Local and cloud are in sync — no differences found.</span>
          </div>
        ) : (
          diffs.map(diff => (
            <DiffCell
              key={diff.path}
              diff={diff}
              accepted={decisions[diff.path] ?? null}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderTop: `1px solid ${C.border}`, background: C.sidebarBg }}
      >
        <span className="text-[11px] flex-1" style={{ color: C.textMuted }}>
          {acceptedDiffs.length} accepted · {diffs.length - acceptedDiffs.length - undecidedCount} rejected · {undecidedCount} undecided
        </span>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 rounded text-xs font-medium transition-all hover:opacity-80"
          style={{ color: C.textMuted, border: `1px solid ${C.border}` }}
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-1.5 rounded text-xs font-medium transition-all hover:opacity-90"
          style={{
            background: acceptedDiffs.length > 0 ? C.accent : C.textDim,
            color: "#fff",
          }}
        >
          {acceptedDiffs.length > 0
            ? `Apply ${acceptedDiffs.length} Change${acceptedDiffs.length !== 1 ? "s" : ""}`
            : "Close"
          }
        </button>
      </div>
    </div>
  );
}
