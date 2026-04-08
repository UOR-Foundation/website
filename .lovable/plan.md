

## Immersive Mode — Full-Screen Photo Portal for Desktop Search

### What It Does

Add a toggle to the desktop search empty state that switches from the current dark minimal mode to an "immersive mode" inspired by the Momentum reference image: a full-viewport background photo from Unsplash, a live clock, a personalized greeting, and the search bar centered below — all overlaid on the photograph.

### Design (from reference image)

- **Background**: Full-bleed high-resolution landscape photo from Unsplash (random nature/landscape, rotated daily or on each visit)
- **Top-left**: Small "Links" and "Focus" style icons (we'll use UOR-relevant ones: Encode, AI Oracle)
- **Top-right**: Focused Today counter + location/weather-style accent (we'll show the current lens name)
- **Center**: Large live clock (HH:MM), greeting below ("Good afternoon, Ilya."), then "What is your main goal for today?" with a subtle underline input
- **Bottom-left**: Small location or tagline text
- **Bottom-right**: "Tasks" style link (we'll keep Sovereign Identity)
- **Search**: The underline input IS the search bar — typing and pressing Enter triggers UOR search
- The existing UOR logo, glow border, buttons, and tagline are hidden in immersive mode

### Toggle

A small pill/icon button in the top-right corner of the normal desktop empty state: a landscape icon (e.g., `Maximize2` or `Image`) labeled "Immersive". Clicking it crossfades to the photo view. In immersive mode, a small "Exit" pill returns to the standard view. The preference is stored in `localStorage`.

### Implementation

#### 1. New component: `ImmersiveSearchView.tsx`

**File:** `src/modules/oracle/components/ImmersiveSearchView.tsx` (new)

Self-contained full-viewport overlay:
- Fetches a random Unsplash landscape photo via their free source URL (`https://source.unsplash.com/1920x1080/?landscape,nature`) — no API key needed
- Renders a live clock (updates every second via `setInterval`)
- Computes greeting from hour: "Good morning", "Good afternoon", "Good evening"
- Shows the user's display name from `useAuth()` if available, otherwise "Explorer"
- Centered underline-style search input
- Corner elements matching the reference aesthetic
- Subtle dark overlay gradient for text legibility
- `onSearch(query)` and `onExit()` callback props

#### 2. Update `ResolvePage.tsx`

- Add `immersiveMode` state (initialized from `localStorage`)
- Add toggle button in the desktop empty state (top-right area, small pill)
- When `immersiveMode` is true, render `<ImmersiveSearchView>` instead of the standard desktop empty state
- Wire `onSearch` to existing `handleSearch`, `onExit` to toggle off

### Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/components/ImmersiveSearchView.tsx` | **New** — full-screen photo portal with clock, greeting, search |
| `src/modules/oracle/pages/ResolvePage.tsx` | Add immersive toggle state + conditional render |

### User Experience

1. Open search page — normal dark UOR search as before, with a small "Immersive" toggle in the corner
2. Click it — crossfade to a stunning landscape photo filling the screen, clock centered, "Good afternoon, [name]" greeting, underline search input below
3. Type a query and press Enter — search resolves as normal
4. Click exit pill — returns to standard mode
5. Preference remembers across sessions

