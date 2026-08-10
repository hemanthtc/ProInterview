/* ProInterview PWA service worker — cache shell + offline drills for practice entry */

/* On localhost, immediately self-destruct to prevent dev-mode reload loops */
const IS_LOCAL = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

if (IS_LOCAL) {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll())
        .then((clients) => clients.forEach((c) => c.navigate(c.url)))
    );
  });
} else {
  const CACHE = "prointerview-shell-v4";
  const SHELL = ["/", "/labs", "/prep", "/star-coach", "/coding-lab", "/manifest.json", "/offline-drills.json"];

  // API GET responses that are safe to cache network-first, for offline drill practice.
  const OFFLINE_DRILL_API_PATHS = ["/api/star-coach-questions", "/api/coding-problems"];

  function isOfflineDrillApi(pathname) {
    return OFFLINE_DRILL_API_PATHS.some((p) => pathname.startsWith(p));
  }

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

    const url = new URL(req.url);

    // Network-first with cache fallback for the small set of drill/question APIs so
    // star-coach + coding-lab practice keeps working offline once primed while online.
    if (url.origin === self.location.origin && isOfflineDrillApi(url.pathname)) {
      event.respondWith(
        fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => caches.match(req))
      );
      return;
    }

    // Never cache other API/auth responses
    if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
      event.respondWith(fetch(req));
      return;
    }

    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req)
          .then((res) => {
            const copy = res.clone();
            if (res.ok && url.origin === self.location.origin) {
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
}
