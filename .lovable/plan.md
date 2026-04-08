

# Infinite Improbability Drive — "Surprise Me" Easter Egg

## Concept

Transform the "Surprise Me" button into an **Infinite Improbability Drive** experience. When activated, the screen undergoes a brief "improbability field" sequence — the UI glitches, a rising improbability counter ticks through absurd numbers, hitchhiker-style narration appears, reality "snaps back" with the result, and a witty side-effect message is displayed. The whole thing takes ~2.5 seconds and feels like you just punched the Heart of Gold's drive.

## The Sequence

```text
Click "Surprise Me"
    ↓
Phase 1 (0–600ms): ENGAGING DRIVE
  - Screen flashes white then inverts briefly
  - Improbability counter appears, ticking up: "Improbability: 2^17...2^4096...2^276,709...∞"
  - Background elements scramble (letters in title randomize briefly)
  - Subtle screen shake via CSS transform

Phase 2 (600–1800ms): PASSING THROUGH EVERY POINT
  - Full-screen overlay with swirling gradient (gold → purple → teal)
  - Random "side effects" flash on screen as text:
    "A sperm whale just appeared above Magrathea"
    "All molecules in your device leapt one foot to the left"
    "239,000 lightly fried eggs materialized somewhere nearby"
    "You have been briefly turned into a penguin"
  - The improbability counter hits "∞" and freezes

Phase 3 (1800–2500ms): NORMALITY RESTORED
  - Overlay dissolves, result appears with confetti
  - Toast shows a witty Douglas Adams-style message
  - Improbability counter fades with "DON'T PANIC" briefly visible
```

## Implementation — Single file: `src/modules/oracle/pages/ResolvePage.tsx`

### 1. New state & constants
- Add `improbabilityActive` boolean state for the overlay
- Add `IMPROBABILITY_SIDE_EFFECTS` array with ~8 absurd side-effect strings drawn from the books
- Add `DON_T_PANIC_MESSAGES` array for the final toast (Douglas Adams-style wit)

### 2. Improbability Drive overlay component
- A full-screen `AnimatePresence` overlay that renders when `improbabilityActive` is true
- Three animated phases using `motion.div` with staggered delays:
  - Phase 1: Dark overlay + improbability counter (font-mono, gold text, counting up)
  - Phase 2: Swirling gradient background + random side-effect text cycling every 300ms
  - Phase 3: "DON'T PANIC" in large friendly letters, then fade out
- CSS: radial gradient animation, subtle screen shake keyframe, text scramble effect

### 3. Rewrite "Surprise Me" onClick
- Set `improbabilityActive = true`
- After 600ms: start cycling side effects
- After 1800ms: pick the random entry, fire confetti with extra intensity
- After 2500ms: set `improbabilityActive = false`, show result + toast with Adams-style message
- Rename button label to **"Infinite Improbability Drive"** (or keep "Surprise Me" with a subtle ∞ icon — user's current label works as a disguise for the Easter egg)

### 4. Visual details
- Improbability counter uses `font-mono` with gold color (`text-[#FFD700]`)
- Side effects use `text-foreground/60` italic, appearing/disappearing with fade
- "DON'T PANIC" uses `font-display font-bold text-4xl text-[#FFD700]` — large, friendly letters, per the book
- Overlay background: animated gradient shifting through `hsl(280,60%,12%)` → `hsl(45,90%,50%)` → `hsl(180,50%,20%)`
- Screen shake: 3px random translate jitter for 600ms via inline style animation

### 5. Keep it snappy
- Total duration: ~2.5 seconds — long enough to delight, short enough to not annoy
- If entries are empty, skip the drive and show the existing "Nothing mapped yet" toast
- The drive is purely cosmetic — the actual random pick happens at the 1800ms mark

| File | Change |
|------|--------|
| `src/modules/oracle/pages/ResolvePage.tsx` | Replace Surprise Me handler with Infinite Improbability Drive sequence: full-screen overlay with phased animations, improbability counter, side-effect messages, "DON'T PANIC" reveal, then result |

