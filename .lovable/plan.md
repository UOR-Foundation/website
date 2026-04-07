

# UOR Resolve — The Google for the Semantic Web

## Vision

Transform the Resolve page from a functional tool into a **brand experience** that instantly communicates UOR's value proposition: "Google indexes information. UOR indexes meaning." The current page works, but it feels like a developer tool. We want it to feel like Google circa 2004 — breathtakingly simple, instantly understood, quietly powerful.

## What Changes

**Single file: `src/modules/oracle/pages/ResolvePage.tsx`** — refined, not rewritten. The logic is solid; the UX needs elevation.

### 1. Brand the empty state like Google's homepage

Replace the cryptic Braille glyphs (`⠕⠗⠁⠉⠇⠑`) with a proper brand moment:
- **UOR** in large, elegant serif type (like Google's wordmark)
- Tagline beneath: *"The universal encoder"* in muted small text
- The search input becomes a single-line `<input>` (not textarea) for the address mode — clean, rounded, with a subtle shadow on focus. Only expands to textarea when JSON is detected.
- Replace the generic search icon button with an **"I'm Feeling Lucky"**-style secondary action: a small "Encode" link beneath the input that hints at the reverse direction

### 2. Smoother input transitions

- Single-line input by default (like Google). When the user starts typing `{` or `[`, it smoothly expands into a multi-line textarea
- The mode label ("Address → Content" / "Content → Address") animates between states instead of snapping
- Auto-focus the input on page load

### 3. Result state mirrors Google's SERP

When a result appears, transition to a "results page" layout:
- The search bar **moves to the top** (like Google's results page) with the current query shown, editable
- Below it, the result card appears with the Address as a bold "title" and Content as the "snippet"
- The triword becomes a clickable breadcrumb-style element at the top
- The CID appears as a subtle URL-like element under the triword (like Google shows green URLs under results)

### 4. Subtle footer with stats

Below the search bar in empty state, show a single line:
> *16,777,216 addresses · WASM ✓ · deterministic*

This communicates scale and trust, like Google's "Searching X billion pages."

### 5. Loading state

Replace the spinner with a Google-style progress bar — a thin animated line at the top of the page.

## Technical Details

- All existing WASM pipeline (`computeAndRegister`, `lookupReceipt`, `singleProofHash`) stays identical
- No new files, no new dependencies
- The `looksLikeJson` detection stays but drives a smoother input type transition
- Auto-focus via `inputRef.current?.focus()` on mount
- Result state: search bar repositions to top via conditional layout (not animation of position, just two layouts toggled by `result` state)

## Layout

```text
EMPTY STATE (Google homepage):
┌──────────────────────────────────────────────────┐
│  ← Resolve                          ● wasm ✓    │
│──────────────────────────────────────────────────│
│                                                  │
│                                                  │
│                    U O R                          │
│             The universal encoder                │
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │  Search by address or paste content…   🔍│   │
│   └──────────────────────────────────────────┘   │
│                                                  │
│      16,777,216 addresses · deterministic        │
│                                                  │
└──────────────────────────────────────────────────┘

RESULT STATE (Google SERP):
┌──────────────────────────────────────────────────┐
│  ← ┌─meadow.steep.keep──────────────────┐ ● wasm│
│    └─────────────────────────────────────┘       │
│──────────────────────────────────────────────────│
│                                                  │
│   ADDRESS                                        │
│   Meadow · Steep · Keep                     📋   │
│   bafy2bzace…xk3q                           📋   │
│   ● wasm ✓ 0.1.5                                │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│   CONTENT                                   📋   │
│   ┌────────────────────────────────────────┐     │
│   │ {                                      │     │
│   │   "@type": "oracle:Claim",             │     │
│   │   "oracle:text": "Memory involves…"    │     │
│   │ }                                      │     │
│   └────────────────────────────────────────┘     │
│                                                  │
│   ↻ Verify determinism   ✓ Identical             │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/pages/ResolvePage.tsx` | Elevate UX — brand wordmark, single-line input that expands, result-state search bar at top, stats footer, loading bar |

