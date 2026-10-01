const GLOBAL_KEYS = [
    "appUsersDb",
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
    "globalTheme",
    "globalInterviewMode"
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
    let userIdentifier = "guest";
    try {
        userIdentifier = localStorage.getItem("userIdentifier") || "guest";
    } catch {}
    return `${key}_${userIdentifier}`;
}

export function getStorageItem(key: string): string | null {
    if (typeof window === "undefined") return null;

    if (key === "userLoggedIn") {
        // 1. Check active sessionToken first: auto-heals userLoggedIn and cookie if valid
        try {
            const token = localStorage.getItem("sessionToken") || sessionStorage.getItem("sessionToken") || tempMemory["sessionToken"];
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
                        localStorage.setItem("userLoggedIn", "true");
                    } catch {}
                    tempMemory["userLoggedIn"] = "true";
                    if (typeof document !== "undefined") {
                        document.cookie = "userLoggedIn=true; path=/; max-age=604800; SameSite=Lax";
                    }
                    return "true";
                } else {
                    removeStorageItem("userLoggedIn");
                    return null;
                }
            }
        } catch {}

        // 2. Check expiration timestamp if stored (for sessions without a JWT token)
        try {
            const exp = localStorage.getItem("userSessionExpiresAt") || tempMemory["userSessionExpiresAt"];
            if (exp) {
                if (Date.now() > Number(exp)) {
                    // Session expired! Auto-logout and cleanup
                    removeStorageItem("userLoggedIn");
                    return null;
                }
            }
        } catch {}

        // 3. Local or temporary memory status
        try {
            const fromLocal = localStorage.getItem("userLoggedIn");
            if (fromLocal === "true") {
                if (typeof document !== "undefined" && !document.cookie.includes("userLoggedIn=true")) {
                    document.cookie = "userLoggedIn=true; path=/; max-age=604800; SameSite=Lax";
                }
                return "true";
            }
            if (fromLocal === "guest") return "guest";
        } catch {}

        const fromTemp = tempMemory["userLoggedIn"];
        if (fromTemp === "true") return "true";
        if (fromTemp === "guest") return "guest";

        // 4. Cross-check document.cookie and auto-heal localStorage
        if (typeof document !== "undefined" && document.cookie) {
            const match = document.cookie.match(/(?:^|;\s*)userLoggedIn=([^;]+)/);
            if (match) {
                const val = match[1].trim();
                if (val === "true") {
                    try { localStorage.setItem("userLoggedIn", "true"); } catch {}
                    tempMemory["userLoggedIn"] = "true";
                    return "true";
                }
                if (val === "guest") {
                    try { localStorage.setItem("userLoggedIn", "guest"); } catch {}
                    tempMemory["userLoggedIn"] = "guest";
                    return "guest";
                }
            }
        }
        return null;
    }

    // Global un-scoped keys (userName, userIdentifier, userType, userRole, etc.)
    if (GLOBAL_KEYS.includes(key)) {
        try {
            const val = localStorage.getItem(key);
            if (val !== null && val !== undefined) return val;
        } catch {}
        const fromTemp = tempMemory[key];
        if (fromTemp !== null && fromTemp !== undefined) return fromTemp;
    }

    let isLoggedIn = false;
    try {
        isLoggedIn =
            localStorage.getItem("userLoggedIn") === "true" ||
            Boolean(localStorage.getItem("sessionToken")) ||
            tempMemory["userLoggedIn"] === "true" ||
            Boolean(tempMemory["sessionToken"]) ||
            (typeof document !== "undefined" && document.cookie.includes("userLoggedIn=true"));
    } catch {
        isLoggedIn =
            tempMemory["userLoggedIn"] === "true" ||
            Boolean(tempMemory["sessionToken"]) ||
            (typeof document !== "undefined" && document.cookie.includes("userLoggedIn=true"));
    }

    const scopedKey = getScopedKey(key);
    try {
        if (isLoggedIn) {
            return localStorage.getItem(scopedKey) || tempMemory[scopedKey] || localStorage.getItem(key) || null;
        } else {
            return tempMemory[scopedKey] || localStorage.getItem(key) || null;
        }
    } catch {
        return tempMemory[scopedKey] || null;
    }
}

export function setStorageItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    if (key === "userLoggedIn") {
        if (value === "true") {
            const durationMs = 7 * 24 * 60 * 60 * 1000; // 7 days
            const expiresAt = String(Date.now() + durationMs);
            try {
                localStorage.setItem("userLoggedIn", "true");
                localStorage.setItem("userSessionExpiresAt", expiresAt);
            } catch {}
            tempMemory["userLoggedIn"] = "true";
            tempMemory["userSessionExpiresAt"] = expiresAt;
            if (typeof document !== "undefined") {
                document.cookie = "userLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                document.cookie = "userLoggedIn=true; path=/; max-age=604800; SameSite=Lax";
            }
        } else if (value === "guest") {
            const durationMs = 24 * 60 * 60 * 1000; // 24 hours
            const expiresAt = String(Date.now() + durationMs);
            try {
                localStorage.setItem("userLoggedIn", "guest");
                localStorage.setItem("userSessionExpiresAt", expiresAt);
            } catch {}
            tempMemory["userLoggedIn"] = "guest";
            tempMemory["userSessionExpiresAt"] = expiresAt;
            if (typeof document !== "undefined") {
                document.cookie = "userLoggedIn=guest; path=/; max-age=86400; SameSite=Lax";
            }
        } else {
            try {
                localStorage.removeItem("userLoggedIn");
                localStorage.removeItem("userSessionExpiresAt");
            } catch {}
            delete tempMemory["userLoggedIn"];
            delete tempMemory["userSessionExpiresAt"];
            if (typeof document !== "undefined") {
                document.cookie = "userLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            }
        }
        emitStorageChange(key);
        return;
    }

    if (GLOBAL_KEYS.includes(key)) {
        try { localStorage.setItem(key, value); } catch {}
        tempMemory[key] = value;
        emitStorageChange(key);
        return;
    }

    let isLoggedIn = false;
    try {
        isLoggedIn =
            localStorage.getItem("userLoggedIn") === "true" ||
            tempMemory["userLoggedIn"] === "true" ||
            (typeof document !== "undefined" && Boolean(document.cookie?.includes("userLoggedIn=true")));
    } catch {
        isLoggedIn =
            tempMemory["userLoggedIn"] === "true" ||
            (typeof document !== "undefined" && Boolean(document.cookie?.includes("userLoggedIn=true")));
    }

    try {
        if (isLoggedIn) {
            localStorage.setItem(getScopedKey(key), value);
        } else {
            tempMemory[getScopedKey(key)] = value;
        }
    } catch {
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
        const authKeys = [
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
            "userEducationData"
        ];
        authKeys.forEach((k) => {
            try { localStorage.removeItem(k); } catch {}
            try { sessionStorage.removeItem(k); } catch {}
            delete tempMemory[k];
        });

        if (typeof document !== "undefined") {
            const past = "Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = `userLoggedIn=; path=/; expires=${past}; max-age=0; SameSite=Lax`;
            document.cookie = `userLoggedIn=; path=/; expires=${past}; max-age=0`;
            document.cookie = `userLoggedIn=; expires=${past}; max-age=0`;
            document.cookie = `session=; path=/; expires=${past}; max-age=0; SameSite=Lax`;
            document.cookie = `session=; path=/; expires=${past}; max-age=0`;
            document.cookie = `session=; expires=${past}; max-age=0`;
        }
        purgeAllUserLocalCaches();
        emitStorageChange(key);
        return;
    }

    if (GLOBAL_KEYS.includes(key)) {
        try { localStorage.removeItem(key); } catch {}
        try { sessionStorage.removeItem(key); } catch {}
        delete tempMemory[key];
        emitStorageChange(key);
        return;
    }

    const isLoggedIn =
        localStorage.getItem("userLoggedIn") === "true" ||
        (typeof document !== "undefined" && Boolean(document.cookie?.includes("userLoggedIn=true")));
    if (isLoggedIn) {
        try { localStorage.removeItem(getScopedKey(key)); } catch {}
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
