/**
 * CodeProjection — Global canonical code editor for PoloGram
 * ═══════════════════════════════════════════════════════════
 *
 * A reusable, high-performance code input surface used wherever
 * code editing is needed across the hologram. Extracted from the
 * Quantum Jupyter Workspace to provide a single, consistent
 * projection for all code surfaces.
 *
 * Features:
 *   - Dual mode: standard textarea (default) + per-line PIP virtualization
 *   - Active line highlight with subtle luminance shift
 *   - Bracket auto-close + smart indent after `:`, `{`, `(`
 *   - Micro-feedback: brief flash on matched bracket
 *   - Keyboard-first: Ctrl+D duplicate line, Ctrl+/ toggle comment,
 *     Ctrl+Shift+K delete line, Alt+Up/Down move line
 *   - Zero-latency local state with 16ms flush to parent
 *   - GPU-composited layers (will-change, translate3d)
 *   - Syntax overlay in read/command mode
 *
 * @module hologram/kernel/components/CodeProjection
 */

import React, {
  useState, useCallback, useRef, useMemo,
  useEffect, useLayoutEffect, memo,
} from "react";
import { useNbTheme, type NbColors } from "../notebook/notebook-theme";

/* ── Constants ─────────────────────────────────────────────────── */

/** Fixed row height in px — shared between gutter, textarea, and highlight */
const ROW_H = 22;
const PIP_LINE_H = ROW_H;
const PIP_OVERSCAN = 8;
const FLUSH_MS = 16;

const BRACKET_PAIRS: Record<string, string> = {
  "(": ")", "[": "]", "{": "}", '"': '"', "'": "'", "`": "`",
};
const CLOSE_BRACKETS = new Set(Object.values(BRACKET_PAIRS));
const INDENT_TRIGGERS = new Set([":", "{", "("]);

/* ── Types ─────────────────────────────────────────────────────── */

export interface CodeProjectionProps {
  /** Current source text */
  value: string;
  /** Called when content changes */
  onChange: (value: string) => void;
  /** Unique ID for DOM queries */
  id?: string;
  /** Language hint for syntax highlighting */
  language?: "python" | "javascript" | "typescript" | "json" | "plain";
  /** Show line numbers (default true) */
  lineNumbers?: boolean;
  /** Enable PIP virtualization mode (default false) */
  precisionMode?: boolean;
  /** Read-only mode */
  readOnly?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Called on Shift+Enter or Ctrl+Enter */
  onRun?: () => void;
  /** Called when editor gains focus */
  onFocus?: () => void;
  /** Called on Escape */
  onBlur?: () => void;
  /** Called when cursor hits the top/bottom boundary and wants to leave the cell */
  onNavigate?: (direction: -1 | 1) => void;
  /** Max height before scrolling (default 600) */
  maxHeight?: number;
  /** Minimum rows visible (default 1) */
  minRows?: number;
  /** Custom syntax highlighter */
  highlighter?: (code: string, theme: NbColors) => { tokens: React.ReactNode[] }[];
  /** Show syntax overlay when not focused (default false) */
  syntaxOverlay?: boolean;
  /** External theme override */
  theme?: NbColors;
  /** Additional className on the root */
  className?: string;
}

/* ════════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════════ */

export const CodeProjection = memo(function CodeProjection({
  value,
  onChange,
  id = "code-projection",
  language = "python",
  lineNumbers = true,
  precisionMode = false,
  readOnly = false,
  placeholder,
  onRun,
  onFocus,
  onBlur,
  onNavigate,
  maxHeight = 600,
  minRows = 1,
  highlighter,
  syntaxOverlay = false,
  theme: themeProp,
  className,
}: CodeProjectionProps) {
  const ctxTheme = useNbTheme();
  const t = themeProp ?? ctxTheme;

  // ── Local state for zero-latency typing ──
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);
  const [activeLine, setActiveLine] = useState(0);
  const [bracketFlash, setBracketFlash] = useState<number | null>(null);
  const flushRef = useRef<ReturnType<typeof setTimeout>>();
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Sync parent → local
  useEffect(() => {
    if (value !== local) setLocal(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const flush = useCallback((v: string) => {
    if (flushRef.current) clearTimeout(flushRef.current);
    flushRef.current = setTimeout(() => onChange(v), FLUSH_MS);
  }, [onChange]);

  useEffect(() => () => { if (flushRef.current) clearTimeout(flushRef.current); }, []);

  // ── Auto-resize textarea ──
  const autoResize = useCallback(() => {
    const ta = taRef.current;
    if (ta) { ta.style.height = "0"; ta.style.height = `${ta.scrollHeight}px`; }
  }, []);

  useLayoutEffect(() => { autoResize(); }, [local, autoResize]);

  // ── Track active line from cursor ──
  const updateActiveLine = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const lines = ta.value.slice(0, pos).split("\n");
    setActiveLine(lines.length - 1);
  }, []);

  // ── Highlight computation ──
  const highlighted = useMemo(() => {
    if (!syntaxOverlay || !highlighter || focused) return [];
    return highlighter(local, t);
  }, [syntaxOverlay, highlighter, focused, local, t]);

  const showOverlay = syntaxOverlay && !focused && highlighted.length > 0;

  // ── Bracket flash effect ──
  useEffect(() => {
    if (bracketFlash !== null) {
      const timer = setTimeout(() => setBracketFlash(null), 200);
      return () => clearTimeout(timer);
    }
  }, [bracketFlash]);

  // ── Smart editing handlers ──
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    const val = e.target.value;
    setLocal(val);
    flush(val);
    requestAnimationFrame(autoResize);
    requestAnimationFrame(updateActiveLine);
  }, [readOnly, flush, autoResize, updateActiveLine]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = local;

    // Run: Shift+Enter / Ctrl+Enter
    if (e.key === "Enter" && (e.shiftKey || e.ctrlKey)) {
      e.preventDefault();
      if (flushRef.current) clearTimeout(flushRef.current);
      onChange(local);
      onRun?.();
      return;
    }

    // Escape
    if (e.key === "Escape") {
      e.preventDefault();
      ta.blur();
      onBlur?.();
      return;
    }

    // Tab / Shift+Tab
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        const lineStart = val.lastIndexOf("\n", start - 1) + 1;
        const sp = val.slice(lineStart, lineStart + 4).match(/^ {1,4}/)?.[0].length ?? 0;
        if (sp > 0) {
          const nv = val.slice(0, lineStart) + val.slice(lineStart + sp);
          setLocal(nv); flush(nv);
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start - sp; });
        }
      } else {
        const nv = val.slice(0, start) + "    " + val.slice(end);
        setLocal(nv); flush(nv);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 4; autoResize(); });
      }
      return;
    }

    // Bracket auto-close
    if (BRACKET_PAIRS[e.key] && start === end) {
      const closer = BRACKET_PAIRS[e.key];
      // Don't auto-close quotes if next char is alphanumeric
      if ((e.key === '"' || e.key === "'" || e.key === "`") && start < val.length && /\w/.test(val[start])) return;
      e.preventDefault();
      const nv = val.slice(0, start) + e.key + closer + val.slice(end);
      setLocal(nv); flush(nv);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 1; });
      return;
    }

    // Skip over closing bracket
    if (CLOSE_BRACKETS.has(e.key) && start === end && val[start] === e.key) {
      e.preventDefault();
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 1; });
      return;
    }

    // Smart indent after `:`, `{`, `(`
    if (e.key === "Enter" && start === end) {
      const lineStart = val.lastIndexOf("\n", start - 1) + 1;
      const currentLine = val.slice(lineStart, start);
      const indent = currentLine.match(/^(\s*)/)?.[1] ?? "";
      const lastChar = currentLine.trimEnd().slice(-1);
      if (INDENT_TRIGGERS.has(lastChar)) {
        e.preventDefault();
        const nv = val.slice(0, start) + "\n" + indent + "    " + val.slice(end);
        setLocal(nv); flush(nv);
        requestAnimationFrame(() => {
          const pos = start + 1 + indent.length + 4;
          ta.selectionStart = ta.selectionEnd = pos;
          autoResize();
        });
        return;
      }
      // Maintain indent level
      if (indent.length > 0) {
        e.preventDefault();
        const nv = val.slice(0, start) + "\n" + indent + val.slice(end);
        setLocal(nv); flush(nv);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 1 + indent.length;
          autoResize();
        });
        return;
      }
    }

    // Ctrl+D: Duplicate line
    if (e.key === "d" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      const lineStart = val.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = val.indexOf("\n", start);
      const line = val.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      const nv = val.slice(0, (lineEnd === -1 ? val.length : lineEnd)) + "\n" + line + val.slice(lineEnd === -1 ? val.length : lineEnd);
      setLocal(nv); flush(nv);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + line.length + 1; autoResize(); });
      return;
    }

    // Ctrl+/: Toggle comment
    if (e.key === "/" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const lineStart = val.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = val.indexOf("\n", start);
      const line = val.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      const commentPrefix = language === "python" ? "# " : "// ";
      let nv: string;
      let newPos: number;
      if (line.trimStart().startsWith(commentPrefix.trimEnd())) {
        const idx = line.indexOf(commentPrefix.trimEnd());
        const removeLen = line[idx + commentPrefix.trimEnd().length] === " " ? commentPrefix.length : commentPrefix.trimEnd().length;
        nv = val.slice(0, lineStart) + line.slice(0, idx) + line.slice(idx + removeLen) + val.slice(lineEnd === -1 ? val.length : lineEnd);
        newPos = Math.max(lineStart, start - removeLen);
      } else {
        const indent = line.match(/^(\s*)/)?.[1] ?? "";
        nv = val.slice(0, lineStart) + indent + commentPrefix + line.slice(indent.length) + val.slice(lineEnd === -1 ? val.length : lineEnd);
        newPos = start + commentPrefix.length;
      }
      setLocal(nv); flush(nv);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = newPos; });
      return;
    }

    // Ctrl+Shift+K: Delete line
    if (e.key === "K" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      const lineStart = val.lastIndexOf("\n", start - 1) + 1;
      let lineEnd = val.indexOf("\n", start);
      if (lineEnd === -1) lineEnd = val.length; else lineEnd += 1;
      const nv = val.slice(0, lineStart) + val.slice(lineEnd);
      setLocal(nv); flush(nv);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = lineStart; autoResize(); });
      return;
    }

    // Alt+Up: Move line up
    if (e.key === "ArrowUp" && e.altKey && !e.shiftKey) {
      e.preventDefault();
      const lines = val.split("\n");
      const lineIdx = val.slice(0, start).split("\n").length - 1;
      if (lineIdx <= 0) return;
      const colPos = start - val.lastIndexOf("\n", start - 1) - 1;
      [lines[lineIdx - 1], lines[lineIdx]] = [lines[lineIdx], lines[lineIdx - 1]];
      const nv = lines.join("\n");
      setLocal(nv); flush(nv);
      // Recalculate cursor position
      const newLineStart = lines.slice(0, lineIdx - 1).join("\n").length + (lineIdx > 1 ? 1 : 0);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = newLineStart + Math.min(colPos, lines[lineIdx - 1].length); });
      return;
    }

    // Alt+Down: Move line down
    if (e.key === "ArrowDown" && e.altKey && !e.shiftKey) {
      e.preventDefault();
      const lines = val.split("\n");
      const lineIdx = val.slice(0, start).split("\n").length - 1;
      if (lineIdx >= lines.length - 1) return;
      const colPos = start - val.lastIndexOf("\n", start - 1) - 1;
      [lines[lineIdx], lines[lineIdx + 1]] = [lines[lineIdx + 1], lines[lineIdx]];
      const nv = lines.join("\n");
      setLocal(nv); flush(nv);
      const newLineStart = lines.slice(0, lineIdx + 1).join("\n").length + 1;
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = newLineStart + Math.min(colPos, lines[lineIdx + 1].length); });
      return;
    }

    // ArrowUp at first line → navigate to previous cell
    if (e.key === "ArrowUp" && !e.altKey && !e.shiftKey && onNavigate) {
      const lineIdx = val.slice(0, start).split("\n").length - 1;
      if (lineIdx === 0) {
        e.preventDefault();
        onNavigate(-1);
        return;
      }
    }

    // ArrowDown at last line → navigate to next cell
    if (e.key === "ArrowDown" && !e.altKey && !e.shiftKey && onNavigate) {
      const allLines = val.split("\n");
      const lineIdx = val.slice(0, start).split("\n").length - 1;
      if (lineIdx === allLines.length - 1) {
        e.preventDefault();
        onNavigate(1);
        return;
      }
    }

    requestAnimationFrame(updateActiveLine);
  }, [readOnly, local, onChange, onRun, onBlur, onNavigate, flush, autoResize, updateActiveLine, language]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    onFocus?.();
    requestAnimationFrame(updateActiveLine);
  }, [onFocus, updateActiveLine]);

  const handleBlurInternal = useCallback(() => {
    setFocused(false);
    setActiveLine(0);
  }, []);

  const handleClick = useCallback(() => {
    requestAnimationFrame(updateActiveLine);
  }, [updateActiveLine]);

  const handleSelect = useCallback(() => {
    requestAnimationFrame(updateActiveLine);
  }, [updateActiveLine]);

  // ── Lines for gutter ──
  const lines = useMemo(() => local.split("\n"), [local]);
  const lineCount = lines.length;

  // ── Render ──
  if (precisionMode) {
    return (
      <PIPEditor
        source={local}
        onChange={(v) => { setLocal(v); flush(v); }}
        cellId={id}
        onRun={onRun}
        onFocus={onFocus}
        onNavigate={onNavigate}
        showLineNumbers={lineNumbers}
        maxHeight={maxHeight}
        readOnly={readOnly}
        t={t}
        className={className}
      />
    );
  }

  return (
    <div
      className={`relative flex rounded overflow-hidden ${className ?? ""}`}
      style={{
        border: `1px solid ${focused ? t.bgCellCodeBorderActive : t.bgCellCodeBorder}`,
        background: t.bgCellCode,
        transition: "border-color 120ms ease",
      }}
    >
      {/* Line numbers — fixed ROW_H per line for pixel-perfect alignment */}
      {lineNumbers && (
        <div
          className="select-none pr-2 text-right border-r shrink-0"
          style={{ minWidth: 40, background: t.bgHover, borderColor: t.border, paddingTop: 5, paddingBottom: 5 }}
        >
          {lines.map((_, i) => (
            <div
              key={i}
              className="text-[13px] font-mono px-1 flex items-center justify-end"
              style={{
                height: ROW_H,
                color: i === activeLine && focused ? t.gold : t.textDim,
                fontWeight: i === activeLine && focused ? 600 : 400,
                transition: "color 75ms",
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 relative">
        {/* Active line highlight */}
        {focused && (
          <div
            className="absolute left-0 right-0 pointer-events-none z-[1]"
            style={{
              transform: `translate3d(0, ${5 + activeLine * ROW_H}px, 0)`,
              top: 0,
              height: ROW_H,
              background: `hsla(38, 50%, 55%, 0.04)`,
              transition: "transform 50ms ease-out",
              willChange: "transform",
            }}
          />
        )}

        {/* Bracket flash indicator */}
        {bracketFlash !== null && (
          <div
            className="absolute left-0 right-0 pointer-events-none z-[2]"
            style={{
              top: 5 + bracketFlash * ROW_H,
              height: ROW_H,
              background: `hsla(38, 60%, 60%, 0.1)`,
              animation: "bracket-flash 200ms ease-out forwards",
            }}
          />
        )}

        {/* Syntax overlay */}
        {showOverlay && (
          <pre
            className="absolute inset-0 px-4 py-[5px] text-[13px] font-mono pointer-events-none overflow-hidden"
            aria-hidden="true"
            style={{
              color: t.textCode,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "break-word",
              tabSize: 4,
              fontVariantLigatures: "none",
              margin: 0,
              border: "none",
              background: "transparent",
              lineHeight: `${ROW_H}px`,
            }}
          >
            {highlighted.map((h, i) => (
              <div key={i} style={{ height: ROW_H }}>{h.tokens.length > 0 ? h.tokens : "\u00A0"}</div>
            ))}
          </pre>
        )}

        {/* Core textarea */}
        <textarea
          ref={taRef}
          data-cell-id={id}
          data-code-projection
          value={local}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlurInternal}
          onClick={handleClick}
          onSelect={handleSelect}
          readOnly={readOnly}
          className="w-full px-4 py-[5px] text-[13px] font-mono resize-none focus:outline-none bg-transparent relative z-10"
          style={{
            color: showOverlay ? "transparent" : t.textCode,
            caretColor: t.caret,
            lineHeight: `${ROW_H}px`,
            minHeight: Math.max(minRows, 1) * ROW_H + 10,
            maxHeight,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflowWrap: "break-word",
            tabSize: 4,
            fontVariantLigatures: "none",
          }}
          spellCheck={false}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
});

/* ════════════════════════════════════════════════════════════════
   PIP Editor — Per-line virtualized input
   ════════════════════════════════════════════════════════════════ */

function PIPEditor({
  source, onChange, cellId, onRun, onFocus, onNavigate, showLineNumbers, maxHeight, readOnly, t, className,
}: {
  source: string;
  onChange: (s: string) => void;
  cellId: string;
  onRun?: () => void;
  onFocus?: () => void;
  onNavigate?: (direction: -1 | 1) => void;
  showLineNumbers: boolean;
  maxHeight: number;
  readOnly: boolean;
  t: NbColors;
  className?: string;
}) {
  const lines = useMemo(() => source.split("\n"), [source]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(400);
  const [focusedLine, setFocusedLine] = useState<number | null>(null);
  // Cursor column memory: remembers the "desired" column when navigating up/down
  const desiredColRef = useRef<number | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => { for (const e of entries) setViewH(e.contentRect.height); });
    ro.observe(el);
    setViewH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const totalH = lines.length * PIP_LINE_H;
  const startIdx = Math.max(0, Math.floor(scrollTop / PIP_LINE_H) - PIP_OVERSCAN);
  const endIdx = Math.min(lines.length, Math.ceil((scrollTop + viewH) / PIP_LINE_H) + PIP_OVERSCAN);

  const handleLineChange = useCallback((idx: number, value: string) => {
    if (readOnly) return;
    const next = [...lines]; next[idx] = value; onChange(next.join("\n"));
    // Any horizontal edit resets desired column
    desiredColRef.current = null;
  }, [lines, onChange, readOnly]);

  const focusLine = useCallback((idx: number, pos?: number) => {
    // Scroll into view if needed
    const el = scrollRef.current;
    if (el) {
      const top = idx * PIP_LINE_H;
      const bottom = top + PIP_LINE_H;
      if (top < el.scrollTop) el.scrollTop = top;
      else if (bottom > el.scrollTop + el.clientHeight) el.scrollTop = bottom - el.clientHeight;
    }
    requestAnimationFrame(() => {
      const input = scrollRef.current?.querySelector(`[data-pip-line="${idx}"]`) as HTMLInputElement | null;
      if (input) { input.focus(); if (pos != null) input.selectionStart = input.selectionEnd = pos; }
    });
  }, []);

  const handleLineKeyDown = useCallback((idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const input = e.currentTarget;
    const cursorPos = input.selectionStart ?? 0;

    if (e.key === "Enter" && (e.shiftKey || e.ctrlKey)) { e.preventDefault(); onRun?.(); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const pos = input.selectionStart ?? input.value.length;
      const currentLine = input.value;
      const indent = currentLine.match(/^(\s*)/)?.[1] ?? "";
      const lastChar = currentLine.slice(0, pos).trimEnd().slice(-1);
      const extraIndent = INDENT_TRIGGERS.has(lastChar) ? "    " : "";
      const next = [...lines];
      next[idx] = currentLine.slice(0, pos);
      next.splice(idx + 1, 0, indent + extraIndent + currentLine.slice(pos));
      onChange(next.join("\n"));
      focusLine(idx + 1, indent.length + extraIndent.length);
      desiredColRef.current = null;
      return;
    }
    if (e.key === "Backspace" && input.selectionStart === 0 && input.selectionEnd === 0 && idx > 0) {
      e.preventDefault();
      const prevLen = lines[idx - 1].length;
      const next = [...lines]; next[idx - 1] += next[idx]; next.splice(idx, 1);
      onChange(next.join("\n"));
      focusLine(idx - 1, prevLen);
      desiredColRef.current = null;
      return;
    }
    if (e.key === "Delete" && input.selectionStart === input.value.length && idx < lines.length - 1) {
      e.preventDefault();
      const next = [...lines]; next[idx] += next[idx + 1]; next.splice(idx + 1, 1);
      onChange(next.join("\n"));
      desiredColRef.current = null;
      return;
    }

    // ArrowUp: move up within cell, or cross to previous cell
    if (e.key === "ArrowUp" && !e.altKey) {
      e.preventDefault();
      if (desiredColRef.current === null) desiredColRef.current = cursorPos;
      if (idx > 0) {
        focusLine(idx - 1, Math.min(desiredColRef.current, lines[idx - 1].length));
      } else if (onNavigate) {
        desiredColRef.current = null;
        onNavigate(-1);
      }
      return;
    }

    // ArrowDown: move down within cell, or cross to next cell
    if (e.key === "ArrowDown" && !e.altKey) {
      e.preventDefault();
      if (desiredColRef.current === null) desiredColRef.current = cursorPos;
      if (idx < lines.length - 1) {
        focusLine(idx + 1, Math.min(desiredColRef.current, lines[idx + 1].length));
      } else if (onNavigate) {
        desiredColRef.current = null;
        onNavigate(1);
      }
      return;
    }

    // Home: jump to start of line (Ctrl+Home: first line)
    if (e.key === "Home") {
      e.preventDefault();
      desiredColRef.current = null;
      if (e.ctrlKey || e.metaKey) { focusLine(0, 0); } else { input.selectionStart = input.selectionEnd = 0; }
      return;
    }

    // End: jump to end of line (Ctrl+End: last line)
    if (e.key === "End") {
      e.preventDefault();
      desiredColRef.current = null;
      if (e.ctrlKey || e.metaKey) { focusLine(lines.length - 1, lines[lines.length - 1].length); } else { input.selectionStart = input.selectionEnd = input.value.length; }
      return;
    }

    // PageUp / PageDown: jump ~visible page of lines
    if (e.key === "PageUp") {
      e.preventDefault();
      const pageLines = Math.max(1, Math.floor(viewH / PIP_LINE_H) - 2);
      const target = Math.max(0, idx - pageLines);
      if (desiredColRef.current === null) desiredColRef.current = cursorPos;
      focusLine(target, Math.min(desiredColRef.current, lines[target].length));
      return;
    }
    if (e.key === "PageDown") {
      e.preventDefault();
      const pageLines = Math.max(1, Math.floor(viewH / PIP_LINE_H) - 2);
      const target = Math.min(lines.length - 1, idx + pageLines);
      if (desiredColRef.current === null) desiredColRef.current = cursorPos;
      focusLine(target, Math.min(desiredColRef.current, lines[target].length));
      return;
    }

    // Tab / Shift+Tab
    if (e.key === "Tab") {
      e.preventDefault();
      const pos = input.selectionStart ?? 0;
      if (e.shiftKey) {
        const sp = input.value.match(/^ {1,4}/)?.[0].length ?? 0;
        if (sp > 0) { handleLineChange(idx, input.value.slice(sp)); requestAnimationFrame(() => { input.selectionStart = input.selectionEnd = Math.max(0, pos - sp); }); }
      } else {
        handleLineChange(idx, input.value.slice(0, pos) + "    " + input.value.slice(pos));
        requestAnimationFrame(() => { input.selectionStart = input.selectionEnd = pos + 4; });
      }
      return;
    }

    // Ctrl+D: Duplicate line
    if (e.key === "d" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      const next = [...lines];
      next.splice(idx + 1, 0, lines[idx]);
      onChange(next.join("\n"));
      focusLine(idx + 1, cursorPos);
      return;
    }

    // Ctrl+Shift+K: Delete line
    if (e.key === "K" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      if (lines.length <= 1) { onChange(""); focusLine(0, 0); return; }
      const next = [...lines]; next.splice(idx, 1);
      onChange(next.join("\n"));
      focusLine(Math.min(idx, next.length - 1), 0);
      return;
    }

    // Ctrl+/ : Toggle comment
    if (e.key === "/" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const line = lines[idx];
      const commentPrefix = "# ";
      if (line.trimStart().startsWith("#")) {
        const trimIdx = line.indexOf("#");
        const removeLen = line[trimIdx + 1] === " " ? 2 : 1;
        handleLineChange(idx, line.slice(0, trimIdx) + line.slice(trimIdx + removeLen));
      } else {
        const indent = line.match(/^(\s*)/)?.[1] ?? "";
        handleLineChange(idx, indent + commentPrefix + line.slice(indent.length));
      }
      return;
    }

    // Alt+Up: Move line up
    if (e.key === "ArrowUp" && e.altKey) {
      e.preventDefault();
      if (idx <= 0) return;
      const next = [...lines]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      onChange(next.join("\n"));
      focusLine(idx - 1, cursorPos);
      return;
    }

    // Alt+Down: Move line down
    if (e.key === "ArrowDown" && e.altKey) {
      e.preventDefault();
      if (idx >= lines.length - 1) return;
      const next = [...lines]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      onChange(next.join("\n"));
      focusLine(idx + 1, cursorPos);
      return;
    }

    if (e.key === "Escape") { e.preventDefault(); input.blur(); return; }

    // Any horizontal movement resets column memory
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      desiredColRef.current = null;
    }
  }, [lines, onChange, onRun, handleLineChange, focusLine, readOnly, onNavigate, viewH]);

  return (
    <div className={`relative flex rounded overflow-hidden ${className ?? ""}`}
      style={{ border: `1px solid ${t.bgCellCodeBorderActive}` }}>
      {showLineNumbers && (
        <div className="select-none pr-1 text-right border-r shrink-0"
          style={{ minWidth: 40, background: t.bgHover, borderColor: t.border }}>
          <div style={{ height: Math.min(totalH, maxHeight), overflow: "hidden", position: "relative" }}>
            {Array.from({ length: endIdx - startIdx }, (_, i) => {
              const li = startIdx + i;
              return (
                <div key={li} className="text-[12px] font-mono px-1 flex items-center justify-end"
                  style={{
                    position: "absolute",
                    transform: `translate3d(0, ${li * PIP_LINE_H - scrollTop}px, 0)`,
                    top: 0,
                    height: PIP_LINE_H,
                    color: li === focusedLine ? t.gold : t.textDim,
                    fontWeight: li === focusedLine ? 600 : 400,
                    transition: "color 60ms",
                  }}>
                  {li + 1}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden"
        onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        style={{
          maxHeight: Math.min(totalH + 4, maxHeight),
          background: t.bgCellCode,
          willChange: "scroll-position",
          contain: "layout style",
        }}>
        <div style={{ height: totalH, position: "relative", contain: "layout" }}>
          {Array.from({ length: endIdx - startIdx }, (_, i) => {
            const li = startIdx + i;
            const isFocused = li === focusedLine;
            return (
              <input key={li} data-pip-line={li} data-cell-id={cellId}
                value={lines[li] ?? ""} onChange={e => handleLineChange(li, e.target.value)}
                onKeyDown={e => handleLineKeyDown(li, e)}
                onFocus={() => { setFocusedLine(li); onFocus?.(); }}
                onBlur={() => setFocusedLine(null)}
                readOnly={readOnly} spellCheck={false}
                autoComplete="off" autoCorrect="off" autoCapitalize="off"
                className="absolute left-0 right-0 px-4 font-mono text-[13px] bg-transparent focus:outline-none"
                style={{
                  transform: `translate3d(0, ${li * PIP_LINE_H}px, 0)`,
                  top: 0, height: PIP_LINE_H, lineHeight: `${PIP_LINE_H}px`,
                  color: t.textCode, caretColor: t.caret, border: "none",
                  background: isFocused ? `hsla(38, 50%, 55%, 0.04)` : "transparent",
                  transition: "background 60ms",
                  willChange: isFocused ? "background-color" : "auto",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CodeProjection;
