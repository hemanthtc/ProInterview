import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import CloudSession from "@/models/CloudSession";
import { getVerifiedSession } from "@/utils/auth";
import { isS3Configured, getJSON, uploadJSON, deleteS3Object, pingS3, getS3SessionsKey, getLegacyS3SessionsKey, getS3PrepPacksKey, getS3FilmRoomKey, deleteObject } from "@/utils/s3";
import { runProgressAutoCleanup } from "@/utils/serverProgressCleanup";

function sessionKey(s: any): string | null {
    if (!s || typeof s.timestamp !== "number") return null;
    return `${s.timestamp}_${s.finalScore ?? ""}`;
}

function mergeByTimestamp(cloud: any[], incoming: any[]): any[] {
    const map = new Map<string, any>();
    for (const s of [...(cloud || []), ...(incoming || [])]) {
        const key = sessionKey(s);
        if (!key) continue;
        const existing = map.get(key);
        if (!existing || (s.updatedAt || s.timestamp) >= (existing.updatedAt || existing.timestamp)) {
            map.set(key, s);
        }
    }
    return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

function mergeById(cloud: any[], incoming: any[]): any[] {
    const map = new Map<string, any>();
    for (const item of [...(cloud || []), ...(incoming || [])]) {
        if (!item) continue;
        const key =
            typeof item.id === "string"
                ? item.id
                : typeof item.timestamp === "number"
                  ? `ts_${item.timestamp}`
                  : typeof item.createdAt === "number"
                    ? `created_${item.createdAt}`
                    : null;
        if (!key) continue;
        const existing = map.get(key);
        if (!existing || (item.timestamp || item.createdAt || 0) >= (existing.timestamp || existing.createdAt || 0)) {
            map.set(key, item);
        }
    }
    return Array.from(map.values()).sort((a, b) => (b.timestamp || b.createdAt || b.dueAt || 0) - (a.timestamp || a.createdAt || a.dueAt || 0));
}

async function getOrCreateBlob(identifier: string) {
    let blob = await CloudSession.findOne({ identifier });
    if (!blob) {
        blob = await CloudSession.create({
            identifier,
            sessions: [],
            mockAptitudeSessions: [],
            prepPacks: [],
            spacedDrills: [],
            retentionDays: 30,
        });
    }
    return blob;
}

// Auto-migration helper: reconciles legacy S3 sessions from the old folder key to the new folder key
async function migrateLegacyS3Sessions(userIdentifier: string, newKey: string, currentS3Data: any): Promise<any> {
    try {
        if (!isS3Configured()) return currentS3Data;
        const legacyKey = getLegacyS3SessionsKey(userIdentifier);
        let legacyData: any = null;
        try {
            legacyData = await getJSON<any>(legacyKey);
        } catch (err: any) {
            if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) {
                console.error("Failed to fetch legacy S3 sessions:", err);
            }
        }

        if (legacyData) {
            console.log(`Migrating legacy S3 sessions to new folder for ${userIdentifier}...`);
            const merged = {
                sessions: mergeByTimestamp(currentS3Data.sessions || [], legacyData.sessions || []),
                prepPacks: [],
                spacedDrills: mergeById(currentS3Data.spacedDrills || [], legacyData.spacedDrills || []),
            };
            await uploadJSON(newKey, merged);
            await deleteS3Object(legacyKey);
            console.log("Successfully migrated legacy S3 sessions and deleted old file.");
            return merged;
        }
    } catch (err) {
        console.error("Failed in migrateLegacyS3Sessions:", err);
    }
    return currentS3Data;
}

// Auto-migration helper: reconciles offline MongoDB sessions cache into S3 and deletes it from MongoDB
async function migrateMongoSessionsToS3(userIdentifier: string, key: string, s3Data: any): Promise<any> {
    try {
        await connectDB();
        const blob = await CloudSession.findOne({ identifier: userIdentifier });
        if (blob && (blob.sessions.length > 0 || blob.prepPacks.length > 0 || blob.spacedDrills.length > 0)) {
            console.log(`Migrating MongoDB sessions to S3 for ${userIdentifier}...`);
            const merged = {
                sessions: mergeByTimestamp(s3Data.sessions || [], blob.sessions || []),
                prepPacks: [],
                spacedDrills: mergeById(s3Data.spacedDrills || [], blob.spacedDrills || []),
            };
            await uploadJSON(key, merged);
            // Clear from MongoDB to keep it clean
            blob.sessions = [];
            blob.prepPacks = [];
            blob.spacedDrills = [];
            blob.markModified("sessions");
            blob.markModified("prepPacks");
            blob.markModified("spacedDrills");
            await blob.save();
            console.log("Successfully migrated sessions to S3 and cleared MongoDB cache.");
            return merged;
        }
    } catch (err) {
        console.error("Failed to migrate MongoDB sessions to S3:", err);
    }
    return s3Data;
}

async function migrateMongoPrepPacksToS3(userIdentifier: string, key: string): Promise<any[]> {
    try {
        await connectDB();
        const blob = await CloudSession.findOne({ identifier: userIdentifier });
        if (blob && blob.prepPacks && blob.prepPacks.length > 0) {
            console.log(`Migrating MongoDB prep-packs to S3 for ${userIdentifier}...`);
            let s3Packs: any[] = [];
            try {
                s3Packs = await getJSON<any[]>(key);
            } catch (err: any) {
                if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) {
                    throw err;
                }
            }
            const mergedPacks = mergeById(s3Packs || [], blob.prepPacks);
            await uploadJSON(key, mergedPacks);

            // Clear from MongoDB to keep it clean
            blob.prepPacks = [];
            blob.markModified("prepPacks");
            await blob.save();
            console.log("Successfully migrated prep-packs to S3 and cleared MongoDB cache.");
            return mergedPacks;
        }
    } catch (err) {
        console.error("Failed to migrate MongoDB prep-packs to S3:", err);
    }
    return [];
}

export async function GET() {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        await connectDB();
        
        // Execute background auto-cleanup for expired sessions (> 30 days)
        void runProgressAutoCleanup(session.identifier);

        let data: any = null;
        let prepPacks: any[] = [];
        const blob = await getOrCreateBlob(session.identifier);
        
        if (isS3Configured()) {
            const ping = await pingS3();
            if (ping.ok) {
                const sessionsKey = getS3SessionsKey(session.identifier);
                const prepPacksKey = getS3PrepPacksKey(session.identifier);
                
                // Fetch Prep Packs
                let s3Packs: any[] = [];
                try {
                    s3Packs = await getJSON<any[]>(prepPacksKey);
                } catch (err: any) {
                    if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) {
                        throw err;
                    }
                }
                const migratedPacks = await migrateMongoPrepPacksToS3(session.identifier, prepPacksKey);
                prepPacks = migratedPacks.length > 0 ? migratedPacks : s3Packs;

                // Fetch Sessions
                let s3Data: any = { sessions: [], prepPacks: [], spacedDrills: [] };
                try {
                    s3Data = await getJSON<any>(sessionsKey);
                } catch (err: any) {
                    if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) {
                        throw err;
                    }
                }
                s3Data = await migrateLegacyS3Sessions(session.identifier, sessionsKey, s3Data);
                data = await migrateMongoSessionsToS3(session.identifier, sessionsKey, s3Data);
            }
        }

        if (!data) {
            data = {
                sessions: blob.sessions || [],
                prepPacks: [],
                spacedDrills: blob.spacedDrills || [],
            };
            prepPacks = blob.prepPacks || [];
        }

        return NextResponse.json({
            sessions: data.sessions || [],
            mockAptitudeSessions: blob.mockAptitudeSessions || [],
            prepPacks: prepPacks || [],
            spacedDrills: data.spacedDrills || [],
            retentionDays: blob.retentionDays || 30,
        });
    } catch (error: any) {
        console.error("sync-sessions GET error:", error);
        return NextResponse.json({ error: error.message || "Failed to sync sessions" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();
        const incomingSessions = Array.isArray(body.sessions) ? body.sessions : [];
        const incomingMocks = Array.isArray(body.mockAptitudeSessions) ? body.mockAptitudeSessions : [];
        const hasIncomingPacks = body.prepPacks !== undefined && Array.isArray(body.prepPacks);
        const incomingPacks = hasIncomingPacks ? body.prepPacks : [];
        const incomingDrills = Array.isArray(body.spacedDrills) ? body.spacedDrills : [];

        const blob = await getOrCreateBlob(session.identifier);

        // Always merge and save mockAptitudeSessions in MongoDB
        if (incomingMocks.length > 0 || body.mockAptitudeSessions !== undefined) {
            const mergedMocks = mergeById(blob.mockAptitudeSessions || [], incomingMocks);
            blob.mockAptitudeSessions = mergedMocks;
            blob.markModified("mockAptitudeSessions");
        }

        if (typeof body.retentionDays === "number" && body.retentionDays > 0) {
            blob.retentionDays = body.retentionDays;
        }

        let finalData: any = null;
        let finalPacks: any[] = [];
        
        if (isS3Configured()) {
            const ping = await pingS3();
            if (ping.ok) {
                const sessionsKey = getS3SessionsKey(session.identifier);
                const prepPacksKey = getS3PrepPacksKey(session.identifier);
                
                // Fetch Prep Packs & Self-heal if needed
                let s3Packs: any[] = [];
                try {
                    s3Packs = await getJSON<any[]>(prepPacksKey);
                } catch (err: any) {
                    if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) {
                        throw err;
                    }
                }
                const migratedPacks = await migrateMongoPrepPacksToS3(session.identifier, prepPacksKey);
                const basePacks = migratedPacks.length > 0 ? migratedPacks : s3Packs;
                
                let mergedPacks: any[] = [];
                if (body.clearAllPrepPacks) {
                    await uploadJSON(prepPacksKey, []);
                    await deleteS3Object(prepPacksKey);
                    mergedPacks = [];
                } else {
                    mergedPacks = hasIncomingPacks && incomingPacks.length > 0 ? incomingPacks : basePacks;
                    await uploadJSON(prepPacksKey, mergedPacks);
                }
                finalPacks = mergedPacks;

                // Fetch Sessions & Self-heal if needed
                let s3Data: any = { sessions: [], prepPacks: [], spacedDrills: [] };
                try {
                    s3Data = await getJSON<any>(sessionsKey);
                } catch (err: any) {
                    if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) {
                        throw err;
                    }
                }
                s3Data = await migrateLegacyS3Sessions(session.identifier, sessionsKey, s3Data);
                s3Data = await migrateMongoSessionsToS3(session.identifier, sessionsKey, s3Data);
                const mergedSessions = mergeByTimestamp(s3Data.sessions || [], incomingSessions);
                const mergedDrills = incomingDrills.length > 0 ? mergeById(s3Data.spacedDrills || [], incomingDrills) : s3Data.spacedDrills || [];

                finalData = {
                    sessions: mergedSessions,
                    prepPacks: [],
                    spacedDrills: mergedDrills,
                };
                await uploadJSON(sessionsKey, finalData);

                // Clear MongoDB prepPacks cache to keep Mongo clean
                try {
                    if (blob.prepPacks && blob.prepPacks.length > 0) {
                        blob.prepPacks = [];
                        blob.markModified("prepPacks");
                    }
                } catch (e) {
                    console.error("Force clear MongoDB cache failed:", e);
                }
            }
        }

        if (!finalData) {
            const mergedSessions = mergeByTimestamp(blob.sessions || [], incomingSessions);
            const mergedPacks = hasIncomingPacks ? incomingPacks : (blob.prepPacks || []);
            const mergedDrills = incomingDrills.length > 0 ? mergeById(blob.spacedDrills || [], incomingDrills) : blob.spacedDrills || [];

            blob.sessions = mergedSessions;
            blob.prepPacks = mergedPacks;
            blob.spacedDrills = mergedDrills;

            blob.markModified("sessions");
            blob.markModified("prepPacks");
            blob.markModified("spacedDrills");

            finalData = {
                sessions: mergedSessions,
                prepPacks: mergedPacks,
                spacedDrills: mergedDrills,
            };
            finalPacks = mergedPacks;
        }

        await blob.save();

        return NextResponse.json({
            ok: true,
            sessions: finalData.sessions,
            mockAptitudeSessions: blob.mockAptitudeSessions || [],
            prepPacks: finalPacks,
            spacedDrills: finalData.spacedDrills,
            retentionDays: blob.retentionDays || 30,
        });
    } catch (error: any) {
        console.error("sync-sessions POST error:", error);
        return NextResponse.json({ error: error.message || "Failed to sync sessions" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        await connectDB();
        const body = await req.json().catch(() => ({}));
        const { type, id, timestamp, tab } = body;

        const blob = await getOrCreateBlob(session.identifier);

        // Case 1: Delete individual interview attempt + cascade S3 film room delete
        if (type === "interview" || (timestamp && !type)) {
            const targetTs = Number(timestamp);
            blob.sessions = (blob.sessions || []).filter((s: any) => {
                const sTs = s?.timestamp ? Number(s.timestamp) : 0;
                const sId = s?.id || "";
                if (id && sId === id) return false;
                if (targetTs && sTs === targetTs) return false;
                return true;
            });
            blob.markModified("sessions");

            if (isS3Configured()) {
                // Delete session from S3 session data
                try {
                    const sessionsKey = getS3SessionsKey(session.identifier);
                    const s3Data = await getJSON<any>(sessionsKey).catch(() => null);
                    if (s3Data && Array.isArray(s3Data.sessions)) {
                        s3Data.sessions = s3Data.sessions.filter((s: any) => {
                            const sTs = s?.timestamp ? Number(s.timestamp) : 0;
                            const sId = s?.id || "";
                            if (id && sId === id) return false;
                            if (targetTs && sTs === targetTs) return false;
                            return true;
                        });
                        await uploadJSON(sessionsKey, s3Data);
                    }
                } catch (err) {
                    console.error("Failed to delete interview from S3 sessions:", err);
                }

                // Cascade delete Film Room S3 object
                if (targetTs) {
                    try {
                        const filmKey = getS3FilmRoomKey(session.identifier, targetTs);
                        await deleteObject(filmKey);
                    } catch (err) {
                        console.error("Failed to cascade delete Film Room S3 object:", err);
                    }
                }
            }
        }

        // Case 2: Delete individual mock aptitude assessment
        if (type === "mock_aptitude" || (id && type === "mock_aptitude")) {
            const targetTs = Number(timestamp);
            blob.mockAptitudeSessions = (blob.mockAptitudeSessions || []).filter((m: any) => {
                const mTs = m?.timestamp ? Number(m.timestamp) : 0;
                const mId = m?.id || "";
                if (id && mId === id) return false;
                if (targetTs && mTs === targetTs) return false;
                return true;
            });
            blob.markModified("mockAptitudeSessions");
        }

        // Case 3: Clear whole tab history
        if (type === "clear_tab") {
            if (tab === "interview" || tab === "filmroom") {
                // Purge all S3 film rooms if possible
                if (isS3Configured()) {
                    for (const s of blob.sessions || []) {
                        const sess = s as any;
                        if (sess?.timestamp) {
                            deleteObject(getS3FilmRoomKey(session.identifier, sess.timestamp)).catch(() => {});
                        }
                    }
                    try {
                        const sessionsKey = getS3SessionsKey(session.identifier);
                        await uploadJSON(sessionsKey, { sessions: [], prepPacks: [], spacedDrills: [] });
                    } catch { /* ignore */ }
                }
                blob.sessions = [];
                blob.markModified("sessions");
            } else if (tab === "aptitude") {
                blob.mockAptitudeSessions = [];
                blob.markModified("mockAptitudeSessions");
            }
        }

        await blob.save();

        return NextResponse.json({
            ok: true,
            sessions: blob.sessions || [],
            mockAptitudeSessions: blob.mockAptitudeSessions || [],
        });
    } catch (error: any) {
        console.error("sync-sessions DELETE error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete item" }, { status: 500 });
    }
}

