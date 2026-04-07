

# UOR Search — Google-Fidelity Polish

## Current vs Target

The current page has the right structure but lacks Google's signature details:
- Search bar is missing the **left "+" icon** and **right-side action icons**
- No equivalent of Google's **"AI Mode" pill** inside the search bar
- Search bar border is invisible — Google uses a subtle `1px` border with `#5f6368` on hover
- Buttons feel muted — need higher contrast text

## Changes — Single file: `src/modules/oracle/pages/ResolvePage.tsx`

### Search bar interior elements (matching Google exactly)

**Left side**: `+` icon (Plus from lucide) at `text-muted-foreground/50`, same position as Google's

**Right side** (inside the bar, before the edge):
1. A vertical separator line
2. A **"Content Mode"** pill — equivalent to Google's "AI Mode". Rounded pill with a subtle border, a small sparkle/atom icon + "Content Mode" text. This toggles between address-lookup and content-encode mode, replacing the auto-detect behavior with an explicit toggle (more intuitive)

### Search bar styling
- Add `border border-[#303134]` default, `hover:border-[#5f6368]` on hover (Google's exact behavior)
- Increase height slightly: `py-[14px]` (Google uses ~46px total height)
- Make the bar wider: `max-w-[582px]` (Google's exact width)

### Button refinements
- Text color to full `text-foreground` (not `/90`)
- Font size `text-[14px]` matching Google's button text
- Rounded corners `rounded-[4px]` (Google uses very slight rounding)
- Add `h-9` for consistent button height

### Wordmark
- Reduce letter-spacing from `0.12em` to `0.05em` — Google's logo has tighter tracking
- Keep the `clamp(4rem, 8vw, 7rem)` size — it's correct

### Remove
- The `Search` icon on the left of the input (Google doesn't have a magnifying glass in the main input on dark mode — it has `+`)

## Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/pages/ResolvePage.tsx` | Add interior bar icons (+, Content Mode pill), refine bar border/sizing, polish buttons and wordmark tracking |

