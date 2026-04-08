

## Add Spinning Vinyl Disc to Immersive Mode

### Problem

The `SoundCloudFab` component only lives inside `Footer.tsx`, which is not rendered in immersive mode. The immersive view (`ImmersiveSearchView` + `ImmersiveBackground`) is a full-screen overlay that completely bypasses the `Layout` component and its footer.

### Plan

#### 1. Add SoundCloudFab to the Immersive Search View Bottom Bar

**File: `src/modules/oracle/components/ImmersiveSearchView.tsx`**

Import `SoundCloudFab` and place it in the existing bottom bar (lines 194-202), positioned at the bottom-right, just above the photo credit text. The disc will sit naturally alongside the "Photo · Unsplash" label.

```text
Bottom bar layout (current):
  [Universal Object Reference]                    [Photo · Unsplash]

Bottom bar layout (new):
  [Universal Object Reference]          [🎵 vinyl disc] [Photo · Unsplash]
```

#### 2. Add SoundCloudFab to the Immersive Reader View

**File: `src/modules/oracle/pages/ResolvePage.tsx`**

When a result is displayed in immersive mode, the footer is also hidden. Add a fixed-position `SoundCloudFab` at the bottom-right corner of the immersive reader view so the vinyl disc remains accessible while reading content.

#### 3. Make SoundCloudFab Draggable

**File: `src/modules/oracle/components/SoundCloudFab.tsx`**

Wrap the outer container with Framer Motion's `drag` prop so the disc can be repositioned by the user. Constrain dragging to the viewport bounds. The disc starts at its default position (bottom-right) and can be moved freely.

Key changes:
- Wrap in `motion.div` with `drag`, `dragConstraints` referencing the viewport, and `dragElastic={0.1}`
- Distinguish drag from click: use `onPointerDown`/`onPointerUp` distance check so short taps still trigger play/pause and double-tap still opens the panel
- Persist last drag position in `localStorage` so it stays where the user left it across sessions

### Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/components/ImmersiveSearchView.tsx` | Import and render `SoundCloudFab` in bottom bar |
| `src/modules/oracle/pages/ResolvePage.tsx` | Render `SoundCloudFab` in immersive reader mode |
| `src/modules/oracle/components/SoundCloudFab.tsx` | Add Framer Motion `drag` support with viewport constraints |

