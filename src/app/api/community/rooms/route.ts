import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import CommunityRoom from "@/models/CommunityRoom";
import { getVerifiedSession } from "@/utils/auth";
import { DEFAULT_COMMUNITY_CHANNELS, dmSlug } from "@/utils/community";
import {
    memListRooms,
    memSeedChannels,
    memUpsertDm,
} from "@/utils/communityStore";
import { rateLimit } from "@/utils/rateLimit";
import User from "@/models/User";

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

export async function GET() {
    try {
        const session = await getVerifiedSession();
        try {
            await connectDB();
            await ensureDefaultRooms();
            const query: Record<string, unknown> = session
                ? {
                      $or: [
                          { type: "channel" as const },
                          { type: "dm" as const, members: session.identifier.toLowerCase() },
                      ],
                  }
                : { type: "channel" as const };

            const rooms = await CommunityRoom.find(query as never)
                .sort({ type: 1, name: 1 })
                .lean();

            return NextResponse.json({
                rooms: rooms.map((r) => ({
                    slug: r.slug,
                    name: r.name,
                    description: r.description,
                    type: r.type,
                    members: r.members || [],
                })),
                source: "mongo",
            });
        } catch {
            memSeedChannels([...DEFAULT_COMMUNITY_CHANNELS]);
            const rooms = memListRooms(session?.identifier);
            return NextResponse.json({ rooms, source: "memory" });
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load rooms";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/** Create / open a DM with another student */
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

        const { peerIdentifier, peerName } = await req.json();
        if (!peerIdentifier || typeof peerIdentifier !== "string") {
            return NextResponse.json({ error: "peerIdentifier is required" }, { status: 400 });
        }

        const me = session.identifier.trim().toLowerCase();
        const peer = peerIdentifier.trim().toLowerCase();
        if (me === peer) {
            return NextResponse.json({ error: "You cannot DM yourself." }, { status: 400 });
        }

        const slug = dmSlug(me, peer);
        const name = peerName ? `DM · ${peerName}` : `DM · ${peer}`;

        try {
            await connectDB();
            // Optional: verify peer exists
            const peerUser = await User.findOne({ identifier: peer }).lean();
            const displayPeer = peerUser?.displayName || peerName || peer;

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
                { upsert: true, new: true }
            );

            return NextResponse.json({
                room: {
                    slug: room.slug,
                    name: room.name,
                    description: room.description,
                    type: room.type,
                    members: room.members,
                },
                source: "mongo",
            });
        } catch {
            const room = memUpsertDm(slug, name, [me, peer], me);
            return NextResponse.json({ room, source: "memory" });
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to open DM";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
