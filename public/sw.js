// Service Worker for Rashed Telecom Shop Management PWA
// Architecture defined in Master_plan.md (Sections 10, 16, 17)

const CACHE_NAME = "rashed-telecom-v3";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  "/login",
  "/app",
  "/app/pos",
  "/app/service",
  "/app/inventory",
  "/app/accounts",
  "/offline.html",
  "/favicon.ico",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-192.jpg",
  "/icons/icon-512.jpg",
];

// 1. INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Precache asset fetch non-fatal error:", err);
      });
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
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

  // Next.js static assets, chunks, styles & icons: Cache-First with runtime caching
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico" ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response("", { status: 408, statusText: "Offline" });
          });
      })
    );
    return;
  }

  // HTML Page Navigation: Network-First with Local Cache Fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // 1. Try exact requested page from cache (e.g. /app/pos, /app)
          const exactCached = await caches.match(request);
          if (exactCached) {
            return exactCached;
          }

          // 2. Try match without query parameters
          const cleanUrl = new URL(request.url);
          cleanUrl.search = "";
          const cleanCached = await caches.match(cleanUrl.toString());
          if (cleanCached) {
            return cleanCached;
          }

          // 3. Fallback to cached POS or App shell so user can continue working
          const posFallback = await caches.match("/app/pos");
          if (posFallback && url.pathname.includes("/pos")) {
            return posFallback;
          }

          const appFallback = await caches.match("/app");
          if (appFallback && (url.pathname.startsWith("/app") || url.pathname === "/")) {
            return appFallback;
          }

          // 4. Fallback to offline guidance page
          const offlinePage = await caches.match(OFFLINE_URL);
          return (
            offlinePage ||
            new Response("ইন্টারনেট সংযোগ বিচ্ছিন্ন। অফলাইনে পৃষ্ঠাটি প্রস্তুত নেই।", {
              status: 503,
              statusText: "Offline",
              headers: { "Content-Type": "text/html; charset=utf-8" },
            })
          );
        })
    );
    return;
  }

  // API Requests: Network-First, return 503 OFFLINE JSON so frontend can gracefully route to IndexedDB outbox
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
