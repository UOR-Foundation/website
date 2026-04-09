/*
 * COI Service Worker — enables cross-origin isolation (SharedArrayBuffer)
 * on hosting platforms that don't natively serve COOP/COEP headers.
 *
 * This worker intercepts navigation requests and adds the required headers:
 *   - Cross-Origin-Opener-Policy: same-origin  
 *   - Cross-Origin-Embedder-Policy: credentialless
 *
 * Using "credentialless" (not "require-corp") so cross-origin resources
 * like images, scripts, and iframes work without CORP headers.
 *
 * This SW is registered at /coi-serviceworker.js scope and only handles
 * navigations — it does NOT interfere with the VitePWA service worker
 * which handles caching at /sw.js.
 */

/* eslint-disable no-restricted-globals */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Only intercept navigations to inject isolation headers
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).then((response) => {
      // If already cross-origin isolated, pass through
      if (response.headers.get("Cross-Origin-Opener-Policy")) {
        return response;
      }

      const newHeaders = new Headers(response.headers);
      newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
      newHeaders.set("Cross-Origin-Embedder-Policy", "credentialless");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }).catch(() => fetch(event.request))
  );
});
