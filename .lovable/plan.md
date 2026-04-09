

# Performance Audit & Optimization Plan

## Bottlenecks Found

### 1. Window Drag/Resize: Synchronous State + localStorage on Every Pixel (CRITICAL)

`useWindowManager.ts` calls `setWindows()` + `saveWindows()` (which does `JSON.stringify` → `localStorage.setItem`) **on every single pointer move event** during drag/resize. At 60fps that's 60 JSON serializations + 60 localStorage writes per second. This is the single biggest source of UI jank.

**Fix:** Throttle `moveWindow` and `resizeWindow` using `requestAnimationFrame` gating. Debounce `saveWindows` to only persist on drag/resize end (already have `onDragEnd`/`onResizeEnd` events). During drag, update a ref and use `transform: translate3d()` CSS directly on the DOM node instead of React state, only committing final position on pointer-up.

### 2. Boot Sequence Blocks Interaction for 5-10 Seconds (CRITICAL)

The boot sequence fetches WASM, hashes it with SHA-256, runs 256-element ring verification, validates the entire tech stack, computes 7+ cryptographic hashes sequentially, then **replays ~50 log lines with setTimeout delays of 75-200ms each**. Total visual replay alone: ~4-6 seconds of forced waiting.

**Fix:** 
- Run `sovereignBoot()` in parallel with the UI — show the desktop immediately with a subtle "booting…" indicator instead of blocking.
- Cache the boot receipt: if the seal hasn't changed (same WASM binary, same session), skip re-verification on soft navigations.
- Reduce replay delays: use 30ms per line instead of 75-120ms, or let users click to skip.

### 3. Backdrop-Blur Overuse (MODERATE — GPU compositor)

13 files use `backdrop-blur` with values up to 48px. Each blur layer forces the GPU compositor to re-render everything behind it. With multiple windows open + TabBar + MenuBar + SnapOverlay + SpotlightSearch, you can have 4-6 concurrent blur layers. On integrated GPUs and mobile, this causes frame drops during any animation/scroll.

**Fix:** 
- Replace `backdrop-blur` with solid semi-opaque backgrounds where blur adds no meaningful value (SnapOverlay, context menus, popover backgrounds).
- Cap blur radius: use `blur(12px)` max instead of `blur(48px)` — perceptually similar but 4x cheaper.
- Add `will-change: transform` to blurred elements and use `contain: layout style paint` to limit compositing cost.
- Respect `prefers-reduced-motion` — disable blur entirely for users who request reduced motion.

### 4. SSE Stream Parsing: String Concatenation Buffer (MODERATE)

`stream-oracle.ts` and `stream-knowledge.ts` use string concatenation (`buffer += decoder.decode(value)`) then repeatedly `buffer.indexOf("\n")` and `buffer.slice()`. For long streams this creates O(n²) string copies.

**Fix:** Use a `TextLineDecoder` pattern that splits on newlines during decode, avoiding repeated buffer slicing. Or accumulate into an array and join only when needed.

### 5. `activeWindowId` Recomputed Every Render (MINOR)

Line 348-350 of `useWindowManager.ts` sorts and filters the windows array on every render to find the active window. This triggers re-renders of all children since the returned object identity changes.

**Fix:** Memoize `activeWindowId` with `useMemo`, or track it as explicit state updated only on focus/close/minimize events.

### 6. Bus Middleware Chain Allocates Closures Per Call (MINOR)

`bus.ts` creates a new `next()` closure chain for every `bus.call()`. For high-frequency local calls (e.g., `kernel/derive` during batch operations), this creates GC pressure.

**Fix:** Pre-compose the middleware chain at registration time instead of per-call. Store a single composed function.

### 7. No Connection Pooling for Edge Function Calls (MODERATE)

Every `streamOracle`, `streamKnowledge`, and `voice-cleanup` call creates a new `fetch()` with no `keepalive` or connection reuse hints. On high-latency networks, TCP+TLS handshake adds 200-500ms per call.

**Fix:** Add `keepalive: true` to fetch options. For the bus remote gateway, use a single persistent connection via `fetch` with HTTP/2 multiplexing (already supported by the edge runtime).

## Implementation Summary

| File | Change | Impact |
|------|--------|--------|
| `useWindowManager.ts` | RAF-gated drag/resize, debounced persist, ref-based position during drag | Eliminates drag jank |
| `DesktopWindow.tsx` | Use `transform: translate3d()` from ref during drag instead of React re-render | 60fps drag |
| `DesktopShell.tsx` | Non-blocking boot — show desktop immediately, boot in background | 5s faster to interactive |
| `BootSequence.tsx` | Add skip button, reduce replay delays to 30ms, show as overlay not blocker | Instant feel |
| `stream-oracle.ts` | Replace string concat buffer with array-based line decoder | Faster long streams |
| `stream-knowledge.ts` | Same buffer optimization | Faster long streams |
| `bus.ts` | Pre-compose middleware chain at registration | Reduce GC pressure |
| Desktop CSS/components (13 files) | Cap `backdrop-blur` at 12px, remove from non-essential elements, add `contain` hints | Smoother compositing |
| `stream-oracle.ts`, `stream-knowledge.ts` | Add `keepalive: true` to fetch | Reduce connection overhead |
| `useWindowManager.ts` | Memoize `activeWindowId` | Fewer re-renders |

## Estimated Impact

- **Boot to interactive**: 5-8s → <1s (background boot)
- **Window drag**: Janky (60 localStorage writes/s) → Butter-smooth (0 writes during drag)
- **Compositing cost**: 4-6 concurrent blur layers → 1-2 max
- **Stream throughput**: ~15% faster for long AI responses (buffer optimization)

