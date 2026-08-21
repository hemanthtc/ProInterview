import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import CloudSession from "@/models/CloudSession";
import { getVerifiedSession } from "@/utils/auth";
import { isS3Configured, getJSON, uploadJSON, deleteS3Object, pingS3, getS3SessionsKey, getS3PrepPacksKey } from "@/utils/s3";

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
                : typeof item.createdAt === "number"
                  ? `created_${item.createdAt}`
                  : null;
        if (!key) continue;
        const existing = map.get(key);
        if (!existing || (item.createdAt || 0) >= (existing.createdAt || 0)) {
            map.set(key, item);
        }
    }
    return Array.from(map.values()).sort((a, b) => (b.createdAt || b.dueAt || 0) - (a.createdAt || a.dueAt || 0));
}

async function getOrCreateBlob(identifier: string) {
    let blob = await CloudSession.findOne({ identifier });
    if (!blob) {
        blob = await CloudSession.create({
            identifier,
            sessions: [],
            prepPacks: [],
            spacedDrills: [],
        });
    }
    return blob;
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
                prepPacks: [], // Kept separate in its own S3 folder now
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
        
        let data: any = null;
        let prepPacks: any[] = [];
        
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
                data = await migrateMongoSessionsToS3(session.identifier, sessionsKey, s3Data);
            }
        }

        if (!data) {
            const blob = await getOrCreateBlob(session.identifier);
            data = {
                sessions: blob.sessions || [],
                prepPacks: [],
                spacedDrills: blob.spacedDrills || [],
            };
            prepPacks = blob.prepPacks || [];
        }

        return NextResponse.json({
            sessions: data.sessions || [],
            prepPacks: prepPacks || [],
            spacedDrills: data.spacedDrills || [],
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
        const hasIncomingPacks = body.prepPacks !== undefined && Array.isArray(body.prepPacks);
        const incomingPacks = hasIncomingPacks ? body.prepPacks : [];
        const incomingDrills = Array.isArray(body.spacedDrills) ? body.spacedDrills : [];

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
                s3Data = await migrateMongoSessionsToS3(session.identifier, sessionsKey, s3Data);
                const mergedSessions = mergeByTimestamp(s3Data.sessions || [], incomingSessions);
                const mergedDrills = incomingDrills.length > 0 ? mergeById(s3Data.spacedDrills || [], incomingDrills) : s3Data.spacedDrills || [];

                finalData = {
                    sessions: mergedSessions,
                    prepPacks: [], // Kept separate now
                    spacedDrills: mergedDrills,
                };
                await uploadJSON(sessionsKey, finalData);

                // Force clear MongoDB prepPacks cache to be 105% sure nothing remains on the server
                try {
                    const blob = await CloudSession.findOne({ identifier: session.identifier });
                    if (blob && blob.prepPacks && blob.prepPacks.length > 0) {
                        blob.prepPacks = [];
                        blob.markModified("prepPacks");
                        await blob.save();
                    }
                } catch (e) {
                    console.error("Force clear MongoDB cache failed:", e);
                }
            }
        }

        if (!finalData) {
            const blob = await getOrCreateBlob(session.identifier);
            const mergedSessions = mergeByTimestamp(blob.sessions || [], incomingSessions);
            const mergedPacks = hasIncomingPacks ? incomingPacks : (blob.prepPacks || []);
            const mergedDrills = incomingDrills.length > 0 ? mergeById(blob.spacedDrills || [], incomingDrills) : blob.spacedDrills || [];

            blob.sessions = mergedSessions;
            blob.prepPacks = mergedPacks;
            blob.spacedDrills = mergedDrills;

            blob.markModified("sessions");
            blob.markModified("prepPacks");
            blob.markModified("spacedDrills");

            await blob.save();

            finalData = {
                sessions: mergedSessions,
                prepPacks: mergedPacks,
                spacedDrills: mergedDrills,
            };
            finalPacks = mergedPacks;
        }

        return NextResponse.json({
            ok: true,
            sessions: finalData.sessions,
            prepPacks: finalPacks,
            spacedDrills: finalData.spacedDrills,
        });
    } catch (error: any) {
        console.error("sync-sessions POST error:", error);
        return NextResponse.json({ error: error.message || "Failed to sync sessions" }, { status: 500 });
    }
}
