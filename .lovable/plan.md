

# Oracle — Full-Screen Portal Chat Experience

## Concept

Transform the Oracle from a scrollable page-within-a-page into an immersive full-viewport chat portal — like iMessage or WhatsApp — where the input bar is pinned to the bottom, messages flow upward naturally, and the entire screen is the conversation.

## Key Changes

### 1. Full-viewport layout, no page scroll

- Remove the `Layout` wrapper (Navbar/Footer) so Oracle owns the entire screen
- Use `100dvh` (dynamic viewport height) for the container — no page-level scrolling at all
- Structure: fixed header bar (minimal) → flex-grow message area → fixed input bar at bottom

### 2. Messages anchored to bottom, flowing upward

- Use `flex-direction: column; justify-content: flex-end` on the messages container so content hugs the bottom when there are few messages (like iMessage)
- As messages accumulate, the container scrolls naturally — older messages slide up and out of view
- The newest content is always near the input bar where the user's eyes already are

### 3. Fixed input bar at the bottom

- Pinned to the bottom of the viewport with comfortable padding
- Centered, max-width constrained, with the same rounded pill style
- Always visible regardless of scroll position

### 4. Sidebar becomes a collapsible overlay

- On desktop, the sidebar settings (precision, strictness, self-improve) become accessible via a small gear/settings icon in the header bar
- Opens as a slide-over panel or dropdown — keeps the main view clean and focused
- Trust results (grade badge) shown inline with messages, not in a sidebar

### 5. Compact header

- Minimal top bar: "Oracle" title on the left, settings gear + engine status on the right
- Thin, no subtitle paragraph — the empty state handles onboarding

## Files to Change

| File | What changes |
|------|-------------|
| `src/modules/oracle/pages/OraclePage.tsx` | Remove `Layout` wrapper; restructure to full-viewport flex column; move sidebar into collapsible overlay panel; pin input bar; apply `justify-end` to message list; compact header |
| `src/index.css` | Add `oracle-page` utility styles if needed for `100dvh` and scroll anchoring |

## Layout Structure (ASCII)

```text
┌──────────────────────────────────┐
│  Oracle              ⚙️  ● Ready │  ← thin fixed header
├──────────────────────────────────┤
│                                  │
│   (empty: presets centered)      │
│         or                       │
│   ┌─────────────────────┐        │
│   │ user bubble          │  →    │  ← messages flex-end,
│   └─────────────────────┘        │    older ones scroll up
│   ┌──────────────────────────┐   │
│   │ assistant response        │  │
│   │ ...                       │  │
│   │ [grade bar] [proof trail] │  │
│   └──────────────────────────┘   │
│   ● ● ●  (typing dots)          │
│                                  │
├──────────────────────────────────┤
│  [  Ask anything...        ⬆ ]  │  ← fixed input bar
└──────────────────────────────────┘
```

## Settings Panel (overlay)

When the gear icon is clicked, a right-side panel slides in with the existing controls (precision, self-improve, strictness, how-it-works). Clicking outside or pressing Escape closes it. This keeps the portal feel clean while retaining all functionality.

