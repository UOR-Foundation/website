/**
 * SoundCloudFab — ambient vinyl disc player with inline SoundCloud embed.
 *
 * Interactions:
 *   • Single tap → play/pause (disc spins while playing)
 *   • Double tap → toggle expanded panel with embedded SoundCloud player
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Music2, Pause, Play, ListMusic } from "lucide-react";

const SC_PLAYLIST_URL = "https://soundcloud.com/ben-bohmer/sets/begin-again";
const SC_EMBED_URL = `https://w.soundcloud.com/player/?url=${encodeURIComponent(SC_PLAYLIST_URL)}&color=%23e8985a&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`;

const DISC_SIZE = 48;
const GROOVE_COUNT = 5;

const PRELOADED_TRACKS = [
  { title: "Begin Again", artist: "Ben Böhmer" },
  { title: "Ground Control", artist: "Ben Böhmer" },
  { title: "Beyond Beliefs", artist: "Ben Böhmer" },
  { title: "Escalate", artist: "Ben Böhmer" },
  { title: "After Earth", artist: "Ben Böhmer" },
];

export default function SoundCloudFab() {
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeTrack, setActiveTrack] = useState(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCountRef = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const half = DISC_SIZE / 2;

  /* ── Click handler: single = play/pause, double = expand ── */
  const handleClick = useCallback(() => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      if (clickCountRef.current === 1) {
        // Single tap: toggle play/pause
        setPlaying((p) => !p);
      } else if (clickCountRef.current >= 2) {
        // Double tap: toggle expanded panel
        setExpanded((e) => !e);
        if (!expanded) setPlaying(true);
      }
      clickCountRef.current = 0;
    }, 220);
  }, [expanded]);

  /* Auto-play embed when playing starts */
  useEffect(() => {
    if (!iframeRef.current) return;
    const widget = (window as any).SC?.Widget?.(iframeRef.current);
    if (!widget) return;
    if (playing) widget.play?.();
    else widget.pause?.();
  }, [playing]);

  return (
    <div className="relative flex items-center" style={{ zIndex: 50 }}>
      {/* ── The vinyl disc button ── */}
      <button
        onClick={handleClick}
        className="group relative flex items-center justify-center rounded-full focus:outline-none transition-transform hover:scale-105 active:scale-95"
        style={{
          width: DISC_SIZE,
          height: DISC_SIZE,
          cursor: "pointer",
          background: "none",
          border: "none",
          padding: 0,
        }}
        title={playing ? "Tap to pause · Double-tap for player" : "Tap to play · Double-tap for player"}
        aria-label="Music player"
      >
        {/* Outer glow when playing */}
        {playing && (
          <motion.div
            className="absolute inset-[-4px] rounded-full"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background: "radial-gradient(circle, hsl(24 70% 55% / 0.15), transparent 70%)",
            }}
          />
        )}

        {/* Spinning disc */}
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden"
          animate={{ rotate: playing ? 360 : 0 }}
          transition={
            playing
              ? { duration: 3, repeat: Infinity, ease: "linear" }
              : { duration: 0.8, ease: "easeOut" }
          }
          style={{
            boxShadow:
              "0 2px 8px hsl(0 0% 0% / 0.35), inset 0 0 4px hsl(0 0% 0% / 0.2)",
          }}
        >
          {/* Album-style gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background: `conic-gradient(from 0deg, hsl(220 20% 14%), hsl(200 25% 18%), hsl(260 15% 20%), hsl(220 18% 15%), hsl(240 12% 18%), hsl(220 20% 14%))`,
            }}
          />

          {/* Vinyl grooves */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={DISC_SIZE}
            height={DISC_SIZE}
            viewBox={`0 0 ${DISC_SIZE} ${DISC_SIZE}`}
          >
            <circle
              cx={half}
              cy={half}
              r={half - 1}
              fill="none"
              stroke="hsl(0 0% 0% / 0.3)"
              strokeWidth="0.8"
            />
            {Array.from({ length: GROOVE_COUNT }).map((_, i) => {
              const r = 6 + i * 3.5;
              return (
                <circle
                  key={i}
                  cx={half}
                  cy={half}
                  r={r}
                  fill="none"
                  stroke="hsl(0 0% 100% / 0.05)"
                  strokeWidth="0.4"
                />
              );
            })}
            {/* Sheen highlight */}
            <circle
              cx={half}
              cy={half}
              r={half - 4}
              fill="none"
              stroke="hsl(0 0% 100% / 0.08)"
              strokeWidth="0.6"
              strokeDasharray={`${Math.PI * (half - 4) * 0.25} ${Math.PI * (half - 4) * 1.75}`}
              strokeLinecap="round"
              style={{ transform: "rotate(-45deg)", transformOrigin: "center" }}
            />
          </svg>
        </motion.div>

        {/* Centre spindle / play-pause indicator */}
        <div
          className="relative rounded-full z-10 flex items-center justify-center"
          style={{
            width: 14,
            height: 14,
            background:
              "radial-gradient(circle at 40% 35%, hsl(0 0% 85%), hsl(0 0% 50%))",
            boxShadow: "0 0 3px hsl(0 0% 0% / 0.4)",
          }}
        >
          {playing ? (
            <Pause className="w-[7px] h-[7px]" style={{ color: "hsl(0 0% 25%)" }} />
          ) : (
            <Play className="w-[7px] h-[7px] ml-[1px]" style={{ color: "hsl(0 0% 25%)" }} />
          )}
        </div>
      </button>

      {/* ── Expanded SoundCloud player panel ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="absolute rounded-2xl overflow-hidden backdrop-blur-xl"
            style={{
              bottom: "calc(100% + 12px)",
              right: 0,
              width: 320,
              zIndex: 100,
              background: "hsl(220 20% 8% / 0.95)",
              border: "1px solid hsl(0 0% 100% / 0.08)",
              boxShadow: "0 16px 48px hsl(0 0% 0% / 0.5), 0 4px 12px hsl(0 0% 0% / 0.3)",
            }}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <div className="flex items-center gap-2">
                <Music2 className="w-4 h-4" style={{ color: "hsl(24 70% 55%)" }} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "hsl(0 0% 100% / 0.85)",
                    letterSpacing: "0.01em",
                  }}
                >
                  Now Playing
                </span>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: "hsl(0 0% 100% / 0.3)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(0 0% 100% / 0.7)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "hsl(0 0% 100% / 0.3)"; }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SoundCloud embed */}
            <div className="px-3 pb-2">
              <iframe
                ref={iframeRef}
                width="100%"
                height="120"
                scrolling="no"
                frameBorder="no"
                allow="autoplay"
                src={SC_EMBED_URL}
                style={{
                  borderRadius: 10,
                  border: "1px solid hsl(0 0% 100% / 0.05)",
                  background: "hsl(220 20% 12%)",
                }}
                title="SoundCloud Player"
              />
            </div>

            {/* Playlist */}
            <div className="px-3 pb-3">
              <div className="flex items-center gap-1.5 px-1 pb-2">
                <ListMusic className="w-3 h-3" style={{ color: "hsl(0 0% 100% / 0.3)" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "hsl(0 0% 100% / 0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Playlist
                </span>
              </div>
              <div
                className="flex flex-col gap-0.5 overflow-y-auto"
                style={{ maxHeight: 160 }}
              >
                {PRELOADED_TRACKS.map((track, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTrack(i)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left w-full"
                    style={{
                      background: i === activeTrack ? "hsl(24 70% 55% / 0.1)" : "transparent",
                      border: i === activeTrack ? "1px solid hsl(24 70% 55% / 0.15)" : "1px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (i !== activeTrack) e.currentTarget.style.background = "hsl(0 0% 100% / 0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (i !== activeTrack) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: i === activeTrack ? "hsl(24 70% 55% / 0.2)" : "hsl(0 0% 100% / 0.06)",
                        fontSize: 9,
                        fontWeight: 600,
                        color: i === activeTrack ? "hsl(24 70% 55%)" : "hsl(0 0% 100% / 0.3)",
                      }}
                    >
                      {i === activeTrack && playing ? (
                        <motion.span
                          animate={{ opacity: [1, 0.4, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        >
                          ♪
                        </motion.span>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span
                        className="truncate"
                        style={{
                          fontSize: 12,
                          fontWeight: i === activeTrack ? 600 : 400,
                          color: i === activeTrack ? "hsl(0 0% 100% / 0.9)" : "hsl(0 0% 100% / 0.55)",
                        }}
                      >
                        {track.title}
                      </span>
                      <span
                        className="truncate"
                        style={{
                          fontSize: 10,
                          color: i === activeTrack ? "hsl(24 70% 55% / 0.7)" : "hsl(0 0% 100% / 0.25)",
                        }}
                      >
                        {track.artist}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
