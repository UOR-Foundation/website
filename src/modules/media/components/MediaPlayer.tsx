/**
 * MediaPlayer — Native video streaming via Piped API proxy.
 * Replaces YouTube iframe embeds with HTML5 <video> for reliable playback.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  ArrowLeft, Search, Play, Clock, User, X, ChevronRight,
  Pause, SkipForward, Volume2, VolumeX, Maximize, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VIDEO_CATEGORIES,
  getVideosByCategory,
  searchCatalog,
  getPipedThumbnail,
  resolveStream,
  type CatalogVideo,
  type VideoCategory,
} from "@/modules/media/lib/video-catalog";

/* ── Video Card ──────────────────────────────────────────────── */

function VideoCard({
  video, onPlay, compact, isActive,
}: {
  video: CatalogVideo; onPlay: (v: CatalogVideo) => void;
  compact?: boolean; isActive?: boolean;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <button
      onClick={() => onPlay(video)}
      className={cn(
        "group text-left rounded-xl overflow-hidden transition-all duration-150",
        "hover:scale-[1.02] active:scale-[0.98] touch-manipulation select-none border",
        compact ? "flex items-center gap-3 p-2" : "flex flex-col",
        isActive
          ? "bg-white/[0.08] border-white/[0.15] ring-1 ring-white/[0.08]"
          : "bg-white/[0.04] border-white/[0.06] hover:border-white/[0.12]",
      )}
    >
      <div className={cn(
        "relative overflow-hidden flex-shrink-0",
        compact ? "w-40 h-[90px] rounded-lg" : "w-full aspect-video rounded-t-xl",
        !imgLoaded && "bg-white/[0.03] animate-pulse",
      )}>
        <img
          src={getPipedThumbnail(video.id)}
          alt={video.title}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            imgLoaded ? "opacity-100" : "opacity-0",
          )}
        />
        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-black/75 text-white/90 tabular-nums">
          {video.duration}
        </span>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-black/20">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>
      <div className={cn("min-w-0", compact ? "flex-1 py-1" : "p-3 pt-2.5")}>
        <p className={cn(
          "text-white/90 font-medium leading-snug",
          compact ? "text-[13px] line-clamp-2" : "text-sm line-clamp-2",
        )}>{video.title}</p>
        <p className={cn("text-white/40 mt-0.5", compact ? "text-[11px]" : "text-xs")}>
          {video.channel}
        </p>
      </div>
    </button>
  );
}

/* ── Native Video Player ─────────────────────────────────────── */

function NativePlayer({
  video, onEnded,
}: {
  video: CatalogVideo; onEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  // Resolve stream URL
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStreamUrl(null);

    resolveStream(video.id).then((result) => {
      if (cancelled) return;
      if (result?.streamUrl) {
        setStreamUrl(result.streamUrl);
      } else {
        setError("Could not load video stream. Piped instances may be temporarily unavailable.");
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [video.id]);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimer.current);
  }, [resetHideTimer]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPaused(false); }
    else { v.pause(); setPaused(true); }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pct * duration;
  }, [duration]);

  const goFullscreen = useCallback(() => {
    videoRef.current?.requestFullscreen?.();
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
          <p className="text-white/30 text-sm">Resolving stream…</p>
        </div>
      </div>
    );
  }

  if (error || !streamUrl) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 max-w-sm text-center px-4">
          <p className="text-white/50 text-sm">{error || "Stream unavailable"}</p>
          <a
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Open on YouTube ↗
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full aspect-video bg-black relative group cursor-pointer"
      onMouseMove={resetHideTimer}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={streamUrl}
        autoPlay
        className="w-full h-full object-contain"
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (v) { setProgress(v.currentTime); setDuration(v.duration || 0); }
        }}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onEnded={onEnded}
        onLoadedMetadata={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
        }}
      />

      {/* Controls overlay */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 transition-opacity duration-300",
          "bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-12",
          showControls || paused ? "opacity-100" : "opacity-0",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seek bar */}
        <div
          className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group/seek"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-white/80 rounded-full relative transition-all"
            style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover/seek:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            {paused
              ? <Play className="w-4 h-4 text-white" fill="currentColor" />
              : <Pause className="w-4 h-4 text-white" fill="currentColor" />}
          </button>

          <span className="text-[11px] text-white/60 tabular-nums min-w-[80px]">
            {formatTime(progress)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          <button
            onClick={toggleMute}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            {muted
              ? <VolumeX className="w-4 h-4 text-white/70" />
              : <Volume2 className="w-4 h-4 text-white/70" />}
          </button>

          <button
            onClick={goFullscreen}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <Maximize className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

export default function MediaPlayer() {
  const [activeCategory, setActiveCategory] = useState<VideoCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [playing, setPlaying] = useState<CatalogVideo | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const queue = useMemo(() => {
    if (!playing) return [];
    const catVideos = getVideosByCategory(playing.category);
    const idx = catVideos.findIndex(v => v.id === playing.id);
    return catVideos.slice(idx + 1).concat(catVideos.slice(0, idx));
  }, [playing]);

  const displayVideos = useMemo(() => {
    if (searchQuery.trim()) return searchCatalog(searchQuery);
    return getVideosByCategory(activeCategory);
  }, [activeCategory, searchQuery]);

  const handlePlay = useCallback((v: CatalogVideo) => {
    setPlaying(v);
    setSearchQuery("");
  }, []);

  const handleBack = useCallback(() => setPlaying(null), []);

  const handleNext = useCallback(() => {
    if (queue.length > 0) setPlaying(queue[0]);
  }, [queue]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && playing) handleBack();
      if (e.key === "n" && e.altKey && playing) handleNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [playing, handleBack, handleNext]);

  /* ── Player View ── */
  if (playing) {
    return (
      <div className="h-full flex flex-col bg-[hsl(220_15%_6%)] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <button
            onClick={handleBack}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.06] active:scale-95 transition-all duration-100 touch-manipulation"
            title="Back to browse (Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/90 truncate">{playing.title}</p>
            <p className="text-[11px] text-white/40 truncate">{playing.channel}</p>
          </div>
          {queue.length > 0 && (
            <button
              onClick={handleNext}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.06] active:scale-95 transition-all duration-100 touch-manipulation"
              title="Next (Alt+N)"
            >
              <SkipForward className="w-4 h-4 text-white/50" />
            </button>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-shrink-0">
              <NativePlayer video={playing} onEnded={handleNext} />
            </div>
            <div className="p-4 flex-shrink-0">
              <h2 className="text-base font-semibold text-white/95 leading-snug">{playing.title}</h2>
              <div className="flex items-center gap-3 mt-1.5 text-[12px] text-white/40">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{playing.channel}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{playing.duration}</span>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/50 text-[10px] font-medium">{playing.category}</span>
              </div>
            </div>
          </div>

          {queue.length > 0 && (
            <div className="w-72 border-l border-white/[0.06] flex-shrink-0 flex-col overflow-hidden hidden md:flex">
              <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                <span className="text-[12px] font-medium text-white/50 uppercase tracking-wider">Up Next</span>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1.5" style={{ willChange: "transform" }}>
                {queue.slice(0, 12).map(v => (
                  <VideoCard key={v.id} video={v} onPlay={handlePlay} compact isActive={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Browse View ── */
  return (
    <div className="h-full flex flex-col bg-[hsl(220_15%_6%)] overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-4 pb-2 space-y-3">
        <div className={cn(
          "relative flex items-center rounded-full transition-all duration-150",
          "bg-white/[0.05] border",
          searchFocused ? "border-white/[0.15] shadow-[0_0_0_2px_rgba(255,255,255,0.04)]" : "border-white/[0.06]",
        )}>
          <Search className="w-4 h-4 text-white/30 ml-3.5 flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search videos…"
            className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/25 py-2.5 px-3 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="mr-2 w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {VIDEO_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setSearchQuery(""); }}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all duration-100",
                "touch-manipulation select-none active:scale-[0.96]",
                activeCategory === cat && !searchQuery
                  ? "bg-white/[0.12] text-white/90 border border-white/[0.15]"
                  : "text-white/40 hover:text-white/60 hover:bg-white/[0.04] border border-transparent",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4" style={{ willChange: "transform" }}>
        {displayVideos.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-white/25 text-sm">No videos found</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {displayVideos.map(v => (
              <VideoCard key={v.id} video={v} onPlay={handlePlay} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
