
# Data Page — Simplified Profile Redesign

## Name
**"Data Page"** — each UOR address gets its own *Data Page*. Clean, universal, intuitive. It's the personal web page for every piece of data.

## Changes

### 1. Content Section — Human/Machine Toggle + Copy
The `contentViewMode` state already exists (line 612) but isn't wired into the UI. We'll:
- Replace the "CONTENT" label with a clean **segmented toggle**: `Human` | `Machine`
- **Human view**: Shows the existing `HumanContentView` / `ContentPreview` — full content, no truncation (remove the 260px max-height clamp so all content displays)
- **Machine view**: Shows the JSON-LD source with syntax highlighting (currently buried in a collapsed "View Source" section)
- Add a **Copy** button next to the toggle that copies the active view's content
- Remove the separate collapsed "View Source (JSON-LD)" section since it's now accessible via the toggle

### 2. Remove Unnecessary Labels
- Remove the "CONTENT" section header — the toggle itself communicates what this is
- Remove the "PROVENANCE" uppercase header label — replace with a subtle, clean collapsible
- Keep the Identity Hub "Share this address" section as-is (it's already clean)

### 3. Simplify Profile Header
- Keep: cover image, glyph/thumbnail avatar, triword name, copy button, Reader button, overflow menu
- Keep: type badge + discovered/confirmed status
- Remove: redundant spacing and extra wrapper labels

### 4. Discussion Section — Always Visible
- Make the discussion section open by default (it's already auto-opening when comments exist)
- Simplify the header: just show comment count, no "Start a Discussion" CTA text

### 5. Provenance — Clean Collapsed Section
- Keep as collapsed, but simplify the header styling

## Files Modified

| File | Change |
|------|--------|
| `src/modules/oracle/pages/ResolvePage.tsx` | Wire `contentViewMode` toggle into content section, remove truncation, merge JSON source into Machine view, simplify labels |

## Visual Structure (after)

```
┌─ Cover Image ─────────────────────────────────┐
│  [Thumbnail]  TROUT.BUBBLY.CASTLE  📋  [Reader] [···] │
│  KNOWLEDGECARD · ✨ Discovered                │
│  👁 1 visitor · 💬 0 comments · ⑂ 0 forks      │
├───────────────────────────────────────────────┤
│  Share this address  12 formats            ›  │
├───────────────────────────────────────────────┤
│  [Human ▪ Machine]                     📋     │
│                                               │
│  (full content — human or JSON-LD)            │
│                                               │
├───────────────────────────────────────────────┤
│  ▸ Provenance                                 │
├───────────────────────────────────────────────┤
│  💬 Discussion · 0 comments                    │
│  (comment input)                              │
└───────────────────────────────────────────────┘
```
