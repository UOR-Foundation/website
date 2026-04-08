

## Full-Screen Content Reading Experience

### Problem

When content is rendered (e.g., a KnowledgeCard article or WebPage), it currently sits inside a social-profile layout: cover image, avatar, type badges, social stats, identity hub, and then the content in a `max-w-[1100px]` container with `max-h-[70vh] overflow-y-auto`. This fragments attention and wastes screen real estate. The user wants rendered content to fill the entire viewport as a beautiful, distraction-free reading experience.

### What Changes

Transform the result view into two modes:
1. **Reader Mode** (default for KnowledgeCards and rendered content) — full-screen, content-first, minimal chrome
2. **Profile Mode** (toggle) — the current social-profile layout for when you want metadata, provenance, discussion

### Design: Reader Mode

- **Full viewport**: Content spans the entire screen width (with golden-ratio margins)
- **Floating minimal toolbar**: A thin, translucent bar at the top with: back arrow, triword name, lens switcher pills, and a "Details" toggle to switch to profile mode
- **Content area**: The article/rendered content fills the viewport below the toolbar, using golden-ratio proportions for text column width (max ~720px centered, or ~65ch) with generous vertical spacing
- **No cover image, avatar, social stats, or identity hub** in reader mode — those live in the "Details" view
- **Remove the `max-h-[70vh]` constraint** on the content container in reader mode — let the page scroll naturally
- **Typography**: Serif body at 17-18px, line-height 1.75, left-border accents — the existing WikiArticleView typography, but given room to breathe

### Implementation

#### 1. Add `readerMode` state to ResolvePage

**File:** `src/modules/oracle/pages/ResolvePage.tsx`

- Add `readerMode` state, default `true` for KnowledgeCard types, `false` for others
- When `readerMode` is true, render a new minimal layout for the result:
  - Skip the `ProfileCover`, avatar, social stats, identity hub sections
  - Render `HumanContentView` in a full-width, centered reading column with golden-ratio margins
  - Add a floating top toolbar with: back button, triword display (compact), lens pills, and a "Details" button to toggle to profile view
- When `readerMode` is false, render the current profile layout as-is
- Remove the `max-h-[70vh] overflow-y-auto` constraint from the content wrapper in reader mode

#### 2. Create `ReaderToolbar` component

**File:** `src/modules/oracle/components/ReaderToolbar.tsx` (new)

A minimal, translucent fixed-position toolbar:
- Left: back arrow (returns to search)
- Center: compact triword label + type badge
- Right: lens switcher (compact pills), "Details" toggle button
- Styling: `backdrop-blur`, subtle border-bottom, auto-hides on scroll-down / shows on scroll-up (optional, can start simpler)

#### 3. Adjust content container proportions

In reader mode, the content column uses:
- `max-width: min(720px, 90vw)` — optimal reading width based on ~65ch
- Horizontal centering with `margin: 0 auto`
- Vertical padding using golden ratio: `paddingTop: calc(1rem * φ²)`, `paddingBottom: calc(1rem * φ³)`
- No card border, no background tint — just clean content on the page background

### Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/components/ReaderToolbar.tsx` | **New** — minimal floating toolbar for reader mode |
| `src/modules/oracle/pages/ResolvePage.tsx` | Add `readerMode` state, conditional layout for content-first vs. profile view |

### What the User Experiences

1. Search "quantum mechanics" — article streams in full-screen with a thin toolbar at the top
2. The entire viewport is the article: beautiful typography, golden-ratio margins, no distractions
3. Lens switcher pills visible in the toolbar — switch perspectives without leaving the reading flow
4. Click "Details" — switches to the current profile view with cover, avatar, provenance, discussion
5. Click "Reader" — back to immersive content
6. Works responsively — on mobile the content fills edge-to-edge with comfortable side padding

