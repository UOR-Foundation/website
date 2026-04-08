

## Streamline the Data Profile Page

The profile page (non-reader view in ResolvePage.tsx) currently has ~10 distinct sections stacked vertically, several of which are redundant or overwhelming for a first-time visitor. The goal is to make it feel like a clean, standardized "home page" for any data object: instantly legible, socially familiar, and minimal.

### Current Page Anatomy (top to bottom)

1. Cover image (ProfileCover)
2. Profile header: avatar, triword name, action buttons (Reader, Oracle, IPFS, Verify, Fork)
3. Type badges + status row
4. Social stats bar + IPv6 address (AddressSocialStats)
5. Identity Hub (12 sharing formats, expandable)
6. Content section with Human/Machine toggle + full JSON/markdown
7. Provenance Tree
8. Discussion (comments, voting)

### Problems

- **Action bar overload**: 5+ buttons (Reader, Oracle, IPFS, Verify, Fork) all compete for attention on first load. Most users do not need IPFS or Verify on first visit.
- **Identity Hub** takes significant vertical space by default; most visitors just want to see what this object IS, not share it in 12 formats.
- **Content section** with Human/Machine toggle and raw JSON is developer-facing, not "social homepage" material.
- **Provenance Tree** is niche; valuable but should be tucked away.
- **Discussion** is good but the full Reddit-style thread dominates the page length.
- **IPv6 address** shown prominently in the social stats bar is technical noise for most users.

### Redesigned Layout

A clean three-zone layout: **Hero → Content → Social**, with everything else progressive disclosure.

#### Zone 1: Hero Card (cover + identity)
- **Keep**: Cover image, glyph avatar, triword display name, type badge, status badge (Discovered/Confirmed).
- **Remove**: Inline action buttons from the header row. Replace with a single **overflow menu** (three dots) that contains: Oracle, IPFS, Verify, Fork.
- **Keep prominent**: Only **Reader** button (for KnowledgeCard/WebPage types) as the primary CTA since that is the main way to consume content.
- **Simplify social stats**: Show visitor count, comment count, fork count as compact inline text below the name (like "42 visitors · 3 comments · 1 fork"). Remove the full-width bordered section.
- **Move IPv6**: Into the Identity Hub (already there), remove from stats bar.

#### Zone 2: Content (what this object IS)
- **Default to Human view only**. Remove the Human/Machine toggle from the main layout.
- For KnowledgeCard/WebPage: show a 3-4 line description/excerpt with a "Read full article" button that switches to reader mode.
- For other types (Concept, Fork, etc.): show the HumanContentView directly but capped at a readable height with "Show more".
- **Machine view**: Move to a collapsible section at the bottom or inside the overflow menu as "View source".

#### Zone 3: Social & Sharing
- **Identity Hub**: Collapsed by default into a single row: "Share this address · 12 formats ›" (already implemented this way, keep it).
- **Discussion**: Keep but collapse by default if zero comments. Show "Start a discussion" CTA instead.
- **Provenance Tree**: Move inside a tab or collapsible, not visible by default.

### Technical Changes

**File: `src/modules/oracle/pages/ResolvePage.tsx`** (lines ~2249-2627, the non-reader result block)

1. **Refactor profile header** (lines 2264-2434):
   - Remove the 5 action buttons from the flex row
   - Add a minimal overflow menu (ellipsis icon) that opens a dropdown with: Oracle, IPFS, Verify, Fork
   - Keep only "Reader" as a visible pill button for readable types
   - Inline social stats as a single text line below the type badges

2. **Simplify content zone** (lines 2458-2601):
   - Remove the Human/Machine toggle from the default view
   - For KnowledgeCard: show description + truncated content with "Read full article →" CTA
   - For other types: keep HumanContentView with max-height and "Show more"
   - Move Machine view into a "View source" collapsible at the bottom

3. **Collapse secondary sections**:
   - Provenance Tree: wrap in a collapsible with `details/summary` or a toggle, closed by default
   - Discussion: if 0 comments, show a minimal "Be the first to comment" prompt instead of the full thread UI

4. **Remove AddressSocialStats full-width bar** — replace with inline counts in the header

**File: `src/modules/oracle/components/AddressCommunity.tsx`**
- Add a `collapsed` prop or initial state that renders a minimal single-line prompt when there are zero comments

### Visual Result

```text
┌─────────────────────────────────────────┐
│         [Cover Image - parallax]        │
│                                         │
│  (●) ROOT.EMERALD.KEEP          [⋯] [Reader]
│  KNOWLEDGECARD · ✨ DISCOVERED          │
│  1 visitor · 0 comments · 0 forks       │
├─────────────────────────────────────────┤
│  [Description excerpt, 3-4 lines]       │
│  Read full article →                    │
├─────────────────────────────────────────┤
│  ↗ Share this address  12 formats   ›   │
├─────────────────────────────────────────┤
│  💬 Be the first to comment             │
├─────────────────────────────────────────┤
│  ▸ Provenance                           │
│  ▸ View source (JSON-LD)                │
└─────────────────────────────────────────┘
```

This reduces vertical scroll by ~60%, surfaces the most valuable information first, and makes every profile feel like a clean, consistent "homepage" regardless of object type.

