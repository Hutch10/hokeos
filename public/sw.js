const CACHE_NAME = "hokeos-sovereign-v2";
const ASSETS_TO_CACHE = [
  "/dashboard",
  "/dashboard/yard",
  "/manifest.json",
  "/logo.png"
];

/**
 * Phase 2: Sovereign Offline Resilience
 * Custom Service Worker for industrial yard operations.
 * Prioritizes availability in zero-connectivity environments.
 */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
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
  const { request } = event;
  const url = new URL(request.url);

  // API calls: Network-first, then fallback to JSON error
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "OFFLINE_MODE_ACTIVE",
            message: "Operating in Sovereign Offline mode. Data saved locally.",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // Static Assets & Pages: Cache-first
  event.respondWith(
    caches.match(request).then((response) => {
      return (
        response ||
        fetch(request).then((networkResponse) => {
          if (
            request.method === "GET" &&
            networkResponse.status === 200 &&
            !url.pathname.startsWith("/api/")
          ) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cacheCopy);
            });
          }
          return networkResponse;
        })
      );
    })
  );
});
