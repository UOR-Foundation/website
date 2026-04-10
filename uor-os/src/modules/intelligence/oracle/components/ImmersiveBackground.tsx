/**
 * ImmersiveBackground — Fixed full-viewport blurred photo backdrop.
 * Crossfades when the solar phase changes (checked every 60s).
 * Uses the user's geolocation + date to match real-world light conditions.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getPhasePhoto,
  getCurrentPhase,
  preloadNextPhasePhoto,
  initLocation,
} from "@/modules/intelligence/oracle/lib/immersive-photos";
import type { SolarPhase } from "@/modules/intelligence/oracle/lib/solar-position";

interface ImmersiveBackgroundProps {
  scrollProgress?: number;
}

export default function ImmersiveBackground({ scrollProgress = 0 }: ImmersiveBackgroundProps) {
  const [photoUrl, setPhotoUrl] = useState(() => getPhasePhoto());
  const [key, setKey] = useState(0);
  const phaseRef = useRef<SolarPhase>(getCurrentPhase());

  useEffect(() => {
    // Resolve geolocation, then update photo with real coords
    initLocation().then(() => {
      const phase = getCurrentPhase();
      if (phase !== phaseRef.current) {
        phaseRef.current = phase;
        setPhotoUrl(getPhasePhoto());
        setKey((k) => k + 1);
      }
      preloadNextPhasePhoto();
    });

    // Check every 60s if the solar phase changed
    const interval = setInterval(() => {
      const phase = getCurrentPhase();
      if (phase !== phaseRef.current) {
        phaseRef.current = phase;
        setPhotoUrl(getPhasePhoto());
        setKey((k) => k + 1);
        preloadNextPhasePhoto();
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const blurAmount = 2 + scrollProgress * 8;
  const parallaxY = scrollProgress * -30;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.img
          key={key}
          src={photoUrl}
          alt=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full object-cover scale-110"
          style={{
            filter: `blur(${blurAmount}px)`,
            transform: `translateY(${parallaxY}px) scale(1.1)`,
            willChange: "transform, filter",
          }}
          draggable={false}
        />
      </AnimatePresence>
      {/* Subtle overlay for text legibility */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
    </div>
  );
}
