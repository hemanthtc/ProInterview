import { getStorageItem, setStorageItem } from "./storage";
import { buildSpacedDrills } from "./spacedDrills";
import { applyCloudPrepProgress, buildLocalPrepProgress } from "./labProgress";
import { cleanExpiredLocalProgress } from "./progressCleanup";
import type { PrepProgressBlob } from "@/models/CloudSession";

export async function syncPrepProgressToCloud(): Promise<{ ok: boolean; prepProgress?: PrepProgressBlob }> {
    if (typeof window === "undefined") return { ok: false };
    if (getStorageItem("userLoggedIn") !== "true") return { ok: false };
    try {
        const res = await fetch("/api/sync-prep", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prepProgress: buildLocalPrepProgress() }),
        });
        if (!res.ok) return { ok: false };
        const data = await res.json();
        if (data.prepProgress) applyCloudPrepProgress(data.prepProgress as PrepProgressBlob);
        return { ok: true, prepProgress: data.prepProgress };
    } catch {
        return { ok: false };
    }
}

export async function pullPrepProgressFromCloud(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if (getStorageItem("userLoggedIn") !== "true") return false;
    try {
        const res = await fetch("/api/sync-prep");
        if (!res.ok) return false;
        const data = await res.json();
        if (data.prepProgress) {
            // Merge local into cloud then apply merged result
            const mergeRes = await fetch("/api/sync-prep", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prepProgress: buildLocalPrepProgress() }),
            });
            if (mergeRes.ok) {
                const merged = await mergeRes.json();
                if (merged.prepProgress) applyCloudPrepProgress(merged.prepProgress as PrepProgressBlob);
            } else {
                applyCloudPrepProgress(data.prepProgress as PrepProgressBlob);
            }
        }
        return true;
    } catch {
        return false;
    }
}

export async function syncSessionsToCloud(options?: {
    prepPacks?: any[];
    pushDrills?: boolean;
    clearAllPrepPacks?: boolean;
}): Promise<{ ok: boolean; sessions?: any[]; mockAptitudeSessions?: any[] }> {
    if (typeof window === "undefined") return { ok: false };
    if (getStorageItem("userLoggedIn") !== "true") return { ok: false };

    try {
        const localSessions = JSON.parse(getStorageItem("interviewSessions") || "[]");
        const localMocks = JSON.parse(getStorageItem("mockAptitudeSessions") || "[]");
        const localPacks = options?.clearAllPrepPacks ? [] : (options?.prepPacks || JSON.parse(getStorageItem("prepPacks") || "[]"));
        const drills = options?.pushDrills !== false ? buildSpacedDrills(localSessions) : undefined;
        if (drills) setStorageItem("spacedDrills", JSON.stringify(drills));

        const res = await fetch("/api/sync-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sessions: localSessions,
                mockAptitudeSessions: localMocks,
                prepPacks: localPacks,
                spacedDrills: drills,
                clearAllPrepPacks: options?.clearAllPrepPacks,
            }),
        });
        if (!res.ok) return { ok: false };
        const data = await res.json();
        if (Array.isArray(data.sessions)) setStorageItem("interviewSessions", JSON.stringify(data.sessions));
        if (Array.isArray(data.mockAptitudeSessions)) setStorageItem("mockAptitudeSessions", JSON.stringify(data.mockAptitudeSessions));
        if (Array.isArray(data.prepPacks)) setStorageItem("prepPacks", JSON.stringify(data.prepPacks));
        if (Array.isArray(data.spacedDrills)) setStorageItem("spacedDrills", JSON.stringify(data.spacedDrills));
        void syncPrepProgressToCloud();
        return { ok: true, sessions: data.sessions, mockAptitudeSessions: data.mockAptitudeSessions };
    } catch {
        return { ok: false };
    }
}

export async function pullSessionsFromCloud(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    
    // First run local 30-day auto-cleanup
    cleanExpiredLocalProgress(30);

    if (getStorageItem("userLoggedIn") !== "true") return false;
    try {
        const res = await fetch("/api/sync-sessions");
        if (!res.ok) return false;
        const data = await res.json();
        
        // 1. Merge Interview Sessions
        const local = JSON.parse(getStorageItem("interviewSessions") || "[]");
        const mergedMap = new Map<string, any>();
        for (const s of [...(data.sessions || []), ...local]) {
            if (!s?.timestamp) continue;
            mergedMap.set(`${s.timestamp}_${s.finalScore ?? ""}`, s);
        }
        const merged = Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
        setStorageItem("interviewSessions", JSON.stringify(merged));

        // 2. Merge Mock Aptitude Sessions
        if (Array.isArray(data.mockAptitudeSessions)) {
            const localMocks = JSON.parse(getStorageItem("mockAptitudeSessions") || "[]");
            const mockMap = new Map<string, any>();
            for (const m of [...data.mockAptitudeSessions, ...localMocks]) {
                const key = m?.id || (m?.timestamp ? `ts_${m.timestamp}` : null);
                if (!key) continue;
                if (!mockMap.has(key)) {
                    mockMap.set(key, m);
                }
            }
            const mergedMocks = Array.from(mockMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            setStorageItem("mockAptitudeSessions", JSON.stringify(mergedMocks));
        }

        // 3. Merge Prep Packs
        if (Array.isArray(data.prepPacks)) {
            const localPacks = JSON.parse(getStorageItem("prepPacks") || "[]");
            const packMap = new Map<string, any>();
            for (const p of [...(data.prepPacks || []), ...(Array.isArray(localPacks) ? localPacks : [])]) {
                if (!p?.id) continue;
                if (!packMap.has(p.id)) {
                    packMap.set(p.id, p);
                }
            }
            const mergedPacks = Array.from(packMap.values());
            setStorageItem("prepPacks", JSON.stringify(mergedPacks));
            if (mergedPacks.length > (data.prepPacks || []).length) {
                void syncSessionsToCloud({ prepPacks: mergedPacks });
            }
        }

        if (Array.isArray(data.spacedDrills)) {
            setStorageItem("spacedDrills", JSON.stringify(data.spacedDrills));
        } else {
            setStorageItem("spacedDrills", JSON.stringify(buildSpacedDrills(merged)));
        }
        void pullPrepProgressFromCloud();
        return true;
    } catch {
        return false;
    }
}

export async function deleteSessionFromCloud(sessionId?: string, timestamp?: number): Promise<boolean> {
    if (typeof window === "undefined") return false;

    // 1. Remove from local storage immediately
    try {
        const local = JSON.parse(getStorageItem("interviewSessions") || "[]");
        const remaining = local.filter((s: any) => {
            if (sessionId && s?.id === sessionId) return false;
            if (timestamp && Number(s?.timestamp) === Number(timestamp)) return false;
            return true;
        });
        setStorageItem("interviewSessions", JSON.stringify(remaining));

        if (timestamp) {
            localStorage.removeItem(`filmRoom_${timestamp}`);
        }
    } catch (e) {
        console.warn("Failed to remove session from local storage:", e);
    }

    // 2. Call cloud delete API if logged in
    if (getStorageItem("userLoggedIn") === "true") {
        try {
            await fetch("/api/sync-sessions", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "interview", id: sessionId, timestamp }),
            });
        } catch { /* ignore network error */ }
    }

    return true;
}

export async function deleteMockAptitudeFromCloud(mockId?: string, timestamp?: number): Promise<boolean> {
    if (typeof window === "undefined") return false;

    // 1. Remove from local storage immediately
    try {
        const local = JSON.parse(getStorageItem("mockAptitudeSessions") || "[]");
        const remaining = local.filter((m: any) => {
            if (mockId && m?.id === mockId) return false;
            if (timestamp && Number(m?.timestamp) === Number(timestamp)) return false;
            return true;
        });
        setStorageItem("mockAptitudeSessions", JSON.stringify(remaining));
    } catch (e) {
        console.warn("Failed to remove mock session from local storage:", e);
    }

    // 2. Call cloud delete API if logged in
    if (getStorageItem("userLoggedIn") === "true") {
        try {
            await fetch("/api/sync-sessions", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "mock_aptitude", id: mockId, timestamp }),
            });
        } catch { /* ignore network error */ }
    }

    return true;
}

export async function clearTabHistoryFromCloud(tab: "interview" | "filmroom" | "aptitude"): Promise<boolean> {
    if (typeof window === "undefined") return false;

    if (tab === "interview" || tab === "filmroom") {
        const sessions = JSON.parse(getStorageItem("interviewSessions") || "[]");
        for (const s of sessions) {
            if (s?.timestamp) {
                localStorage.removeItem(`filmRoom_${s.timestamp}`);
            }
        }
        setStorageItem("interviewSessions", "[]");
    } else if (tab === "aptitude") {
        setStorageItem("mockAptitudeSessions", "[]");
    }

    if (getStorageItem("userLoggedIn") === "true") {
        try {
            await fetch("/api/sync-sessions", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "clear_tab", tab }),
            });
        } catch { /* ignore */ }
    }

    return true;
}

