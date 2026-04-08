

## Copy VinylPlayer from ANIMA Project

### What Changes

Replace the current `SoundCloudFab.tsx` with the exact `VinylPlayer` implementation from [ANIMA](/projects/b3eeb50e-9dcc-4e1e-8d72-c9156a86a75b). The key differences:

| Current (`SoundCloudFab`) | ANIMA (`VinylPlayer`) |
|---|---|
| 56px draggable FAB, bottom-right | 24px inline disc, sits in toolbar/footer |
| 4 playlist chooser | Single playlist: Ben Bohmer — Begin Again |
| Framer Motion `repeat: Infinity` spin | `requestAnimationFrame` smooth spin (no jank) |
| Conic gradient disc texture | Album artwork from SoundCloud as disc surface |
| Custom mini player with transport controls | Double-click opens SoundCloud visual embed |
| Play/pause icons on hover | Clean vinyl aesthetic, center spindle dot |
| Multiple color themes per playlist | Single cohesive look |

### Changes

#### 1. Replace SoundCloudFab with VinylPlayer
**File: `src/modules/oracle/components/SoundCloudFab.tsx`**

Rewrite entirely to match ANIMA's `VinylPlayer`:
- 24px disc with SVG vinyl grooves
- `requestAnimationFrame`-based rotation (smoother than CSS/framer-motion repeat)
- Album artwork fetched via `widget.getCurrentSound()`, used as disc background with `saturate(0.85) contrast(1.05) brightness(0.8)` filter
- SVG groove overlay with center spindle
- Single click: play/pause. Double click: toggle SoundCloud visual embed panel
- Track title shown adjacent to disc when playing
- Playlist: `https://soundcloud.com/ben-bohmer/sets/begin-again`
- Expanded panel: artwork header with gradient fade, "SoundCloud" label, 320x300 visual embed iframe

#### 2. Update Import Site
**File: wherever `SoundCloudFab` is imported (ResolvePage or layout)**

Update the import to use the new component — the export name stays the same (`default export`) so only internal behavior changes. If the current component is rendered as a fixed FAB, adjust the parent to position it inline (e.g., in the toolbar or footer area) matching ANIMA's footer placement.

### Files Changed

| File | Change |
|---|---|
| `src/modules/oracle/components/SoundCloudFab.tsx` | Full rewrite to match ANIMA VinylPlayer spec |
| Parent layout/page file | Adjust positioning if needed |

