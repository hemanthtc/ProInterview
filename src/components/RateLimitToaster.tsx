"use client";

import { useEffect, useState } from "react";

/** Global toast for HTTP 429 / Retry-After from same-origin API calls. */
export default function RateLimitToaster() {
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const original = window.fetch.bind(window);
        window.fetch = async (...args) => {
            const res = await original(...args);
            if (res.status === 429) {
                try {
                    const input = args[0];
                    const url =
                        typeof input === "string"
                            ? new URL(input, window.location.origin)
                            : input instanceof URL
                              ? input
                              : input instanceof Request
                                ? new URL(input.url, window.location.origin)
                                : null;
                    const isSameOriginApi =
                        url &&
                        url.origin === window.location.origin &&
                        url.pathname.startsWith("/api/");
                    if (isSameOriginApi) {
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
        return () => {
            window.fetch = original;
        };
    }, []);

    if (!message) return null;
    return (
        <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-amber-500 text-slate-950 px-4 py-2 text-sm shadow-lg">
            {message}
        </div>
    );
}
