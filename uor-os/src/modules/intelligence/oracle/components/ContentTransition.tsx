/**
 * ContentTransition — Wraps content with a smooth crossfade
 * when transitioning from seed (Wikipedia extract) to AI-streamed content.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  /** Unique key that changes when content source switches (seed → stream) */
  contentKey: string;
  children: React.ReactNode;
}

const ContentTransition: React.FC<Props> = ({ contentKey, children }) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={contentKey}
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

export default ContentTransition;
