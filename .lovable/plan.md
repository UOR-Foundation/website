

## Persistent Immersive Mode — Glass-Like Reading Experience

### What Changes

When immersive mode is toggled ON, it persists across the entire flow — from search to rendered content. The reader mode gains a glass-like, translucent aesthetic with the same Unsplash background photo softly blurred behind the content, creating one continuous, delightful experience rather than snapping back to a dark UI when content loads.

### Design

**Immersive Reader** (when `immersiveMode + readerMode` are both true):
- The daily Unsplash photo stays as a **fixed, heavily blurred background** behind the article content
- A frosted-glass content panel floats over it: `backdrop-blur-xl`, `bg-white/[0.04]`, subtle `border border-white/[0.08]`
- The `ReaderToolbar` becomes glass-styled: translucent with `bg-white/[0.06] backdrop-blur-2xl`
- Text remains crisp and legible against the frosted surface — white/90 for headings, white/75 for body
- The transition from immersive search → immersive reader is seamless (background stays, content fades in)

**Immersive Profile Mode** (when `immersiveMode` is on but reader is toggled to details):
- Same glass treatment applies to the profile/details layout
- Cover image, avatar, and metadata cards get glass styling with `backdrop-blur` and translucent borders

### Implementation

#### 1. Extract shared daily photo utility
Move `getDailyPhoto()` and `UNSPLASH_PHOTOS` from `ImmersiveSearchView.tsx` into a small shared file `src/modules/oracle/lib/immersive-photos.ts` so both the search view and the reader can use the same photo.

#### 2. Create `ImmersiveBackground` component
**File:** `src/modules/oracle/components/ImmersiveBackground.tsx` (new)

A fixed full-viewport background layer:
- Renders the daily Unsplash photo at full bleed
- Applies a heavy Gaussian blur (20-30px) + dark overlay (`bg-black/40`)
- Fades in with `opacity` transition
- Used as a shared background in both search and reader when immersive mode is active

#### 3. Create `ImmersiveReaderToolbar` variant
**File:** `src/modules/oracle/components/ReaderToolbar.tsx` (update)

Add an `immersive` prop. When true:
- Background becomes `bg-white/[0.06] backdrop-blur-2xl border-white/[0.06]`
- Text colors shift to `text-white/70`, `text-white/90` for active elements
- Lens pills get glass styling: `bg-white/[0.08]` active, `text-white/50` inactive

#### 4. Update `ResolvePage.tsx` — immersive reader path

Pass `immersiveMode` into the reader rendering path:
- When `immersiveMode && showReader`: render `<ImmersiveBackground />` behind the content
- The content column gets glass card styling: `bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-2xl`
- Pass `immersive` prop to `ReaderToolbar`
- The content text needs to remain readable — the lens renderers already use `text-foreground/80` which works

When `immersiveMode && !showReader` (profile/details view):
- Same `<ImmersiveBackground />` behind profile layout
- Profile card gets glass treatment

#### 5. Update `ImmersiveSearchView` to share the photo module

Refactor to import from `immersive-photos.ts` instead of defining its own array.

### Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/lib/immersive-photos.ts` | **New** — shared photo array + `getDailyPhoto()` |
| `src/modules/oracle/components/ImmersiveBackground.tsx` | **New** — fixed blurred photo backdrop |
| `src/modules/oracle/components/ImmersiveSearchView.tsx` | Import from shared photo module |
| `src/modules/oracle/components/ReaderToolbar.tsx` | Add `immersive` prop for glass styling |
| `src/modules/oracle/pages/ResolvePage.tsx` | Render `ImmersiveBackground` behind reader + profile when immersive is on; pass `immersive` to toolbar |

### User Experience

1. Toggle "Immersive" on the search page — stunning photo fills the screen
2. Search "quantum mechanics" — the photo softly blurs and stays as a fixed backdrop
3. The article appears on a frosted-glass panel floating over the landscape
4. The toolbar is translucent glass with lens pills glowing subtly
5. Switch lenses — the glass panel updates instantly, background stays serene
6. Click "Details" — profile view also floats on glass over the same backdrop
7. Navigate back to search — the photo is still there, continuous and seamless
8. Toggle immersive off — returns to the standard dark UI instantly

