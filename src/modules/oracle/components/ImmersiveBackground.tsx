/**
 * ImmersiveBackground — Fixed full-viewport blurred photo backdrop.
 * Crossfades to a new image every hour, matching natural daylight.
 * Preloads the next hour's image for seamless transitions.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getHourlyPhoto, getCurrentHour, preloadNextHourPhoto } from "@/modules/oracle/lib/immersive-photos";

interface ImmersiveBackgroundProps {
  scrollProgress?: number;
}

export default function ImmersiveBackground({ scrollProgress = 0 }: ImmersiveBackgroundProps) {
  const [photoUrl, setPhotoUrl] = useState(() => getHourlyPhoto());
  const [key, setKey] = useState(() => getCurrentHour());
  const hourRef = useRef(getCurrentHour());

  // Check every 30s if the hour changed; crossfade if so
  useEffect(() => {
    // Preload next hour on mount
    preloadNextHourPhoto();

    const interval = setInterval(() => {
      const now = getCurrentHour();
      if (now !== hourRef.current) {
        hourRef.current = now;
        setPhotoUrl(getHourlyPhoto());
        setKey(now);
        // Preload the following hour
        preloadNextHourPhoto();
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  const blurAmount = 24 + scrollProgress * 12;
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
      {/* Dark overlay for legibility */}
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30" />
    </div>
  );
}
