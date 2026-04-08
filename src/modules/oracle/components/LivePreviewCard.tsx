/**
 * LivePreviewCard — Floating preview card that appears as user types,
 * showing Wikipedia thumbnail + description before Enter is pressed.
 */

import { motion, AnimatePresence } from "framer-motion";
import type { PrefetchResult } from "../lib/speculative-prefetch";

interface Props {
  prefetch: PrefetchResult | null;
  visible: boolean;
}

export default function LivePreviewCard({ prefetch, visible }: Props) {
  return (
    <AnimatePresence>
      {visible && prefetch && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-border/20 bg-[hsl(0_0%_10%/0.95)] backdrop-blur-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-start gap-4 p-4">
            {/* Thumbnail */}
            {prefetch.thumbnail && (
              <img
                src={prefetch.thumbnail}
                alt=""
                className="w-16 h-16 rounded-lg object-cover shrink-0 border border-border/10"
              />
            )}

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-foreground/90 text-sm font-semibold truncate">
                {prefetch.title}
              </p>
              {prefetch.description && (
                <p className="text-muted-foreground/60 text-xs mt-0.5 line-clamp-1">
                  {prefetch.description}
                </p>
              )}
              {prefetch.extract && (
                <p className="text-foreground/50 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                  {prefetch.extract}
                </p>
              )}
            </div>
          </div>

          {/* Bottom hint */}
          <div className="px-4 pb-2.5 pt-0">
            <p className="text-muted-foreground/30 text-[10px] tracking-widest uppercase font-medium">
              Press Enter to explore ↵
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
