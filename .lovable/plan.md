

# iMessage-Style Message Bubbles for Oracle Responses

## Problem

Currently, assistant responses render as a single continuous prose block under `oracle-prose`. Even with paragraph-level fade-in animations, the visual result is a wall of text that feels like reading a document, not having a conversation. This is the opposite of how iMessage, WhatsApp, and other messaging apps present information.

## Design: Chat Bubble Paragraphs

Each paragraph of the assistant's response becomes its own **chat bubble**, visually separated and staggered in time, exactly like receiving multiple iMessage messages from a friend explaining something.

### Visual treatment per bubble

- Each paragraph gets its own rounded container with subtle `bg-muted/8` background and soft border
- Left-aligned (assistant side), with slight left margin to distinguish from user bubbles on the right
- Rounded corners: `rounded-2xl rounded-bl-md` (mirroring iMessage's connected-bubble aesthetic where the tail is bottom-left)
- Consecutive bubbles have tighter spacing (`gap-1.5`) to show they belong together, like iMessage groups messages from the same sender
- A tiny timestamp or "just now" on the last bubble only (optional, subtle)

### Staggered reveal animation

- Each bubble animates in with a stagger delay: `delay: ci * 0.15s` (150ms between bubbles)
- Animation: fade + slight upward slide (opacity 0→1, y 6→0)
- During streaming, only the last/current bubble is "typing" — previous ones are settled
- This creates the sensation of receiving discrete thoughts, not a data dump

### User bubble refinement

- Keep existing right-aligned bubble style but ensure visual symmetry with the new assistant bubbles
- Same base font size for consistency

## Changes

| File | What |
|------|------|
| `src/modules/oracle/pages/OraclePage.tsx` | Lines 320-339: Replace the flat `oracle-prose` div with individual bubble containers per paragraph chunk. Each chunk wrapped in a styled bubble div with staggered `motion.div`. The `oracle-prose` class moves inside each bubble so markdown rendering is preserved. |
| `src/index.css` | Add `.oracle-bubble` class for the bubble container styling. Adjust `.oracle-prose` paragraph bottom margin to 0 (since spacing is now between bubbles, not between paragraphs within a single block). |

## Layout

```text
              ┌──────────────────────────┐
              │ Explain quantum computing │  ← user bubble (right)
              └──────────────────────────┘

  ┌──────────────────────────────────────────┐
  │ Traditional computers process info       │  ← bubble 1 (fades in)
  │ using bits...                            │
  └──────────────────────────────────────────┘
  ┌──────────────────────────────────────────┐
  │ Quantum computing relies on subatomic    │  ← bubble 2 (150ms later)
  │ particles...                             │
  └──────────────────────────────────────────┘
  ┌──────────────────────────────────────────┐
  │ Superposition is grounded in the laws    │  ← bubble 3 (300ms later)
  │ of quantum mechanics...                  │
  └──────────────────────────────────────────┘

  ── trust bar ──────────────────────────────
  ✓ 9 of 12 backed by evidence     Details ▸
```

