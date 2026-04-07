

# Natural, Human-Like Streaming Experience

## Problems Identified

1. **Scroll-to-bottom on every token**: Line 83-85 scrolls to `scrollHeight` every time `messages` changes — which is every single token. The user sees the bottom of the response and must scroll back up to read from the top.

2. **Raw token bursts**: Every SSE chunk instantly appends to state, causing jerky character-by-character jumps. Real humans don't type at machine speed with zero variance.

## Solution

### 1. Smart Scroll — Keep the top visible during streaming

Replace the blanket scroll-to-bottom with a "scroll to the start of the new message, then stay put" strategy:

- When a new assistant message **first appears**, scroll so the **top of that message** is visible (not the bottom)
- While streaming continues, do **not** auto-scroll at all — let the user read from the top down naturally
- Only auto-scroll to bottom when the **user sends a new message** (so they see their own bubble appear)
- If the user manually scrolls down during streaming, respect that and don't fight it

Implementation: track a `streamStartRef` that marks the top of the current assistant response. On first token, `scrollIntoView({ behavior: 'smooth', block: 'start' })`. Then stop scrolling until streaming ends.

### 2. Token Buffer — Smooth, human-paced text reveal

Add a small buffer layer between raw SSE tokens and the rendered text:

- Accumulate incoming tokens in a queue
- Flush them to the displayed text using `requestAnimationFrame` at a natural pace (~30-50ms per token batch)
- Add subtle variance to the flush interval (±15ms randomized) so it doesn't feel metronomic
- Batch small tokens (single characters, punctuation) together to avoid single-char flicker
- Brief natural pause (~200-400ms) after sentence-ending punctuation (`. ! ?`) to mimic human "thinking between thoughts"

This creates the effect of someone typing thoughtfully rather than a machine dumping bytes.

### 3. Typing indicator

Show a subtle "thinking" indicator (three soft dots) before the first token arrives, then fade it out as text begins. This mirrors the WhatsApp/iMessage "typing..." bubble.

## Files to Change

### `src/modules/oracle/lib/stream-oracle.ts`
- No changes needed — the raw stream is fine. Buffering happens on the UI side.

### `src/modules/oracle/lib/token-buffer.ts` (new)
- A small class `TokenBuffer` that:
  - Accepts raw tokens via `push(token)`
  - Internally queues them
  - Calls a `onFlush(accumulatedText)` callback on a natural cadence using `requestAnimationFrame`
  - Detects sentence boundaries and inserts micro-pauses
  - Has `start()` / `stop()` / `flush()` lifecycle methods

### `src/modules/oracle/pages/OraclePage.tsx`
- **Remove** the `useEffect` that scrolls on every `messages` change (line 83-85)
- **Add** a ref for the streaming message element (`streamMsgRef`)
- On first assistant token: scroll `streamMsgRef` into view at `block: 'start'`, then stop auto-scrolling
- On user send: scroll to bottom so they see their own message
- **Integrate `TokenBuffer`**: in `onDelta`, push tokens to buffer instead of directly to state. Buffer's `onFlush` updates the displayed text.
- **Add typing indicator**: show animated dots between user message and first token arrival

### `src/index.css`
- Add a simple `.typing-dots` animation (three dots with staggered opacity pulse)

## Summary of UX Principles Applied

| Problem | Solution | Inspiration |
|---------|----------|-------------|
| Jumps to bottom | Scroll to message top, then freeze | Reading a letter |
| Robotic pace | Buffered flush with variance | Human typing on WhatsApp |
| No thinking gap | Typing dots before first token | iMessage "..." bubble |
| Uniform speed | Micro-pauses after sentences | Natural speech cadence |

