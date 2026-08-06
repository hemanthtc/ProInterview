import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import CommunityMessage from "@/models/CommunityMessage";
import CommunityRoom from "@/models/CommunityRoom";
import { getVerifiedSession } from "@/utils/auth";
import { sanitizeChatBody } from "@/utils/community";
import { memGetMessages, memPostMessage, memTouchPresence } from "@/utils/communityStore";
import { rateLimit } from "@/utils/rateLimit";
import User from "@/models/User";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const roomSlug = searchParams.get("room");
        const after = searchParams.get("after") || undefined;
        const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 80)));

        if (!roomSlug) {
            return NextResponse.json({ error: "room query param required" }, { status: 400 });
        }

        const session = await getVerifiedSession();
        // Presence heartbeat on poll
        if (session) {
            memTouchPresence({
                identifier: session.identifier,
                displayName: session.identifier.split("@")[0] || session.identifier,
                lastSeen: Date.now(),
                roomSlug,
            });
        }

        try {
            await connectDB();

            if (session) {
                const room = await CommunityRoom.findOne({ slug: roomSlug }).lean();
                if (room?.type === "dm") {
                    const members = (room.members || []).map((m) => m.toLowerCase());
                    if (!members.includes(session.identifier.toLowerCase())) {
                        return NextResponse.json({ error: "Not a member of this DM." }, { status: 403 });
                    }
                }
            }

            const filter: Record<string, unknown> = { roomSlug };
            if (after) {
                const t = new Date(after);
                if (!Number.isNaN(t.getTime())) filter.createdAt = { $gt: t };
            }

            const messages = await CommunityMessage.find(filter)
                .sort({ createdAt: 1 })
                .limit(limit)
                .lean();

            return NextResponse.json({
                messages: messages.map((m) => ({
                    id: String(m._id),
                    roomSlug: m.roomSlug,
                    senderId: m.senderId,
                    senderName: m.senderName,
                    body: m.body,
                    createdAt: m.createdAt,
                })),
                source: "mongo",
            });
        } catch {
            const messages = memGetMessages(roomSlug, after, limit);
            return NextResponse.json({ messages, source: "memory" });
        }
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

        let displayName = session.identifier.split("@")[0] || "Student";
        try {
            await connectDB();
            const user = await User.findOne({ identifier: session.identifier }).lean();
            if (user?.displayName) displayName = user.displayName;

            const room = await CommunityRoom.findOne({ slug: roomSlug });
            if (!room) {
                return NextResponse.json({ error: "Room not found." }, { status: 404 });
            }
            if (room.type === "dm") {
                const members = (room.members || []).map((m) => m.toLowerCase());
                if (!members.includes(session.identifier.toLowerCase())) {
                    return NextResponse.json({ error: "Not a member of this DM." }, { status: 403 });
                }
            }

            const msg = await CommunityMessage.create({
                roomSlug,
                senderId: session.identifier.toLowerCase(),
                senderName: displayName,
                body: clean,
            });

            memTouchPresence({
                identifier: session.identifier,
                displayName,
                lastSeen: Date.now(),
                roomSlug,
            });

            return NextResponse.json({
                message: {
                    id: String(msg._id),
                    roomSlug: msg.roomSlug,
                    senderId: msg.senderId,
                    senderName: msg.senderName,
                    body: msg.body,
                    createdAt: msg.createdAt,
                },
                source: "mongo",
            });
        } catch {
            const msg = memPostMessage({
                roomSlug,
                senderId: session.identifier.toLowerCase(),
                senderName: displayName,
                body: clean,
            });
            memTouchPresence({
                identifier: session.identifier,
                displayName,
                lastSeen: Date.now(),
                roomSlug,
            });
            return NextResponse.json({ message: msg, source: "memory" });
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to send message";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
