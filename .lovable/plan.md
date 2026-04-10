

# Performance Hardening — Crisp, Instant OS Shell

## Current State Assessment

The desktop shell already has solid foundations:
- **RAF-gated drag/resize** in `useWindowManager` (no re-render per pointer event)
- **CSS `contain: layout paint`** on window chrome
- **Debounced localStorage** persistence
- **Lazy-loaded app components** via `React.lazy`
- **`contentVisibility: auto`** on MobileShell app drawer

However, several performance bottlenecks remain that prevent the "truly instant" feel:

### Bottleneck 1: Framer Motion overhead (10 files in desktop module)
`BootSequence`, `SpotlightSearch`, `SnapOverlay`, `RingIndicator`, `ShortcutCheatSheet`, `ConnectivityPopover`, `VinylPlayer`, `SearchSuggestions`, `GraphQuickView`, `AppHub` all import framer-motion. This is a ~30KB+ runtime that creates JS-driven animations competing with the compositor. For an OS shell that should feel native, CSS animations on `transform`/`opacity` are categorically faster.

### Bottleneck 2: Window drag uses React state, not CSS transform
Despite the RAF gate, `moveWindow` still calls `setWindows()` every frame, causing React reconciliation of the entire window tree. Docker Desktop, VS Code, and native window managers use direct DOM mutation during drag, committing to state only on release.

### Bottleneck 3: BootSequence uses setTimeout chains for line replay
The boot terminal replays ~50 lines via recursive `setTimeout`, each creating a new array via `[...prev, line]`. This is O(n²) array allocation. A ref-based approach with a single `requestAnimationFrame` render loop would be smoother.

### Bottleneck 4: MobileShell re-renders every second
`setTime(new Date())` every 1000ms forces a full MobileShell re-render including all child components, even though only the clock needs updating.

### Bottleneck 5: ContainerBootOverlay dynamic imports during animation
Each boot phase does `await import("@/modules/compose/orchestrator")` — potentially 3-4 dynamic imports during the animation sequence, causing micro-stalls on slower devices.

### Bottleneck 6: Inspector polls every 2s with dynamic import
`ContainerInspector.fetchMetrics` does `await import(...)` inside a 2s interval — repeated module resolution overhead.

### Bottleneck 7: No CSS containment on TabBar or DesktopWidgets
These always-visible components lack `contain` declarations, meaning layout changes in windows can trigger reflow in the tab bar.

## Implementation Plan

### 1. Zero-JS drag: DOM-direct window movement (~40 lines changed)
**File**: `src/modules/desktop/DesktopWindow.tsx`

Replace the current drag flow that calls `onMove()` → `setWindows()` → React reconciliation with:
- During `onDragStart`: store initial position in ref, add `will-change: transform` to the window DOM element
- During `onDragMove`: apply `transform: translate3d(dx, dy, 0)` directly to `windowElRef.current.style` — zero React involvement
- During `onDragEnd`: read final position from transform, reset transform, commit to React state once

Same pattern for resize. This is exactly how VS Code and Chrome handle tab/window drag.

### 2. Migrate BootSequence animations from Framer Motion to CSS (~60 lines)
**File**: `src/modules/desktop/BootSequence.tsx`

- Replace `<motion.div>` exit animation with a CSS class toggle (`opacity` transition via `transition: opacity 0.8s cubic-bezier(0.4,0,0.2,1)`)
- Replace blinking cursor `motion.span` with CSS `@keyframes blink`
- Replace status bar `motion.div` with CSS `@keyframes fade-in`
- Remove the `framer-motion` import entirely from this file
- Replace the `setTimeout` replay chain with a `requestAnimationFrame` loop that batch-renders lines at a target cadence (30ms/line), using a single ref to track the current index — eliminates O(n²) array spread

### 3. Isolate MobileShell clock re-renders (~15 lines)
**File**: `src/modules/desktop/MobileShell.tsx`

Extract the clock tick into a self-contained `<MobileClock>` component with its own `useState`/`useEffect`. The parent `MobileShell` no longer re-renders every second.

### 4. Hoist boot imports, cache inspector module (~20 lines)
**Files**: `ContainerBootOverlay.tsx`, `ContainerInspector.tsx`

- In `ContainerBootOverlay`: import orchestrator at the top of the file (static import) instead of dynamic `await import()` during each phase. The orchestrator is already a singleton — no bundle penalty since it's used by multiple components.
- In `ContainerInspector`: cache the imported module in a module-level variable so the 2s interval doesn't re-resolve.

### 5. Add CSS containment to TabBar and DesktopWidgets (~10 lines)
**Files**: `src/modules/desktop/TabBar.tsx`, `src/modules/desktop/DesktopWidgets.tsx`

Add `contain: layout style` to the root elements, preventing window content reflows from triggering tab bar layout recalculation.

### 6. Add `content-visibility: auto` to off-screen windows (~5 lines)
**File**: `src/modules/desktop/DesktopWindow.tsx`

Windows that are open but fully occluded by a maximized window on top get `content-visibility: auto` — the browser skips rendering their subtree entirely. This is the single biggest win for multi-window scenarios.

### 7. GPU-promote boot overlay and inspector panel (~10 lines)
**Files**: `ContainerBootOverlay.tsx`, `ContainerInspector.tsx`

Add `will-change: opacity` to the boot overlay (it will animate out) and `transform: translateZ(0)` to the inspector panel to promote to compositor layer — eliminates paint on open/close.

### 8. New compliance gate: `rendering-performance-gate.ts` (~90 lines)
**File**: `src/modules/canonical-compliance/gates/rendering-performance-gate.ts`

A gate that verifies the performance patterns are maintained:
- Checks that `DesktopWindow` uses direct DOM mutation for drag (not React state per frame)
- Verifies `contain:` declarations exist on shell chrome elements
- Flags any desktop component still importing `framer-motion` (target: reduce from 10 to ≤4)
- Reports `content-visibility` coverage on window components
- Checks that no `setInterval` in desktop hooks runs at <500ms frequency without isolation

### 9. Register gate and add to desktop.css (~15 lines)
**Files**: `gates/index.ts`, `desktop.css`

- Register the new gate
- Add CSS utility classes for the new containment patterns:
  - `.gpu-promote { transform: translateZ(0); will-change: transform; }`
  - `.contain-strict { contain: layout style paint; }`

## Files

| File | Action | Impact |
|---|---|---|
| `src/modules/desktop/DesktopWindow.tsx` | Update | DOM-direct drag, content-visibility, GPU hints |
| `src/modules/desktop/BootSequence.tsx` | Update | CSS animations, RAF render loop, remove framer-motion |
| `src/modules/desktop/MobileShell.tsx` | Update | Isolate clock re-renders |
| `src/modules/desktop/components/ContainerBootOverlay.tsx` | Update | Static imports, GPU promotion |
| `src/modules/desktop/components/ContainerInspector.tsx` | Update | Module caching, GPU promotion |
| `src/modules/desktop/TabBar.tsx` | Update | CSS containment |
| `src/modules/desktop/DesktopWidgets.tsx` | Update | CSS containment |
| `src/modules/desktop/desktop.css` | Update | GPU/containment utility classes |
| `src/modules/canonical-compliance/gates/rendering-performance-gate.ts` | Create | Performance compliance gate |
| `src/modules/canonical-compliance/gates/index.ts` | Update | Register gate |

