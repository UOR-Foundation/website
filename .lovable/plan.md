

# Fix Video Loading — Replace YouTube Embeds with Piped API Streams

## Problem

YouTube videos fail to load in two ways:
1. **Thumbnails**: `img.youtube.com` returns gray YouTube play-button placeholders for most videos (visible in the screenshot)
2. **Playback**: `youtube-nocookie.com/embed/` iframes are blocked when nested inside Lovable's preview iframe (YouTube sets `X-Frame-Options: SAMEORIGIN` which prevents double-nesting)

These are fundamental restrictions from YouTube's side that cannot be worked around with the current iframe approach.

## Solution: Piped API + Native HTML5 Video

**Piped** is an open-source, privacy-respecting YouTube proxy with a public API. It provides:
- Direct video stream URLs (no iframe needed)
- Working thumbnail URLs (proxied through their CDN)
- No API key required

Instead of embedding YouTube iframes, we'll fetch stream metadata from Piped's API and play videos using a native `<video>` element — completely bypassing YouTube's iframe restrictions.

**Why Piped over alternatives:**
- Invidious: primarily a frontend, API is less reliable for stream extraction
- Vimeo/Mux/BunnyCDN: require accounts, API keys, and content uploads
- Self-hosted proxy: would require significant infrastructure
- Piped: free, public API, multiple fallback instances, returns direct stream URLs

## Implementation

### 1. Create Edge Function: `video-stream` (`supabase/functions/video-stream/index.ts`)

A backend function that calls the Piped API to resolve YouTube video IDs into playable stream URLs and proxied thumbnails. This keeps API calls server-side and provides a stable interface.

```
GET /video-stream?id=VjHMDlAPMUw          → { streamUrl, thumbnailUrl, title }
GET /video-stream?id=VjHMDlAPMUw&thumb=1  → redirect to proxied thumbnail
```

- Tries multiple Piped instances as fallbacks (pipedapi.kavin.rocks, pipedapi.adminforge.de, etc.)
- Returns the best quality audio+video stream URL
- Caches responses in-memory for the function's lifetime

### 2. Update `video-catalog.ts` — Add Piped Thumbnail Helper

Add a `getPipedThumbnail(id)` function that returns a URL through our edge function, falling back to `img.youtube.com` if needed.

### 3. Rewrite `MediaPlayer.tsx` — Native Video Player

Replace the YouTube iframe with a native `<video>` element:
- On video selection, call the `video-stream` edge function to get the direct stream URL
- Show a loading state while the stream URL resolves
- Use `<video>` with full HTML5 controls (play/pause, seek, volume, fullscreen)
- Thumbnails load through the edge function's `?thumb=1` endpoint
- Keep all existing UI (browse grid, category tabs, search, queue sidebar)

### 4. Add Video Player Controls Component

Since we're moving from iframe (which has YouTube's built-in controls) to native `<video>`, add a minimal custom control bar:
- Play/Pause, seek bar, volume, fullscreen toggle
- Styled to match the existing dark cinema aesthetic

## Files

| File | Action | Purpose |
|---|---|---|
| `supabase/functions/video-stream/index.ts` | Create | Piped API proxy edge function |
| `src/modules/media/lib/video-catalog.ts` | Update | Add Piped thumbnail helper |
| `src/modules/media/components/MediaPlayer.tsx` | Rewrite | Native `<video>` player replacing iframe |

## Fallback Strategy

If Piped instances are temporarily down:
1. Try 3 different Piped API instances before failing
2. Fall back to `youtube-nocookie.com` iframe as last resort (works when not in nested iframe)
3. Thumbnails fall back to `img.youtube.com`

