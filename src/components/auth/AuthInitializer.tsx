"use client";

import { useEffect } from "react";
import { installGlobalAuthFetchInterceptor, syncClientAuthState } from "@/utils/authClient";
import { initTabSession } from "@/utils/tabSession";

// Install fetch interceptor and initialize tab session immediately on client evaluation
if (typeof window !== "undefined") {
    initTabSession();
    installGlobalAuthFetchInterceptor();
    syncClientAuthState();
}

/**
 * Root Client Component ensuring tab-isolated authentication,
 * tab session validation, and Bearer token attachment.
 */
export default function AuthInitializer() {
    useEffect(() => {
        initTabSession();
        installGlobalAuthFetchInterceptor();
        syncClientAuthState();

        const handleSync = () => {
            syncClientAuthState();
        };

        // Window-local events only: do NOT listen to cross-tab "storage" events
        // so that actions in another tab cannot overwrite this tab's state.
        window.addEventListener("ai-storage-change", handleSync);
        document.addEventListener("visibilitychange", handleSync);

        return () => {
            window.removeEventListener("ai-storage-change", handleSync);
            document.removeEventListener("visibilitychange", handleSync);
        };
    }, []);

    return null;
}
