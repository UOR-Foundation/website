/**
 * WaterfallSection — Animates each section entrance with a staggered reveal.
 * Uses Pretext height prediction for layout-shift-free streaming.
 * Now reads container width from AdaptiveContentContainer context.
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { predictSectionHeight, FONTS } from "../lib/pretext-layout";
import { useContainerWidth } from "./AdaptiveContentContainer";

interface Props {
  sectionKey: string;
  index: number;
  children: React.ReactNode;
  /** Whether this section is still being streamed */
  isPartial?: boolean;
  /** Raw markdown of this section (for height prediction) */
  markdown?: string;
  /** Font key for height prediction */
  font?: string;
  /** Line height in px for prediction */
  lineHeightPx?: number;
}

const WaterfallSection: React.FC<Props> = ({
  sectionKey,
  index,
  children,
  isPartial = false,
  markdown,
  font = FONTS.dmSansBody,
  lineHeightPx = 31,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [predictedHeight, setPredictedHeight] = useState<number | undefined>(undefined);
  const { bodyMaxWidth } = useContainerWidth();

  const computeHeight = useCallback(() => {
    if (!markdown || !isPartial) {
      setPredictedHeight(undefined);
      return;
    }
    // Use container-aware width, fall back to element width, then bodyMaxWidth
    const el = containerRef.current;
    const width = el?.clientWidth || bodyMaxWidth || 720;
    if (width < 100) return;

    const h = predictSectionHeight(markdown, font, width, lineHeightPx);
    setPredictedHeight((prev) => (prev && h < prev ? prev : h));
  }, [markdown, font, lineHeightPx, isPartial, bodyMaxWidth]);

  useEffect(() => {
    computeHeight();
  }, [computeHeight]);

  useEffect(() => {
    if (!isPartial) {
      setPredictedHeight(undefined);
    }
  }, [isPartial]);

  return (
    <motion.div
      ref={containerRef}
      key={sectionKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isPartial ? 0.85 : 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.06, 0.3),
        ease: [0.23, 1, 0.32, 1],
      }}
      style={{
        minHeight: predictedHeight ? `${predictedHeight}px` : undefined,
        transition: "min-height 0.3s ease-out",
      }}
    >
      {children}
    </motion.div>
  );
};

export default WaterfallSection;
