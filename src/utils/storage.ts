import { TAB_AUTH_KEYS, DEVICE_PREF_KEYS, initTabSession } from "./tabSession";

export { TAB_AUTH_KEYS, DEVICE_PREF_KEYS };

export const GLOBAL_KEYS = [
    ...TAB_AUTH_KEYS,
    ...DEVICE_PREF_KEYS,
];

const STORAGE_CHANGE_EVENT = "ai-storage-change";

// In-memory fallback to avoid saving any guest data on disk
const tempMemory: Record<string, string> = {};

function emitStorageChange(key: string): void {
    if (typeof window === "undefined") return;
    try {
        window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key } }));
    } catch {}
}

/**
 * Returns the tab-scoped storage mechanism (sessionStorage in browsers,
 * with graceful fallback to localStorage in tests when window.sessionStorage is not stubbed).
 */
function getTabStorage(): Storage | null {
    if (typeof window === "undefined") return null;
    try {
        if (typeof window.sessionStorage !== "undefined" && window.sessionStorage) {
            return window.sessionStorage;
        }
    } catch {}
    try {
        if (typeof window.localStorage !== "undefined" && window.localStorage) {
            return window.localStorage;
        }
    } catch {}
    try {
        if (typeof localStorage !== "undefined" && localStorage) {
            return localStorage;
        }
    } catch {}
    return null;
}

export function getScopedKey(key: string): string {
    if (typeof window === "undefined") return key;
    if (GLOBAL_KEYS.includes(key)) {
        return key;
    }
    let userIdentifier = "guest";
    try {
        userIdentifier = getStorageItem("userIdentifier") || "guest";
    } catch {}
    return `${key}_${userIdentifier}`;
}

export function getStorageItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    initTabSession();
    const tabStorage = getTabStorage();

    if (key === "userLoggedIn") {
        // 1. Check expiration timestamp if stored (for sessions without a JWT token or test mocks)
        try {
            const exp =
                tabStorage?.getItem("userSessionExpiresAt") ||
                (typeof localStorage !== "undefined" ? localStorage.getItem("userSessionExpiresAt") : null) ||
                tempMemory["userSessionExpiresAt"];
            if (exp) {
                if (Date.now() > Number(exp)) {
                    // Session expired! Auto-logout and cleanup
                    removeStorageItem("userLoggedIn");
                    return null;
                }
            }
        } catch {}

        // 2. Check active sessionToken first in tab-scoped storage: auto-heals userLoggedIn if valid
        try {
            const token = tabStorage?.getItem("sessionToken") || tempMemory["sessionToken"];
            if (token) {
                let isExpired = false;
                try {
                    const parts = token.split(".");
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
                        if (payload.exp && Date.now() > payload.exp) {
                            isExpired = true;
                        }
                    }
                } catch {}

                if (!isExpired) {
                    try {
                        tabStorage?.setItem("userLoggedIn", "true");
                    } catch {}
                    tempMemory["userLoggedIn"] = "true";
                    return "true";
                } else {
                    removeStorageItem("userLoggedIn");
                    return null;
                }
            }
        } catch {}

        // 3. Tab storage or temporary memory status
        try {
            const fromTab = tabStorage?.getItem("userLoggedIn");
            if (fromTab === "true") return "true";
            if (fromTab === "guest") return "guest";
        } catch {}

        const fromTemp = tempMemory["userLoggedIn"];
        if (fromTemp === "true") return "true";
        if (fromTemp === "guest") return "guest";

        return null;
    }

    // Tab-scoped keys (sessionToken, userIdentifier, userName, userRole, etc.)
    if (TAB_AUTH_KEYS.includes(key)) {
        try {
            const val = tabStorage?.getItem(key);
            if (val !== null && val !== undefined) return val;
        } catch {}
        const fromTemp = tempMemory[key];
        if (fromTemp !== null && fromTemp !== undefined) return fromTemp;
        return null;
    }

    // Global device preferences (globalTheme, globalInterviewMode, etc.)
    if (DEVICE_PREF_KEYS.includes(key)) {
        try {
            const val = localStorage.getItem(key);
            if (val !== null && val !== undefined) return val;
        } catch {}
        const fromTemp = tempMemory[key];
        if (fromTemp !== null && fromTemp !== undefined) return fromTemp;
        return null;
    }

    let isLoggedIn = false;
    try {
        isLoggedIn =
            tabStorage?.getItem("userLoggedIn") === "true" ||
            Boolean(tabStorage?.getItem("sessionToken")) ||
            tempMemory["userLoggedIn"] === "true" ||
            Boolean(tempMemory["sessionToken"]);
    } catch {
        isLoggedIn =
            tempMemory["userLoggedIn"] === "true" ||
            Boolean(tempMemory["sessionToken"]);
    }

    const scopedKey = getScopedKey(key);
    try {
        if (isLoggedIn) {
            return tabStorage?.getItem(scopedKey) || localStorage.getItem(scopedKey) || tempMemory[scopedKey] || tabStorage?.getItem(key) || localStorage.getItem(key) || null;
        } else {
            return tempMemory[scopedKey] || tabStorage?.getItem(key) || localStorage.getItem(key) || null;
        }
    } catch {
        return tempMemory[scopedKey] || null;
    }
}

export function setStorageItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    initTabSession();
    const tabStorage = getTabStorage();

    if (key === "userLoggedIn") {
        if (value === "true") {
            const durationMs = 7 * 24 * 60 * 60 * 1000; // 7 days
            const expiresAt = String(Date.now() + durationMs);
            try {
                tabStorage?.setItem("userLoggedIn", "true");
                tabStorage?.setItem("userSessionExpiresAt", expiresAt);
            } catch {}
            tempMemory["userLoggedIn"] = "true";
            tempMemory["userSessionExpiresAt"] = expiresAt;
            if (typeof document !== "undefined") {
                document.cookie = "userLoggedIn=true; path=/; max-age=604800; SameSite=Lax";
            }
        } else if (value === "guest") {
            const durationMs = 24 * 60 * 60 * 1000; // 24 hours
            const expiresAt = String(Date.now() + durationMs);
            try {
                tabStorage?.setItem("userLoggedIn", "guest");
                tabStorage?.setItem("userSessionExpiresAt", expiresAt);
            } catch {}
            tempMemory["userLoggedIn"] = "guest";
            tempMemory["userSessionExpiresAt"] = expiresAt;
            if (typeof document !== "undefined") {
                document.cookie = "userLoggedIn=guest; path=/; max-age=86400; SameSite=Lax";
            }
        } else {
            try {
                tabStorage?.removeItem("userLoggedIn");
                tabStorage?.removeItem("userSessionExpiresAt");
            } catch {}
            delete tempMemory["userLoggedIn"];
            delete tempMemory["userSessionExpiresAt"];
        }
        emitStorageChange(key);
        return;
    }

    if (TAB_AUTH_KEYS.includes(key)) {
        try { tabStorage?.setItem(key, value); } catch {}
        tempMemory[key] = value;
        emitStorageChange(key);
        return;
    }

    if (DEVICE_PREF_KEYS.includes(key)) {
        try { localStorage.setItem(key, value); } catch {}
        tempMemory[key] = value;
        emitStorageChange(key);
        return;
    }

    let isLoggedIn = false;
    try {
        isLoggedIn =
            tabStorage?.getItem("userLoggedIn") === "true" ||
            tempMemory["userLoggedIn"] === "true";
    } catch {
        isLoggedIn =
            tempMemory["userLoggedIn"] === "true";
    }

    const scopedKey = getScopedKey(key);
    try {
        if (isLoggedIn) {
            tabStorage?.setItem(scopedKey, value);
            localStorage.setItem(scopedKey, value);
        } else {
            tempMemory[scopedKey] = value;
        }
    } catch {
        tempMemory[scopedKey] = value;
    }
    emitStorageChange(key);
}

export function purgeAllUserLocalCaches(): void {
    if (typeof window === "undefined") return;
    const currentId = getStorageItem("userIdentifier");
    if (!currentId) return;
    const suffix = `_${currentId}`;

    const localKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith(suffix)) {
            localKeysToRemove.push(key);
        }
    }
    localKeysToRemove.forEach((key) => {
        try {
            localStorage.removeItem(key);
        } catch {}
    });

    const tabStorage = getTabStorage();
    if (tabStorage) {
        const tabKeysToRemove: string[] = [];
        for (let i = 0; i < tabStorage.length; i++) {
            const key = tabStorage.key(i);
            if (key && (key.endsWith(suffix) || TAB_AUTH_KEYS.includes(key))) {
                tabKeysToRemove.push(key);
            }
        }
        tabKeysToRemove.forEach((key) => {
            try { tabStorage.removeItem(key); } catch {}
        });
    }

    Object.keys(tempMemory).forEach((key) => {
        if (key.endsWith(suffix) || TAB_AUTH_KEYS.includes(key)) {
            delete tempMemory[key];
        }
    });
}

export function removeStorageItem(key: string): void {
    if (typeof window === "undefined") return;
    const tabStorage = getTabStorage();

    if (key === "userLoggedIn") {
        TAB_AUTH_KEYS.forEach((k) => {
            try { tabStorage?.removeItem(k); } catch {}
            try {
                if (typeof localStorage !== "undefined") {
                    localStorage.removeItem(k);
                }
            } catch {}
            delete tempMemory[k];
        });
        purgeAllUserLocalCaches();
        emitStorageChange(key);
        return;
    }

    if (TAB_AUTH_KEYS.includes(key)) {
        try { tabStorage?.removeItem(key); } catch {}
        try {
            if (typeof localStorage !== "undefined") {
                localStorage.removeItem(key);
            }
        } catch {}
        delete tempMemory[key];
        emitStorageChange(key);
        return;
    }

    if (DEVICE_PREF_KEYS.includes(key)) {
        try { localStorage.removeItem(key); } catch {}
        delete tempMemory[key];
        emitStorageChange(key);
        return;
    }

    const scopedKey = getScopedKey(key);
    try { tabStorage?.removeItem(scopedKey); } catch {}
    try { localStorage.removeItem(scopedKey); } catch {}
    delete tempMemory[scopedKey];
    emitStorageChange(key);
}

export function getInterviewResumeText(): string | null {
    const directText = getStorageItem("resumeText");
    if (directText !== null) return directText;

    const storedResumes = getStorageItem("savedResumesDatabase");
    if (!storedResumes) return null;

    try {
        const parsed = JSON.parse(storedResumes);
        if (!Array.isArray(parsed) || parsed.length === 0) return null;

        const activeId = getStorageItem("activeResumeId");
        const activeResume = parsed.find((resume: any) => resume.id === activeId) || parsed[0];
        if (!activeResume) return null;

        const sections = [
            activeResume.summary,
            activeResume.skills,
            activeResume.experience,
            activeResume.education,
            activeResume.projects,
            activeResume.internships,
            activeResume.certifications,
            activeResume.awards,
        ]
            .filter(Boolean)
            .map((section: string) => section.trim());

        const fallbackText = sections.join("\n\n").trim();
        return fallbackText || null;
    } catch {
        return null;
    }
}

export function clearUserScopedData(userIdentifier: string): void {
    if (typeof window === "undefined") return;
    const suffix = `_${userIdentifier}`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith(suffix)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    const tabStorage = getTabStorage();
    if (tabStorage) {
        const tabKeysToRemove: string[] = [];
        for (let i = 0; i < tabStorage.length; i++) {
            const key = tabStorage.key(i);
            if (key && key.endsWith(suffix)) {
                tabKeysToRemove.push(key);
            }
        }
        tabKeysToRemove.forEach(key => tabStorage.removeItem(key));
    }

    Object.keys(tempMemory).forEach(key => {
        if (key.endsWith(suffix)) {
            delete tempMemory[key];
        }
    });
}
