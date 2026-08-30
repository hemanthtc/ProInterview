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
  const CACHE = "prointerview-shell-v6";
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
          .catch(async () => {
            const cached = await caches.match(req);
            return cached || new Response(JSON.stringify({ error: "Offline drill data unavailable." }), {
              status: 503,
              headers: { "Content-Type": "application/json" }
            });
          })
      );
      return;
    }

    // Never cache other API/auth responses, but guarantee a valid Response on network rejection
    if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
      event.respondWith(
        fetch(req).catch(() => new Response(JSON.stringify({ error: "Network request failed." }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        }))
      );
      return;
    }

    // Use Network-First for HTML/navigation requests (including iframe pages like /study-materials/index.html).
    // This ensures that when the user is online, they always fetch the fresh HTML page
    // linking to the latest hashed JS/CSS assets, preventing caching issues on deployments.
    const isHtml = req.mode === "navigate" || (req.headers.get("accept") && req.headers.get("accept").includes("text/html"));
    if (url.origin === self.location.origin && isHtml) {
      event.respondWith(
        fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          })
          .catch(async () => {
            const cachedPage = await caches.match(req);
            if (cachedPage) return cachedPage;
            const shellRoot = await caches.match("/");
            if (shellRoot) return shellRoot;
            return new Response("<!DOCTYPE html><html><head><title>Offline - ProInterview</title></head><body><h2>Offline</h2><p>You are currently offline. Please reconnect to access this page.</p></body></html>", {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" }
            });
          })
      );
      return;
    }

    // Cache-first for other static assets with safe fallback
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res.ok && url.origin === self.location.origin) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => new Response("", { status: 404, statusText: "Not Found" }));
      })
    );
  });

  self.addEventListener("push", (event) => {
    const data = event.data ? event.data.json() : { title: "ProInterview", body: "Prep reminder" };
    event.waitUntil(self.registration.showNotification(data.title || "ProInterview", { body: data.body || "", icon: "/icons/icon-192.png" }));
  });
}
