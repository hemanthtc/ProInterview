import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import CloudSession from "@/models/CloudSession";
import { getVerifiedSession } from "@/utils/auth";

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

export async function GET() {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        await connectDB();
        const blob = await getOrCreateBlob(session.identifier);

        return NextResponse.json({
            sessions: blob.sessions || [],
            prepPacks: blob.prepPacks || [],
            spacedDrills: blob.spacedDrills || [],
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

        const blob = await getOrCreateBlob(session.identifier);

        const mergedSessions = mergeByTimestamp(blob.sessions || [], incomingSessions);
        const mergedPacks =
            incomingPacks.length > 0 ? mergeById(blob.prepPacks || [], incomingPacks) : blob.prepPacks || [];
        const mergedDrills =
            incomingDrills.length > 0
                ? mergeById(blob.spacedDrills || [], incomingDrills)
                : blob.spacedDrills || [];

        blob.sessions = mergedSessions;
        blob.prepPacks = mergedPacks;
        blob.spacedDrills = mergedDrills;
        await blob.save();

        return NextResponse.json({
            ok: true,
            sessions: mergedSessions,
            prepPacks: mergedPacks,
            spacedDrills: mergedDrills,
        });
    } catch (error: any) {
        console.error("sync-sessions POST error:", error);
        return NextResponse.json({ error: error.message || "Failed to sync sessions" }, { status: 500 });
    }
}
