

## Plan: Direct Search-to-Window with Adaptive Content

### Problem Summary
1. **Flash of old home screen**: When you search from the desktop, the window opens showing the `ImmersiveSearchView` (clock, photo, search bar) briefly before the query fires and results appear. This is the "intermediate step."
2. **Window doesn't fill screen**: New search windows open at 960x620 instead of maximized like a browser tab.
3. **Content doesn't fit the window**: The reader view uses `100vw`/`100dvh` which breaks inside a windowed context — content overflows or misaligns.

### Solution

#### 1. Skip the home screen when opened with a query
**File**: `src/modules/oracle/pages/ResolvePage.tsx`

When inside a window with an `initialQuery`, skip rendering the `ImmersiveSearchView` entirely. Instead, show a loading spinner immediately while the search fires. This eliminates the flash.

- Add a flag: if `inWindow && windowInitialQuery`, set `loading = true` on mount and suppress the "empty state" block (`!result && !aiMode`).
- The existing `useEffect` that calls `handleSearch(q)` already fires — we just need to hide the home screen while it runs.

#### 2. Open search windows maximized
**File**: `src/modules/desktop/hooks/useWindowManager.ts`

Add an optional `maximized` flag to `openApp()`. When set, the window opens covering the full usable area (below the tab bar) just like double-clicking a title bar.

**File**: `src/modules/desktop/DesktopWidgets.tsx` (or wherever `onSearch` calls `wm.openApp`)

Pass `maximized: true` when opening search windows from the desktop home screen, so results instantly fill the screen like a browser tab.

#### 3. Make content adaptive to window bounds (not viewport)
**File**: `src/modules/oracle/pages/ResolvePage.tsx`

When `inWindow`, replace all `100vw`/`100dvh` references with `100%` so the content flows within the window container rather than the browser viewport. The reader's `maxWidth`, padding, and height constraints will reference the parent container.

Key changes:
- The root `div` uses `w-full h-full` instead of `fixed inset-0` when inside a window.
- Reader content container uses `max-width: min(1400px, 100%)` instead of `min(1400px, 95vw)`.
- Remove the `marginLeft: calc(-50vw + 50%)` breakout hack when inside a window.
- Height uses `100%` instead of `100dvh`.

#### 4. Leverage pretext for balanced headings inside windows
**File**: `src/modules/oracle/components/HumanContentView.tsx`

The `BalancedHeading` component already uses pretext's `balanceWidth()` with a `ResizeObserver`. Since it measures against `parentElement.clientWidth`, it will naturally re-balance when the window is resized. No changes needed to the balancing logic — it already works adaptively.

The key integration point: ensure the `HumanContentView` title rendering uses `BalancedHeading` (verify it does, or wire it up if not).

### Files Modified
| File | Change |
|------|--------|
| `src/modules/oracle/pages/ResolvePage.tsx` | Skip home screen when `inWindow + initialQuery`; replace viewport units with container-relative units |
| `src/modules/desktop/hooks/useWindowManager.ts` | Add `maximized` option to `openApp()` |
| `src/modules/desktop/DesktopShell.tsx` or `DesktopWidgets.tsx` | Pass maximized flag when opening search from desktop |
| `src/modules/oracle/components/HumanContentView.tsx` | Wire `BalancedHeading` for titles if not already used |

### Result
- Typing on the desktop home screen → window opens maximized → results render immediately (no intermediate screen).
- Window is draggable, resizable, closable — all existing window management works.
- Content inside the window adapts fluidly as you resize — headings re-balance via pretext, text reflows, padding scales.

