/* ProInterview PWA service worker — cache shell for offline practice entry */
const CACHE = "prointerview-shell-v1";
const SHELL = ["/", "/labs", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok && new URL(req.url).origin === self.location.origin) {
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "ProInterview", body: "Prep reminder" };
  event.waitUntil(self.registration.showNotification(data.title || "ProInterview", { body: data.body || "", icon: "/icons/icon-192.png" }));
});
