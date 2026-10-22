// Droovee Service Worker v2.0
const CACHE_NAME = "droovee-static-v2";
const STATIC_ASSETS = [
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Strictly NEVER cache API requests, auth routes, or dynamic booking posts
  if (url.pathname.startsWith("/api/") || event.request.method !== "GET") {
    return;
  }

  // Network-first strategy for navigation and pages, falling back to cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful static responses
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.startsWith("/_next/static/") || STATIC_ASSETS.includes(url.pathname))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If offline, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback if navigating to a page while offline
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
      })
  );
});
