

# Media Player — Native Video Streaming Experience

## Platform Choice: YouTube IFrame API

YouTube is the optimal choice for several reasons:
- Largest video catalog on earth (800M+ videos), highest quality
- Free IFrame Player API with full programmatic control (play, pause, seek, volume, quality selection)
- No API key required for embed playback — zero setup friction
- Supports `origin` parameter for security, `modestbranding` for clean UI
- Already proven in this codebase: the VinylPlayer uses the same iframe-embed pattern with SoundCloud

Alternative platforms (Vimeo, Dailymotion) have smaller catalogs and more restrictive embed policies. YouTube wins on breadth, quality, and API maturity.

## Architecture

Register a new `"media"` desktop app in the existing app system. The player opens as a standard OS window — consistent with Oracle, Messenger, Library, etc.

```text
MediaPlayer (desktop app window)
├── Header: search bar + category tabs
├── Featured Grid: curated video cards (thumbnail + title + channel)
├── Video Player: YouTube IFrame embed with custom controls overlay
└── Queue sidebar: up next / related
```

## Implementation

### 1. New file: `src/modules/media/components/MediaPlayer.tsx`
The main app component with three views:
- **Browse view**: A grid of curated video cards organized by categories (Music, Science, Technology, Nature, Art). Each card shows a YouTube thumbnail (`https://img.youtube.com/vi/{id}/mqdefault.jpg`), title, and channel name. Clicking opens the player view.
- **Player view**: YouTube IFrame embed (using the IFrame Player API for programmatic control), custom frosted-glass controls overlay matching the OS aesthetic, video title/channel below, and a sidebar list of related/queued videos.
- **Search view**: Text input that searches a curated catalog (local array of ~50-80 hand-picked high-quality videos across categories). No YouTube Data API needed — we curate the catalog ourselves.

The curated catalog is a static array of `{ id, title, channel, category, duration }` objects — beautiful, high-quality content (nature documentaries, electronic music sets, science explainers, art films). This avoids API key requirements entirely while ensuring quality control.

### 2. New file: `src/modules/media/lib/video-catalog.ts`
Static catalog of ~60 curated YouTube video IDs across categories:
- Music (Cercle sets, ambient, electronic)
- Nature (BBC, National Geographic clips)
- Science & Technology (Kurzgesagt, 3Blue1Brown, Veritasium)
- Art & Design (creative processes, architecture)
- Ambient (fireplace, rain, ocean — matching the OS calm aesthetic)

### 3. Modify: `src/modules/desktop/lib/desktop-apps.ts`
Register the new app:
- id: `"media"`, label: `"Media"`, icon: `Play` (from lucide)
- component: lazy import of MediaPlayer
- defaultSize: `{ w: 960, h: 640 }`
- category: `"RESOLVE"`
- keywords: `["video", "watch", "stream", "music", "youtube", "play", "media", "tv"]`

### 4. Modify: `src/modules/desktop/lib/os-taxonomy.ts`
Add `"media"` to RESOLVE appIds.

### 5. Design
- Dark theme matching the OS aesthetic (slate-950 backgrounds, white/[0.x] text)
- Frosted-glass video cards with hover scale effect
- Smooth transitions between browse ↔ player views
- Category tabs use the same pill style as messenger filter tabs
- Thumbnail grid uses golden-ratio proportions (16:10 cards)
- Touch-friendly: `active:scale-[0.97]`, `touch-manipulation`
- Player view: video fills ~70% width, queue sidebar fills remaining 30%

### 6. Home screen dock update
Modify `DesktopWidgets.tsx` to add Media to the quick-access row (replacing or extending the 5-icon dock).

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/modules/media/components/MediaPlayer.tsx` | Create | Main video player app |
| `src/modules/media/lib/video-catalog.ts` | Create | Curated video catalog |
| `desktop-apps.ts` | Modify | Register media app |
| `os-taxonomy.ts` | Modify | Add to RESOLVE category |
| `DesktopWidgets.tsx` | Modify | Add to home dock |

No database migrations needed. No API keys needed. Pure client-side.

