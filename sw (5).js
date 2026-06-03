/* 3T Paracords and Crafts — Service Worker
   Caches the app shell so the launcher opens instantly and works offline.
   Bump CACHE_VERSION whenever you change index.html / icons / manifest. */

const CACHE_VERSION = "3t-paracords-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png",
  "./icon-192.png",
  "./icon-512.png"
];

// Install: pre-cache the shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - The Apps Script app (script.google.com / googleusercontent.com) is ALWAYS
//   fetched from the network so products, orders, and the admin portal stay live.
// - The local shell files use cache-first, falling back to network.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache the live web app or Google endpoints
  if (
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("googleusercontent.com") ||
    url.hostname.includes("google.com")
  ) {
    return; // let the browser handle it normally (network)
  }

  // Cache-first for our own shell assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((resp) => {
            // optionally cache new same-origin GET requests
            if (
              event.request.method === "GET" &&
              url.origin === self.location.origin
            ) {
              const copy = resp.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(event.request, copy));
            }
            return resp;
          })
          .catch(() => cached)
      );
    })
  );
});
