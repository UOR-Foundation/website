

# Apps — Unified My Apps + App Store Experience

## Overview

Rewrite `AppHub.tsx` into a two-section experience called "Apps" — combining **My Apps** (the user's installed/running applications) with **App Store** (discover new apps). The design language will match the MediaPlayer and LibraryPage: dark cinema background (`hsl(220 15% 6%)`), rounded pill category tabs, immersive search bar, card-based browsing with hover overlays, and smooth Framer Motion transitions.

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  Apps                                                        │
│                                                              │
│  ┌─ Search (rounded pill, full-width like MediaPlayer) ────┐│
│  │  🔍 Search apps...                                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  [ My Apps ]  [ App Store ]  [ Developer ]   ← pill tabs     │
│                                                              │
│  ─── MY APPS ────────────────────────────────────────────── │
│                                                              │
│  "Recently Used"                                             │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                   │
│  │ icon  │ │ icon  │ │ icon  │ │ icon  │  ← large cards    │
│  │ label │ │ label │ │ label │ │ label │    with app color  │
│  │ desc  │ │ desc  │ │ desc  │ │ desc  │    and open button │
│  └───────┘ └───────┘ └───────┘ └───────┘                   │
│                                                              │
│  "All My Apps" (grouped by category)                         │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐    ← compact grid   │
│                                                              │
│  ─── APP STORE ──────────────────────────────────────────── │
│                                                              │
│  "Featured"  (hero cards — horizontal row)                   │
│  "By Category" — pill filters, then card grid                │
│                                                              │
│  ─── DEVELOPER ──────────────────────────────────────────── │
│  (existing CNCF infrastructure cards, preserved as-is)       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Design Details

**Shared with MediaPlayer/Library:**
- Dark background: `bg-[hsl(220_15%_6%)]`
- Rounded pill search bar with focus ring animation
- Category pills: `rounded-full`, `bg-white/[0.12]` active state, `text-white/40` inactive
- Card style: `border-white/[0.06]`, `bg-white/[0.04]`, hover `scale-[1.02]`
- Section headers: small caps `text-[10px] uppercase tracking-[0.2em] text-white/40`

**My Apps section:**
- Tracks recently opened apps via `sessionStorage` (list of app IDs in order of last use)
- "Recently Used" row: horizontal scroll of large cards (icon + label + description + "Open" button)
- "All My Apps" grid: all non-hidden apps grouped by OS category, compact cards matching the current AppCard style
- Each card has a subtle "Open" action on hover (like MediaPlayer's play overlay)

**App Store section:**
- "Featured" hero row (3 featured apps as wide horizontal cards with colored backgrounds)
- Browse by category with pill filter tabs (RESOLVE, IDENTITY, OBSERVE, etc.)
- Cards show icon, label, description, category badge, and "Get" / "Open" button depending on whether it's already in My Apps
- Since all apps are pre-installed in this OS, "Get" simply launches the app

**Tab structure:** Three tabs — `My Apps`, `App Store`, `Developer` — using the same pill-toggle pattern as MediaPlayer's category tabs

## Files

| File | Action | Purpose |
|---|---|---|
| `src/modules/desktop/components/AppHub.tsx` | Rewrite | Three-tab layout with My Apps + App Store + Developer |

## Technical Notes

- Blueprint label override for `app-hub` stays as "Apps" (update `LABEL_OVERRIDES` in `desktop-apps.ts`)
- Recently used tracking: on `uor:open-app` event, push app ID to `sessionStorage` key `uor:recent-apps` (max 8)
- All existing launch behavior via `window.dispatchEvent(new CustomEvent("uor:open-app"))` is preserved
- Developer tab content is preserved from current implementation
- No new dependencies needed — uses existing framer-motion, lucide-react

