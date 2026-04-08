

# Google-Style Predictive Search Suggestions

## Overview

Add a live autocomplete dropdown to the home screen search bar that appears as the user types, combining three sources ranked by relevance: (1) the user's personal search history, (2) context-derived suggestions from their active context items and attention profile, and (3) Wikipedia OpenSearch results for global knowledge. The dropdown matches the Google pattern from the reference screenshot — clean rows with icons distinguishing suggestion types, thumbnail images for entity matches, and keyboard navigation.

## Architecture

```text
User types "hous" →
  ┌─────────────────────────────────────────────┐
  │ 🕐  house music               (history)     │  ← user searched this before
  │ 🕐  houston rockets           (history)     │
  │ ───────────────────────────────────────────  │
  │ 🎯  housing market trends     (context)     │  ← derived from economics context docs
  │ ───────────────────────────────────────────  │
  │ 🔍  House (TV series)         (popular)     │  ← Wikipedia OpenSearch
  │ 🔍  Houston                   (popular)     │
  │ 🔍  House of Habsburg         (popular)     │
  │ 🔍  Whitney Houston           (popular)     │
  └─────────────────────────────────────────────┘
```

Ranking: History matches first (the user cares about these), then context-derived, then global. Each category capped to prevent overwhelming the list. Total max: 8 suggestions.

## Changes

### 1. New: `src/modules/oracle/lib/search-suggestions.ts`

The suggestion engine. Combines three sources into a ranked list:

- **History suggestions**: Fuzzy-match the user's `search_history` keywords against the typed prefix. Loaded once on mount, filtered client-side for instant response.
- **Context suggestions**: Extract keywords from context items (file names, workspace names, pasted text) and from the attention profile's `domainHistory` to generate domain-relevant suggestions (e.g., user has economics context docs → suggest "housing market" when typing "hous").
- **Wikipedia OpenSearch**: Debounced call to `en.wikipedia.org/w/api.php?action=opensearch&search=X&limit=6` for globally popular completions with optional thumbnail fetch.

Interface:
```typescript
export interface SearchSuggestion {
  text: string;
  type: "history" | "context" | "popular";
  thumbnail?: string | null;
  subtitle?: string | null;
}

export function createSuggestionEngine(options: {
  history: SearchHistoryEntry[];
  contextItems: ContextItem[];
  domainHistory: Array<{ domain: string }>;
}): {
  suggest: (query: string, callback: (results: SearchSuggestion[]) => void) => void;
  cancel: () => void;
}
```

The engine is instantiated once and reused. History and context matching are synchronous (instant). Wikipedia is debounced at 300ms. Results are merged with history first, context second, popular third, deduped by lowercase text.

### 2. New: `src/modules/desktop/SearchSuggestions.tsx`

The dropdown UI component. Renders below the search input as an absolutely-positioned panel:

- Grouped sections with subtle dividers (no headers to keep it clean like Google)
- Each row: icon (Clock for history, Compass for context, Search for popular) + text + optional thumbnail on right
- Keyboard navigation: ArrowUp/ArrowDown to highlight, Enter to select, Escape to dismiss
- Click to select
- Theme-aware styling matching the existing search bar aesthetic
- Smooth `AnimatePresence` fade-in/out
- Thumbnail images displayed as small rounded squares (32x32) on the right side for Wikipedia entities that have them

### 3. Modified: `src/modules/desktop/DesktopWidgets.tsx`

Wire the suggestion engine and dropdown into the home screen search bar:

- Import `SearchSuggestions` and `createSuggestionEngine`
- On mount, load search history + attention profile to initialize the engine
- On `query` change, call `engine.suggest(query, setSuggestions)`
- Render `<SearchSuggestions>` absolutely positioned below the search input
- On suggestion select: set query, call `onSearch`, close dropdown
- Add keyboard event handlers (ArrowDown to enter suggestions, Escape to dismiss)

### 4. Modified: `src/modules/desktop/SpotlightSearch.tsx`

Add the same suggestion engine to the Spotlight (Cmd+K) search, so suggestions also appear in the command palette when typing. Reuse the same `SearchSuggestions` component, rendered inside the CommandList as a custom group above apps.

## Guest vs Sovereign

- **Guests**: History is empty (no DB access), context-derived suggestions come from guest in-memory context items, Wikipedia suggestions always work. The experience is still useful — they get global suggestions plus anything from their session context.
- **Sovereign users**: Full history from `search_history` table, plus persistent attention profile domains, plus context items. The suggestions become deeply personalized over time.

## Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/lib/search-suggestions.ts` | New — suggestion engine combining history + context + Wikipedia OpenSearch |
| `src/modules/desktop/SearchSuggestions.tsx` | New — dropdown UI component with icons, thumbnails, keyboard nav |
| `src/modules/desktop/DesktopWidgets.tsx` | Wire suggestion engine, render dropdown below search bar |
| `src/modules/desktop/SpotlightSearch.tsx` | Add suggestion group to command palette |

