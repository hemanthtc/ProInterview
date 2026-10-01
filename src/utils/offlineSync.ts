import { getStorageItem, setStorageItem, removeStorageItem } from "./storage";
import { syncSessionsToCloud } from "./cloudSync";
import { authFetch } from "./authExpiry";

let isSyncing = false;

/**
 * Triggers self-healing of cached offline data.
 * Tries to reconcile localStorage caches (profiles, sessions, scorecards)
 * with MongoDB and S3 when the network is online.
 */
export async function triggerSelfHealing(): Promise<void> {
    if (typeof window === "undefined") return;
    if (getStorageItem("userLoggedIn") !== "true") return;
    if (isSyncing) return;

    isSyncing = true;
    try {
        console.log("Checking for unsynced offline data...");

        // 1. Check/Heal Profile changes
        const profileCache = getStorageItem("local_profile_cache");
        if (profileCache) {
            try {
                const profilePayload = JSON.parse(profileCache);
                const res = await authFetch("/api/auth/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(profilePayload),
                });
                if (res.ok) {
                    console.log("Successfully healed offline profile changes to server.");
                    removeStorageItem("local_profile_cache");
                }
            } catch (profileErr) {
                console.error("Failed to sync profile cache:", profileErr);
            }
        }

        // 2. Heal Scorecard creations
        const scorecardsCache = getStorageItem("local_scorecards_cache");
        if (scorecardsCache) {
            try {
                const scorecards: any[] = JSON.parse(scorecardsCache);
                if (Array.isArray(scorecards) && scorecards.length > 0) {
                    const remaining: any[] = [];
                    for (const scorecard of scorecards) {
                        try {
                            const res = await fetch("/api/scorecard", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(scorecard),
                            });
                            if (!res.ok) {
                                remaining.push(scorecard);
                            }
                        } catch {
                            remaining.push(scorecard);
                        }
                    }
                    if (remaining.length === 0) {
                        console.log("Successfully healed offline scorecards to server.");
                        removeStorageItem("local_scorecards_cache");
                    } else {
                        setStorageItem("local_scorecards_cache", JSON.stringify(remaining));
                    }
                }
            } catch (scorecardErr) {
                console.error("Failed to sync scorecards cache:", scorecardErr);
            }
        }

        // 3. Heal Mock Interview Sessions (calls backend which uploads MongoDB to S3 if online)
        const syncRes = await syncSessionsToCloud();
        if (syncRes.ok) {
            console.log("Successfully reconciled sessions with cloud database/S3.");
        }
    } catch (err) {
        console.error("Offline self-healing sync error:", err);
    } finally {
        isSyncing = false;
    }
}
