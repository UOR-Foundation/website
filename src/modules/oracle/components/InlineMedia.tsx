/**
 * InlineMedia — Distributes media items between content sections for a richer reading experience.
 * Each lens calls this to weave images/videos naturally into the flow.
 */

import React, { useState, useMemo } from "react";
import { Play, Volume2, X } from "lucide-react";
import type { MediaData, MediaImage, MediaVideo, MediaAudio } from "../lib/stream-knowledge";

/* ── Lightbox ──────────────────────────────────────────────────────── */

const Lightbox: React.FC<{ image: MediaImage; onClose: () => void }> = ({ image, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
    <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
      <X className="w-6 h-6" />
    </button>
    <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
      <img src={image.url} alt={image.caption || ""} className="max-w-full max-h-[75vh] object-contain rounded-lg" />
      {image.caption && <p className="text-white/70 text-sm text-center max-w-lg">{image.caption}</p>}
    </div>
  </div>
);

/* ── Inline Figure (for editorial / story layouts) ─────────────────── */

export const InlineFigure: React.FC<{
  image: MediaImage;
  variant?: "float-right" | "full-width" | "pull-left" | "card";
  className?: string;
}> = ({ image, variant = "full-width", className = "" }) => {
  const [showLightbox, setShowLightbox] = useState(false);

  const wrapperStyle: React.CSSProperties = variant === "float-right"
    ? { float: "right", width: 280, marginLeft: 24, marginBottom: 16, marginTop: 4 }
    : variant === "pull-left"
      ? { float: "left", width: 260, marginRight: 24, marginBottom: 16, marginTop: 4 }
      : {};

  return (
    <>
      <figure
        className={`group cursor-pointer ${className}`}
        style={{ margin: 0, ...wrapperStyle }}
        onClick={() => setShowLightbox(true)}
      >
        <div className="relative overflow-hidden rounded-lg">
          <img
            src={image.url}
            alt={image.caption || ""}
            loading="lazy"
            className={`w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${
              variant === "full-width" ? "max-h-[400px]" : "max-h-[220px]"
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        {image.caption && (
          <figcaption
            className="text-muted-foreground/50 mt-2 leading-snug"
            style={{ fontSize: 12, fontStyle: "italic" }}
          >
            {image.caption}
          </figcaption>
        )}
      </figure>
      {showLightbox && <Lightbox image={image} onClose={() => setShowLightbox(false)} />}
    </>
  );
};

/* ── Inline Video ──────────────────────────────────────────────────── */

export const InlineVideo: React.FC<{
  video: MediaVideo;
  variant?: "default" | "cinematic" | "compact";
  className?: string;
}> = ({ video, variant = "default", className = "" }) => {
  const [loaded, setLoaded] = useState(false);

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
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors rounded-lg">
            <div className={`rounded-full bg-white/90 flex items-center justify-center shadow-lg ${
              variant === "compact" ? "w-12 h-12" : "w-16 h-16"
            }`}>
              <Play className={`text-red-600 ml-0.5 ${variant === "compact" ? "w-6 h-6" : "w-8 h-8"}`} />
            </div>
          </div>
          {variant === "cinematic" && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-lg">
              <p className="text-white/90 text-sm font-medium">{video.title}</p>
            </div>
          )}
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
      {!loaded && variant !== "cinematic" && (
        <p className="text-muted-foreground/50 text-xs mt-2 truncate">{video.title}</p>
      )}
    </div>
  );
};

/* ── Inline Audio ──────────────────────────────────────────────────── */

export const InlineAudio: React.FC<{
  audio: MediaAudio;
  className?: string;
}> = ({ audio, className = "" }) => (
  <div className={`flex items-center gap-3 bg-muted/10 border border-border/10 rounded-lg px-4 py-2.5 ${className}`}>
    <Volume2 className="w-4 h-4 text-primary/50 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-foreground/60 text-xs truncate mb-1">{audio.title}</p>
      <audio controls className="w-full" style={{ height: 28 }}>
        <source src={audio.url} />
      </audio>
    </div>
  </div>
);

/* ── Section-distributed media helper ─────────────────────────────── */

/**
 * Distributes images across markdown sections for inline placement.
 * Returns a map: sectionIndex → image to show after that section.
 */
export function distributeMediaAcrossSections(
  markdown: string,
  images: MediaImage[],
  maxInline: number = 4,
): Map<number, MediaImage> {
  const sections = markdown.split(/\n##\s/).length - 1;
  if (sections <= 0 || images.length === 0) return new Map();

  const usable = images.slice(0, maxInline);
  const map = new Map<number, MediaImage>();

  if (sections <= usable.length) {
    // Distribute evenly
    usable.forEach((img, i) => {
      const sectionIdx = Math.floor((i / usable.length) * sections);
      if (!map.has(sectionIdx)) map.set(sectionIdx, img);
    });
  } else {
    // Spread across available sections
    const step = Math.floor(sections / usable.length);
    usable.forEach((img, i) => {
      map.set(i * step, img);
    });
  }

  return map;
}
