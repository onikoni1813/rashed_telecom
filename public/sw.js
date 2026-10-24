// Service Worker for Rashed Telecom Shop Management PWA
// Architecture defined in Master_plan.md (Sections 10, 16, 17)

const CACHE_NAME = "rashed-telecom-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  "/app",
  "/offline.html",
  "/favicon.ico",
  "/manifest.json",
  "/icons/icon-192.jpg",
  "/icons/icon-512.jpg",
];

// 1. INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests (mutations go through IndexedDB outbox or direct online fetch)
  if (request.method !== "GET") {
    return;
  }

  // Next.js static assets & icons: Cache-First
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // HTML Page Navigation: Network-First with Offline Fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          return caches.match(OFFLINE_URL).then((offlineResponse) => {
            return offlineResponse || new Response("Offline", { status: 503, statusText: "Offline" });
          });
        })
    );
    return;
  }

  // API Requests: Network-First, do NOT serve stale financial data silently
  if (url.pathname.startsWith("/api/v1/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            error: {
              code: "OFFLINE",
              message: "Device is currently offline. Action stored in local draft queue.",
            },
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // Generic fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// 4. BACKGROUND SYNC (where supported by browser)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-outbox") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "TRIGGER_SYNC" });
        });
      })
    );
  }
});
