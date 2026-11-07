const CACHE_PREFIX = "ice24-private";
const CACHE_VERSION = "v3";
const CURRENT_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const ENABLED = new URL(self.location.href).searchParams.get("offline") === "1";
const SHELL = [
  "/offline-shell.html",
  "/offline-shell.js",
  "/offline-work.html",
  "/offline-work/app.js",
  "/offline-work/app.css",
];

self.addEventListener("install", (event) => {
  if (ENABLED) event.waitUntil(caches.open(CURRENT_CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && (!ENABLED || key !== CURRENT_CACHE))
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// Only the generic shell is cached. Never cache API, RSC, session or authenticated HTML responses.
self.addEventListener("fetch", (event) => {
  if (!ENABLED || event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then((cached) => cached || fetch(event.request)));
  } else if (
    event.request.mode === "navigate" &&
    /^\/maintenance\/work-orders\/[0-9a-f-]{36}(?:\/execute)?$/.test(url.pathname)
  ) {
    event.respondWith(
      fetch(event.request).catch(
        async () => (await caches.match("/offline-shell.html")) || Response.error(),
      ),
    );
  }
});
