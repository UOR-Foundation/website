

# Flow Mode — Continuous Conversational Stream

## Core Insight

The current UX has a hard separation: content area (top) vs input bar (bottom). This creates a ping-pong rhythm — type, wait, read, type again. Real conversation doesn't work this way. When you're texting a friend on iMessage, you start composing your reply *while reading their last message*, and the input sits right there in the flow.

The most ingenious implementation: **the input field travels with the conversation**. Instead of being anchored to the bottom of the screen behind a border, the textarea lives *inline* at the end of the message stream, as the next natural element in the scroll. The conversation becomes one continuous river of thought.

## What Changes

### 1. Inline floating input (the "flow cursor")

- Remove the fixed bottom input bar entirely
- The textarea renders as the **last element inside the message scroll area**, sitting right below the most recent Oracle bubble
- It has the same left-alignment and width as Oracle bubbles, so it feels like you're continuing the conversation inline
- As messages accumulate and scroll, the input scrolls naturally with them — always at the bottom of content, never in a separate zone
- When the page is empty (no messages), the input sits centered in the viewport with the preset chips above it

### 2. Mid-stream composition

- While the Oracle is streaming, the input remains visible and editable below the streaming bubbles
- The user can compose their next question while watching the response arrive
- When the user hits Enter during a stream, their message queues and fires immediately after the current stream completes
- A subtle "thinking…" indicator replaces the input briefly during the gap between streams
- This removes the "wait wall" — users never feel blocked

### 3. Seamless scroll behavior

- After each new bubble appears, the view gently scrolls so the input field stays visible at the bottom of the viewport
- The top fade gradient remains (content dissolving as it scrolls up)
- The bottom fade gradient is removed since the input is no longer fixed at the bottom — instead, the content simply flows to the edge
- The input itself has a subtle glow/focus ring that acts as the visual anchor point

### 4. Conversation rhythm indicators

- Between the last Oracle bubble and the input, show a subtle breathing dot (pulsing at ~2s interval) when the Oracle is idle — indicating it's "listening" and ready
- During streaming, this dot becomes the typing indicator (three dots)
- After verification completes, a brief ✓ flash before returning to the breathing dot
- This creates the feeling of a living, present conversational partner

## Files to Change

| File | Changes |
|------|------|
| `src/modules/oracle/pages/OraclePage.tsx` | Move textarea from fixed footer into the scroll area as the last child after messages. Remove the `shrink-0 border-t` footer div. Add queued-message state for mid-stream sends. Add breathing dot between last message and input. Adjust scroll-into-view logic to keep the inline input visible. |
| `src/index.css` | Remove `.oracle-fade-bottom` (no longer needed with inline input). Add `.oracle-flow-input` class for the inline textarea styling. Add `.oracle-breathing-dot` keyframes for the idle pulse animation. |

## Layout

```text
┌──────────────────────────────────────┐
│  ← Oracle                  ● Ready ⚙│
├──▓▓▓▓▓▓ fade top gradient ▓▓▓▓▓▓▓──┤
│                                      │
│  ┌──────────────────────────────┐    │
│  │ Memory involves encoding...  │    │  ← Oracle bubble
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ The hippocampus plays a...   │    │  ← Oracle bubble
│  └──────────────────────────────┘    │
│                                      │
│  ✓ 8 of 12 backed         Details ▸  │  ← trust bar
│                                      │
│            ● (breathing dot)         │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ Ask anything…             ⬆  │    │  ← inline input (IN the scroll)
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

## Why This Is Ingenious

- **Zero dead time**: Users compose while reading — the conversation never pauses
- **Spatial continuity**: Input and output share the same space, like writing in a notebook
- **The breathing dot**: Creates the sensation of presence — the Oracle is *there*, listening
- **UOR-native**: The coherence framework's real-time verification feeds the breathing dot's state (idle → verifying → confirmed), making the framework's operation *felt* rather than shown

