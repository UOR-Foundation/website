/**
 * BootSequence — cinematic OS boot animation.
 * Plays once per session, then calls onComplete.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface BootSequenceProps {
  onComplete: () => void;
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [phase, setPhase] = useState(0); // 0=black, 1=logo, 2=text, 3=progress, 4=fadeout
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 3400),
      setTimeout(() => {
        sessionStorage.setItem("uor:booted", "true");
        onComplete();
      }, 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Animate progress bar
  useEffect(() => {
    if (phase < 3) return;
    let raf: number;
    const start = performance.now();
    const duration = 1800;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  return (
    <AnimatePresence>
      {phase < 5 && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          animate={{ opacity: phase >= 4 ? 0 : 1, scale: phase >= 4 ? 1.02 : 1 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: phase >= 1 ? 1 : 0,
              scale: phase >= 1 ? 1 : 0.8,
            }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Glow */}
            <motion.div
              className="absolute inset-0 rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(212,168,83,0.25) 0%, transparent 70%)" }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Hexagon SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 200 200"
              fill="none"
              stroke="rgba(212,168,83,0.85)"
              strokeWidth="0.8"
              className="w-24 h-24 relative z-10"
            >
              <polygon points="100,10 177.3,55 177.3,145 100,190 22.7,145 22.7,55" />
              <polygon points="100,32 158,66 158,134 100,168 42,134 42,66" />
              <line x1="100" y1="10" x2="100" y2="190" />
              <line x1="22.7" y1="55" x2="177.3" y2="145" />
              <line x1="177.3" y1="55" x2="22.7" y2="145" />
              <line x1="100" y1="10" x2="42" y2="66" />
              <line x1="100" y1="10" x2="158" y2="66" />
              <line x1="177.3" y1="55" x2="158" y2="134" />
              <line x1="177.3" y1="55" x2="100" y2="32" />
              <line x1="177.3" y1="145" x2="100" y2="168" />
              <line x1="177.3" y1="145" x2="158" y2="66" />
              <line x1="100" y1="190" x2="158" y2="134" />
              <line x1="100" y1="190" x2="42" y2="134" />
              <line x1="22.7" y1="145" x2="42" y2="66" />
              <line x1="22.7" y1="145" x2="100" y2="168" />
              <line x1="22.7" y1="55" x2="100" y2="32" />
              <line x1="22.7" y1="55" x2="42" y2="134" />
              <line x1="42" y1="66" x2="158" y2="134" />
              <line x1="158" y1="66" x2="42" y2="134" />
              <line x1="100" y1="32" x2="100" y2="168" />
              <circle cx="100" cy="100" r="2" fill="rgba(212,168,83,0.7)" stroke="none" />
            </svg>
          </motion.div>

          {/* Title */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: phase >= 2 ? 0.6 : 0,
              y: phase >= 2 ? 0 : 12,
            }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-white/60 text-sm tracking-[0.3em] font-light"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            UOR OS
          </motion.p>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 3 ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            className="mt-8 w-48 h-[1px] bg-white/10 rounded-full overflow-hidden relative"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${progress * 100}%`,
                background: "linear-gradient(90deg, #D4A853, #E8C97A)",
              }}
            />
            {/* Shimmer */}
            <motion.div
              className="absolute inset-y-0 w-12"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
              }}
              animate={{ x: ["-48px", "192px"] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
