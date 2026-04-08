

## Immersive Reader Cleanup: Full-Screen, Zero-Duplication, Flow-State Reading

### Problems Identified

From the screenshot and code analysis:

1. **Duplicate lens switcher** — The ReaderToolbar (top bar) has lens pills AND ContextualArticleView renders its own lens pills below. Two identical controls competing for attention.
2. **Redundant context banner** — "Personalized for your exploration" banner adds visual noise between the toolbar and the actual content.
3. **Narrow content + dead margins** — Content is capped at `max-width: min(720px, 90vw)` inside a `max-w-[1100px]` container inside `profile-container`, creating three layers of width constraints and wasted side margins.
4. **Container is not truly full-width** — The result is wrapped in `profile-container max-w-[1100px]` which adds unnecessary side padding on large screens.
5. **Reader mode still shows the top search header bar** — The conditional at line 1334 hides it for KnowledgeCard/WebPage in reader mode, but the logic is convoluted and fragile.

### Design Principles Applied

- **Single point of control** — One lens switcher (the toolbar), no duplication
- **Content is king** — Remove everything that isn't the content itself
- **Full-bleed immersion** — Reader content should breathe and use available space
- **Responsive intelligence** — Wider content area on large screens, still readable on small ones
- **Flow state** — Minimize cognitive interruptions; the reading surface should feel like a window into knowledge

### Changes

#### 1. `ContextualArticleView.tsx` — Remove lens switcher and context banner in reader mode

Add an `isReaderMode` prop. When true:
- Skip rendering the lens switcher pills (toolbar already provides this)
- Skip rendering the context banner ("Personalized for your exploration")
- Only render the lens-routed article content

This eliminates duplication without removing the lens UI from non-reader contexts.

#### 2. `HumanContentView.tsx` — Pass `isReaderMode` through

Thread the new prop from HumanContentView → ContextualArticleView so reader mode can suppress the duplicate UI.

#### 3. `ResolvePage.tsx` — Reader mode layout overhaul

**Remove the outer `profile-container max-w-[1100px]` constraint** for reader mode content. The reader view should break out of the generic container and go full-width, with its own internal max-width for optimal reading.

Update the reader content area (lines ~1900-1949):
- Remove the intermediate container constraints
- Let the content panel use `max-width` responsive to screen size: `clamp(640px, 65vw, 860px)` — wider on big screens, still readable
- Center with `mx-auto`
- More generous horizontal padding (`px-6 sm:px-10 lg:px-16`) for breathing room
- In immersive mode: the glass card should also use this wider responsive width

**Remove the duplicate `<div className="profile-container max-w-[1100px]...">`** wrapper around reader content — let it go full-bleed within the viewport.

#### 4. Responsive content width strategy

Instead of a fixed `720px` cap:
- **< 768px**: Full width minus padding (mobile)
- **768px–1280px**: `max-width: 720px` (standard reading width)
- **1280px+**: `max-width: clamp(720px, 55vw, 860px)` — scales up on large screens for Magazine and Deep Dive lenses that benefit from wider layouts
- Story and Simple lenses keep their own internal `max-width` (640px and 680px respectively) which naturally constrains within the wider container

#### 5. Clean up ReaderToolbar visual weight

Reduce the toolbar's visual presence slightly:
- Drop border opacity to almost invisible (`border-border/5`)
- Slightly reduce padding
- This lets the content feel more dominant

### Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/components/ContextualArticleView.tsx` | Add `isReaderMode` prop; skip lens pills + context banner when true |
| `src/modules/oracle/components/HumanContentView.tsx` | Pass `isReaderMode` prop through to ContextualArticleView |
| `src/modules/oracle/pages/ResolvePage.tsx` | Reader mode: break out of `profile-container`, responsive width, pass `isReaderMode`, reduce chrome |
| `src/modules/oracle/components/ReaderToolbar.tsx` | Subtle visual refinement (lighter border, tighter padding) |

### Result

The reader experience becomes a single continuous canvas: one slim toolbar at top, then pure content filling the screen beautifully. No duplicate controls, no wasted margins, no distracting banners. The content breathes on every screen size, and the immersive glass mode wraps the wider content area seamlessly.

