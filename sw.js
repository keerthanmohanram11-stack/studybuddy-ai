// Service worker: makes the app installable, opens instantly and works offline
const CACHE = "studybuddy-v4";
const FILES = [
  "/", "/index.html", "/manifest.json", "/css/app.css",
  "/js/core.js", "/js/home.js", "/js/learn.js", "/js/practice.js",
  "/js/progress.js", "/js/profile.js", "/js/onboard.js",
  "/icons/icon-192.png", "/icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // AI requests always go to the internet
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  // App files: use the internet first (so updates show), fall back to the saved copy when offline
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("/index.html")))
  );
});