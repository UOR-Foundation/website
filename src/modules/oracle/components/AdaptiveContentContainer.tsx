/**
 * AdaptiveContentContainer — Container-aware typography context.
 *
 * Tracks the actual pixel width of its container via ResizeObserver
 * and exposes it to all children via React context. This replaces
 * viewport-relative units (vw, dvh) and hardcoded maxWidth values
 * with precise, window-aware measurements.
 *
 * Children use `useContainerWidth()` to read the current width and
 * derive fluid maxWidth, font scaling, and layout decisions.
 */

import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from "react";

interface ContainerContextValue {
  /** Current container width in CSS pixels */
  width: number;
  /** Optimal body text measure: min(720, width - padding) */
  bodyMaxWidth: number;
  /** Whether the container is narrow (< 480px) */
  isNarrow: boolean;
  /** Whether the container is wide (≥ 1024px) */
  isWide: boolean;
}

const ContainerContext = createContext<ContainerContextValue>({
  width: 720,
  bodyMaxWidth: 720,
  isNarrow: false,
  isWide: false,
});

export function useContainerWidth(): ContainerContextValue {
  return useContext(ContainerContext);
}

/** Compute body max width with golden-ratio-inspired padding */
function computeBodyMax(containerWidth: number): number {
  const padding = containerWidth < 480 ? 32 : containerWidth < 768 ? 48 : 64;
  return Math.min(720, containerWidth - padding);
}

interface AdaptiveContentContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const AdaptiveContentContainer: React.FC<AdaptiveContentContainerProps> = ({
  children,
  className = "",
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      const w = el.clientWidth;
      if (w > 0) setWidth(w);
    }
  }, []);

  useEffect(() => {
    measure();
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const value: ContainerContextValue = {
    width,
    bodyMaxWidth: computeBodyMax(width),
    isNarrow: width < 480,
    isWide: width >= 1024,
  };

  return (
    <ContainerContext.Provider value={value}>
      <div ref={containerRef} className={`w-full ${className}`} style={style}>
        {children}
      </div>
    </ContainerContext.Provider>
  );
};

export default AdaptiveContentContainer;
