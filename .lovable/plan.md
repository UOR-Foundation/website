

## Multimodal Lens Enhancement — UOR-Anchored Media Integration

### Overview

Enrich each knowledge lens with contextual multimedia (images, video, audio) pulled from free public APIs. Each media asset is content-addressed via UOR (fnv1a hash) and rendered per-lens with distinct visual treatments. The approach: the edge function fetches multimedia metadata alongside Wikipedia/Wikidata, emits it in the SSE stream, and each lens renderer integrates media appropriate to its character.

### Media Sources (No API Key Required)

| Source | Data | API |
|--------|------|-----|
| **Wikimedia Commons** | High-res images, diagrams, maps | `commons.wikimedia.org/w/api.php` (free, no key) |
| **Wikipedia page images** | Already have thumbnail via REST API; extend to get all page images |
| **Wikidata P18** | Main image property — already fetched but only as text. Resolve to Wikimedia Commons URL |
| **YouTube** | Relevant educational videos | `www.youtube.com/oembed` for embedding (no key for oembed) |

### Architecture

```text
Edge Function (uor-knowledge)
  ├── fetchWikipedia()        ← existing
  ├── fetchWikidataFacts()    ← existing, enhance P18 → image URL
  ├── fetchCommonsMedia()     ← NEW: images, audio, video from Commons
  └── SSE stream
       └── wiki event now includes:
           media: {
             images: [{ url, caption, uorHash, source }],
             videos: [{ youtubeId, title, uorHash }],
             audio?: [{ url, title, uorHash }]
           }
```

### Changes

#### 1. Edge function: `supabase/functions/uor-knowledge/index.ts`

**New function `fetchCommonsMedia(term, qid)`:**
- Query Wikimedia Commons API for images related to the topic: `action=query&generator=images` on the Wikipedia page
- Also resolve Wikidata P18 (Image) property to a full Wikimedia Commons URL via the standard filename→URL formula
- Return up to 4-6 images with captions and URLs
- Query YouTube oembed for 1-2 relevant educational videos (search term + "explained" or "documentary")

**Updated SSE `wiki` event:** Add `media` field containing `images[]`, `videos[]`, and optionally `audio[]`. Each entry has a `uorHash` (fnv1a of URL) for content-addressing.

#### 2. New component: `src/modules/oracle/components/MediaGallery.tsx`

Shared component for rendering media across lenses:
- **ImageGallery**: Responsive grid of images with captions, lazy loading, lightbox on click. Each image shows a subtle `uor:hash` badge on hover
- **VideoEmbed**: YouTube iframe embed with privacy-enhanced mode, 16:9 aspect ratio, rounded corners
- **AudioPlayer**: Simple HTML5 audio player for Wikimedia audio clips (pronunciation, etc.)

#### 3. Lens-specific media integration

Each lens gets media placed differently, matching its character:

| Lens | Media Treatment |
|------|----------------|
| **Encyclopedia** | Infobox already has thumbnail. Add a "Media" section after the article body with a 2-3 column image grid and video embed. Scholarly, caption-heavy |
| **Magazine** | Full-bleed hero image at top (largest Commons image). Mid-article image breaks between sections. Video at end as "Watch More" |
| **Storyteller** | Cinematic: large images between story chapters as "scene breaks". Video as an epilogue |
| **Explain-like-5** | Fun: images with emoji-decorated captions in pastel callout cards. Video as "Watch and Learn! 🎬" |
| **Expert** | Compact: small figure thumbnails in the margin/inline. Diagrams preferred. Video in a collapsible "Supplementary Materials" section |

#### 4. Update `stream-knowledge.ts`

Extend `WikiMeta` interface to include `media` field. Pass through to renderers.

#### 5. Update `LensRendererProps` interface

Add optional `media` prop to all lens renderers. Each renderer checks for available media and renders it in its lens-appropriate style.

#### 6. Update `ContextualArticleView.tsx` and `HumanContentView.tsx`

Pass `media` data from the wiki metadata through to the active lens renderer.

### Per-Lens Media Placement Detail

**Magazine** — The most media-rich:
- Hero image below title/above pull-quote (full width, 400px max height, cover crop)
- Section break images after every 2nd `## heading` (alternating left/right float)
- Video embed before References footer

**Storyteller** — Cinematic scene breaks:
- Large centered image after 1st chapter heading (captioned as "scene setter")
- Subsequent images as full-width dividers between chapters
- No video inline (would break narrative); optional at end

**Simple (ELI5)** — Playful integration:
- Images in colorful rounded cards with fun captions ("Look at this! 👀")
- Video in a "Watch and Learn" card with play button overlay
- Max 2-3 images to keep it focused

**Expert** — Minimal, reference-style:
- Small figure thumbnails (150px) floated right with "Fig. N" labels
- Collapsible "Supplementary Media" section at end

**Encyclopedia** — Already has infobox thumbnail. Add:
- Additional images in a grid below the article
- Video embed in a "Media" section

### UOR Framework Integration

Every media asset gets:
- `uorHash`: fnv1a content-address of the URL
- `source`: provenance tag ("wikimedia-commons", "wikidata-p18", "youtube")
- These are displayed as subtle badges on hover, maintaining the UOR identity space

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/uor-knowledge/index.ts` | Add `fetchCommonsMedia()`, resolve P18 images, YouTube oembed; emit `media` in SSE |
| `src/modules/oracle/components/MediaGallery.tsx` | **New** — ImageGallery, VideoEmbed, AudioPlayer components |
| `src/modules/oracle/lib/stream-knowledge.ts` | Extend `WikiMeta` with `media` field |
| `src/modules/oracle/components/WikiArticleView.tsx` | Add media section after article body |
| `src/modules/oracle/components/lenses/MagazineLensRenderer.tsx` | Hero image, section break images, video |
| `src/modules/oracle/components/lenses/StoryLensRenderer.tsx` | Cinematic scene-break images |
| `src/modules/oracle/components/lenses/SimpleLensRenderer.tsx` | Playful image cards, video card |
| `src/modules/oracle/components/lenses/DeepDiveLensRenderer.tsx` | Figure thumbnails, supplementary section |
| `src/modules/oracle/components/ContextualArticleView.tsx` | Pass media to lens renderers |
| `src/modules/oracle/components/HumanContentView.tsx` | Extract and pass media from wiki metadata |

