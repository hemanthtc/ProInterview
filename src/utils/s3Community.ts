import { uploadJSON, getJSON } from "@/utils/s3";
export { isS3Configured } from "@/utils/s3";
import { DEFAULT_COMMUNITY_CHANNELS } from "@/utils/community";

export type S3Room = {
    slug: string;
    name: string;
    description: string;
    type: "channel" | "dm";
    members: string[]; // lowercase identifiers
    createdBy?: string;
    createdAt: string;
};

export type S3Message = {
    id: string;
    roomSlug: string;
    senderId: string;
    senderName: string;
    body: string;
    createdAt: string;
    likes?: string[]; // array of user publicIds
};

const ROOMS_KEY = "community/rooms.json";

export async function s3GetRooms(): Promise<S3Room[]> {
    try {
        return await getJSON<S3Room[]>(ROOMS_KEY);
    } catch {
        // Seeding default channels if key doesn't exist
        const initialRooms: S3Room[] = DEFAULT_COMMUNITY_CHANNELS.map(ch => ({
            slug: ch.slug,
            name: ch.name,
            description: ch.description,
            type: "channel" as const,
            members: [],
            createdAt: new Date().toISOString()
        }));
        try {
            await uploadJSON(ROOMS_KEY, initialRooms);
        } catch (e) {
            console.error("Failed to upload seed rooms to S3", e);
        }
        return initialRooms;
    }
}

export async function s3UpsertDm(slug: string, name: string, members: string[], createdBy: string): Promise<S3Room> {
    const rooms = await s3GetRooms();
    let room = rooms.find(r => r.slug === slug);
    if (!room) {
        room = {
            slug,
            name,
            description: "Direct message",
            type: "dm",
            members: members.map(m => m.toLowerCase()),
            createdBy,
            createdAt: new Date().toISOString()
        };
        rooms.push(room);
        await uploadJSON(ROOMS_KEY, rooms);
    }
    return room;
}

export async function s3GetMessages(roomSlug: string): Promise<S3Message[]> {
    const key = `community/messages/${roomSlug}.json`;
    try {
        return await getJSON<S3Message[]>(key);
    } catch {
        return [];
    }
}

export async function s3PostMessage(roomSlug: string, message: Omit<S3Message, "id" | "createdAt">): Promise<S3Message> {
    const key = `community/messages/${roomSlug}.json`;
    let messages = await s3GetMessages(roomSlug);

    // 1. Filter out messages older than 7 days
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    messages = messages.filter(m => Date.parse(m.createdAt) > oneWeekAgo);

    // 2. If messages exceed 5000, slice off the oldest 1000 messages
    if (messages.length > 5000) {
        messages = messages.slice(messages.length - 4000);
    }

    // 3. Append the new message
    const newMsg: S3Message = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        roomSlug,
        createdAt: new Date().toISOString()
    };
    messages.push(newMsg);

    await uploadJSON(key, messages);
    return newMsg;
}

export async function s3GetReadReceipts(roomSlug: string): Promise<Record<string, string>> {
    const key = `community/read_receipts/${roomSlug}.json`;
    try {
        return await getJSON<Record<string, string>>(key);
    } catch {
        return {};
    }
}

export async function s3UpdateReadReceipt(roomSlug: string, userIdentifier: string): Promise<void> {
    const key = `community/read_receipts/${roomSlug}.json`;
    try {
        const receipts = await s3GetReadReceipts(roomSlug);
        receipts[userIdentifier.toLowerCase()] = new Date().toISOString();
        await uploadJSON(key, receipts);
    } catch (e) {
        console.error("Failed to update read receipt in S3", e);
    }
}

export async function s3LikeMessage(roomSlug: string, messageId: string, userPublicId: string): Promise<boolean> {
    const key = `community/messages/${roomSlug}.json`;
    try {
        const messages = await s3GetMessages(roomSlug);
        const msg = messages.find(m => m.id === messageId);
        if (!msg) return false;

        if (!msg.likes) {
            msg.likes = [];
        }

        const idx = msg.likes.indexOf(userPublicId);
        if (idx >= 0) {
            msg.likes.splice(idx, 1); // Unlike
        } else {
            msg.likes.push(userPublicId); // Like
        }

        await uploadJSON(key, messages);
        return true;
    } catch (e) {
        console.error("Failed to toggle like in S3", e);
        return false;
    }
}

export async function s3DeleteMessages(roomSlug: string, messageIds: string[], senderId: string): Promise<boolean> {
    const key = `community/messages/${roomSlug}.json`;
    try {
        const messages = await s3GetMessages(roomSlug);
        const nextMessages = messages.filter(m => {
            const isTarget = messageIds.includes(m.id);
            const isOwner = m.senderId.toLowerCase() === senderId.toLowerCase();
            return !(isTarget && isOwner);
        });
        if (messages.length === nextMessages.length) return false;

        await uploadJSON(key, nextMessages);
        return true;
    } catch (e) {
        console.error("Failed to delete messages in S3", e);
        return false;
    }
}
