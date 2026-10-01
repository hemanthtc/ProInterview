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
    memDeleteMessages,
    memPruneExpiredAttachments,
} from "@/utils/communityStore";
import { rateLimit } from "@/utils/rateLimit";
import User from "@/models/User";
import {
    isS3Configured,
    s3GetRooms,
    s3GetMessages,
    s3PostMessage,
    s3GetReadReceipts,
    s3UpdateReadReceipt,
    s3DeleteMessages,
} from "@/utils/s3Community";
import { deleteObject, uploadJSON, createPresignedDownloadUrl } from "@/utils/s3";

function mapMessage(
    m: {
        id?: string;
        _id?: unknown;
        roomSlug: string;
        senderId: string;
        senderName: string;
        body: string;
        replyToId?: string;
        replyToMessage?: { body: string; senderName: string; attachmentType?: string };
        attachmentUrl?: string;
        attachmentType?: string;
        createdAt: Date | string;
        likes?: string[];
    },
    viewerId: string,
    receipts?: Record<string, string>
) {
    const senderId = String(m.senderId).toLowerCase();
    const mine = senderId === viewerId.toLowerCase();
    const createdAtStr = typeof m.createdAt === "string" ? m.createdAt : m.createdAt.toISOString();
    
    // Read status: true if any other user's read timestamp is >= message creation time
    const read = receipts
        ? Object.entries(receipts).some(([email, lastRead]) => email !== senderId && lastRead >= createdAtStr)
        : false;

    return {
        id: m.id || String(m._id),
        roomSlug: m.roomSlug,
        senderPublicId: presencePublicId(senderId),
        senderName: m.senderName,
        body: m.body,
        replyToId: m.replyToId,
        replyToMessage: m.replyToMessage,
        attachmentUrl: m.attachmentUrl,
        attachmentType: m.attachmentType,
        createdAt: createdAtStr,
        mine,
        delivered: true,
        read,
        likes: m.likes || [],
    };
}

async function resolveAttachmentUrls(messages: any[]) {
    if (!isS3Configured()) return messages;
    for (const m of messages) {
        await resolveAttachmentUrlSingle(m);
    }
    return messages;
}

async function resolveAttachmentUrlSingle(m: any) {
    if (!m || !isS3Configured()) return m;
    if (m.attachmentUrl) {
        const url = m.attachmentUrl;
        if (url.startsWith("data:")) return m;
        const keyIndex = url.indexOf("community/") !== -1 ? url.indexOf("community/") : url.indexOf("feedback/");
        if (keyIndex !== -1) {
            const key = url.substring(keyIndex);
            try {
                m.attachmentUrl = await createPresignedDownloadUrl(key, 48 * 3600);
            } catch (err) {
                console.warn(`Failed to sign key ${key}:`, err);
            }
        }
    }
    return m;
}

async function assertRoomAccess(roomSlug: string, identifier: string): Promise<
    | { ok: true; source: "s3" | "mongo" | "memory"; roomType: "channel" | "dm" }
    | { ok: false; status: number; error: string }
> {
    const cleanId = identifier.toLowerCase();

    // 1. AWS S3 Access Check
    if (isS3Configured()) {
        try {
            const s3Rooms = await s3GetRooms();
            const room = s3Rooms.find((r) => r.slug === roomSlug);
            if (!room) {
                if (isDefaultChannelSlug(roomSlug)) {
                    return { ok: true, source: "s3", roomType: "channel" };
                }
                return { ok: false, status: 404, error: "Room not found." };
            }
            if (room.type === "dm") {
                const members = (room.members || []).map((m) => m.toLowerCase());
                if (!members.includes(cleanId)) {
                    return { ok: false, status: 403, error: "Not a member of this DM." };
                }
            }
            return { ok: true, source: "s3", roomType: room.type };
        } catch (err) {
            console.error("S3 assertRoomAccess failed, falling back:", err);
        }
    }

    // 2. MongoDB Fallback
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
            if (!members.includes(cleanId)) {
                return { ok: false, status: 403, error: "Not a member of this DM." };
            }
        }
        return { ok: true, source: "mongo", roomType: room.type };
    } catch {
        memSeedChannels([...DEFAULT_COMMUNITY_CHANNELS]);
        if (!memCanAccessRoom(roomSlug, identifier)) {
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

async function pruneExpiredAttachments(roomSlug: string, source: string) {
    try {
        const now = Date.now();
        const limitHours = roomSlug === "general" ? 24 : 48;
        const limitMs = limitHours * 60 * 60 * 1000;

        if (source === "s3") {
            const rawMessages = await s3GetMessages(roomSlug);
            let changed = false;
            for (const m of rawMessages) {
                if (m.attachmentUrl && now - Date.parse(m.createdAt) > limitMs) {
                    const url = m.attachmentUrl;
                    const keyIndex = url.indexOf("community/") !== -1 ? url.indexOf("community/") : url.indexOf("feedback/");
                    if (keyIndex !== -1) {
                        const key = url.substring(keyIndex);
                        try {
                            await deleteObject(key);
                        } catch (s3Err) {
                            console.warn(`S3 prune failed for key ${key}:`, s3Err);
                        }
                    }
                    m.attachmentUrl = undefined;
                    m.attachmentType = undefined;
                    changed = true;
                }
            }
            if (changed) {
                const key = `community/messages/${roomSlug}.json`;
                await uploadJSON(key, rawMessages);
            }
        } else if (source === "mongo") {
            await connectDB();
            const expiredDate = new Date(now - limitMs);
            const expiredMsgs = await CommunityMessage.find({
                roomSlug,
                attachmentUrl: { $ne: null },
                createdAt: { $lt: expiredDate },
            }).lean();

            if (expiredMsgs.length > 0) {
                for (const m of expiredMsgs) {
                    if (m.attachmentUrl) {
                        const url = m.attachmentUrl;
                        const keyIndex = url.indexOf("community/") !== -1 ? url.indexOf("community/") : url.indexOf("feedback/");
                        if (keyIndex !== -1) {
                            const key = url.substring(keyIndex);
                            try {
                                await deleteObject(key);
                            } catch (s3Err) {
                                console.warn(`S3 prune failed for key ${key}:`, s3Err);
                            }
                        }
                    }
                }
                await CommunityMessage.updateMany(
                    {
                        roomSlug,
                        attachmentUrl: { $ne: null },
                        createdAt: { $lt: expiredDate },
                    },
                    {
                        $unset: { attachmentUrl: "", attachmentType: "" },
                    }
                );
            }
        } else if (source === "memory") {
            memPruneExpiredAttachments(roomSlug, limitMs);
        }
    } catch (err) {
        console.error("Prune expired attachments failed:", err);
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
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

        void pruneExpiredAttachments(roomSlug, access.source);

        let displayName = sanitizeDisplayName(session.identifier.split("@")[0] || "Student");
        try {
            if (access.source === "mongo") {
                const user = await User.findOne({ identifier: session.identifier }).lean();
                if (user?.displayName) displayName = sanitizeDisplayName(user.displayName);
            }
        } catch { /* ignore */ }

        memTouchPresence(
            {
                identifier: session.identifier,
                displayName,
                lastSeen: Date.now(),
                roomSlug,
            },
            presencePublicId(session.identifier)
        );

        // 1. AWS S3 Path
        if (access.source === "s3") {
            // Update read receipts presence first
            await s3UpdateReadReceipt(roomSlug, session.identifier);

            const rawMessages = await s3GetMessages(roomSlug);
            const receipts = await s3GetReadReceipts(roomSlug);

            let list = rawMessages;
            if (after) {
                const afterTime = Date.parse(after);
                if (!Number.isNaN(afterTime)) {
                    list = list.filter((m) => Date.parse(m.createdAt) > afterTime);
                }
            }

            const messages = list
                .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
                .slice(-limit)
                .map((m) => mapMessage(m, session.identifier, receipts));

            await resolveAttachmentUrls(messages);
            return NextResponse.json({ messages, source: "s3" });
        }

        // 2. Memory Fallback
        if (access.source === "memory") {
            const messages = memGetMessages(roomSlug, after, limit).map((m) =>
                mapMessage(m, session.identifier)
            );
            await resolveAttachmentUrls(messages);
            return NextResponse.json({ messages, source: "memory" });
        }

        // 3. MongoDB Fallback
        const filter: Record<string, unknown> = { roomSlug };
        if (after) {
            const t = new Date(after);
            if (!Number.isNaN(t.getTime())) filter.createdAt = { $gt: t };
        }

        const messages = await CommunityMessage.find(filter).sort({ createdAt: 1 }).limit(limit).lean();
        const mapped = messages.map((m) => mapMessage(m, session.identifier));
        await resolveAttachmentUrls(mapped);

        return NextResponse.json({
            messages: mapped,
            source: "mongo",
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load messages";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
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

        const { roomSlug, body, replyToId, replyToMessage, attachmentUrl, attachmentType } = await req.json();
        if (!roomSlug || typeof roomSlug !== "string") {
            return NextResponse.json({ error: "roomSlug is required" }, { status: 400 });
        }

        // Admin-only reply check for feedback
        if (roomSlug === "feedback" && replyToId) {
            const isAdminOrEmployee = session.role === "admin" || session.role === "employee";
            if (!isAdminOrEmployee) {
                return NextResponse.json({ error: "Only administrators and employees can reply to feedback." }, { status: 403 });
            }
        }

        const clean = sanitizeChatBody(body);
        if (!clean && !attachmentUrl) {
            return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
        }

        const access = await assertRoomAccess(roomSlug, session.identifier);
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        let displayName = sanitizeDisplayName(session.identifier.split("@")[0] || "Student");

        // 1. AWS S3 Path
        if (access.source === "s3") {
            try {
                await connectDB();
                const user = await User.findOne({ identifier: session.identifier }).lean();
                if (user?.displayName) displayName = sanitizeDisplayName(user.displayName);
            } catch { /* offline DB / fallback displayPeer */ }

            const msg = await s3PostMessage(roomSlug, {
                roomSlug,
                senderId: session.identifier.toLowerCase(),
                senderName: displayName,
                body: clean,
                replyToId,
                replyToMessage,
                attachmentUrl,
                attachmentType,
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

            // Fetch receipts to get read/tick states right away
            const receipts = await s3GetReadReceipts(roomSlug);

            const mapped = mapMessage(msg, session.identifier, receipts);
            await resolveAttachmentUrlSingle(mapped);

            return NextResponse.json({
                message: mapped,
                source: "s3",
            });
        }

        // 2. MongoDB Path
        if (access.source === "mongo") {
            try {
                const user = await User.findOne({ identifier: session.identifier }).lean();
                if (user?.displayName) displayName = sanitizeDisplayName(user.displayName);

                const msg = await CommunityMessage.create({
                    roomSlug,
                    senderId: session.identifier.toLowerCase(),
                    senderName: displayName,
                    body: clean,
                    replyToId,
                    replyToMessage,
                    attachmentUrl,
                    attachmentType,
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

                const mapped = mapMessage(
                    {
                        id: String(msg._id),
                        roomSlug: msg.roomSlug,
                        senderId: msg.senderId,
                        senderName: msg.senderName,
                        body: msg.body,
                        replyToId: msg.replyToId,
                        replyToMessage: msg.replyToMessage,
                        attachmentUrl: msg.attachmentUrl,
                        attachmentType: msg.attachmentType,
                        createdAt: msg.createdAt,
                    },
                    session.identifier
                );
                await resolveAttachmentUrlSingle(mapped);

                return NextResponse.json({
                    message: mapped,
                    source: "mongo",
                });
            } catch (err) {
                if (access.roomType === "dm" || isDmSlug(roomSlug)) {
                    const message = err instanceof Error ? err.message : "Failed to send message";
                    return NextResponse.json({ error: message }, { status: 503 });
                }
            }
        }

        // 3. Memory Path
        if (access.roomType === "dm" || isDmSlug(roomSlug)) {
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
            replyToId,
            replyToMessage,
            attachmentUrl,
            attachmentType,
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
        const mapped = mapMessage(msg, session.identifier);
        await resolveAttachmentUrlSingle(mapped);
        return NextResponse.json({
            message: mapped,
            source: "memory",
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to send message";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Sign in to delete messages." }, { status: 401 });
        }

        const { roomSlug, messageId, messageIds } = await req.json();
        const ids = Array.isArray(messageIds) ? messageIds : messageId ? [messageId] : [];
        if (!roomSlug || ids.length === 0) {
            return NextResponse.json({ error: "roomSlug and messageId(s) are required" }, { status: 400 });
        }

        const senderId = session.identifier.toLowerCase();
        const isAdmin = session.role === "admin" || (session as any).isAdmin === true;

        // 1. AWS S3 Check
        if (isS3Configured()) {
            const success = await s3DeleteMessages(roomSlug, ids, senderId, isAdmin);
            if (success) {
                return NextResponse.json({ success: true });
            }
            return NextResponse.json({ error: "Messages not found or insufficient permissions to delete." }, { status: 403 });
        }

        // 2. MongoDB Fallback
        try {
            await connectDB();
            const filter: any = { _id: { $in: ids } };
            if (!isAdmin) {
                filter.senderId = senderId;
            }
            const res = await CommunityMessage.deleteMany(filter);
            if (res.deletedCount && res.deletedCount > 0) {
                return NextResponse.json({ success: true });
            }
        } catch (err) {
            // fallback to memory
        }

        // 3. Memory store fallback
        const success = memDeleteMessages(ids, senderId, isAdmin);
        if (success) {
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Messages not found or insufficient permissions to delete." }, { status: 403 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to delete message";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
