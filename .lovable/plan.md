

# Encoder: Turn the "+" Button into a Text Encoder

## What We're Building

The `+` icon on the left side of the search bar becomes the gateway to encoding. When clicked, it opens an elegant encode mode where users paste any text and receive a unique, deterministic address — like getting a passport for their data.

## User Experience Flow

```text
1. User clicks "+" → search bar transforms into encode mode
2. A text area slides in below the search bar for pasting content
3. User pastes/types text → clicks "Encode" (or presses Enter)
4. Encoding animation plays briefly
5. Result appears: the same SERP view showing the address + source content
6. The encoded content is now permanently registered and searchable
```

## Design Details

- **Encode mode toggle**: Clicking "+" morphs the search bar area. The `+` icon rotates to `×` (close). The input placeholder changes to "Paste your text…". A textarea expands below with a subtle entrance animation.
- **Encode button**: Replaces "UOR Search" with an "Encode" button styled with the primary color — a clear call to action. Subtle shimmer or glow to convey "something is being created."
- **Encoding animation**: Brief loading bar (reuses existing loading bar) + a small confetti burst on success to celebrate the identity creation.
- **Result**: Transitions directly to the existing result/SERP view showing the triword address, CID, IPv6, glyph, and source content. Toast: "✨ Your data has its address."
- **Source object**: The text is wrapped in a canonical JSON-LD envelope (`@type: "uor:UserContent"`) before encoding, ensuring deterministic identity.

## Technical Changes

### File: `src/modules/oracle/pages/ResolvePage.tsx`

1. **New state**: `encodeMode` (boolean), `encodeText` (string)
2. **"+" button** (line 650): `onClick` toggles `encodeMode`. When active, icon rotates to `X`.
3. **Conditional UI**: When `encodeMode` is true:
   - Hide the main search input and right-side buttons
   - Show a textarea (auto-focus, monospace, ~4 rows, expandable) with placeholder "Paste or type any text…"
   - Show an "Encode" button below (primary styled, with a fingerprint/sparkle icon)
4. **Encode handler**: 
   - Wraps text in `{ "@context": "https://schema.uor.foundation/v1", "@type": "uor:UserContent", "uor:content": text, "uor:encodedAt": ISO timestamp }`
   - Calls `encode(obj)` from `uor-codec`
   - Sets `result` with the receipt → transitions to SERP view
   - Fires small confetti + success toast
   - Exits encode mode
5. **Animation**: The textarea entrance uses framer-motion (slide down, fade in). The `+` to `×` rotation is a CSS transform transition.

### No other files need changes
The existing `encode()` pipeline, receipt registry, and result view handle everything. The encoder just provides a new entry point into the same system.

