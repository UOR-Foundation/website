/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// ── 1. Workbox Precaching (VitePWA injects manifest at build time) ──
precacheAndRoute(self.__WB_MANIFEST);

// ── 2. Runtime caching strategies ──

// Images – cache first
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
);

// JS/CSS – stale while revalidate
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 })],
  }),
);

// Supabase API – network first with short cache
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 5 })],
    networkTimeoutSeconds: 3,
  }),
);

// ── 3. Cross-Origin Isolation header injection ──
// Intercept navigation requests to inject COOP/COEP headers so
// SharedArrayBuffer is available on every hosting platform.

function addCOIHeaders(response: Response): Response {
  // Don't modify opaque responses — their headers/body are inaccessible
  if (response.type === 'opaque' || response.type === 'opaqueredirect') {
    return response;
  }

  // Already has isolation headers (e.g. dev server)
  if (response.headers.get('Cross-Origin-Opener-Policy')) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => addCOIHeaders(response))
      .catch(async () => {
        // Offline fallback: serve precached index.html with COI headers
        const cached = await caches.match('/index.html');
        if (cached) return addCOIHeaders(cached);
        return new Response('Offline', { status: 503 });
      }),
  );
});

// ── 4. Standard SW lifecycle ──
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
