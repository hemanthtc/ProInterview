import { getStorageItem } from "./storage";
import { clearAllAuthSession, logoutUser, AUTH_STORAGE_KEYS } from "./authClient";

export { clearAllAuthSession, logoutUser, AUTH_STORAGE_KEYS };

let isHandlingExpiry = false;

/**
 * Completely clears local authentication state and cookies,
 * and safely redirects the user to /login?expired=1.
 */
export function handleSessionExpired(customMessage?: string): void {
    if (typeof window === "undefined") return;
    if (isHandlingExpiry) return;
    isHandlingExpiry = true;

    try {
        clearAllAuthSession();

        // 3. Optional message
        if (customMessage) {
            try {
                sessionStorage.setItem("session_expired_message", customMessage);
            } catch {}
        }

        // 4. Clean navigation to login with expired param
        const currentPath = window.location.pathname;
        const redirectParam = currentPath && currentPath !== "/login" && currentPath !== "/" ? `&redirect=${encodeURIComponent(currentPath)}` : "";
        // Full page reload intentionally clears all in-memory client state on auth expiration
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `/login?expired=1${redirectParam}`;
    } finally {
        setTimeout(() => {
            isHandlingExpiry = false;
        }, 3000);
    }
}

/**
 * Retrieves the stored session token (used as Bearer token).
 */
export function getStoredSessionToken(): string | null {
    return getStorageItem("sessionToken");
}

/**
 * An authenticated fetch wrapper that:
 * 1. Automatically attaches the Authorization: Bearer <sessionToken> header.
 * 2. Intercepts HTTP 401 (Unauthorized) responses and triggers auto-logout.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = getStoredSessionToken();
    const headers = new Headers(init?.headers || {});

    // Inject Bearer token if available and not explicitly provided
    if (token && !headers.has("authorization") && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const modifiedInit: RequestInit = {
        ...init,
        headers,
    };

    try {
        const response = await fetch(input, modifiedInit);

        if (response.status === 401) {
            handleSessionExpired("Your session has expired. Please log in again to continue.");
        }

        return response;
    } catch (error) {
        throw error;
    }
}
