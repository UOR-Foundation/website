// Retires the old website's offline helper so every browser loads the current site.
// The site has no other workers, so every stored copy belongs to the old helper.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.allSettled(names.map((n) => caches.delete(n)));
      await self.clients.claim();
      const tabs = await self.clients.matchAll({ type: "window" });
      await Promise.allSettled(tabs.map((t) => t.navigate(t.url)));
    } finally {
      await self.registration.unregister();
    }
  })()),
);
