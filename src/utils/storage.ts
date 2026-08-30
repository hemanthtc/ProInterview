const GLOBAL_KEYS = [
    "appUsersDb",
    "userLoggedIn",
    "userName",
    "userIdentifier",
    "userType",
    "userRole"
];

const STORAGE_CHANGE_EVENT = "ai-storage-change";

// In-memory fallback to avoid saving any guest data on disk
const tempMemory: Record<string, string> = {};

function emitStorageChange(key: string): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key } }));
}

export function getScopedKey(key: string): string {
    if (typeof window === "undefined") return key;
    if (GLOBAL_KEYS.includes(key)) {
        return key;
    }
    const userIdentifier = localStorage.getItem("userIdentifier") || "guest";
    return `${key}_${userIdentifier}`;
}

export function getStorageItem(key: string): string | null {
    if (typeof window === "undefined") return null;

    if (key === "userLoggedIn") {
        const fromLocal = localStorage.getItem("userLoggedIn");
        if (fromLocal === "true") return "true";
        if (fromLocal === "guest") return "guest";
        const fromTemp = tempMemory["userLoggedIn"];
        if (fromTemp === "true") return "true";
        if (fromTemp === "guest") return "guest";
        if (typeof document !== "undefined" && document.cookie) {
            if (document.cookie.includes("userLoggedIn=true")) return "true";
            if (document.cookie.includes("userLoggedIn=guest")) return "guest";
        }
        return null;
    }

    // Global un-scoped keys (userName, userIdentifier, userType, userRole, etc.)
    if (GLOBAL_KEYS.includes(key)) {
        const val = localStorage.getItem(key) || tempMemory[key];
        if (val !== null && val !== undefined) return val;
    }

    const isLoggedIn =
        localStorage.getItem("userLoggedIn") === "true" ||
        tempMemory["userLoggedIn"] === "true" ||
        (typeof document !== "undefined" && document.cookie.includes("userLoggedIn=true"));

    const scopedKey = getScopedKey(key);
    if (isLoggedIn) {
        return localStorage.getItem(scopedKey) || tempMemory[scopedKey] || localStorage.getItem(key) || null;
    } else {
        return tempMemory[scopedKey] || localStorage.getItem(key) || null;
    }
}

export function setStorageItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    if (key === "userLoggedIn") {
        if (value === "true") {
            localStorage.setItem("userLoggedIn", "true");
            tempMemory["userLoggedIn"] = "true";
            if (typeof document !== "undefined") {
                document.cookie = "userLoggedIn=true; path=/; max-age=604800; SameSite=Lax";
            }
        } else if (value === "guest") {
            localStorage.setItem("userLoggedIn", "guest");
            tempMemory["userLoggedIn"] = "guest";
            if (typeof document !== "undefined") {
                document.cookie = "userLoggedIn=guest; path=/; max-age=86400; SameSite=Lax";
            }
        } else {
            localStorage.removeItem("userLoggedIn");
            delete tempMemory["userLoggedIn"];
            if (typeof document !== "undefined") {
                document.cookie = "userLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            }
        }
        emitStorageChange(key);
        return;
    }

    if (GLOBAL_KEYS.includes(key)) {
        localStorage.setItem(key, value);
        tempMemory[key] = value;
        emitStorageChange(key);
        return;
    }

    const isLoggedIn =
        localStorage.getItem("userLoggedIn") === "true" ||
        tempMemory["userLoggedIn"] === "true" ||
        (typeof document !== "undefined" && Boolean(document.cookie?.includes("userLoggedIn=true")));

    if (isLoggedIn) {
        localStorage.setItem(getScopedKey(key), value);
    } else {
        tempMemory[getScopedKey(key)] = value;
    }
    emitStorageChange(key);
}

export function purgeAllUserLocalCaches(): void {
    if (typeof window === "undefined") return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !GLOBAL_KEYS.includes(key)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach((key) => {
        try {
            localStorage.removeItem(key);
        } catch {}
    });

    Object.keys(tempMemory).forEach((key) => {
        if (!GLOBAL_KEYS.includes(key)) {
            delete tempMemory[key];
        }
    });
}

export function removeStorageItem(key: string): void {
    if (typeof window === "undefined") return;
    if (key === "userLoggedIn") {
        localStorage.removeItem("userLoggedIn");
        localStorage.removeItem("userIdentifier");
        localStorage.removeItem("userName");
        delete tempMemory["userLoggedIn"];
        delete tempMemory["userIdentifier"];
        delete tempMemory["userName"];
        if (typeof document !== "undefined") {
            document.cookie = "userLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
        purgeAllUserLocalCaches();
        emitStorageChange(key);
        return;
    }
    const isLoggedIn =
        localStorage.getItem("userLoggedIn") === "true" ||
        (typeof document !== "undefined" && Boolean(document.cookie?.includes("userLoggedIn=true")));
    if (isLoggedIn) {
        localStorage.removeItem(getScopedKey(key));
    } else {
        delete tempMemory[getScopedKey(key)];
    }
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

    Object.keys(tempMemory).forEach(key => {
        if (key.endsWith(suffix)) {
            delete tempMemory[key];
        }
    });
}
