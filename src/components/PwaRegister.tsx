"use client";

import { useEffect } from "react";

/** Registers the PWA service worker once on the client. */
export default function PwaRegister() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
        if (process.env.NODE_ENV === "development") {
            // Force the browser to fetch the updated sw.js (self-destruct version)
            // then unregister all registrations. This stops the old SW's fetch handler.
            navigator.serviceWorker.getRegistrations().then(async (registrations) => {
                for (const reg of registrations) {
                    try { await reg.update(); } catch { /* ignore */ }
                    await reg.unregister();
                }
                // Also clear any stale SW caches
                if ("caches" in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map((k) => caches.delete(k)));
                }
            });
            return;
        }
        navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((reg) => {
            // Check for updates periodically (e.g., every hour)
            setInterval(() => {
                reg.update().catch(() => {/* ignore */});
            }, 60 * 60 * 1000);
        }).catch(() => {
            /* ignore offline register errors */
        });

        // Automatically reload the page when a new service worker takes over control
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    }, []);
    return null;
}
