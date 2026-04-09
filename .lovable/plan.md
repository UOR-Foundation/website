

## Plan: Fix Build Error + Make SharedArrayBuffer Reliable Everywhere

### Two Issues to Fix

**Issue 1 — Build Error**: `@react-sigma/core` v4 doesn't export `./lib/style.css`. The correct exported CSS path is `./lib/react-sigma.min.css`.

**Issue 2 — SharedArrayBuffer never activates on production**: The COI service worker (`coi-serviceworker.js`) registers at scope `/`, but then VitePWA's auto-registered SW (`sw.js`) also registers at scope `/` and **replaces** the COI worker. Only one service worker can control a given scope. Once the PWA SW takes over, navigation responses no longer get COOP/COEP headers injected, so `crossOriginIsolated` stays `false` and `SharedArrayBuffer` is unavailable.

The `_headers` file uses Netlify format, but Lovable hosting doesn't process it — so the static header approach doesn't work either.

### Solution: Unified Service Worker via `injectManifest`

Merge COI header injection and PWA caching into **one** service worker. Switch VitePWA from `generateSW` to `injectManifest` mode with a custom SW source.

```text
Before:  coi-serviceworker.js (COI) + sw.js (PWA) → conflict, PWA wins, COI lost
After:   sw.ts (unified) = Workbox precaching + COI header injection → both work
```

### Files

| File | Change |
|------|--------|
| `src/modules/knowledge-graph/components/SovereignGraphExplorer.tsx` | Fix CSS import: `@react-sigma/core/lib/react-sigma.min.css` |
| `src/custom-sw.ts` | **New** — custom service worker source that: (1) imports Workbox precaching via `self.__WB_MANIFEST`, (2) intercepts navigation fetch events and injects COOP/COEP headers on every response, (3) handles both network and cache-served navigations |
| `vite.config.ts` | Switch VitePWA to `injectManifest` mode pointing to `src/custom-sw.ts`; move runtime caching config into the custom SW |
| `src/main.tsx` | **Remove** the entire `ensureCrossOriginIsolation()` function and COI service worker registration logic. The unified SW handles everything. Keep the iframe detection for logging only. Simplify to just render the app immediately. |
| `public/coi-serviceworker.js` | **Delete** — no longer needed |

### Custom Service Worker Logic (`src/custom-sw.ts`)

```typescript
// 1. Workbox precaching (VitePWA injects manifest here)
import { precacheAndRoute } from 'workbox-precaching';
precacheAndRoute(self.__WB_MANIFEST);

// 2. COI header injection for ALL navigation responses
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.headers.get('Cross-Origin-Opener-Policy')) return response;
      const headers = new Headers(response.headers);
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }).catch(() => {
      // Offline: serve precached index.html with COI headers
      const cached = caches.match('/index.html');
      // ...add headers to cached response too
    })
  );
});
```

This ensures COOP/COEP headers are present on **every** navigation response — whether from network or cache — making SharedArrayBuffer work reliably on every device, every browser, every hosting platform.

### Why This Always Works

- **No SW scope conflict** — single SW at `/` handles both concerns
- **Works offline** — precached index.html also gets COI headers injected
- **Platform-agnostic** — doesn't depend on hosting platform supporting `_headers` files
- **First-load**: On very first page load (before SW installs), SAB won't be available. After SW installs + page reload, it's permanently active. The existing `main.tsx` reload logic ensures this happens automatically on first visit.
- **Mobile/desktop/Apple/PC** — all modern browsers support both `credentialless` COEP and service workers

### main.tsx Simplification

The boot sequence becomes:
1. Register the unified SW (VitePWA handles this automatically via `registerType: "autoUpdate"`)
2. If `!crossOriginIsolated` and SW just installed → reload once (same logic, but triggered by the unified SW)
3. Render the app

Most of the 70-line `ensureCrossOriginIsolation()` function gets replaced by ~10 lines checking if a reload is needed after the SW activates.

