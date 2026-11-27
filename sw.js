// Service worker: makes Wayfinder installable, fast to open and usable offline
const CACHE = "wayfinder-v8";
const FILES = ["/", "/index.html", "/manifest.json", "/css/app.css",
  "/js/icons.js", "/js/data.js", "/js/i18n.js", "/js/core.js", "/js/auth.js", "/js/home.js", "/js/learn.js",
  "/js/practice.js", "/js/plan.js", "/js/progress.js", "/js/settings.js",
  "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png", "/icons/logo.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok && (url.origin === location.origin || url.hostname.includes("fonts."))) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request).then(r => r || (e.request.mode === "navigate" ? caches.match("/index.html") : undefined))));
});
