/**
 * WaterfallSection — Animates each section entrance with a staggered reveal.
 * Used by lens renderers for progressive "waterfall" rendering.
 */

import React from "react";
import { motion } from "framer-motion";

interface Props {
  sectionKey: string;
  index: number;
  children: React.ReactNode;
  /** Whether this section is still being streamed */
  isPartial?: boolean;
}

const WaterfallSection: React.FC<Props> = ({ sectionKey, index, children, isPartial = false }) => (
  <motion.div
    key={sectionKey}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: isPartial ? 0.85 : 1, y: 0 }}
    transition={{
      duration: 0.35,
      delay: Math.min(index * 0.06, 0.3),
      ease: [0.23, 1, 0.32, 1],
    }}
  >
    {children}
  </motion.div>
);

export default WaterfallSection;
