import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import CommunityMessage from "@/models/CommunityMessage";
import CommunityRoom from "@/models/CommunityRoom";
import { getVerifiedSession } from "@/utils/auth";
import {
    DEFAULT_COMMUNITY_CHANNELS,
    isDefaultChannelSlug,
    isDmSlug,
    presencePublicId,
    sanitizeChatBody,
    sanitizeDisplayName,
} from "@/utils/community";
import {
    memCanAccessRoom,
    memGetMessages,
    memPostMessage,
    memSeedChannels,
    memTouchPresence,
} from "@/utils/communityStore";
import { rateLimit } from "@/utils/rateLimit";
import User from "@/models/User";

function mapMessage(
    m: {
        id?: string;
        _id?: unknown;
        roomSlug: string;
        senderId: string;
        senderName: string;
        body: string;
        createdAt: Date | string;
    },
    viewerId: string
) {
    const senderId = String(m.senderId).toLowerCase();
    const mine = senderId === viewerId.toLowerCase();
    return {
        id: m.id || String(m._id),
        roomSlug: m.roomSlug,
        // Never leak peer emails — only opaque keys (+ raw id for own messages is unnecessary).
        senderPublicId: presencePublicId(senderId),
        senderName: m.senderName,
        body: m.body,
        createdAt: m.createdAt,
        mine,
    };
}

async function assertRoomAccess(roomSlug: string, identifier: string): Promise<
    | { ok: true; source: "mongo"; roomType: "channel" | "dm" }
    | { ok: true; source: "memory"; roomType: "channel" | "dm" }
    | { ok: false; status: number; error: string }
> {
    try {
        await connectDB();
        const room = await CommunityRoom.findOne({ slug: roomSlug }).lean();
        if (!room) {
            if (isDefaultChannelSlug(roomSlug)) {
                return { ok: true, source: "mongo", roomType: "channel" };
            }
            return { ok: false, status: 404, error: "Room not found." };
        }
        if (room.type === "dm") {
            const members = (room.members || []).map((m) => m.toLowerCase());
            if (!members.includes(identifier.toLowerCase())) {
                return { ok: false, status: 403, error: "Not a member of this DM." };
            }
        }
        return { ok: true, source: "mongo", roomType: room.type };
    } catch {
        memSeedChannels([...DEFAULT_COMMUNITY_CHANNELS]);
        if (!memCanAccessRoom(roomSlug, identifier)) {
            // Fail closed for DMs / unknown rooms when DB is down.
            if (isDmSlug(roomSlug)) {
                return {
                    ok: false,
                    status: 503,
                    error: "Direct messages unavailable while the database is down.",
                };
            }
            return { ok: false, status: 404, error: "Room not found." };
        }
        return {
            ok: true,
            source: "memory",
            roomType: isDmSlug(roomSlug) ? "dm" : "channel",
        };
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Sign in to view community chat." }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const roomSlug = searchParams.get("room");
        const after = searchParams.get("after") || undefined;
        const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 80)));

        if (!roomSlug) {
            return NextResponse.json({ error: "room query param required" }, { status: 400 });
        }

        const access = await assertRoomAccess(roomSlug, session.identifier);
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        let displayName = sanitizeDisplayName(session.identifier.split("@")[0] || "Student");
        try {
            if (access.source === "mongo") {
                const user = await User.findOne({ identifier: session.identifier }).lean();
                if (user?.displayName) displayName = sanitizeDisplayName(user.displayName);
            }
        } catch {
            /* ignore */
        }

        memTouchPresence(
            {
                identifier: session.identifier,
                displayName,
                lastSeen: Date.now(),
                roomSlug,
            },
            presencePublicId(session.identifier)
        );

        if (access.source === "memory") {
            const messages = memGetMessages(roomSlug, after, limit).map((m) =>
                mapMessage(m, session.identifier)
            );
            return NextResponse.json({ messages, source: "memory" });
        }

        const filter: Record<string, unknown> = { roomSlug };
        if (after) {
            const t = new Date(after);
            if (!Number.isNaN(t.getTime())) filter.createdAt = { $gt: t };
        }

        const messages = await CommunityMessage.find(filter).sort({ createdAt: 1 }).limit(limit).lean();

        return NextResponse.json({
            messages: messages.map((m) => mapMessage(m, session.identifier)),
            source: "mongo",
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load messages";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Sign in to chat with the community." }, { status: 401 });
        }

        const rl = rateLimit(`community-msg:${session.identifier}`, { limit: 60, windowMs: 5 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Slow down — retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const { roomSlug, body } = await req.json();
        if (!roomSlug || typeof roomSlug !== "string") {
            return NextResponse.json({ error: "roomSlug is required" }, { status: 400 });
        }

        const clean = sanitizeChatBody(body);
        if (!clean) {
            return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
        }

        const access = await assertRoomAccess(roomSlug, session.identifier);
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        let displayName = sanitizeDisplayName(session.identifier.split("@")[0] || "Student");

        if (access.source === "mongo") {
            try {
                const user = await User.findOne({ identifier: session.identifier }).lean();
                if (user?.displayName) displayName = sanitizeDisplayName(user.displayName);

                const msg = await CommunityMessage.create({
                    roomSlug,
                    senderId: session.identifier.toLowerCase(),
                    senderName: displayName,
                    body: clean,
                });

                memTouchPresence(
                    {
                        identifier: session.identifier,
                        displayName,
                        lastSeen: Date.now(),
                        roomSlug,
                    },
                    presencePublicId(session.identifier)
                );

                return NextResponse.json({
                    message: mapMessage(
                        {
                            id: String(msg._id),
                            roomSlug: msg.roomSlug,
                            senderId: msg.senderId,
                            senderName: msg.senderName,
                            body: msg.body,
                            createdAt: msg.createdAt,
                        },
                        session.identifier
                    ),
                    source: "mongo",
                });
            } catch (err) {
                // Do not silently write DMs to memory after a mid-request DB failure.
                if (access.roomType === "dm" || isDmSlug(roomSlug)) {
                    const message = err instanceof Error ? err.message : "Failed to send message";
                    return NextResponse.json({ error: message }, { status: 503 });
                }
                // Channels may fall back for local demos.
            }
        }

        if (access.roomType === "dm" || isDmSlug(roomSlug)) {
            // Memory DM only if we already verified membership via memCanAccessRoom.
            if (access.source !== "memory" || !memCanAccessRoom(roomSlug, session.identifier)) {
                return NextResponse.json(
                    { error: "Direct messages unavailable while the database is down." },
                    { status: 503 }
                );
            }
        } else {
            memSeedChannels([...DEFAULT_COMMUNITY_CHANNELS]);
        }

        const msg = memPostMessage({
            roomSlug,
            senderId: session.identifier.toLowerCase(),
            senderName: displayName,
            body: clean,
        });
        memTouchPresence(
            {
                identifier: session.identifier,
                displayName,
                lastSeen: Date.now(),
                roomSlug,
            },
            presencePublicId(session.identifier)
        );
        return NextResponse.json({
            message: mapMessage(msg, session.identifier),
            source: "memory",
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to send message";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
