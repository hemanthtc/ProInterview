"use client";

import { useEffect } from "react";
import { installGlobalAuthFetchInterceptor, syncClientAuthState } from "@/utils/authClient";

// Install fetch interceptor immediately on client module evaluation
if (typeof window !== "undefined") {
    installGlobalAuthFetchInterceptor();
    syncClientAuthState();
}

/**
 * Root Client Component ensuring seamless authentication,
 * cookie-storage synchronization, and Bearer token attachment.
 */
export default function AuthInitializer() {
    useEffect(() => {
        installGlobalAuthFetchInterceptor();
        syncClientAuthState();

        const handleSync = () => {
            syncClientAuthState();
        };

        window.addEventListener("storage", handleSync);
        window.addEventListener("ai-storage-change", handleSync);
        document.addEventListener("visibilitychange", handleSync);

        return () => {
            window.removeEventListener("storage", handleSync);
            window.removeEventListener("ai-storage-change", handleSync);
            document.removeEventListener("visibilitychange", handleSync);
        };
    }, []);

    return null;
}
