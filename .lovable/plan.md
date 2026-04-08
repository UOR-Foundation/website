

## Full-Screen Immersive Reader — Edge-to-Edge Redesign

### Problem (from screenshot)

The desktop immersive reader constrains content to a narrow column (`max-width: clamp(640px, 65vw, 860px)`) centered on screen, leaving roughly 40% of the viewport as dead space. The toolbar is a sticky horizontal bar with a type badge, lens buttons, and details toggle — standard UI chrome that breaks immersion. The infobox floats right within the already-narrow column, squeezing body text further.

### Design Vision

Transform the reader into a **full-viewport editorial canvas** where content breathes across the entire screen, controls are ambient and contextual, and every pixel serves the reading experience.

```text
┌──────────────────────────────────────────────────────────┐
│ ← (hover-reveal)              LENS PILLS (hover-reveal) │ ← Transparent overlay bar, fades to invisible
├──────────┬───────────────────────────────────────┬───────┤
│          │                                       │       │
│  INFOBOX │         ARTICLE BODY                  │       │
│  (fixed  │    (wide: max-width ~1100px)          │       │
│  sidebar │    Centered, generous margins          │       │
│  on lg)  │    Serif text, 18-20px                │       │
│          │                                       │       │
│          │                                       │       │
├──────────┴───────────────────────────────────────┴───────┤
│                 [Floating search pill]                    │
└──────────────────────────────────────────────────────────┘
```

### Changes

#### 1. Wide Content Container (Desktop Immersive)
**File: `ResolvePage.tsx` (~line 2196)**

Change the desktop immersive content wrapper from the narrow column to a wide layout:
- `maxWidth`: `clamp(640px, 65vw, 860px)` → `min(1200px, 90vw)`
- Side padding: `clamp(1.5rem, 4vw, 4rem)` → `clamp(2rem, 5vw, 5rem)`
- Remove the `bg-white/[0.04]`, `border-x`, `border-b`, `rounded-b-2xl` container chrome for immersive mode (same treatment mobile already gets)
- Content floats directly on the blurred background — more editorial, more immersive

#### 2. Auto-Hiding Transparent Toolbar (Desktop Immersive)
**File: `ReaderToolbar.tsx`**

Apply the same auto-hide pattern that already works for mobile to desktop immersive:
- Toolbar starts visible, fades out after 3s of mouse inactivity
- Move mouse to top 80px of viewport → toolbar reveals with backdrop blur
- When hidden, show nothing (clean top edge — the coherence indicator line is enough)
- The toolbar itself becomes fully transparent (`bg: transparent`) when idle, transitioning to `bg: rgba(0,0,0,0.3) backdrop-blur` on hover
- Lens pills move into the toolbar (already there on desktop) — they inherit the fade behavior
- Back arrow and Details button stay in toolbar

#### 3. Two-Column Layout for Infobox on Wide Screens
**File: `WikiArticleView.tsx`**

On screens ≥ 1024px in immersive mode:
- Instead of `float: right` with a fixed 280px width crammed into the text column, use a CSS Grid or flex layout:
  - Left column (sidebar): infobox at ~300px, sticky at `top: 80px`
  - Right column (main): article body fills remaining space
- On screens < 1024px: infobox stays full-width above the article (current mobile behavior)
- This uses the full viewport width naturally — infobox and text sit side by side

#### 4. Pass Immersive Context to WikiArticleView
**File: `HumanContentView.tsx`**

Add an `immersive` prop that flows down to `ContextualArticleView` → `WikiArticleView` so the article renderer can adapt its layout (sidebar vs. inline infobox, wider typography).

#### 5. Wider Article Typography in Immersive
**File: `WikiArticleView.tsx`**

When in immersive wide mode:
- Body text: 18px with `line-height: 1.9` for comfortable reading against the photo background
- Section headers: slightly larger, with a subtle white underline instead of the muted border
- The article fills the available column width naturally

#### 6. Floating Controls Refinement
**File: `ResolvePage.tsx`**

The floating search pill (bottom) already exists for mobile — extend it to desktop immersive:
- Small pill at bottom-center: search icon + "Search…" text, expands on click
- This replaces the need for a persistent header search bar in immersive reader

### Files Changed

| File | Change |
|------|--------|
| `ResolvePage.tsx` | Wide content container for desktop immersive, remove container chrome, extend floating search pill to desktop |
| `ReaderToolbar.tsx` | Auto-hide on desktop immersive (mouse-aware), transparent hover-reveal |
| `WikiArticleView.tsx` | Two-column grid layout on wide screens (infobox sidebar + article), wider typography |
| `HumanContentView.tsx` | Pass `immersive` prop down to article renderers |

