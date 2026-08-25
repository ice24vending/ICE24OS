const CACHE_PREFIX = "ice24-private";
const CACHE_VERSION = "v1";
const CURRENT_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CURRENT_CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// Phase 1 intentionally does not cache authenticated requests or protected data.
