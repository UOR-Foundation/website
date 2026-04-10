/**
 * CursorAvoidText — Easter egg: text reflows around the mouse cursor.
 *
 * Uses Pretext's getLines() to lay out text, then for each line near the
 * cursor, computes a Gaussian-falloff indent that makes text "flow around"
 * the pointer like it's a physical object displacing text.
 *
 * Opt-in via the `active` prop. Throttled to 60fps via requestAnimationFrame.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { getLines, FONTS } from "../lib/pretext-layout";

interface CursorAvoidTextProps {
  /** The text content */
  children: string;
  /** CSS font shorthand */
  font?: string;
  /** Line height in px */
  lineHeight?: number;
  /** Whether the effect is active */
  active?: boolean;
  /** Radius of influence in px (default 60) */
  radius?: number;
  /** Max indent in px (default 30) */
  maxIndent?: number;
  /** Container className */
  className?: string;
  /** Container style */
  style?: React.CSSProperties;
}

/** Gaussian falloff: 1 at center, 0 at distance = radius */
function gaussian(distance: number, radius: number): number {
  if (distance >= radius) return 0;
  const sigma = radius / 2.5;
  return Math.exp(-(distance * distance) / (2 * sigma * sigma));
}

const CursorAvoidText: React.FC<CursorAvoidTextProps> = ({
  children,
  font = FONTS.dmSansBody,
  lineHeight = 28,
  active = false,
  radius = 60,
  maxIndent = 30,
  className = "",
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(720);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setContainerWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track mouse position relative to container
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!active) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    });
  }, [active]);

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  // Pre-compute lines
  const lines = useMemo(() => {
    if (!children.trim()) return [];
    const result = getLines(children, font, containerWidth, lineHeight);
    return result.lines;
  }, [children, font, containerWidth, lineHeight]);

  // Compute per-line indents based on cursor proximity
  const lineIndents = useMemo(() => {
    if (!mousePos || !active) return null;

    return lines.map((_, i) => {
      const lineY = i * lineHeight + lineHeight / 2;
      const dy = Math.abs(mousePos.y - lineY);
      const influence = gaussian(dy, radius);
      
      if (influence < 0.01) return 0;
      
      // Determine which side the cursor is on
      const isLeftHalf = mousePos.x < containerWidth / 2;
      const indent = influence * maxIndent;
      
      return isLeftHalf ? indent : -indent; // negative = indent from right
    });
  }, [mousePos, active, lines, lineHeight, radius, maxIndent, containerWidth]);

  // If not active or no mouse, render normally
  if (!active || !lineIndents) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ ...style, lineHeight: `${lineHeight}px`, font }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    );
  }

  // Render each line with computed indent
  return (
    <div
      ref={containerRef}
      className={className}
      style={{ ...style, position: "relative" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {lines.map((line, i) => {
        const indent = lineIndents[i] || 0;
        const isFromRight = indent < 0;
        const absIndent = Math.abs(indent);

        return (
          <div
            key={i}
            style={{
              lineHeight: `${lineHeight}px`,
              font,
              paddingLeft: isFromRight ? 0 : absIndent,
              paddingRight: isFromRight ? absIndent : 0,
              transition: "padding 0.15s ease-out",
            }}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(CursorAvoidText);
