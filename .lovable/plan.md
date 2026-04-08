

# Unified Floating Input Bar with Real-Time Content Refinement

## What Changes

### 1. Replace `ReaderFloatingBar` with `UnifiedFloatingInput`

The current bottom bar has two separate buttons ("Search..." and "Oracle"). Replace with a single, always-visible input bar that combines search, voice, and live content refinement into one elegant component.

**Design:**
- A single frosted-glass pill at the bottom center
- One text input with placeholder "Refine this page..."
- A mic button on the right for voice input (reuses `VoiceInput` component)
- A subtle "Live" dot indicator on the left that pulses green when streaming
- As the user types (debounced ~600ms) or speaks, the page content re-streams with the new query/refinement applied — the existing `streamKnowledge` pipeline is called with the original topic + the user's refinement instruction
- Pressing Enter commits the refinement; Escape clears and collapses

**Interaction flow:**
1. User sees the floating bar at the bottom of any rendered knowledge card
2. They type "focus on the history" or speak it — after a brief pause the content re-renders live with that focus
3. The bar shows a subtle streaming animation (pulsing dot) while content updates
4. The original query is preserved; the refinement is appended as a lens/instruction

### 2. Wire Real-Time Refinement into ResolvePage

- Add a `refinement` state variable to `SearchPage`
- When the `UnifiedFloatingInput` emits a refinement, call `streamKnowledge` (or `streamOracle`) with the original query + refinement instruction appended
- The result streams into the existing `HumanContentView` progressively (the `synthesizing` flag is already supported)
- Cancel any in-flight stream when a new refinement arrives (cancel-on-resume pattern)

### 3. Voice Integration

- Embed the existing `VoiceInput` component inside the floating bar
- Voice transcripts feed directly into the refinement input
- Interim transcripts show in the input field in real time; final transcript triggers the refinement

## Files to Create
1. **`src/modules/oracle/components/UnifiedFloatingInput.tsx`** — The new single-input floating bar with voice, typing, and live streaming indicator

## Files to Modify
1. **`src/modules/oracle/pages/ResolvePage.tsx`** — Replace `ReaderFloatingBar` with `UnifiedFloatingInput`, add refinement state + streaming logic, wire voice

