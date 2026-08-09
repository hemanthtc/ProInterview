"use client";

import { useEffect } from "react";

/** Registers the PWA service worker once on the client. */
export default function PwaRegister() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
        navigator.serviceWorker.register("/sw.js").catch(() => {
            /* ignore offline register errors */
        });
    }, []);
    return null;
}
