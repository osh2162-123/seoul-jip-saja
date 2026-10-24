// Service worker: network-first for app files so data/rule updates arrive when online,
// cache-first for fonts (immutable subsets). Bump VERSION on every release.
const VERSION = 'app-2026-10-25-1';
const FONTS = 'fonts-v1';
const CORE = ["./", "./index.html", "./licenses.html", "./manifest.webmanifest", "./fonts/Pretendard-subset.woff2", "./vendor/d3.min.js", "./icons/icon-192.png", "./icons/icon-512.png", "./js/01.js", "./js/02.js", "./js/03.js", "./js/04.js", "./js/05.js", "./js/06.js", "./js/07.js", "./js/08.js", "./js/09.js", "./js/10.js", "./js/11.js", "./js/12.js", "./js/13.js", "./js/14.js", "./js/15.js", "./js/99-sw.js"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/fonts/') && url.pathname.endsWith('.woff2')) {
    e.respondWith(caches.open(FONTS).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  e.respondWith(fetch(req).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return r;
  }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
