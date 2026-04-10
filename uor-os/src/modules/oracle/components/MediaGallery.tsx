/**
 * MediaGallery — UOR-anchored multimedia components for knowledge lenses.
 * ImageGallery, VideoEmbed, AudioPlayer — each asset shows a subtle uor:hash badge.
 */

import React, { useState } from "react";
import { ExternalLink, X, Play, Volume2 } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface MediaImage {
  url: string;
  caption?: string;
  uorHash: string;
  source: string;
}

export interface MediaVideo {
  youtubeId: string;
  title: string;
  uorHash: string;
}

export interface MediaAudio {
  url: string;
  title: string;
  uorHash: string;
}

export interface MediaData {
  images: MediaImage[];
  videos: MediaVideo[];
  audio?: MediaAudio[];
}

/* ── Lightbox ──────────────────────────────────────────────────────── */

const Lightbox: React.FC<{
  image: MediaImage;
  onClose: () => void;
}> = ({ image, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    onClick={onClose}
  >
    <button
      onClick={onClose}
      className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
    >
      <X className="w-6 h-6" />
    </button>
    <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
      <img
        src={image.url}
        alt={image.caption || ""}
        className="max-w-full max-h-[75vh] object-contain rounded-lg"
      />
      {image.caption && (
        <p className="text-white/70 text-sm text-center max-w-lg">{image.caption}</p>
      )}
      <span className="text-white/30 text-[10px] font-mono">
        uor:{image.uorHash} · {image.source}
      </span>
    </div>
  </div>
);

/* ── ImageGallery ──────────────────────────────────────────────────── */

export const ImageGallery: React.FC<{
  images: MediaImage[];
  layout?: "grid" | "hero" | "figure" | "playful";
  maxImages?: number;
  className?: string;
}> = ({ images, layout = "grid", maxImages = 6, className = "" }) => {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const visible = images.slice(0, maxImages);

  if (visible.length === 0) return null;

  if (layout === "hero" && visible.length > 0) {
    const hero = visible[0];
    return (
      <>
        <div className={`relative group cursor-pointer ${className}`} onClick={() => setLightboxIdx(0)}>
          <img
            src={hero.url}
            alt={hero.caption || ""}
            loading="lazy"
            className="w-full rounded-lg object-cover"
            style={{ maxHeight: 480, aspectRatio: "1.618 / 1" }}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg p-4">
            {hero.caption && (
              <p className="text-white/90 text-sm">{hero.caption}</p>
            )}
            <span className="text-white/30 text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              uor:{hero.uorHash}
            </span>
          </div>
        </div>
        {lightboxIdx !== null && (
          <Lightbox image={visible[lightboxIdx]} onClose={() => setLightboxIdx(null)} />
        )}
      </>
    );
  }

  if (layout === "figure") {
    return (
      <>
        <div className={`flex flex-col gap-4 ${className}`}>
          {visible.map((img, i) => (
            <figure
              key={i}
              className="group cursor-pointer"
              onClick={() => setLightboxIdx(i)}
              style={{ margin: 0 }}
            >
              <div className="relative overflow-hidden rounded-md border border-border/15">
                <img
                  src={img.url}
                  alt={img.caption || ""}
                  loading="lazy"
                  className="w-full object-cover"
                  style={{ maxHeight: 200, width: "100%" }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
              <figcaption className="text-muted-foreground/50 text-[11px] mt-1.5 leading-snug">
                <span className="text-foreground/60 font-medium">Fig. {i + 1}.</span>{" "}
                {img.caption || ""}
                <span className="text-muted-foreground/25 font-mono text-[9px] ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  uor:{img.uorHash}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        {lightboxIdx !== null && (
          <Lightbox image={visible[lightboxIdx]} onClose={() => setLightboxIdx(null)} />
        )}
      </>
    );
  }

  if (layout === "playful") {
    return (
      <>
        <div className={`flex flex-wrap gap-3 ${className}`}>
          {visible.map((img, i) => (
            <div
              key={i}
              className="bg-primary/[0.04] border border-primary/10 rounded-2xl overflow-hidden cursor-pointer group"
              style={{ maxWidth: 200 }}
              onClick={() => setLightboxIdx(i)}
            >
              <img
                src={img.url}
                alt={img.caption || ""}
                loading="lazy"
                className="w-full object-cover"
                style={{ height: 140 }}
              />
              <div className="p-2.5">
                <p className="text-foreground/70 text-xs leading-snug">
                  👀 {img.caption || "Check this out!"}
                </p>
                <span className="text-muted-foreground/20 text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                  uor:{img.uorHash}
                </span>
              </div>
            </div>
          ))}
        </div>
        {lightboxIdx !== null && (
          <Lightbox image={visible[lightboxIdx]} onClose={() => setLightboxIdx(null)} />
        )}
      </>
    );
  }

  // Default grid
  return (
    <>
      <div className={`grid gap-3 ${visible.length === 1 ? "grid-cols-1" : visible.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"} ${className}`}>
        {visible.map((img, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-lg border border-border/15 cursor-pointer"
            onClick={() => setLightboxIdx(i)}
          >
            <img
              src={img.url}
              alt={img.caption || ""}
              loading="lazy"
              className="w-full object-cover transition-transform group-hover:scale-105"
              style={{ height: 200 }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white/80 text-[11px] leading-snug truncate">
                {img.caption || img.source}
              </p>
              <span className="text-white/30 text-[8px] font-mono">uor:{img.uorHash}</span>
            </div>
          </div>
        ))}
      </div>
      {lightboxIdx !== null && (
        <Lightbox image={visible[lightboxIdx]} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  );
};

/* ── VideoEmbed ────────────────────────────────────────────────────── */

export const VideoEmbed: React.FC<{
  video: MediaVideo;
  variant?: "default" | "card" | "playful";
  className?: string;
}> = ({ video, variant = "default", className = "" }) => {
  const [loaded, setLoaded] = useState(false);

  if (variant === "playful") {
    return (
      <div className={`bg-accent/[0.06] border border-accent/15 rounded-2xl overflow-hidden ${className}`}>
        <div className="p-3 pb-0">
          <p className="text-foreground/70 text-sm font-semibold flex items-center gap-2">
            🎬 Watch and Learn!
          </p>
        </div>
        <div className="p-3">
          {!loaded ? (
            <button
              onClick={() => setLoaded(true)}
              className="relative w-full rounded-xl overflow-hidden group"
              style={{ aspectRatio: "16/9" }}
            >
              <img
                src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <Play className="w-7 h-7 text-red-600 ml-1" />
                </div>
              </div>
            </button>
          ) : (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full rounded-xl"
              style={{ aspectRatio: "16/9", border: "none" }}
            />
          )}
          <p className="text-foreground/60 text-xs mt-2">{video.title}</p>
          <span className="text-muted-foreground/20 text-[8px] font-mono">uor:{video.uorHash}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      {!loaded ? (
        <button
          onClick={() => setLoaded(true)}
          className="relative w-full group"
          style={{ aspectRatio: "16/9" }}
        >
          <img
            src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
            alt={video.title}
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors rounded-lg">
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play className="w-8 h-8 text-red-600 ml-1" />
            </div>
          </div>
        </button>
      ) : (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full rounded-lg"
          style={{ aspectRatio: "16/9", border: "none" }}
        />
      )}
      <div className="flex items-center justify-between mt-2">
        <p className="text-foreground/60 text-sm">{video.title}</p>
        <span className="text-muted-foreground/20 text-[9px] font-mono">uor:{video.uorHash}</span>
      </div>
    </div>
  );
};

/* ── AudioPlayer ───────────────────────────────────────────────────── */

export const AudioPlayer: React.FC<{
  audio: MediaAudio;
  className?: string;
}> = ({ audio, className = "" }) => (
  <div className={`flex items-center gap-3 bg-muted/15 border border-border/15 rounded-lg px-4 py-3 ${className}`}>
    <Volume2 className="w-4 h-4 text-primary/50 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-foreground/70 text-sm truncate">{audio.title}</p>
      <audio controls className="w-full mt-1.5" style={{ height: 28 }}>
        <source src={audio.url} />
      </audio>
    </div>
    <span className="text-muted-foreground/20 text-[8px] font-mono shrink-0">uor:{audio.uorHash}</span>
  </div>
);

/* ── Composite: lens-specific media sections ──────────────────────── */

export const EncyclopediaMedia: React.FC<{ media: MediaData }> = ({ media }) => {
  if (media.images.length === 0 && media.videos.length === 0) return null;
  return (
    <div className="border-t border-border/15 mt-8 pt-6">
      <h2
        className="text-foreground border-b border-border/25"
        style={{
          fontSize: "1.35rem",
          fontWeight: 600,
          fontFamily: "Georgia, 'Times New Roman', serif",
          paddingBottom: 4,
          marginBottom: 16,
        }}
      >
        Media
      </h2>
      {media.images.length > 0 && <ImageGallery images={media.images} layout="grid" maxImages={6} className="mb-6" />}
      {media.videos.length > 0 && <VideoEmbed video={media.videos[0]} className="mt-4" />}
      {media.audio && media.audio.length > 0 && (
        <div className="mt-4 space-y-2">
          {media.audio.map((a, i) => <AudioPlayer key={i} audio={a} />)}
        </div>
      )}
    </div>
  );
};

export const ExpertMedia: React.FC<{ media: MediaData }> = ({ media }) => {
  const hasContent = media.images.length > 0 || media.videos.length > 0;
  if (!hasContent) return null;
  return (
    <details className="border border-border/15 rounded-md mt-6 group">
      <summary className="px-4 py-3 cursor-pointer text-foreground/60 text-xs font-bold uppercase tracking-wider select-none">
        Supplementary Materials ({media.images.length + media.videos.length})
      </summary>
      <div className="px-4 pb-4 pt-2 space-y-4">
        {media.images.length > 0 && <ImageGallery images={media.images} layout="figure" maxImages={4} />}
        {media.videos.length > 0 && <VideoEmbed video={media.videos[0]} />}
      </div>
    </details>
  );
};
