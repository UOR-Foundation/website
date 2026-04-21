
# Fix the Missing Preview Button / Stuck Files Mode

## Root Cause

The project still has a full PWA/service-worker setup enabled:

- `vite.config.ts` uses `vite-plugin-pwa` with `injectManifest`
- `src/custom-sw.ts` registers Workbox caching + navigation interception
- `src/main.tsx` still runs service-worker / cross-origin-isolation bootstrap logic

That combination is exactly the kind of setup that can break Lovable preview, especially because preview runs in an iframe. The platform guidance for this environment explicitly warns that service workers in preview can cause stale routing, navigation interference, and the editor getting stuck in Files mode with the preview button disappearing.

## Plan

### 1. Remove preview-breaking PWA behavior
Update the app so Lovable preview never depends on a service worker:

- Remove `VitePWA(...)` from `vite.config.ts`
- Remove the `vite-plugin-pwa` import
- Remove Workbox-related dependencies from `package.json` if they are no longer needed
- Keep the app as a normal SPA so the preview iframe can load reliably again

### 2. Remove the custom service worker
Delete the service-worker implementation path entirely:

- Remove `src/custom-sw.ts`
- Remove any references to Workbox manifest injection or runtime caching
- Eliminate the navigation interception that is currently modifying responses for COOP/COEP

### 3. Simplify `src/main.tsx`
Strip out the service-worker / COI bootstrap logic that is currently tied to preview behavior:

- Remove `isInIframe` / `isEditorPreview` PWA cleanup block
- Remove `ensureCrossOriginIsolation()`
- Remove reload-on-`controllerchange` logic
- Leave `src/main.tsx` as a standard React entrypoint

### 4. Preserve installability only if needed
If you still want “install app” behavior without breaking preview, keep only the safe pieces:

- keep a lightweight web manifest if desired
- do **not** reintroduce service worker registration
- no offline caching in the Lovable environment

This gives installability without the preview instability.

### 5. Audit for leftover service-worker assumptions
Clean up UI/status surfaces that currently imply service-worker support is expected:

- `src/modules/desktop/BootSequence.tsx`
- `src/modules/boot/SystemMonitorDetailViews.tsx`

Update wording so preview/dev mode does not report SW/COI as a required capability.

### 6. Verify expected outcome
After the cleanup:

- Lovable preview should return
- the top preview button should reappear
- the project should stop getting trapped in Files mode
- the app should behave as a standard SPA in preview

## Files to Change

- `vite.config.ts`
- `src/main.tsx`
- `src/custom-sw.ts` (remove)
- `package.json`
- `src/modules/desktop/BootSequence.tsx`
- `src/modules/boot/SystemMonitorDetailViews.tsx`

## Result

The site will stop using the preview-breaking PWA/service-worker path and return to a stable Lovable development setup, so the preview panel and preview button work normally again.
