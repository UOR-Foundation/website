/**
 * pretext-layout.ts — Wrapper around @chenglou/pretext for zero-DOM text layout.
 *
 * Provides height prediction, text balancing, and line-break utilities
 * that use canvas-based measurement instead of DOM reflow.
 */

import {
  prepare,
  prepareWithSegments,
  layout,
  layoutWithLines,
  walkLineRanges,
  type PreparedText,
  type PreparedTextWithSegments,
  type LayoutResult,
  type LayoutLinesResult,
} from "@chenglou/pretext";

/* ── Font constants matching lens CSS ────────────────────────────────── */

export const FONTS = {
  /** Magazine / Simple / Deep-Dive body */
  dmSansBody: "17px 'DM Sans', system-ui, sans-serif",
  /** Story body */
  georgiaBody: "18px Georgia, 'Times New Roman', serif",
  /** Magazine / Simple title */
  dmSansTitle: "800 32px 'DM Sans', system-ui, sans-serif",
  /** Story title */
  georgiaTitle: "400 36px Georgia, 'Times New Roman', serif",
  /** Deep-Dive title */
  dmSansTitleBold: "700 28px 'DM Sans', system-ui, sans-serif",
  /** Section headings (h2) */
  dmSansH2: "700 24px 'DM Sans', system-ui, sans-serif",
  /** Pull-quote */
  georgiaPullQuote: "italic 22px Georgia, 'Times New Roman', serif",
  /** OS: Desktop clock (largest) */
  osClock: "700 80px 'DM Sans', -apple-system, sans-serif",
  /** OS: Desktop clock (medium fallback) */
  osClockMd: "700 56px 'DM Sans', -apple-system, sans-serif",
  /** OS: Desktop clock (small fallback) */
  osClockSm: "700 40px 'DM Sans', -apple-system, sans-serif",
  /** OS: Greeting line */
  osGreeting: "500 24px 'DM Sans', -apple-system, sans-serif",
  /** OS: Greeting (small) */
  osGreetingSm: "500 18px 'DM Sans', -apple-system, sans-serif",
  /** OS: Tab bar labels */
  osTabLabel: "500 12px 'DM Sans', -apple-system, sans-serif",
  /** OS: Spotlight search text */
  osSpotlight: "500 15px 'DM Sans', -apple-system, sans-serif",
} as const;

/* ── Caching layer ───────────────────────────────────────────────────── */

const preparedCache = new Map<string, PreparedText>();
const segmentCache = new Map<string, PreparedTextWithSegments>();

function cacheKey(text: string, font: string): string {
  return `${font}|${text.length}|${text.slice(0, 80)}`;
}

function getPrepared(text: string, font: string): PreparedText {
  const key = cacheKey(text, font);
  let p = preparedCache.get(key);
  if (!p) {
    p = prepare(text, font);
    preparedCache.set(key, p);
    // Keep cache bounded
    if (preparedCache.size > 200) {
      const first = preparedCache.keys().next().value;
      if (first) preparedCache.delete(first);
    }
  }
  return p;
}

function getPreparedWithSegments(text: string, font: string): PreparedTextWithSegments {
  const key = cacheKey(text, font);
  let p = segmentCache.get(key);
  if (!p) {
    p = prepareWithSegments(text, font);
    segmentCache.set(key, p);
    if (segmentCache.size > 100) {
      const first = segmentCache.keys().next().value;
      if (first) segmentCache.delete(first);
    }
  }
  return p;
}

/* ── Public API ──────────────────────────────────────────────────────── */

/**
 * Predict the pixel height of text at a given container width.
 * Uses canvas measurement — no DOM needed. ~0.05ms per call.
 */
export function predictHeight(
  text: string,
  font: string,
  containerWidth: number,
  lineHeight: number
): number {
  if (!text.trim()) return 0;
  const prepared = getPrepared(text, font);
  const result: LayoutResult = layout(prepared, containerWidth, lineHeight);
  return result.height;
}

/**
 * Count lines text would occupy at a given font and width.
 */
export function measureLineCount(
  text: string,
  font: string,
  containerWidth: number,
  lineHeight: number
): number {
  if (!text.trim()) return 0;
  const prepared = getPrepared(text, font);
  const result: LayoutResult = layout(prepared, containerWidth, lineHeight);
  return result.lineCount;
}

/**
 * Get full line-break data: each line's text, width, and position.
 */
export function getLines(
  text: string,
  font: string,
  containerWidth: number,
  lineHeight: number
): LayoutLinesResult {
  const prepared = getPreparedWithSegments(text, font);
  return layoutWithLines(prepared, containerWidth, lineHeight);
}

/**
 * Balance text: find the narrowest container width that keeps
 * the same number of lines as the full width. Eliminates orphans
 * by distributing text more evenly across lines.
 *
 * Uses binary search — typically 8-12 layout() calls, ~0.5ms total.
 */
export function balanceWidth(
  text: string,
  font: string,
  maxWidth: number,
  lineHeight: number
): number {
  if (!text.trim()) return maxWidth;

  const prepared = getPrepared(text, font);
  const fullLayout = layout(prepared, maxWidth, lineHeight);
  const targetLines = fullLayout.lineCount;

  // Single line — no balancing needed
  if (targetLines <= 1) return maxWidth;

  // Binary search for the tightest width that still fits in targetLines
  let lo = maxWidth * 0.5;
  let hi = maxWidth;
  let best = maxWidth;

  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const trial = layout(prepared, mid, lineHeight);
    if (trial.lineCount <= targetLines) {
      best = mid;
      hi = mid;
    } else {
      lo = mid;
    }
  }

  // Add a small buffer (2%) for rendering safety
  return Math.ceil(best * 1.02);
}

/**
 * Strip markdown formatting for plain-text measurement.
 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")      // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")   // bold
    .replace(/\*(.+?)\*/g, "$1")       // italic
    .replace(/`(.+?)`/g, "$1")         // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/^>\s?/gm, "")            // blockquotes
    .replace(/^[-*+]\s/gm, "")         // list markers
    .replace(/^\d+\.\s/gm, "")         // ordered list markers
    .trim();
}

/**
 * Predict height of a markdown section (rough — strips formatting first).
 */
export function predictSectionHeight(
  markdown: string,
  font: string,
  containerWidth: number,
  lineHeight: number
): number {
  const plain = stripMarkdown(markdown);
  return predictHeight(plain, font, containerWidth, lineHeight);
}

/**
 * Smart truncation — find the longest text prefix that fits within
 * `maxLines` lines, truncating at a natural word boundary with "…".
 */
export function smartTruncate(
  text: string,
  font: string,
  containerWidth: number,
  lineHeight: number,
  maxLines: number
): string {
  if (!text.trim()) return text;
  const lines = measureLineCount(text, font, containerWidth, lineHeight);
  if (lines <= maxLines) return text;

  // Binary search for the longest prefix that fits
  const words = text.split(/\s+/);
  let lo = 1;
  let hi = words.length;
  let best = 1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = words.slice(0, mid).join(" ") + "…";
    const cl = measureLineCount(candidate, font, containerWidth, lineHeight);
    if (cl <= maxLines) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return words.slice(0, best).join(" ") + "…";
}

/**
 * Layout with an exclusion rectangle — computes per-line available widths
 * by subtracting the exclusion rect's horizontal intersection with each
 * line's vertical band. Returns line data for custom rendering.
 */
export interface ExclusionLine {
  text: string;
  indent: number;
  width: number;
  y: number;
}

export function layoutWithExclusion(
  text: string,
  font: string,
  containerWidth: number,
  lineHeight: number,
  exclusionRect: { x: number; y: number; w: number; h: number }
): ExclusionLine[] {
  if (!text.trim()) return [];

  // First, get the normal line layout to know text per line
  const linesResult = getLines(text, font, containerWidth, lineHeight);
  const result: ExclusionLine[] = [];

  linesResult.lines.forEach((line, i) => {
    const y = i * lineHeight;
    const lineTop = y;
    const lineBottom = y + lineHeight;
    const exTop = exclusionRect.y;
    const exBottom = exclusionRect.y + exclusionRect.h;

    let indent = 0;
    let availableWidth = containerWidth;

    // Check vertical overlap
    if (lineBottom > exTop && lineTop < exBottom) {
      const exLeft = exclusionRect.x;
      const exRight = exclusionRect.x + exclusionRect.w;

      if (exLeft <= 0) {
        indent = Math.min(exRight, containerWidth * 0.5);
        availableWidth = containerWidth - indent;
      } else if (exRight >= containerWidth) {
        availableWidth = Math.max(exLeft, containerWidth * 0.5);
      } else {
        const leftSpace = exLeft;
        const rightSpace = containerWidth - exRight;
        if (leftSpace >= rightSpace) {
          availableWidth = leftSpace;
        } else {
          indent = exRight;
          availableWidth = rightSpace;
        }
      }
    }

    result.push({
      text: line.text,
      indent,
      width: availableWidth,
      y,
    });
  });

  return result;
}

/**
 * Clear internal caches (e.g., on unmount or large navigation).
 */
export function clearLayoutCache() {
  preparedCache.clear();
  segmentCache.clear();
}
