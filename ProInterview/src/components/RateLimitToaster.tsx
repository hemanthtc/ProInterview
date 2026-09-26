"use client";

import { useEffect, useState } from "react";

/** Global toast for HTTP 429 / Retry-After from same-origin API calls. */
export default function RateLimitToaster() {
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if ((window as any).__rateLimitInterceptorSet) return;
        (window as any).__rateLimitInterceptorSet = true;

        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const res = await originalFetch(...args);
            if (res && res.status === 429) {
                try {
                    const input = args[0];
                    const urlStr =
                        typeof input === "string"
                            ? input
                            : input instanceof URL
                              ? input.href
                              : input instanceof Request
                                ? input.url
                                : "";
                    if (urlStr.includes("/api/")) {
                        const retry = res.headers.get("Retry-After");
                        setMessage(retry ? `Rate limited — retry in ${retry}s` : "Rate limited — please wait and retry");
                        window.setTimeout(() => setMessage(null), 5000);
                    }
                } catch {
                    // ignore URL parse failures
                }
            }
            return res;
        };
    }, []);

    if (!message) return null;
    return (
        <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-amber-500 text-slate-950 px-4 py-2 text-sm shadow-lg">
            {message}
        </div>
    );
}
