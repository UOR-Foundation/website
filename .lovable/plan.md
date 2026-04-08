

# Hide Constellation Background on Result Pages

## Problem
The constellation background renders on all views within the search page — including the result view, where it makes the content too busy and hard to read.

## Solution
Conditionally render `<SearchConstellationBg />` only when on the search homepage (no result shown, not in AI mode). When a result is displayed, the background will be plain dark.

## Technical Change

**File:** `src/modules/oracle/pages/ResolvePage.tsx`

- Change line 408 from:
  ```tsx
  <SearchConstellationBg />
  ```
  to:
  ```tsx
  {!result && !aiMode && <SearchConstellationBg />}
  ```

This is a single-line change. The constellation canvas will mount/unmount cleanly (it already has cleanup in its `useEffect`), so transitioning between states will be seamless — constellations appear on the search home, disappear when results load.

