// Minimal service worker — caches the app shell for offline launch.
// Deliberately simple for Session 1; richer offline/recipe caching is later work.
const CACHE_NAME = "memory-kitchen-v3";
const APP_SHELL = ["/manifest.json"];

self.addEventListener("install", (event) => {
  // Take over from any previous worker (e.g. the poisoned v1/v2) as soon as
  // this one finishes installing, instead of waiting for every open tab to
  // close. Without this, a tab opened before this update stays controlled by
  // the old worker — and the old worker's broken cache entries keep being
  // served — until the user manually closes every tab for the site.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
      // Immediately become the controller of any already-open tabs so the
      // fix applies on this activation, not on some future reload.
      self.clients.claim(),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Never let the cache serve a redirected response for a navigation.
  // Chrome refuses to fulfill a navigate request with a Response whose
  // redirected flag is true and fails the whole request with
  // net::ERR_FAILED ("This site can't be reached"). This bit us on "/":
  // it got precached while unauthenticated (so the real response was a
  // 307 to /login), and every later visit to "/" replayed that broken
  // redirect response forever, even after the redirect target was fixed.
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      if (cached && !cached.redirected) return cached;
      return fetch(event.request);
    })()
  );
});
