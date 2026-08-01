import { getStorageItem, setStorageItem } from "./storage";
import { buildSpacedDrills } from "./spacedDrills";

export async function syncSessionsToCloud(options?: {
    prepPacks?: any[];
    pushDrills?: boolean;
}): Promise<{ ok: boolean; sessions?: any[] }> {
    if (typeof window === "undefined") return { ok: false };
    if (getStorageItem("userLoggedIn") !== "true") return { ok: false };

    try {
        const localSessions = JSON.parse(getStorageItem("interviewSessions") || "[]");
        const localPacks = options?.prepPacks || JSON.parse(getStorageItem("prepPacks") || "[]");
        const drills = options?.pushDrills !== false ? buildSpacedDrills(localSessions) : undefined;
        if (drills) setStorageItem("spacedDrills", JSON.stringify(drills));

        const res = await fetch("/api/sync-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sessions: localSessions,
                prepPacks: localPacks,
                spacedDrills: drills,
            }),
        });
        if (!res.ok) return { ok: false };
        const data = await res.json();
        if (Array.isArray(data.sessions)) setStorageItem("interviewSessions", JSON.stringify(data.sessions));
        if (Array.isArray(data.prepPacks)) setStorageItem("prepPacks", JSON.stringify(data.prepPacks));
        if (Array.isArray(data.spacedDrills)) setStorageItem("spacedDrills", JSON.stringify(data.spacedDrills));
        return { ok: true, sessions: data.sessions };
    } catch {
        return { ok: false };
    }
}

export async function pullSessionsFromCloud(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if (getStorageItem("userLoggedIn") !== "true") return false;
    try {
        const res = await fetch("/api/sync-sessions");
        if (!res.ok) return false;
        const data = await res.json();
        const local = JSON.parse(getStorageItem("interviewSessions") || "[]");
        const mergedMap = new Map<string, any>();
        for (const s of [...(data.sessions || []), ...local]) {
            if (!s?.timestamp) continue;
            mergedMap.set(`${s.timestamp}_${s.finalScore ?? ""}`, s);
        }
        const merged = Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
        setStorageItem("interviewSessions", JSON.stringify(merged));
        if (Array.isArray(data.prepPacks)) setStorageItem("prepPacks", JSON.stringify(data.prepPacks));
        if (Array.isArray(data.spacedDrills)) {
            setStorageItem("spacedDrills", JSON.stringify(data.spacedDrills));
        } else {
            setStorageItem("spacedDrills", JSON.stringify(buildSpacedDrills(merged)));
        }
        return true;
    } catch {
        return false;
    }
}
