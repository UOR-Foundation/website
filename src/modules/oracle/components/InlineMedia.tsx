/**
 * InlineMedia — Distributes media items between content sections for a richer reading experience.
 * Uses semantic matching: each image is placed next to the section whose content
 * most closely relates to the image's caption, ensuring contextual coherence.
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

/* ── Semantic relevance scoring ──────────────────────────────────── */

/**
 * Compute a relevance score between an image caption and a text section.
 * Uses word overlap with IDF-like weighting (rare words score higher).
 */
function semanticRelevance(caption: string, sectionText: string): number {
  if (!caption || !sectionText) return 0;
  
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "and", "but", "or", "nor",
    "not", "no", "so", "if", "then", "than", "that", "this", "these",
    "those", "it", "its", "of", "in", "on", "at", "to", "for", "with",
    "by", "from", "as", "into", "about", "between", "through", "during",
    "before", "after", "above", "below", "up", "down", "out", "off",
    "over", "under", "again", "further", "once", "here", "there", "when",
    "where", "why", "how", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "only", "own", "same", "very",
    "file", "image", "jpg", "png", "gif", "jpeg", "commons", "wikipedia",
  ]);

  const tokenize = (text: string): string[] =>
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

  const captionWords = tokenize(caption);
  if (captionWords.length === 0) return 0;

  const sectionWords = new Set(tokenize(sectionText));
  
  let score = 0;
  const matched = new Set<string>();
  for (const word of captionWords) {
    if (sectionWords.has(word) && !matched.has(word)) {
      matched.add(word);
      // Longer words (more specific) score higher
      score += Math.min(word.length, 8);
    }
  }

  // Normalize by caption length to avoid bias toward long captions
  return captionWords.length > 0 ? score / Math.sqrt(captionWords.length) : 0;
}

/* ── Section-distributed media helper ─────────────────────────────── */

/**
 * Distributes images across markdown sections using SEMANTIC matching.
 * Each image is placed next to the section whose content is most relevant
 * to the image's caption, ensuring contextual coherence.
 * 
 * Returns a map: sectionIndex → image to show after that section.
 */
export function distributeMediaAcrossSections(
  markdown: string,
  images: MediaImage[],
  maxInline: number = 4,
): Map<number, MediaImage> {
  const sectionTexts = markdown.split(/\n##\s/);
  const sections = sectionTexts.length - 1;
  if (sections <= 0 || images.length === 0) return new Map();

  const usable = images.slice(0, maxInline);
  const map = new Map<number, MediaImage>();
  const usedSections = new Set<number>();
  const usedImages = new Set<number>();

  // Build a relevance matrix: [imageIdx][sectionIdx] = score
  const scores: number[][] = usable.map((img) =>
    sectionTexts.slice(1).map((sectionText) =>
      semanticRelevance(img.caption || "", sectionText)
    )
  );

  // Greedy assignment: pick the highest-scoring (image, section) pair repeatedly
  for (let round = 0; round < usable.length; round++) {
    let bestScore = -1;
    let bestImg = -1;
    let bestSection = -1;

    for (let i = 0; i < usable.length; i++) {
      if (usedImages.has(i)) continue;
      for (let s = 0; s < sections; s++) {
        if (usedSections.has(s)) continue;
        if (scores[i][s] > bestScore) {
          bestScore = scores[i][s];
          bestImg = i;
          bestSection = s;
        }
      }
    }

    if (bestImg === -1 || bestSection === -1) break;
    
    // Only place if there's meaningful relevance (score > 0)
    // or if this is the only option and the image is generally relevant
    if (bestScore > 0 || round === 0) {
      map.set(bestSection, usable[bestImg]);
      usedSections.add(bestSection);
      usedImages.add(bestImg);
    }
  }

  // If no semantic matches found at all, fall back to even distribution
  // but only for the first 1-2 images (better to show fewer than irrelevant ones)
  if (map.size === 0 && usable.length > 0 && sections > 0) {
    // Place only the first image at the first non-intro section
    const targetSection = Math.min(1, sections - 1);
    map.set(targetSection, usable[0]);
  }

  return map;
}