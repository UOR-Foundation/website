/**
 * ImmersiveBackground — Fixed full-viewport blurred photo backdrop.
 * Supports scroll-aware parallax and dynamic blur increase.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { getDailyPhoto } from "@/modules/oracle/lib/immersive-photos";

interface ImmersiveBackgroundProps {
  /** Scroll progress 0–1 for parallax and blur effects */
  scrollProgress?: number;
}

export default function ImmersiveBackground({ scrollProgress = 0 }: ImmersiveBackgroundProps) {
  const [loaded, setLoaded] = useState(false);
  const photoUrl = getDailyPhoto();

  // Dynamic blur: 24px at top → 36px at bottom
  const blurAmount = 24 + scrollProgress * 12;
  // Subtle parallax shift
  const parallaxY = scrollProgress * -30;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
    >
      <img
        src={photoUrl}
        alt=""
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-1000 scale-110 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{
          filter: `blur(${blurAmount}px)`,
          transform: `translateY(${parallaxY}px) scale(1.1)`,
          willChange: "transform, filter",
        }}
        draggable={false}
      />
      {/* Dark overlay for legibility */}
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30" />
    </motion.div>
  );
}
