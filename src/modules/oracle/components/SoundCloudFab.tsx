/**
 * SoundCloudFab — ambient SoundCloud player as a spinning vinyl disc.
 *
 * Interactions:
 *   • Single click → play / pause (disc spins clockwise when playing)
 *   • Double click → toggle mini SoundCloud embed panel
 *
 * When playing, the disc pulls album artwork from SoundCloud and uses it
 * as the disc surface texture — blended under vinyl grooves for a rich,
 * dimensional look. When paused, it returns to a clean dark vinyl.
 *
 * Uses SoundCloud's iframe Widget API for real playback control.
 * Default playlist: Ben Böhmer — Begin Again
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useAnimationControls, type PanInfo } from "framer-motion";
import { X } from "lucide-react";

const DRAG_THRESHOLD = 5; // px — movement beyond this counts as drag, not click
const POSITION_KEY = "uor-vinyl-pos";

const SC_PLAYLIST = "https://soundcloud.com/ben-bohmer/sets/begin-again";
const SC_PLAYLIST_ENCODED = encodeURIComponent(SC_PLAYLIST);
const EMBED_AUDIO = `https://w.soundcloud.com/player/?url=${SC_PLAYLIST_ENCODED}&color=%232A2724&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`;
const EMBED_VISUAL = `https://w.soundcloud.com/player/?url=${SC_PLAYLIST_ENCODED}&color=%232A2724&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true`;

interface SCWidget {
  play: () => void;
  pause: () => void;
  isPaused: (cb: (paused: boolean) => void) => void;
  bind: (event: string, cb: () => void) => void;
  unbind: (event: string) => void;
  getCurrentSound: (cb: (sound: { title?: string; artwork_url?: string; user?: { username?: string } }) => void) => void;
}

declare global {
  interface Window {
    SC?: { Widget: (el: HTMLIFrameElement) => SCWidget; Events: Record<string, string> };
  }
}

let apiLoaded = false;
const loadSCApi = (): Promise<void> => {
  if (apiLoaded || window.SC) { apiLoaded = true; return Promise.resolve(); }
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://w.soundcloud.com/player/api.js";
    s.onload = () => { apiLoaded = true; resolve(); };
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
};

const DISC_SIZE = 24;
const GROOVE_COUNT = 4;

export default function SoundCloudFab() {
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [trackTitle, setTrackTitle] = useState<string | null>(null);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<SCWidget | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCountRef = useRef(0);
  const spinControls = useAnimationControls();
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);
  const isDragging = useRef(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSCApi().then(() => {
      if (iframeRef.current && window.SC) {
        const w = window.SC.Widget(iframeRef.current);
        widgetRef.current = w;
        w.bind("play", () => {
          setPlaying(true);
          w.getCurrentSound((sound) => {
            if (sound?.title) setTrackTitle(sound.title);
            if (sound?.artwork_url) {
              setArtworkUrl(sound.artwork_url.replace("-large", "-t500x500"));
            }
          });
        });
        w.bind("pause", () => setPlaying(false));
        w.bind("finish", () => setPlaying(false));
      }
    });
  }, []);

  // RAF-based smooth spin
  const rotationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (playing) {
      lastTimeRef.current = null;
      const spin = (time: number) => {
        if (lastTimeRef.current !== null) {
          const delta = time - lastTimeRef.current;
          rotationRef.current = (rotationRef.current + (delta / 6000) * 360) % 360;
          spinControls.set({ rotate: rotationRef.current });
        }
        lastTimeRef.current = time;
        rafRef.current = requestAnimationFrame(spin);
      };
      rafRef.current = requestAnimationFrame(spin);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, spinControls]);

  const togglePlay = useCallback(() => {
    const w = widgetRef.current;
    if (!w) return;
    w.isPaused((paused) => {
      if (paused) w.play(); else w.pause();
    });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY };
    isDragging.current = false;
  }, []);

  const handleDrag = useCallback((_: unknown, info: PanInfo) => {
    const dist = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
    if (dist > DRAG_THRESHOLD) isDragging.current = true;
  }, []);

  const handleClick = useCallback(() => {
    if (isDragging.current) return; // was a drag, not a click
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      if (clickCountRef.current === 1) {
        togglePlay();
      } else if (clickCountRef.current >= 2) {
        setExpanded((e) => !e);
      }
      clickCountRef.current = 0;
    }, 250);
  }, [togglePlay]);

  const half = DISC_SIZE / 2;

  return (
    <>
      {/* Invisible full-viewport drag constraints layer */}
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
      {/* Hidden audio iframe */}
      <iframe
        ref={iframeRef}
        src={EMBED_AUDIO}
        width="0"
        height="0"
        allow="autoplay"
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
        title="SoundCloud Player"
      />

      {/* Track title — to the LEFT of the disc */}
      <AnimatePresence>
        {playing && trackTitle && !expanded && (
          <motion.span
            className="text-foreground/40 font-body truncate select-none"
            style={{ fontSize: 10, maxWidth: 120, marginRight: 14 }}
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 0.6, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.4 }}
          >
            {trackTitle}
          </motion.span>
        )}
      </AnimatePresence>

      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        className="group relative flex items-center justify-center rounded-full focus:outline-none"
        style={{
          width: DISC_SIZE,
          height: DISC_SIZE,
          cursor: "pointer",
          background: "none",
          border: "none",
          padding: 0,
          transition: "transform 0.3s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.12)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        title={playing ? "Tap to pause · Double-tap for controls" : "Tap to play · Double-tap for controls"}
        aria-label="Music player"
      >
        {/* Spinning disc container */}
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden"
          animate={spinControls}
          style={{
            boxShadow: playing
              ? "0 0 4px 1px hsl(0 0% 0% / 0.3), inset 0 0 3px hsl(0 0% 0% / 0.4)"
              : "0 1px 4px hsl(0 0% 0% / 0.4), inset 0 0 3px hsl(0 0% 0% / 0.3)",
          }}
        >
          {/* Album artwork */}
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "saturate(0.85) contrast(1.05) brightness(0.8)" }}
              crossOrigin="anonymous"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 50% 50%, hsl(0 0% 16%) 0%, hsl(0 0% 8%) 100%)`,
              }}
            />
          )}

          {/* Vinyl overlay — grooves + sheen */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={DISC_SIZE}
            height={DISC_SIZE}
            viewBox={`0 0 ${DISC_SIZE} ${DISC_SIZE}`}
          >
            <circle cx={half} cy={half} r={half - 0.5} fill="none" stroke="hsl(0 0% 0% / 0.5)" strokeWidth="1" />
            {Array.from({ length: GROOVE_COUNT }).map((_, i) => {
              const r = 3.5 + i * 2;
              return (
                <circle key={i} cx={half} cy={half} r={r} fill="none" stroke="hsl(0 0% 0% / 0.2)" strokeWidth="0.3" />
              );
            })}
            <circle
              cx={half} cy={half} r={half - 2} fill="none"
              stroke="hsl(0 0% 100% / 0.08)" strokeWidth="0.5"
              strokeDasharray={`${Math.PI * (half - 2) * 0.25} ${Math.PI * (half - 2) * 1.75}`}
              strokeLinecap="round"
              style={{ transform: "rotate(-45deg)", transformOrigin: "center" }}
            />
          </svg>
        </motion.div>

        {/* Centre spindle */}
        <div
          className="relative rounded-full z-10"
          style={{
            width: 5, height: 5,
            background: "radial-gradient(circle at 40% 35%, hsl(0 0% 85%), hsl(0 0% 40%))",
            boxShadow: "0 0 2px hsl(0 0% 0% / 0.5), inset 0 0.5px 0 hsl(0 0% 100% / 0.4)",
          }}
        />

        {/* Glow ring when playing */}
        {playing && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{ inset: -1.5, border: "0.5px solid hsl(0 0% 100% / 0.08)", borderRadius: "50%" }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </button>

      {/* Expanded mini-player panel — double-tap */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="absolute rounded-2xl border border-border/30 shadow-2xl overflow-hidden backdrop-blur-sm"
            style={{
              bottom: "calc(100% + 12px)",
              right: 0,
              width: 320,
              zIndex: 100,
              background: "hsl(0 0% 8% / 0.95)",
            }}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Artwork header */}
            {artworkUrl && (
              <div className="relative" style={{ height: 80, overflow: "hidden" }}>
                <img
                  src={artworkUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: "brightness(0.6) saturate(0.8)" }}
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, hsl(0 0% 8% / 0.95) 100%)" }} />
                {trackTitle && (
                  <div className="absolute bottom-0 left-0 right-0" style={{ padding: "0 12px 8px" }}>
                    <span className="text-sm font-medium block truncate" style={{ color: "hsl(0 0% 100% / 0.85)" }}>
                      {trackTitle}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between" style={{ padding: "8px 12px", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(0 0% 100% / 0.4)" }}>
                SoundCloud
              </span>
              <button
                onClick={() => setExpanded(false)}
                className="flex items-center justify-center rounded-lg transition-colors"
                style={{ width: 22, height: 22, color: "hsl(0 0% 100% / 0.4)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(0 0% 100% / 0.8)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(0 0% 100% / 0.4)")}
              >
                <X style={{ width: 12, height: 12 }} strokeWidth={1.5} />
              </button>
            </div>
            <iframe
              src={EMBED_VISUAL}
              width="320"
              height="300"
              allow="autoplay"
              style={{ border: "none", display: "block" }}
              title="SoundCloud Controls"
            />
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </>
  );
}
