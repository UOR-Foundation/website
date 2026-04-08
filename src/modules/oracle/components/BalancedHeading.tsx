/**
 * BalancedHeading — Orphan-free titles using Pretext canvas measurement.
 *
 * Computes the tightest container width that keeps the same line count,
 * so text distributes evenly and avoids single-word orphan lines.
 * Recomputes on resize via ResizeObserver (layout() is <0.1ms).
 *
 * Adaptive font scaling: when `fontSizes` is provided, picks the largest
 * font size that keeps the line count ≤ `maxLines` for the current width.
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { balanceWidth, measureLineCount } from "../lib/pretext-layout";

interface BalancedHeadingProps {
  /** The heading text (plain string) */
  children: string;
  /** CSS font shorthand matching the heading's rendered font */
  font: string;
  /** Line-height in px */
  lineHeight: number;
  /** HTML tag to render */
  as?: "h1" | "h2" | "h3";
  /** Additional className */
  className?: string;
  /** Inline styles (applied to the heading element) */
  style?: React.CSSProperties;
  /** Center the balanced container */
  center?: boolean;
  /**
   * Optional array of font CSS shorthands from largest to smallest.
   * The component picks the largest that fits within maxLines.
   */
  fontSizes?: Array<{ font: string; lineHeight: number; fontSize: string }>;
  /** Maximum line count before stepping down font size (default: 3) */
  maxLines?: number;
}

const BalancedHeading: React.FC<BalancedHeadingProps> = ({
  children,
  font,
  lineHeight,
  as: Tag = "h1",
  className = "",
  style,
  center = false,
  fontSizes,
  maxLines = 3,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [balancedPx, setBalancedPx] = useState<number | null>(null);
  const [adaptedFont, setAdaptedFont] = useState<{
    font: string;
    lineHeight: number;
    fontSize: string;
  } | null>(null);

  const recompute = useCallback(() => {
    const el = containerRef.current;
    if (!el || typeof children !== "string" || !children.trim()) return;

    const parentWidth = el.parentElement?.clientWidth ?? el.clientWidth;
    if (parentWidth < 100) return;

    // Adaptive font scaling — try each size from largest to smallest
    let activeFont = font;
    let activeLH = lineHeight;
    let chosenAdapted: typeof adaptedFont = null;

    if (fontSizes && fontSizes.length > 0) {
      for (const candidate of fontSizes) {
        const lines = measureLineCount(children, candidate.font, parentWidth, candidate.lineHeight);
        if (lines <= maxLines) {
          activeFont = candidate.font;
          activeLH = candidate.lineHeight;
          chosenAdapted = candidate;
          break;
        }
      }
      // If none fit, use the smallest
      if (!chosenAdapted) {
        const smallest = fontSizes[fontSizes.length - 1];
        activeFont = smallest.font;
        activeLH = smallest.lineHeight;
        chosenAdapted = smallest;
      }
      setAdaptedFont(chosenAdapted);
    }

    const optimal = balanceWidth(children, activeFont, parentWidth, activeLH);
    setBalancedPx(optimal);
  }, [children, font, lineHeight, fontSizes, maxLines]);

  useEffect(() => {
    recompute();

    const el = containerRef.current?.parentElement;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      recompute();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [recompute]);

  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(adaptedFont ? { fontSize: adaptedFont.fontSize } : {}),
  };

  return (
    <div ref={containerRef} style={{ maxWidth: balancedPx ?? undefined, ...(center ? { marginLeft: "auto", marginRight: "auto" } : {}) }}>
      <Tag className={className} style={mergedStyle}>
        {children}
      </Tag>
    </div>
  );
};

export default React.memo(BalancedHeading);
