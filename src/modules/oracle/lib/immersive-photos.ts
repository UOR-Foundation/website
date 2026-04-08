/**
 * Shared Unsplash curated landscape collection for immersive mode.
 * Used by both ImmersiveSearchView and ImmersiveBackground.
 */

export const UNSPLASH_PHOTOS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1920&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1920&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1920&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=1920&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80&auto=format&fit=crop",
];

export function getDailyPhoto(): string {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return UNSPLASH_PHOTOS[day % UNSPLASH_PHOTOS.length];
}
