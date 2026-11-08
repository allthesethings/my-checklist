// Service worker: приложение открывается и без интернета.
// При изменении файлов увеличьте VERSION, чтобы телефоны получили обновление.
const VERSION = "v4";
const CACHE = "checklist-" + VERSION;
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("checklist-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Страница: сначала сеть (чтобы видеть обновления), без сети — из кэша
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Шрифты Google и свои файлы: из кэша, параллельно обновляем
  // (запросы к Supabase не кэшируем — только статику)
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  const isLib = url.hostname === "cdn.jsdelivr.net";
  if (url.origin === location.origin || isFont || isLib) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then(res => { if (res.ok || res.type === "opaque") cache.put(req, res.clone()); return res; })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
