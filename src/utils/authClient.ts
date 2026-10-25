import { getStorageItem, removeStorageItem, TAB_AUTH_KEYS } from "./storage";

export const AUTH_STORAGE_KEYS = [
    ...TAB_AUTH_KEYS,
    "prointerview_todos",
];

/**
 * Clears authentication tokens, user metadata, and in-memory caches for the current tab.
 * Does not clear shared cookies or other tabs' sessions.
 */
export function clearAllAuthSession(): void {
    if (typeof window === "undefined") return;

    AUTH_STORAGE_KEYS.forEach((key) => {
        try {
            removeStorageItem(key);
            sessionStorage.removeItem(key);
        } catch {}
    });
}

/**
 * Tab-scoped logout:
 * Notifies the server of tab logout, purges this tab's storage and in-memory state,
 * dispatches a local tab state change, and redirects only this tab.
 * Does NOT clear other tabs' sessions or shared cookies unless global=true is requested.
 */
export async function logoutUser(redirectTo: string = "/", isGlobal: boolean = false): Promise<void> {
    try {
        const identifier = getStorageItem("userIdentifier") || "";
        const role = getStorageItem("userRole") || getStorageItem("userType") || "user";
        const token = getStorageItem("sessionToken") || "";

        await fetch("/api/auth/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ identifier, accountType: role, tabOnly: !isGlobal, global: isGlobal }),
            signal: AbortSignal.timeout(3000)
        }).catch(() => {});
    } catch {}

    clearAllAuthSession();

    if (typeof window !== "undefined") {
        // Dispatch only window-local event; do NOT fire cross-tab "storage" event
        window.dispatchEvent(new CustomEvent("ai-storage-change", { detail: { key: "userLoggedIn" } }));

        if (redirectTo) {
            window.location.href = redirectTo;
        }
    }
}

/**
 * Automatically attaches Authorization headers and cookies to all /api/ requests.
 * Uses the session credential established specifically in this tab's sessionStorage.
 */
export function installGlobalAuthFetchInterceptor(): void {
    if (typeof window === "undefined") return;
    if ((window as any).__prointerview_fetch_interceptor_installed__) return;
    (window as any).__prointerview_fetch_interceptor_installed__ = true;

    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        let urlStr = "";
        if (typeof input === "string") {
            urlStr = input;
        } else if (input instanceof URL) {
            urlStr = input.toString();
        } else if (input && typeof (input as any).url === "string") {
            urlStr = (input as any).url;
        }

        const isInternalApi =
            urlStr.startsWith("/api/") ||
            (urlStr.includes("/api/") &&
                (urlStr.startsWith(window.location.origin) ||
                    urlStr.startsWith("http://localhost") ||
                    urlStr.startsWith("http://127.0.0.1")));

        if (isInternalApi) {
            let token: string | null = null;
            try {
                token = getStorageItem("sessionToken") || sessionStorage.getItem("sessionToken");
            } catch {}

            const modifiedInit: RequestInit = {
                credentials: init?.credentials || "same-origin",
                ...init,
            };

            const headers = new Headers(init?.headers || {});
            if (token) {
                if (!headers.has("authorization") && !headers.has("Authorization")) {
                    headers.set("Authorization", `Bearer ${token}`);
                }
                if (!headers.has("x-session-token")) {
                    headers.set("x-session-token", token);
                }
            }
            modifiedInit.headers = headers;

            return originalFetch(input, modifiedInit);
        }

        return originalFetch(input, init);
    };
}

/**
 * Reconciles tab-scoped authentication state for the current tab.
 * Does not pull credentials from other tabs' storage.
 */
export function syncClientAuthState(): void {
    if (typeof window === "undefined") return;

    try {
        const token = sessionStorage.getItem("sessionToken");
        const isLogged = sessionStorage.getItem("userLoggedIn") === "true" || !!token;

        if (isLogged) {
            if (sessionStorage.getItem("userLoggedIn") !== "true") {
                try { sessionStorage.setItem("userLoggedIn", "true"); } catch {}
            }
        }
    } catch {}
}
