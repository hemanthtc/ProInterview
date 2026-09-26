import { getStorageItem, setStorageItem, removeStorageItem } from "@/utils/storage";

export const DEFAULT_PROGRESS_RETENTION_DAYS = 30;

/**
 * Client-side auto-cleanup for browser storage.
 * Prunes interviewSessions, mockAptitudeSessions, and orphan filmRoom_* keys older than retentionDays.
 */
export function cleanExpiredLocalProgress(retentionDays = DEFAULT_PROGRESS_RETENTION_DAYS) {
    if (typeof window === "undefined") return;

    try {
        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

        // 1. Clean scoped interviewSessions
        const rawSessions = getStorageItem("interviewSessions");
        if (rawSessions) {
            try {
                const sessions = JSON.parse(rawSessions);
                if (Array.isArray(sessions)) {
                    const validSessions = sessions.filter((s: any) => {
                        const ts = s?.timestamp ? Number(s.timestamp) : 0;
                        if (ts > 0 && ts < cutoffTime) {
                            // Also purge local film room cache
                            removeStorageItem(`filmRoom_${ts}`);
                            if (typeof localStorage !== "undefined") {
                                localStorage.removeItem(`filmRoom_${ts}`);
                            }
                            return false;
                        }
                        return true;
                    });
                    if (validSessions.length !== sessions.length) {
                        setStorageItem("interviewSessions", JSON.stringify(validSessions));
                    }
                }
            } catch { /* ignore JSON parse error */ }
        }

        // 2. Clean scoped mockAptitudeSessions
        const rawMocks = getStorageItem("mockAptitudeSessions");
        if (rawMocks) {
            try {
                const mocks = JSON.parse(rawMocks);
                if (Array.isArray(mocks)) {
                    const validMocks = mocks.filter((m: any) => {
                        const ts = m?.timestamp ? Number(m.timestamp) : 0;
                        return !(ts > 0 && ts < cutoffTime);
                    });
                    if (validMocks.length !== mocks.length) {
                        setStorageItem("mockAptitudeSessions", JSON.stringify(validMocks));
                    }
                }
            } catch { /* ignore JSON parse error */ }
        }
    } catch (err) {
        console.warn("cleanExpiredLocalProgress failed:", err);
    }
}

