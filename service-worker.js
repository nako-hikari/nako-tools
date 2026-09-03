// service-worker.js
//
// This service worker exists ONLY to make the site installable as a PWA.
// It deliberately does NOT use the Cache API, does NOT store any responses,
// and does NOT intercept navigation. Every request is just passed straight
// through to the network. Nothing here can grow storage over time.
//
// If you ever DO want offline caching later, that's a deliberate feature to
// add on top of this — this file will not silently start caching things.

self.addEventListener('install', (event) => {
  // Activate immediately, don't wait around for old tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of open pages right away.
  event.waitUntil(self.clients.claim());
});

// A fetch handler is required for Chrome/most browsers to consider this
// installable. This one just forwards straight to the network — no cache
// reads, no cache writes, no storage of any kind.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
