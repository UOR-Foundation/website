/**
 * BalancedBlock — Orphan-free text balancing for any block element.
 *
 * Extends the BalancedHeading pattern to work with pull-quotes,
 * blockquotes, section subheadings, and any text block that benefits
 * from even line distribution. Uses Pretext canvas measurement.
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { balanceWidth } from "../lib/pretext-layout";

interface BalancedBlockProps {
  /** The text content (plain string) */
  children: string;
  /** CSS font shorthand matching the element's rendered font */
  font: string;
  /** Line-height in px */
  lineHeight: number;
  /** HTML tag or component to render */
  as?: keyof JSX.IntrinsicElements;
  /** Additional className */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Center the balanced container */
  center?: boolean;
  /** Max width cap (defaults to parent width) */
  maxWidth?: number;
}

const BalancedBlock: React.FC<BalancedBlockProps> = ({
  children,
  font,
  lineHeight,
  as: Tag = "div",
  className = "",
  style,
  center = false,
  maxWidth: maxWidthProp,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [balancedPx, setBalancedPx] = useState<number | null>(null);

  const recompute = useCallback(() => {
    const el = containerRef.current;
    if (!el || typeof children !== "string" || !children.trim()) return;

    const parentWidth = maxWidthProp ?? el.parentElement?.clientWidth ?? el.clientWidth;
    if (parentWidth < 100) return;

    const optimal = balanceWidth(children, font, parentWidth, lineHeight);
    setBalancedPx(optimal);
  }, [children, font, lineHeight, maxWidthProp]);

  useEffect(() => {
    recompute();

    const el = containerRef.current?.parentElement;
    if (!el) return;

    const ro = new ResizeObserver(() => recompute());
    ro.observe(el);
    return () => ro.disconnect();
  }, [recompute]);

  return (
    <div
      ref={containerRef}
      style={{
        maxWidth: balancedPx ?? undefined,
        ...(center ? { marginLeft: "auto", marginRight: "auto" } : {}),
      }}
    >
      {/* @ts-ignore — dynamic tag */}
      <Tag className={className} style={style}>
        {children}
      </Tag>
    </div>
  );
};

export default React.memo(BalancedBlock);
