

# "Surprise Me" — Random Address with Confetti

## What happens

When the user clicks **"Surprise Me"**, the app picks a random entry from the global receipt registry (all content-addressed objects), triggers a playful confetti burst, and navigates to show that entry's result — complete with a fun transition animation.

## Changes — Single file: `src/modules/oracle/pages/ResolvePage.tsx`

### 1. Add confetti library
Install `canvas-confetti` (lightweight, ~6KB). Import it in the page.

### 2. "Surprise Me" button logic
- Import `allEntries` from `@/modules/oracle/lib/receipt-registry`
- On click: grab all entries, pick one at random
- Fire a confetti burst (gold/purple/blue particles, spread from center)
- Brief delay (~400ms) for the confetti to land, then display the result
- Show a playful toast like "✨ You landed on..." or a fun random phrase from a small pool of delightful messages (e.g. "Look what the universe found!", "This one's special.", "Your cosmic address awaits…")

### 3. Transition animation
- The result fades in with a gentle scale-up + slight bounce (spring physics via framer-motion)
- The wordmark ("UOR") shrinks up and away before the result appears — a satisfying "whoosh" feeling

### 4. Edge case
- If registry is empty (no entries yet), show a friendly toast: "Nothing mapped yet — search something first!"

## Files changed

| File | Change |
|------|--------|
| `package.json` | Add `canvas-confetti` dependency |
| `src/modules/oracle/pages/ResolvePage.tsx` | Import confetti + `allEntries`, wire "Surprise Me" to random pick with confetti + playful toast + spring transition |

