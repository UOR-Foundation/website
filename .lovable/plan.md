

# Unified Feature Discovery — App Hub + Contextual Surfacing

## Problem

The OS has 8 desktop apps, but the system contains 40+ modules with capabilities that are invisible to users. Features are only reachable through Spotlight search (if you know the name) or right-click context menus. Users who don't explore will never find Messenger, Graph Explorer, Daily Notes, or the bridge/identity features built into them.

## Solution: Three-Layer Discovery

```text
Layer 1: App Hub (dedicated window)
  └─ Full catalog of apps, grouped by OS taxonomy category
  └─ App cards with icon, name, 1-line description, quick-launch
  └─ Featured/new section at top for recently added capabilities

Layer 2: Home Screen Quick-Access Row
  └─ Below the search bar: 4-5 subtle icon buttons for core apps
  └─ Replaces the current "nothing visible" state
  └─ Always visible on the home screen (not in a menu)

Layer 3: Contextual App Suggestions (KG-powered)
  └─ Spotlight/search suggests relevant apps based on query context
  └─ e.g. typing "message" surfaces Messenger; "graph" surfaces Graph Explorer
  └─ Powered by keyword matching against app metadata
```

## Implementation

### 1. App Hub Window (new desktop app)

**New file: `src/modules/desktop/components/AppHub.tsx`**
- A dedicated window/app registered in `desktop-apps.ts` with id `"app-hub"`, category `"RESOLVE"`
- Layout: A clean grid organized by OS taxonomy categories (Resolve, Identity, Exchange, Observe, Structure)
- Each app card: icon (from existing `DesktopApp.icon`), label, a short description (new `description` field on `DesktopApp`), and accent color indicator
- Clicking a card launches the app via `window.dispatchEvent(new CustomEvent("uor:open-app", { detail: appId }))`
- A "Featured" section at the top highlights 2-3 apps with slightly larger cards
- Non-user-facing categories (Compute, Transform, Failure) are hidden
- Clean, minimal grid — no marketing, just functional catalog

**Modify: `src/modules/desktop/lib/desktop-apps.ts`**
- Add `description: string` to `DesktopApp` interface
- Add short descriptions to each existing app (e.g., Oracle: "AI-powered knowledge assistant", Messenger: "Sovereign encrypted messaging")
- Register `app-hub` as a new app with `Grid3X3` icon, label "Apps", category "RESOLVE"
- Add apps currently missing from the desktop: a `"wallet"` app pointing to identity/wallet

### 2. Home Screen Quick-Access Dock

**Modify: `src/modules/desktop/DesktopWidgets.tsx`**
- Below the search bar (after context pills), add a row of 5 subtle circular icon buttons for the most-used apps: Oracle, Messenger, Library, Files, Apps (App Hub)
- Icons use the same frosted-glass treatment as the search bar
- Clicking any icon opens that app
- Row fades with the rest of the home screen when windows are open
- On mobile (`MobileShell.tsx`): the existing menu drawer grid already handles this

### 3. Enhanced Spotlight with App-Context Suggestions

**Modify: `src/modules/desktop/SpotlightSearch.tsx`**
- Add keyword-to-app mapping: each `DesktopApp` gets a `keywords: string[]` field (e.g., Messenger: ["chat", "message", "send", "whatsapp", "telegram"])
- When typing, if the query matches app keywords, that app is promoted to the top of the results with a "Launch" indicator
- This uses the existing `filter` function in cmdk — no KG query needed for this layer

**Modify: `src/modules/desktop/lib/desktop-apps.ts`**
- Add `keywords: string[]` to `DesktopApp` for richer search matching

### 4. OS Taxonomy Polish

**Modify: `src/modules/desktop/lib/os-taxonomy.ts`**
- Update `appIds` arrays to include the new `app-hub` and `wallet` entries
- Ensure Graph Explorer appears under OBSERVE (already does)

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `desktop/components/AppHub.tsx` | Create | Full app catalog window |
| `desktop/lib/desktop-apps.ts` | Modify | Add descriptions, keywords, new app entries |
| `desktop/DesktopWidgets.tsx` | Modify | Quick-access icon row on home screen |
| `desktop/SpotlightSearch.tsx` | Modify | Keyword-boosted app suggestions |
| `desktop/lib/os-taxonomy.ts` | Modify | Update app registrations |

No database migrations needed. No new dependencies. Pure UI/UX layer.

## Why This Works

- **App Hub** = a single place to see everything (solves "I didn't know that existed")
- **Home screen dock** = zero-tap access to the 5 core apps (solves "too many clicks")
- **Smart Spotlight** = type naturally, get the right app (solves "I forgot the name")
- Everything routes through the existing `openApp()` → `useWindowManager` pipeline — no new state management

