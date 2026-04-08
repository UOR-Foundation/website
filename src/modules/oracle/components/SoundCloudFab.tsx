/**
 * SoundCloudFab — Draggable floating disc that plays SoundCloud playlists.
 * 
 * - Click: toggles play/pause with spinning animation
 * - Double-click: opens mini player with playlist chooser
 * - Draggable to any screen position
 * - Only visible in immersive mode
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Play, Pause, X, SkipForward, SkipBack, Volume2, VolumeX } from "lucide-react";

/* ── SoundCloud playlists (public, no API key needed) ── */
const SC_PLAYLISTS = [
  {
    id: "chillhop",
    name: "Lo-Fi Focus",
    url: "https://soundcloud.com/chaboree/sets/lofi-hip-hop-chill",
    color: "hsl(200 60% 50%)",
  },
  {
    id: "ambient",
    name: "Ambient Worlds",
    url: "https://soundcloud.com/ambientmusicalgenre/sets/the-ambient-realm",
    color: "hsl(260 60% 50%)",
  },
  {
    id: "deep-focus",
    name: "Deep Focus",
    url: "https://soundcloud.com/lakeyinspired/sets/chill-nation",
    color: "hsl(140 50% 45%)",
  },
  {
    id: "jazz",
    name: "Jazz Café",
    url: "https://soundcloud.com/jazzandsoul/sets/smooth-jazz-selection",
    color: "hsl(30 70% 50%)",
  },
];

const SC_WIDGET_API = "https://w.soundcloud.com/player/";

export default function SoundCloudFab() {
  const [playing, setPlaying] = useState(false);
  const [showMini, setShowMini] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState(SC_PLAYLISTS[0]);
  const [muted, setMuted] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<any>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Position state for drag
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Load SoundCloud Widget API script
  useEffect(() => {
    if ((window as any).SC?.Widget) return;

    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      try { document.body.removeChild(script); } catch {}
    };
  }, []);

  // Initialize widget when iframe loads
  const initWidget = useCallback(() => {
    const SC = (window as any).SC;
    if (!SC?.Widget || !iframeRef.current) return;

    const widget = SC.Widget(iframeRef.current);
    widgetRef.current = widget;

    widget.bind(SC.Widget.Events.READY, () => {
      widget.setVolume(80);
      // Get initial track title
      widget.getCurrentSound((sound: any) => {
        if (sound?.title) setTrackTitle(sound.title);
      });
    });

    widget.bind(SC.Widget.Events.PLAY, () => {
      setPlaying(true);
      widget.getCurrentSound((sound: any) => {
        if (sound?.title) setTrackTitle(sound.title);
      });
    });

    widget.bind(SC.Widget.Events.PAUSE, () => setPlaying(false));
    widget.bind(SC.Widget.Events.FINISH, () => {
      widget.next();
    });
  }, []);

  const togglePlay = useCallback(() => {
    const widget = widgetRef.current;
    if (!widget) return;
    widget.toggle();
  }, []);

  const handleClick = useCallback(() => {
    // Single click: play/pause. Double-click: open mini player.
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setShowMini(prev => !prev);
      return;
    }

    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      togglePlay();
    }, 250);
  }, [togglePlay]);

  const switchPlaylist = useCallback((playlist: typeof SC_PLAYLISTS[0]) => {
    setActivePlaylist(playlist);
    setTrackTitle("");
    // Widget will re-mount with new URL
    setTimeout(() => {
      const widget = widgetRef.current;
      if (widget) {
        widget.play();
      }
    }, 1000);
  }, []);

  const skipNext = useCallback(() => widgetRef.current?.next(), []);
  const skipPrev = useCallback(() => widgetRef.current?.prev(), []);

  const toggleMute = useCallback(() => {
    const widget = widgetRef.current;
    if (!widget) return;
    if (muted) {
      widget.setVolume(80);
    } else {
      widget.setVolume(0);
    }
    setMuted(!muted);
  }, [muted]);

  const iframeSrc = `${SC_WIDGET_API}?url=${encodeURIComponent(activePlaylist.url)}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false&color=%23ff5500`;

  return (
    <>
      {/* Drag constraint area — full screen */}
      <div ref={constraintsRef} className="fixed inset-0 z-[90] pointer-events-none" />

      {/* Hidden SoundCloud iframe */}
      <iframe
        ref={iframeRef}
        key={activePlaylist.id}
        src={iframeSrc}
        onLoad={initWidget}
        className="hidden"
        allow="autoplay"
        title="SoundCloud Player"
      />

      {/* Draggable Floating Disc */}
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0.1}
        initial={{ x: 0, y: 0 }}
        className="fixed bottom-8 right-8 z-[95] pointer-events-auto"
        style={{ touchAction: "none" }}
      >
        {/* The disc button */}
        <motion.button
          onClick={handleClick}
          className="relative w-14 h-14 rounded-full shadow-2xl focus:outline-none group"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          title={playing ? "Click to pause · Double-click for player" : "Click to play · Double-click for player"}
        >
          {/* Outer glow ring */}
          <motion.div
            className="absolute -inset-1 rounded-full opacity-50"
            style={{ background: `radial-gradient(circle, ${activePlaylist.color}, transparent 70%)` }}
            animate={playing ? { scale: [1, 1.3, 1], opacity: [0.4, 0.15, 0.4] } : { scale: 1, opacity: 0.2 }}
            transition={playing ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
          />

          {/* Disc body — spins when playing */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white/20 overflow-hidden"
            style={{
              background: `conic-gradient(from 0deg, hsl(0 0% 8%), hsl(0 0% 14%), hsl(0 0% 8%), hsl(0 0% 14%), hsl(0 0% 8%))`,
            }}
            animate={playing ? { rotate: 360 } : { rotate: 0 }}
            transition={playing ? { duration: 3, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
          >
            {/* Vinyl grooves */}
            <div className="absolute inset-2 rounded-full border border-white/5" />
            <div className="absolute inset-4 rounded-full border border-white/5" />
            <div className="absolute inset-[22px] rounded-full border border-white/8" />

            {/* Center label */}
            <div
              className="absolute inset-[18px] rounded-full flex items-center justify-center"
              style={{ background: activePlaylist.color }}
            >
              <div className="w-2 h-2 rounded-full bg-black/40" />
            </div>
          </motion.div>

          {/* Play/Pause overlay on hover */}
          <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-sm">
            {playing ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </div>
        </motion.button>

        {/* Mini Player Panel */}
        <AnimatePresence>
          {showMini && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="absolute bottom-[72px] right-0 w-72 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: activePlaylist.color }} />
                  <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">SoundCloud</span>
                </div>
                <button
                  onClick={() => setShowMini(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Now playing */}
              <div className="px-4 pb-3">
                <p className="text-white/90 text-sm font-medium truncate">
                  {trackTitle || activePlaylist.name}
                </p>
                <p className="text-white/40 text-xs mt-0.5">{activePlaylist.name}</p>
              </div>

              {/* Transport controls */}
              <div className="flex items-center justify-center gap-4 px-4 pb-4">
                <button onClick={skipPrev} className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white/90 hover:bg-white/10 transition-all">
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all"
                  style={{ background: activePlaylist.color }}
                >
                  {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <button onClick={skipNext} className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white/90 hover:bg-white/10 transition-all">
                  <SkipForward className="w-4 h-4" />
                </button>
                <button onClick={toggleMute} className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white/90 hover:bg-white/10 transition-all">
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Playlist chooser */}
              <div className="border-t border-white/5 px-2 py-2">
                <p className="text-white/30 text-[10px] font-semibold tracking-widest uppercase px-2 mb-1.5">Playlists</p>
                {SC_PLAYLISTS.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => switchPlaylist(pl)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                      activePlaylist.id === pl.id
                        ? "bg-white/10 text-white"
                        : "text-white/50 hover:text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: pl.color }} />
                    <span className="text-xs font-medium truncate">{pl.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
