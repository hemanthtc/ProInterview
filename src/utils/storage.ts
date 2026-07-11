const GLOBAL_KEYS = [
    "appUsersDb",
    "userLoggedIn",
    "userName",
    "userIdentifier",
    "userType",
    "userRole"
];

const STORAGE_CHANGE_EVENT = "ai-storage-change";

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
    return localStorage.getItem(getScopedKey(key));
}

export function setStorageItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(getScopedKey(key), value);
    emitStorageChange(key);
}

export function removeStorageItem(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(getScopedKey(key));
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
}
