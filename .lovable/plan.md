

# Fix SharedArrayBuffer — Cross-Origin Isolation Bootstrap

## Root Cause

The `_headers` file in `public/` sets COOP/COEP headers, but Lovable's hosting platform does **not** process `_headers` files (that format is Netlify/Cloudflare-specific). So the only mechanism is the **service worker header injection** in `custom-sw.ts`.

The SW approach has a **race condition** in `ensureCrossOriginIsolation()` (main.tsx):

1. `navigator.serviceWorker.ready` resolves when the SW reaches `activated` state
2. But `clients.claim()` (in the SW) is async — it may not have completed yet
3. So `navigator.serviceWorker.controller` is still `null` when the `.ready.then()` callback runs
4. The reload never triggers → page stays non-isolated → SAB unavailable

Additionally, there's no fallback if the first reload doesn't achieve isolation, and no `controllerchange` listener to detect when the SW actually takes control.

## Fix

### 1. Fix `src/main.tsx` — Robust COI Bootstrap

Replace the current `ensureCrossOriginIsolation` with a version that:
- Listens for `controllerchange` event (fires when `clients.claim()` completes)
- Uses a `sessionStorage` guard to prevent infinite reload loops (max 1 reload per session)
- Explicitly registers the SW early (before VitePWA's lazy registration) to speed up the bootstrap

### 2. Fix `src/custom-sw.ts` — Handle Opaque Responses

The current `addCOIHeaders` tries to create a `new Response(response.body, ...)` from the fetch result. If the response is opaque (cross-origin without CORS), `response.body` is null and this fails silently. Add a guard to only inject headers on non-opaque responses.

### 3. Enhance Health Report Diagnostics

Update `SystemMonitorApp.tsx` to show **why** SAB is unavailable — distinguish between:
- No service worker support
- SW registered but not controlling
- SW controlling but COEP/COOP not applied
- Running in iframe (structurally impossible)

## Files Modified

| File | Change |
|------|--------|
| `src/main.tsx` | Fix COI bootstrap with `controllerchange` listener + reload guard |
| `src/custom-sw.ts` | Guard against opaque response bodies |
| `src/modules/boot/SystemMonitorApp.tsx` | Add SAB diagnostic detail to health report |
| `src/modules/boot/SystemMonitorDetailViews.tsx` | Show COI diagnostic breakdown in capabilities view |

## Technical Detail

```text
Current flow (broken):
  Page loads → SW registered (async) → ready fires → controller is null → no reload → SAB ✗

Fixed flow:
  Page loads → check crossOriginIsolated → false
  → register SW explicitly → listen for controllerchange
  → SW activates, calls clients.claim() → controllerchange fires
  → check sessionStorage guard → reload once
  → Page reloads through SW → COOP/COEP injected → SAB ✓
```

The `sessionStorage` key `coi-reload` prevents infinite loops — if a reload was already attempted this session and COI still failed, the system logs a diagnostic and proceeds with the Transferable ArrayBuffer fallback.

