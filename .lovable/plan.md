

# Oracle Portal: Immersive Reading Experience

## What changes

### 1. Wider content area, uniform text sizing
- Remove `max-w-2xl` constraint on the message container; use `max-w-3xl` or `max-w-4xl` so responses use more screen width
- Reduce left/right padding on mobile
- In `.oracle-prose`, bump `font-size` to `clamp(16.5px, 1.15vw, 19px)` and widen `max-width` from `68ch` to `78ch`
- Ensure user bubbles use the same base font size as response prose for visual uniformity

### 2. Input bar with stronger contrast
- Give the textarea a visible `bg-muted/20` or `bg-[hsl(var(--muted)/0.15)]` background instead of `bg-transparent`
- Slightly thicker border (`border-border/50`) and a subtle inner glow/shadow so it pops against the dark background
- Increase input text size to match the prose (`text-base`)

### 3. Focus-fade gradient overlays (top and bottom)
- Add two fixed gradient overlays on the scroll area using `pointer-events-none`:
  - **Top**: fades from `bg-background` to transparent over ~120px — older messages dissolve as they scroll up
  - **Bottom**: fades from transparent to `bg-background` over ~80px just above the input bar — creates a soft reading zone boundary
- This creates an Apple-style "spotlight" reading zone in the center of the screen

### 4. Message-by-message paragraph reveal
- When streaming, instead of dumping all text at once, split the assistant response by double-newline (`\n\n`) into paragraph chunks
- Each new paragraph enters with a subtle `motion.div` fade-up animation (opacity 0→1, y 8→0, 300ms)
- This creates the WhatsApp "messages arriving one by one" feel while keeping it as a single response block
- Older paragraphs are already visible; only the newest chunk animates in

### 5. Scroll anchoring refinement
- After each new paragraph appears, auto-scroll smoothly so the new content sits in the center-bottom of the visible area (not flush against the very bottom)
- Use `scrollIntoView({ behavior: 'smooth', block: 'end' })` with a small bottom offset

## Files to change

| File | Changes |
|------|---------|
| `src/modules/oracle/pages/OraclePage.tsx` | Widen container (`max-w-3xl`), add top/bottom fade overlays as siblings of scroll div, split response into animated paragraph blocks, increase input contrast styling, uniform text sizing on user bubbles |
| `src/index.css` | Bump `.oracle-prose` font-size and max-width, add `.oracle-fade-top` / `.oracle-fade-bottom` gradient classes |

## Layout sketch

```text
┌──────────────────────────────────────┐
│  ← Oracle                  ● Ready ⚙│
├──▓▓▓▓▓▓▓▓ fade gradient ▓▓▓▓▓▓▓▓▓──┤
│                                      │
│  (older messages faded/scrolled up)  │
│                                      │
│  ┌────────────────────────────────┐  │  ← wider content area
│  │  Clear, focused reading zone   │  │
│  │  Current paragraph animates in │  │
│  └────────────────────────────────┘  │
│                                      │
├──▓▓▓▓▓▓▓▓ fade gradient ▓▓▓▓▓▓▓▓▓──┤
│  [ Ask anything...              ⬆ ] │  ← high-contrast input
└──────────────────────────────────────┘
```

