

# Smart Text Selection — Contextual Actions on Any Word, Sentence, or Paragraph

## Concept

When you select any text inside an Oracle response, a floating action toolbar appears near the selection. It offers instant follow-up actions that inject a new prompt based on your selection. No double-click heuristics needed — the browser's native text selection is the trigger, which is the most natural and familiar gesture.

## How It Works

1. User highlights any text (word, phrase, sentence, paragraph) inside an assistant response
2. A compact floating toolbar appears just above the selection
3. Four action buttons, each sends a contextual follow-up prompt:

| Action | Icon | What it does |
|--------|------|-------------|
| **Zoom In** | `ZoomIn` | "Explain this in more detail: {selection}" |
| **Zoom Out** | `ZoomOut` | "Explain this more simply, in broader context: {selection}" |
| **Clarify** | `HelpCircle` | "Clarify what this means: {selection}" |
| **Verify** | `ShieldCheck` | "What are the sources and evidence for: {selection}" |

4. Clicking any action dismisses the toolbar and sends the prompt as if the user typed it

## UI Design

- Floating pill-shaped bar with a subtle backdrop blur and shadow
- Appears via `framer-motion` fade+slide animation (from below, 150ms)
- Positioned above the selection using `window.getSelection().getRangeAt(0).getBoundingClientRect()`
- Dismisses on click outside, scroll, or Escape key
- Icons only with tooltips on hover (keeps it minimal and clean)

## Implementation

### New component: `src/modules/oracle/components/SelectionToolbar.tsx`

- Listens for `mouseup` events on the prose container
- Reads `window.getSelection()`, checks if text is selected and within an assistant message
- Computes position from the selection range bounding rect
- Renders a portal with 4 icon buttons
- Calls `onAction(type, selectedText)` callback which the parent uses to send a new prompt
- Cleans up on unmount (event listeners)

### Changes to `OraclePage.tsx`

- Import `SelectionToolbar`
- Wrap assistant message content in a ref-tracked container
- Pass the `send` function as the action handler
- Add state for selection toolbar visibility and position

### Files to change

| File | Change |
|------|--------|
| `src/modules/oracle/components/SelectionToolbar.tsx` | New component — floating contextual toolbar |
| `src/modules/oracle/pages/OraclePage.tsx` | Integrate toolbar with message rendering, wire actions to `send()` |

