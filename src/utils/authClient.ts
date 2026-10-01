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
