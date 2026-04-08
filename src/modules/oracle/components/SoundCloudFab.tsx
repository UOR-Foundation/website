/**
 * SoundCloudFab — ambient SoundCloud player as a spinning vinyl disc.
 *
 * Interactions:
 *   • Single click → open SoundCloud in new tab (since embeds are blocked on preview domains)
 *   • Double click → toggle mini info panel with direct link
 *
 * The disc auto-populates with a subtle ambient gradient background
 * and spins gently on hover for a delightful, lightweight feel.
 */
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { ExternalLink, Music2 } from "lucide-react";

const DRAG_THRESHOLD = 5;
const SC_PLAYLIST_URL = "https://soundcloud.com/ben-bohmer/sets/begin-again";

const DISC_SIZE = 20;
const GROOVE_COUNT = 3;

export default function SoundCloudFab() {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCountRef = useRef(0);
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);
  const isDragging = useRef(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const half = DISC_SIZE / 2;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY };
    isDragging.current = false;
  }, []);

  const handleDrag = useCallback((_: unknown, info: PanInfo) => {
    const dist = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
    if (dist > DRAG_THRESHOLD) isDragging.current = true;
  }, []);

  const handleClick = useCallback(() => {
    if (isDragging.current) return;
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      if (clickCountRef.current === 1) {
        window.open(SC_PLAYLIST_URL, "_blank", "noopener");
      } else if (clickCountRef.current >= 2) {
        setExpanded((e) => !e);
      }
      clickCountRef.current = 0;
    }, 250);
  }, []);

  return (
    <>
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 49 }} />
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.08}
        dragMomentum={false}
        onDrag={handleDrag}
        className="relative flex items-center cursor-grab active:cursor-grabbing"
        style={{ zIndex: 50, touchAction: "none" }}
      >
        <button
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="group relative flex items-center justify-center rounded-full focus:outline-none"
          style={{ width: DISC_SIZE, height: DISC_SIZE, cursor: "pointer", background: "none", border: "none", padding: 0 }}
          title="Tap to open music · Double-tap for info"
          aria-label="Music player"
        >
          {/* Spinning disc */}
          <motion.div
            className="absolute inset-0 rounded-full overflow-hidden"
            animate={{ rotate: hovered ? 360 : 0 }}
            transition={hovered ? { duration: 4, repeat: Infinity, ease: "linear" } : { duration: 0.6, ease: "easeOut" }}
            style={{
              boxShadow: "0 1px 3px hsl(0 0% 0% / 0.25), inset 0 0 2px hsl(0 0% 0% / 0.2)",
            }}
          >
            {/* Ambient gradient background */}
            <div
              className="absolute inset-0"
              style={{
                background: `conic-gradient(from 0deg, hsl(220 15% 18%), hsl(260 12% 22%), hsl(200 14% 16%), hsl(240 10% 20%), hsl(220 15% 18%))`,
              }}
            />

            {/* Vinyl grooves */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={DISC_SIZE}
              height={DISC_SIZE}
              viewBox={`0 0 ${DISC_SIZE} ${DISC_SIZE}`}
            >
              <circle cx={half} cy={half} r={half - 0.5} fill="none" stroke="hsl(0 0% 0% / 0.3)" strokeWidth="0.5" />
              {Array.from({ length: GROOVE_COUNT }).map((_, i) => {
                const r = 3 + i * 1.8;
                return (
                  <circle key={i} cx={half} cy={half} r={r} fill="none" stroke="hsl(0 0% 100% / 0.06)" strokeWidth="0.3" />
                );
              })}
              {/* Sheen highlight */}
              <circle
                cx={half} cy={half} r={half - 2} fill="none"
                stroke="hsl(0 0% 100% / 0.1)" strokeWidth="0.4"
                strokeDasharray={`${Math.PI * (half - 2) * 0.2} ${Math.PI * (half - 2) * 1.8}`}
                strokeLinecap="round"
                style={{ transform: "rotate(-45deg)", transformOrigin: "center" }}
              />
            </svg>
          </motion.div>

          {/* Centre spindle */}
          <div
            className="relative rounded-full z-10"
            style={{
              width: 4, height: 4,
              background: "radial-gradient(circle at 40% 35%, hsl(0 0% 80%), hsl(0 0% 45%))",
              boxShadow: "0 0 1px hsl(0 0% 0% / 0.4)",
            }}
          />
        </button>

        {/* Expanded info panel */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              className="absolute rounded-xl border border-border/20 shadow-lg overflow-hidden backdrop-blur-md"
              style={{
                bottom: "calc(100% + 10px)",
                right: 0,
                width: 220,
                zIndex: 100,
                background: "hsl(0 0% 8% / 0.92)",
              }}
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-2 p-3">
                <div className="flex items-center gap-2">
                  <Music2 className="w-3.5 h-3.5" style={{ color: "hsl(24 70% 55%)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "hsl(0 0% 100% / 0.7)" }}>
                    Ambient Music
                  </span>
                </div>
                <p style={{ fontSize: 10, color: "hsl(0 0% 100% / 0.4)", lineHeight: 1.4 }}>
                  Ben Böhmer — Begin Again
                </p>
                <a
                  href={SC_PLAYLIST_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-lg transition-colors"
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    padding: "6px 0",
                    color: "hsl(24 70% 55%)",
                    background: "hsl(24 70% 55% / 0.1)",
                    border: "1px solid hsl(24 70% 55% / 0.15)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(24 70% 55% / 0.18)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "hsl(24 70% 55% / 0.1)"; }}
                >
                  <ExternalLink style={{ width: 10, height: 10 }} />
                  Listen on SoundCloud
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
