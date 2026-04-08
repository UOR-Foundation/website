

## Mobile Portal Search: Perplexity-Style Full-Screen Experience

### What Changes

Transform the mobile search page into a clean, full-screen portal that mirrors the Perplexity reference: centered prompt text, a bottom-pinned input bar, and a slide-out hamburger menu with large editorial navigation.

### Current State

The search page uses the same layout for mobile and desktop: a vertically centered stack with a large logo, title text, inline search bar with glowing border, and two action buttons. On mobile this feels cramped and the search bar is mid-screen rather than thumb-friendly at the bottom.

### Design Target (from Perplexity reference)

1. **Empty state**: Full dark screen, centered text ("What do you want to know?"), input bar pinned to the very bottom of the viewport
2. **Bottom input bar**: Rounded card with text input, action buttons (model selector, microphone, send), sitting in the safe area
3. **Hamburger menu**: Full-screen overlay with large left-aligned navigation items (Home, Discover, Spaces, History), Sign Up / Log In at bottom
4. **Header**: Minimal top bar with hamburger icon left, logo center-left, and minimal right action

### Implementation Plan

#### 1. Mobile-specific empty state in ResolvePage

**File:** `src/modules/oracle/pages/ResolvePage.tsx`

Wrap the empty state (`!result && !aiMode`) with a mobile/desktop split using the existing `useIsMobile` hook:

**Desktop** stays exactly as-is (logo, title, centered search bar, buttons).

**Mobile** renders a new layout:
- Remove the large hexagon logo from center (or shrink to a small icon in the top-left header)
- Show a top header bar: hamburger (left), small UOR logo + "UOR" wordmark (center-left), sovereign identity avatar (right)
- Centered hero text: "What do you want to know?" in large serif/display font, vertically centered in the viewport
- Search input bar pinned to the bottom of the screen (above safe area), styled as a rounded card with subtle background, containing: text input, a lens/model selector pill, and a send arrow button
- Remove the "UOR Search" and "Surprise Me" buttons on mobile (the send arrow in the bottom bar replaces them)
- Remove the bottom tagline on mobile

#### 2. Mobile hamburger menu

**File:** `src/modules/oracle/components/MobileSearchMenu.tsx` (new)

A full-screen overlay triggered by the hamburger icon:
- Dark background matching the app
- Large, left-aligned navigation items with icons: Home, Discover, AI Oracle, History
- Horizontal rule separator
- Sign Up / Log In buttons at the bottom (or user identity info if logged in)
- Smooth slide-in animation from the left
- X close button at the top

#### 3. Mobile result header

Update the result-state header in ResolvePage to be more compact on mobile:
- Hamburger replaces the UOR wordmark on small screens
- Search bar takes full width
- Sovereign identity icon stays on the right

#### 4. Bottom input bar component

**File:** `src/modules/oracle/components/MobileSearchBar.tsx` (new)

A reusable bottom-pinned input bar:
- `position: fixed; bottom: 0` with safe-area padding
- Rounded container with subtle border and background blur
- Text input with placeholder
- Left: "+" encode button (optional)
- Right: active lens pill + send arrow
- Submits on Enter or arrow tap

### Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/pages/ResolvePage.tsx` | Add mobile/desktop conditional rendering for empty state; use mobile bottom bar + header |
| `src/modules/oracle/components/MobileSearchMenu.tsx` | **New**: full-screen hamburger menu overlay |
| `src/modules/oracle/components/MobileSearchBar.tsx` | **New**: bottom-pinned search input bar |

### What the User Experiences (Mobile)

1. Open the search page: full dark screen, "What do you want to know?" centered, input bar at the bottom of the screen, thumb-ready
2. Tap hamburger: full-screen menu slides in with large navigation items
3. Type a query and tap send: loading bar appears, result streams in with the compact header
4. The whole experience feels like a portal: immersive, edge-to-edge, distraction-free

