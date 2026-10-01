import { getStorageItem, removeStorageItem } from "./storage";

export const AUTH_STORAGE_KEYS = [
    "userLoggedIn",
    "sessionToken",
    "userSessionExpiresAt",
    "userName",
    "userIdentifier",
    "userType",
    "userRole",
    "userSubscriptionPlan",
    "userProfilePhoto",
    "userOrgName",
    "userAdminId",
    "userDepartment",
    "userAdditionalEmail",
    "userGithub",
    "userLinkedin",
    "userPortfolio",
    "userResumeCvName",
    "userResumeCvText",
    "userPhone",
    "userEducationData",
    "prointerview_todos",
];

/**
 * Clears all client-side authentication tokens, user metadata, caches, and cookies.
 */
export function clearAllAuthSession(): void {
    if (typeof window === "undefined") return;

    AUTH_STORAGE_KEYS.forEach((key) => {
        try {
            removeStorageItem(key);
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        } catch {}
    });

    try {
        const past = "Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = `userLoggedIn=; path=/; expires=${past}; max-age=0; SameSite=Lax`;
        document.cookie = `userLoggedIn=; path=/; expires=${past}; max-age=0`;
        document.cookie = `userLoggedIn=; expires=${past}; max-age=0`;
        document.cookie = `session=; path=/; expires=${past}; max-age=0; SameSite=Lax`;
        document.cookie = `session=; path=/; expires=${past}; max-age=0`;
        document.cookie = `session=; expires=${past}; max-age=0`;
    } catch {}
}

/**
 * Universally logs out any user (authenticated user or guest),
 * notifies server to clear HttpOnly cookies, purges all local storage,
 * dispatches storage sync events, and navigates cleanly to target path.
 */
export async function logoutUser(redirectTo: string = "/"): Promise<void> {
    try {
        const identifier = getStorageItem("userIdentifier") || "";
        const role = getStorageItem("userRole") || getStorageItem("userType") || "user";

        await fetch("/api/auth/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, accountType: role }),
            signal: AbortSignal.timeout(3000)
        }).catch(() => {});
    } catch {}

    clearAllAuthSession();

    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("ai-storage-change", { detail: { key: "userLoggedIn" } }));

        if (redirectTo) {
            window.location.href = redirectTo;
        }
    }
}

/**
 * Automatically attaches Authorization headers and cookies to all /api/ requests.
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
                token = getStorageItem("sessionToken") || localStorage.getItem("sessionToken");
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
 * Reconciles cookie and localStorage states for persistent auth session across tabs.
 */
export function syncClientAuthState(): void {
    if (typeof window === "undefined") return;

    try {
        const token = localStorage.getItem("sessionToken") || sessionStorage.getItem("sessionToken");
        const isLogged = localStorage.getItem("userLoggedIn") === "true" || !!token;

        if (isLogged) {
            if (!document.cookie.includes("userLoggedIn=true")) {
                document.cookie = "userLoggedIn=true; path=/; max-age=604800; SameSite=Lax";
            }
            if (localStorage.getItem("userLoggedIn") !== "true") {
                try { localStorage.setItem("userLoggedIn", "true"); } catch {}
            }
        } else if (document.cookie.includes("userLoggedIn=true")) {
            try { localStorage.setItem("userLoggedIn", "true"); } catch {}
        }
    } catch {}
}
