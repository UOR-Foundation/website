

## Plan: Harden Mobile PWA Delivery and Responsiveness

### Issues Found

1. **Double render in `main.tsx`** — `createRoot().render()` is called both inside `.finally()` (line 57) and unconditionally on line 60, causing the app to mount twice on every load.

2. **No iframe/preview guard** — The COI service worker registers even inside Lovable's preview iframe, causing stale caching and interference. VitePWA also lacks `devOptions: { enabled: false }`.

3. **MobileShell missing safe-area insets** — Bottom controls don't use `env(safe-area-inset-bottom)`, so on notched iPhones the home indicator pill and bottom icons get clipped behind the system gesture area.

4. **No GPU layer promotion on mobile shell** — The clock, background, and drawer content aren't promoted to compositor layers, causing potential paint jank during drawer transitions.

5. **Missing mobile-specific touch optimizations** — No `will-change` hints on animated elements, no `content-visibility: auto` on off-screen drawer content.

### Changes

**1. Fix `src/main.tsx`**
- Remove the duplicate `createRoot().render()` on line 60
- Add iframe/preview-host guard: if running inside an iframe or on a `*.lovableproject.com` / `id-preview--*` domain, unregister all existing service workers and skip COI registration
- Keep the `.finally()` render path as the single mount point

**2. Harden `vite.config.ts` PWA config**
- Add `devOptions: { enabled: false }` so VitePWA's service worker never activates during development

**3. Upgrade `src/modules/desktop/MobileShell.tsx`**
- Bottom controls: change `pb-2` to `pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))]` so content respects the device safe area on notched phones
- Add `will-change: transform` to the DayRingClock container and bottom controls for GPU compositing
- Add `content-visibility: auto` on drawer content containers so off-screen drawer DOM doesn't trigger layout

**4. Add mobile PWA meta hardening to `index.html`**
- Already has `viewport-fit=cover`, `apple-mobile-web-app-capable`, and `apple-mobile-web-app-status-bar-style` — these are correct
- Add `<meta name="mobile-web-app-capable" content="yes" />` for Android Chrome's Add to Home Screen
- Add `<link rel="apple-touch-startup-image" href="/pwa-icon-512.png" />` for iOS splash screen

### Technical Details

The safe-area fix uses CSS `env()` with fallback values so non-notched devices still get correct spacing. The `will-change: transform` hints tell the browser to promote those layers to the GPU compositor, eliminating paint operations during Vaul drawer slide animations. The iframe guard prevents service worker interference in the Lovable editor preview while keeping full PWA functionality in production.

### Files Modified
- `src/main.tsx` — Remove double render, add iframe guard
- `vite.config.ts` — Add `devOptions: { enabled: false }`
- `src/modules/desktop/MobileShell.tsx` — Safe-area insets, GPU promotion
- `index.html` — Android PWA meta tag, iOS splash image link

