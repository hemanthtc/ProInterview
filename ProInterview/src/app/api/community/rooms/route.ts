import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import CommunityRoom from "@/models/CommunityRoom";
import { getVerifiedSession } from "@/utils/auth";
import {
    DEFAULT_COMMUNITY_CHANNELS,
    dmSlug,
    presencePublicId,
    sanitizeDisplayName,
} from "@/utils/community";
import {
    memListRooms,
    memResolvePublicId,
    memSeedChannels,
    memUpsertDm,
} from "@/utils/communityStore";
import { rateLimit } from "@/utils/rateLimit";
import User from "@/models/User";
import { isS3Configured, s3GetRooms, s3UpsertDm } from "@/utils/s3Community";

async function ensureDefaultRooms() {
    for (const ch of DEFAULT_COMMUNITY_CHANNELS) {
        await CommunityRoom.updateOne(
            { slug: ch.slug },
            {
                $setOnInsert: {
                    slug: ch.slug,
                    name: ch.name,
                    description: ch.description,
                    type: "channel",
                    members: [],
                },
            },
            { upsert: true }
        );
    }
}

function publicRoom(r: {
    slug: string;
    name: string;
    description?: string;
    type: "channel" | "dm";
    members?: string[];
}) {
    return {
        slug: r.slug,
        name: r.name,
        description: r.description || "",
        type: r.type,
        memberPublicIds:
            r.type === "dm" ? (r.members || []).map((m) => presencePublicId(m)) : [],
    };
}

export async function GET() {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Sign in to view community rooms." }, { status: 401 });
        }

        const me = session.identifier.toLowerCase();

        // 1. AWS S3 Storage Check
        if (isS3Configured()) {
            try {
                const s3Rooms = await s3GetRooms();
                const filtered = s3Rooms.filter(
                    (r) => r.type === "channel" || r.members.includes(me)
                );
                return NextResponse.json({
                    rooms: filtered.map((r) => publicRoom(r)),
                    mePublicId: presencePublicId(session.identifier),
                    role: session.role,
                    source: "s3",
                });
            } catch (err) {
                console.error("Failed to load rooms from S3, falling back to memory:", err);
            }
        }

        // 2. MongoDB Fallback
        try {
            await connectDB();
            await ensureDefaultRooms();
            const query = {
                $or: [
                    { type: "channel" as const },
                    { type: "dm" as const, members: me },
                ],
            };

            const rooms = await CommunityRoom.find(query as never)
                .sort({ type: 1, name: 1 })
                .lean();

            return NextResponse.json({
                rooms: rooms.map((r) => publicRoom(r)),
                mePublicId: presencePublicId(session.identifier),
                role: session.role,
                source: "mongo",
            });
        } catch {
            memSeedChannels([...DEFAULT_COMMUNITY_CHANNELS]);
            const rooms = memListRooms(session.identifier);
            return NextResponse.json({
                rooms: rooms.map((r) => publicRoom(r)),
                mePublicId: presencePublicId(session.identifier),
                role: session.role,
                source: "memory",
            });
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load rooms";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/** Create / open a DM with another online student (opaque publicId). */
export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Sign in to start a direct message." }, { status: 401 });
        }

        const rl = rateLimit(`community-dm:${session.identifier}`, { limit: 20, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Too many DM opens. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const body = await req.json();
        const peerPublicId = typeof body.peerPublicId === "string" ? body.peerPublicId.trim() : "";
        if (!peerPublicId) {
            return NextResponse.json({ error: "peerPublicId is required" }, { status: 400 });
        }

        const peer = memResolvePublicId(peerPublicId);
        if (!peer) {
            return NextResponse.json(
                { error: "That student is offline or unknown. Ask them to open Community first." },
                { status: 404 }
            );
        }

        const me = session.identifier.trim().toLowerCase();
        if (me === peer) {
            return NextResponse.json({ error: "You cannot DM yourself." }, { status: 400 });
        }

        const slug = dmSlug(me, peer);

        // 1. AWS S3 Storage Check
        if (isS3Configured()) {
            try {
                let displayPeer = sanitizeDisplayName(peer.split("@")[0] || "Student");
                try {
                    await connectDB();
                    const peerUser = await User.findOne({ identifier: peer }).lean();
                    if (peerUser?.displayName) {
                        displayPeer = sanitizeDisplayName(peerUser.displayName);
                    }
                } catch { /* offline DB / fallback displayPeer */ }

                const room = await s3UpsertDm(slug, `DM · ${displayPeer}`, [me, peer], me);
                return NextResponse.json({
                    room: publicRoom(room),
                    source: "s3",
                });
            } catch (err) {
                console.error("Failed to upsert DM to S3, falling back to memory:", err);
            }
        }

        // 2. MongoDB Fallback
        try {
            await connectDB();
            const peerUser = await User.findOne({ identifier: peer }).lean();
            const displayPeer = sanitizeDisplayName(
                peerUser?.displayName || peer.split("@")[0] || "Student"
            );

            const room = await CommunityRoom.findOneAndUpdate(
                { slug },
                {
                    $setOnInsert: {
                        slug,
                        name: `DM · ${displayPeer}`,
                        description: "Direct message",
                        type: "dm",
                        members: [me, peer],
                        createdBy: me,
                    },
                },
                { upsert: true, returnDocument: 'after' }
            );

            return NextResponse.json({
                room: publicRoom(room),
                source: "mongo",
            });
        } catch {
            // Peer was presence-resolved above — safe memory DM for local demos.
            const displayPeer = sanitizeDisplayName(peer.split("@")[0] || "Student");
            const room = memUpsertDm(slug, `DM · ${displayPeer}`, [me, peer], me);
            return NextResponse.json({ room: publicRoom(room), source: "memory" });
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to open DM";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
