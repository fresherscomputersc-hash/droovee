// Droovee Service Worker v3.0
//
// Two caches:
//   - immutable: content-hashed /_next/static/* and the PWA icons/manifest.
//     Cache-first is safe because a new deploy changes the filename.
//   - pages: HTML snapshots used only as an offline fallback. Navigation stays
//     network-first so users always get the current app shell.
//
// API traffic is never intercepted (see the early return in the fetch handler).
const VERSION = "v4";
const IMMUTABLE_CACHE = `droovee-immutable-${VERSION}`;
const PAGE_CACHE = `droovee-pages-${VERSION}`;
const KEEP_CACHES = [IMMUTABLE_CACHE, PAGE_CACHE];

const PRECACHE = ["/manifest.json", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

// Each deploy adds new hashed chunks; cap the cache so it cannot grow forever.
const MAX_IMMUTABLE_ENTRIES = 200;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(IMMUTABLE_CACHE).then((cache) =>
      // addAll() rejects the whole install if one file 404s; tolerate that.
      Promise.all(
        PRECACHE.map((path) => cache.add(path).catch(() => undefined))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !KEEP_CACHES.includes(key))
          .map((key) => caches.delete(key))
      );
      await prune(IMMUTABLE_CACHE, MAX_IMMUTABLE_ENTRIES);
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || PRECACHE.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, IMMUTABLE_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  }
});

/** Immutable assets: serve from cache, fall back to the network. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response && response.status === 200) {
    await cache.put(request, response.clone());
  }
  return response;
}

/** HTML: always try the network first, keep a copy for offline use. */
async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      await cache.put(request, response.clone());
      return response;
    }
    // A dead origin behind a proxy surfaces as 5xx, not a network error.
    if (response && response.status >= 500) {
      const fallback = await cachedPage(cache, request);
      if (fallback) return fallback;
    }
    return response;
  } catch {
    const fallback = await cachedPage(cache, request);
    if (fallback) return fallback;

    return new Response("You are offline. Reconnect to continue booking.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cachedPage(cache, request) {
  return (await cache.match(request)) ?? (await cache.match("/")) ?? null;
}

async function prune(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const excess = keys.slice(0, keys.length - maxEntries);
  await Promise.all(excess.map((key) => cache.delete(key)));
}
