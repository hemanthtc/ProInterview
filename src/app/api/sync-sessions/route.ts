import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import CloudSession from "@/models/CloudSession";
import { getVerifiedSession } from "@/utils/auth";
import { isS3Configured, getJSON, uploadJSON, pingS3, getS3SessionsKey } from "@/utils/s3";

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
                prepPacks: mergeById(s3Data.prepPacks || [], blob.prepPacks || []),
                spacedDrills: mergeById(s3Data.spacedDrills || [], blob.spacedDrills || []),
            };
            await uploadJSON(key, merged);
            // Clear from MongoDB to keep it clean
            blob.sessions = [];
            blob.prepPacks = [];
            blob.spacedDrills = [];
            await blob.save();
            console.log("Successfully migrated sessions to S3 and cleared MongoDB cache.");
            return merged;
        }
    } catch (err) {
        console.error("Failed to migrate MongoDB sessions to S3:", err);
    }
    return s3Data;
}

export async function GET() {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        await connectDB();
        
        let data: any = null;
        if (isS3Configured()) {
            const ping = await pingS3();
            if (ping.ok) {
                const key = getS3SessionsKey(session.identifier);
                let s3Data: any = { sessions: [], prepPacks: [], spacedDrills: [] };
                try {
                    s3Data = await getJSON<any>(key);
                } catch (err: any) {
                    if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) {
                        throw err;
                    }
                }
                data = await migrateMongoSessionsToS3(session.identifier, key, s3Data);
            }
        }

        if (!data) {
            const blob = await getOrCreateBlob(session.identifier);
            data = {
                sessions: blob.sessions || [],
                prepPacks: blob.prepPacks || [],
                spacedDrills: blob.spacedDrills || [],
            };
        }

        return NextResponse.json({
            sessions: data.sessions || [],
            prepPacks: data.prepPacks || [],
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
        const incomingPacks = Array.isArray(body.prepPacks) ? body.prepPacks : [];
        const incomingDrills = Array.isArray(body.spacedDrills) ? body.spacedDrills : [];

        let finalData: any = null;
        if (isS3Configured()) {
            const ping = await pingS3();
            if (ping.ok) {
                const key = getS3SessionsKey(session.identifier);
                let s3Data: any = { sessions: [], prepPacks: [], spacedDrills: [] };
                try {
                    s3Data = await getJSON<any>(key);
                } catch (err: any) {
                    if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) {
                        throw err;
                    }
                }

                // Migrate legacy Mongo data first if present
                s3Data = await migrateMongoSessionsToS3(session.identifier, key, s3Data);

                const mergedSessions = mergeByTimestamp(s3Data.sessions || [], incomingSessions);
                const mergedPacks = incomingPacks.length > 0 ? mergeById(s3Data.prepPacks || [], incomingPacks) : s3Data.prepPacks || [];
                const mergedDrills = incomingDrills.length > 0 ? mergeById(s3Data.spacedDrills || [], incomingDrills) : s3Data.spacedDrills || [];

                finalData = {
                    sessions: mergedSessions,
                    prepPacks: mergedPacks,
                    spacedDrills: mergedDrills,
                };

                await uploadJSON(key, finalData);
            }
        }

        if (!finalData) {
            const blob = await getOrCreateBlob(session.identifier);
            const mergedSessions = mergeByTimestamp(blob.sessions || [], incomingSessions);
            const mergedPacks = incomingPacks.length > 0 ? mergeById(blob.prepPacks || [], incomingPacks) : blob.prepPacks || [];
            const mergedDrills = incomingDrills.length > 0 ? mergeById(blob.spacedDrills || [], incomingDrills) : blob.spacedDrills || [];

            blob.sessions = mergedSessions;
            blob.prepPacks = mergedPacks;
            blob.spacedDrills = mergedDrills;
            await blob.save();

            finalData = {
                sessions: mergedSessions,
                prepPacks: mergedPacks,
                spacedDrills: mergedDrills,
            };
        }

        return NextResponse.json({
            ok: true,
            sessions: finalData.sessions,
            prepPacks: finalData.prepPacks,
            spacedDrills: finalData.spacedDrills,
        });
    } catch (error: any) {
        console.error("sync-sessions POST error:", error);
        return NextResponse.json({ error: error.message || "Failed to sync sessions" }, { status: 500 });
    }
}
