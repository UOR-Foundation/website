/*
 * COI Service Worker — enables cross-origin isolation (SharedArrayBuffer)
 * on hosting platforms that don't natively serve COOP/COEP headers.
 *
 * How it works:
 *   1. Registers itself as a service worker
 *   2. Intercepts all fetch responses
 *   3. Injects Cross-Origin-Opener-Policy & Cross-Origin-Embedder-Policy headers
 *   4. The browser sees the headers → sets crossOriginIsolated = true → unlocks SAB
 *
 * Using "credentialless" for COEP to allow cross-origin resources (images, scripts)
 * without requiring CORP headers on every third-party resource.
 */

/* eslint-disable no-restricted-globals */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only intercept same-origin navigations and subresources
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        // Clone the response so we can modify headers
        const newHeaders = new Headers(response.headers);
        newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
        newHeaders.set("Cross-Origin-Embedder-Policy", "credentialless");

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }).catch((err) => {
        console.error("[COI-SW] Navigation fetch failed:", err);
        return fetch(request);
      })
    );
  }
});
