/**
 * BalancedHeading — Orphan-free titles using Pretext canvas measurement.
 *
 * Computes the tightest container width that keeps the same line count,
 * so text distributes evenly and avoids single-word orphan lines.
 * Recomputes on resize via ResizeObserver (layout() is <0.1ms).
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { balanceWidth } from "../lib/pretext-layout";

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
  /** Inline styles (applied to outer wrapper) */
  style?: React.CSSProperties;
}

const BalancedHeading: React.FC<BalancedHeadingProps> = ({
  children,
  font,
  lineHeight,
  as: Tag = "h1",
  className = "",
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [balancedPx, setBalancedPx] = useState<number | null>(null);

  const recompute = useCallback(() => {
    const el = containerRef.current;
    if (!el || typeof children !== "string" || !children.trim()) return;

    const parentWidth = el.parentElement?.clientWidth ?? el.clientWidth;
    if (parentWidth < 100) return; // too small to bother

    const optimal = balanceWidth(children, font, parentWidth, lineHeight);
    setBalancedPx(optimal);
  }, [children, font, lineHeight]);

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

  return (
    <div ref={containerRef} style={{ maxWidth: balancedPx ?? undefined }}>
      <Tag className={className} style={style}>
        {children}
      </Tag>
    </div>
  );
};

export default React.memo(BalancedHeading);
