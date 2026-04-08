/**
 * ImmersiveBackground — Fixed full-viewport blurred photo backdrop.
 * Shared between immersive search and immersive reader modes.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { getDailyPhoto } from "@/modules/oracle/lib/immersive-photos";

export default function ImmersiveBackground() {
  const [loaded, setLoaded] = useState(false);
  const photoUrl = getDailyPhoto();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-0 pointer-events-none"
    >
      <img
        src={photoUrl}
        alt=""
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-1000 scale-105 blur-[24px] ${loaded ? "opacity-100" : "opacity-0"}`}
        draggable={false}
      />
      {/* Dark overlay for legibility */}
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30" />
    </motion.div>
  );
}
