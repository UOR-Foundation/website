

## Address Profile Page Redesign

### Goal
Transform the address profile from a narrow, stacked layout into a full-width, golden-ratio-proportioned, social-network-style profile that uses the entire screen and feels like a unified, next-level identity page.

### Layout Architecture

The current constraint is `max-w-5xl mx-auto px-8` on line 978 of ResolvePage.tsx. The profile result view (lines 1376-1747) will be restructured into distinct zones:

```text
┌──────────────────────────────────────────────────────────┐
│  COVER IMAGE (full-width, edge-to-edge, taller: 240px)  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  PROFILE HEADER (overlapping cover bottom)          │ │
│  │  Avatar + Triword Name + Badges + Actions           │ │
│  └─────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│  SOCIAL STATS BAR (full-width, subtle border divider)   │
│  visitors · comments · forks · reactions                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─── MAIN (φ ratio) ───┐  ┌──── SIDEBAR ────┐         │
│  │                       │  │                  │         │
│  │  Content Section      │  │  Identity Hub    │         │
│  │  (Human/Machine view) │  │  (IPv6, triword, │         │
│  │                       │  │   projections)   │         │
│  │  Action Bar           │  │                  │         │
│  │  (Oracle, IPFS,       │  │  Provenance Tree │         │
│  │   Verify, Fork)       │  │                  │         │
│  │                       │  │                  │         │
│  └───────────────────────┘  └──────────────────┘         │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  DISCUSSION (full-width, Reddit-style threads)           │
│  Sort · Comment box · Threaded replies                   │
└──────────────────────────────────────────────────────────┘
```

### Key Changes

**1. Full-width profile container**
- Remove the `max-w-5xl` constraint for the result/profile view
- Use `max-w-7xl` for the overall profile, with inner content using golden ratio splits
- Cover image becomes edge-to-edge within the container, taller (200-260px)

**2. Profile header overlaps cover**
- Avatar shifts to overlap the cover bottom edge (negative margin, `ring-4 ring-background`)
- Name, badges, and status sit beside it on a single row
- Action buttons (Oracle, IPFS, Verify, Fork) move into the header row as compact icon-buttons, right-aligned

**3. Two-column golden ratio layout (main content area)**
- Split: 61.8% main column, 38.2% sidebar
- Main: Content section (Human/Machine view) with the view toggle
- Sidebar: Identity Hub (sticky) + Provenance Tree
- On mobile: stack vertically (sidebar below main)

**4. Social stats as a horizontal bar**
- Full-width thin bar below header, before the two-column area
- Visitors, comments, forks, reactions displayed as horizontal metrics with icons
- Reactions are interactive inline (click to react)

**5. Discussion section**
- Full-width below the two-column area
- Stays as-is (Reddit-style threads already implemented)

**6. Golden ratio proportions throughout**
- Section spacing: `gap` values follow φ multiples (e.g., 1rem, 1.618rem, 2.618rem)
- Cover height to header height ratio follows φ
- Two-column split: 61.8% / 38.2%

**7. Visual refinements**
- Subtle section dividers using `border-border/10`
- Consistent rounded corners (`rounded-2xl` for major cards)
- Smooth staggered entrance animations (already partially there)
- Provenance banner (fork origin) integrates into the header area rather than being a separate block

### Files Modified

1. **`src/modules/oracle/pages/ResolvePage.tsx`** (lines ~1376-1747) — Restructure the result view into the new layout: full-width cover, overlapping header, two-column golden-ratio body, repositioned action bar, full-width discussion
2. **`src/modules/oracle/components/ProfileCover.tsx`** — Increase height, adjust rounded corners for full-width feel
3. **`src/modules/oracle/components/IdentityHub.tsx`** — Minor: ensure it works well in a narrower sidebar context
4. **`src/modules/oracle/components/AddressCommunity.tsx`** — Minor: ensure full-width rendering for discussion section

### No database or backend changes required.

