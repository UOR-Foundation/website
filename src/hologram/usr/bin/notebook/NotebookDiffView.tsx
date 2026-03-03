/**
 * NotebookDiffView — Visual side-by-side diff for notebook cells
 * ══════════════════════════════════════════════════════════════
 *
 * Shows a clear, line-level diff between local and remote notebook versions.
 * Developers can review every change before accepting or rejecting.
 */

import React, { useMemo, useState } from "react";
import type { NotebookDocument, NotebookCell } from "./notebook-engine";
import { useNbTheme } from "./notebook-theme";
import {
  X, Check, ArrowLeft, ChevronDown, ChevronRight,
  FileText, Plus, Minus, Edit3, Equal,
} from "../../../platform/bridge";

// ── Diff algorithm (line-level LCS) ────────────────────────────────────────

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNum?: number;
  remoteLineNum?: number;
}

function diffLines(localLines: string[], remoteLines: string[]): DiffLine[] {
  const m = localLines.length;
  const n = remoteLines.length;

  // LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = localLines[i - 1] === remoteLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to produce diff
  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && localLines[i - 1] === remoteLines[j - 1]) {
      result.unshift({ type: "unchanged", content: localLines[i - 1], lineNum: i, remoteLineNum: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", content: remoteLines[j - 1], remoteLineNum: j });
      j--;
    } else {
      result.unshift({ type: "removed", content: localLines[i - 1], lineNum: i });
      i--;
    }
  }
  return result;
}

// ── Cell diff status ───────────────────────────────────────────────────────

type CellDiffStatus = "unchanged" | "modified" | "added" | "removed";

interface CellDiff {
  status: CellDiffStatus;
  localCell?: NotebookCell;
  remoteCell?: NotebookCell;
  lines: DiffLine[];
}

function computeCellDiffs(local: NotebookDocument, remote: NotebookDocument): CellDiff[] {
  const diffs: CellDiff[] = [];
  const maxLen = Math.max(local.cells.length, remote.cells.length);

  // Simple positional comparison (matches Jupyter behavior)
  for (let i = 0; i < maxLen; i++) {
    const lc = local.cells[i];
    const rc = remote.cells[i];

    if (!lc && rc) {
      diffs.push({
        status: "added",
        remoteCell: rc,
        lines: rc.source.split("\n").map((l, li) => ({ type: "added" as const, content: l, remoteLineNum: li + 1 })),
      });
    } else if (lc && !rc) {
      diffs.push({
        status: "removed",
        localCell: lc,
        lines: lc.source.split("\n").map((l, li) => ({ type: "removed" as const, content: l, lineNum: li + 1 })),
      });
    } else if (lc && rc) {
      if (lc.source === rc.source && lc.type === rc.type) {
        diffs.push({
          status: "unchanged",
          localCell: lc,
          remoteCell: rc,
          lines: lc.source.split("\n").map((l, li) => ({ type: "unchanged" as const, content: l, lineNum: li + 1, remoteLineNum: li + 1 })),
        });
      } else {
        diffs.push({
          status: "modified",
          localCell: lc,
          remoteCell: rc,
          lines: diffLines(lc.source.split("\n"), rc.source.split("\n")),
        });
      }
    }
  }
  return diffs;
}

// ── Component ──────────────────────────────────────────────────────────────

interface NotebookDiffViewProps {
  localNotebook: NotebookDocument;
  remoteNotebook: NotebookDocument;
  onAccept: (remote: NotebookDocument) => void;
  onReject: () => void;
}

export function NotebookDiffView({ localNotebook, remoteNotebook, onAccept, onReject }: NotebookDiffViewProps) {
  const t = useNbTheme();
  const cellDiffs = useMemo(() => computeCellDiffs(localNotebook, remoteNotebook), [localNotebook, remoteNotebook]);
  const [collapsedCells, setCollapsedCells] = useState<Set<number>>(() => {
    // Auto-collapse unchanged cells
    const s = new Set<number>();
    cellDiffs.forEach((d, i) => { if (d.status === "unchanged") s.add(i); });
    return s;
  });

  const stats = useMemo(() => {
    let added = 0, removed = 0, modified = 0, unchanged = 0;
    for (const d of cellDiffs) {
      if (d.status === "added") added++;
      else if (d.status === "removed") removed++;
      else if (d.status === "modified") modified++;
      else unchanged++;
    }
    return { added, removed, modified, unchanged, total: cellDiffs.length };
  }, [cellDiffs]);

  const toggleCollapse = (i: number) => {
    setCollapsedCells(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const statusIcon = (s: CellDiffStatus) => {
    switch (s) {
      case "added": return <Plus size={14} />;
      case "removed": return <Minus size={14} />;
      case "modified": return <Edit3 size={14} />;
      default: return <Equal size={14} />;
    }
  };

  const statusColor = (s: CellDiffStatus) => {
    switch (s) {
      case "added": return t.green;
      case "removed": return "hsl(0, 70%, 60%)";
      case "modified": return t.gold;
      default: return t.textDim;
    }
  };

  const statusLabel = (s: CellDiffStatus) => {
    switch (s) {
      case "added": return "New cell";
      case "removed": return "Deleted cell";
      case "modified": return "Modified";
      default: return "Unchanged";
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: t.bgSoft, color: t.text }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3 shrink-0"
        style={{ background: t.bgToolbar, borderBottom: `1px solid ${t.border}` }}
      >
        <button onClick={onReject} className="p-1.5 rounded-md hover:opacity-80 transition-opacity" style={{ color: t.textMuted }}>
          <ArrowLeft size={18} />
        </button>
        <FileText size={18} style={{ color: t.blue }} />
        <span className="font-semibold text-sm" style={{ color: t.textStrong }}>
          Review Changes — {remoteNotebook.name}
        </span>
        <div className="flex-1" />

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs font-mono mr-4">
          {stats.added > 0 && (
            <span className="flex items-center gap-1" style={{ color: t.green }}>
              <Plus size={12} /> {stats.added} added
            </span>
          )}
          {stats.removed > 0 && (
            <span className="flex items-center gap-1" style={{ color: "hsl(0, 70%, 60%)" }}>
              <Minus size={12} /> {stats.removed} removed
            </span>
          )}
          {stats.modified > 0 && (
            <span className="flex items-center gap-1" style={{ color: t.gold }}>
              <Edit3 size={12} /> {stats.modified} modified
            </span>
          )}
          <span style={{ color: t.textDim }}>{stats.unchanged} unchanged</span>
        </div>

        {/* Actions */}
        <button
          onClick={onReject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ color: "hsl(0, 70%, 60%)", border: `1px solid hsl(0, 70%, 60%, 0.3)` }}
        >
          <X size={14} /> Reject
        </button>
        <button
          onClick={() => onAccept(remoteNotebook)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ background: t.green, color: "#fff" }}
        >
          <Check size={14} /> Accept All
        </button>
      </div>

      {/* Diff body */}
      <div className="flex-1 overflow-y-auto py-4 px-6">
        <div className="max-w-4xl mx-auto space-y-3">
          {cellDiffs.map((diff, idx) => {
            const collapsed = collapsedCells.has(idx);
            const cellLabel = (diff.localCell || diff.remoteCell)?.type === "markdown" ? "Markdown" : "Code";
            const cellIdx = idx + 1;

            return (
              <div
                key={idx}
                className="rounded-lg overflow-hidden transition-shadow"
                style={{
                  border: `1px solid ${diff.status === "unchanged" ? t.border : statusColor(diff.status) + "44"}`,
                  background: t.bg,
                }}
              >
                {/* Cell header */}
                <button
                  onClick={() => toggleCollapse(idx)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left transition-colors"
                  style={{ background: diff.status === "unchanged" ? "transparent" : statusColor(diff.status) + "0a" }}
                >
                  {collapsed ? <ChevronRight size={14} style={{ color: t.textDim }} /> : <ChevronDown size={14} style={{ color: t.textDim }} />}
                  <span style={{ color: statusColor(diff.status) }}>{statusIcon(diff.status)}</span>
                  <span className="text-xs font-mono" style={{ color: t.textDim }}>
                    Cell [{cellIdx}]
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ background: statusColor(diff.status) + "18", color: statusColor(diff.status) }}
                  >
                    {statusLabel(diff.status)}
                  </span>
                  <span className="text-xs" style={{ color: t.textDim }}>{cellLabel}</span>
                  {diff.status === "modified" && (
                    <span className="text-xs ml-auto font-mono" style={{ color: t.textDim }}>
                      {diff.lines.filter(l => l.type === "added").length} additions, {diff.lines.filter(l => l.type === "removed").length} deletions
                    </span>
                  )}
                </button>

                {/* Cell diff lines */}
                {!collapsed && (
                  <div
                    className="overflow-x-auto font-mono text-[13px] leading-[22px]"
                    style={{ borderTop: `1px solid ${t.border}` }}
                  >
                    {diff.lines.map((line, li) => (
                      <div
                        key={li}
                        className="flex"
                        style={{
                          background:
                            line.type === "added"
                              ? "hsla(130, 50%, 50%, 0.08)"
                              : line.type === "removed"
                                ? "hsla(0, 50%, 50%, 0.08)"
                                : "transparent",
                        }}
                      >
                        {/* Line numbers */}
                        <span
                          className="shrink-0 w-10 text-right pr-2 select-none"
                          style={{ color: t.textDim, opacity: 0.6 }}
                        >
                          {line.type !== "added" ? line.lineNum ?? "" : ""}
                        </span>
                        <span
                          className="shrink-0 w-10 text-right pr-2 select-none"
                          style={{ color: t.textDim, opacity: 0.6 }}
                        >
                          {line.type !== "removed" ? line.remoteLineNum ?? "" : ""}
                        </span>

                        {/* Indicator */}
                        <span
                          className="shrink-0 w-6 text-center select-none font-bold"
                          style={{
                            color:
                              line.type === "added"
                                ? t.green
                                : line.type === "removed"
                                  ? "hsl(0, 70%, 60%)"
                                  : "transparent",
                          }}
                        >
                          {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
                        </span>

                        {/* Content */}
                        <span className="flex-1 pr-4 whitespace-pre" style={{ color: t.text }}>
                          {line.content || " "}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer summary */}
        <div className="max-w-4xl mx-auto mt-6 text-center">
          <p className="text-xs" style={{ color: t.textDim }}>
            {stats.total} cells compared · {stats.added + stats.removed + stats.modified} changes detected
          </p>
        </div>
      </div>
    </div>
  );
}
