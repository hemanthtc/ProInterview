/**
 * Ephemeral in-memory community store used when MongoDB is unavailable
 * (local demos / cold starts). Data resets on server restart.
 */

import { isDefaultChannelSlug, isDmSlug } from "@/utils/community";

export type MemRoom = {
    slug: string;
    name: string;
    description: string;
    type: "channel" | "dm";
    members: string[];
    createdBy?: string;
    createdAt: string;
};

export type MemMessage = {
    id: string;
    roomSlug: string;
    senderId: string;
    senderName: string;
    body: string;
    replyToId?: string;
    replyToMessage?: {
        body: string;
        senderName: string;
        attachmentType?: string;
    };
    attachmentUrl?: string;
    attachmentType?: string;
    createdAt: string;
};

export type Presence = {
    identifier: string;
    displayName: string;
    lastSeen: number;
    roomSlug?: string;
};

type Store = {
    rooms: MemRoom[];
    messages: MemMessage[];
    presence: Map<string, Presence>;
    /** publicId -> identifier for resolving DM peers without leaking emails */
    publicIdIndex: Map<string, string>;
    seeded: boolean;
};

const g = globalThis as unknown as { __proCommunityStore?: Store };

function store(): Store {
    if (!g.__proCommunityStore) {
        g.__proCommunityStore = {
            rooms: [],
            messages: [],
            presence: new Map(),
            publicIdIndex: new Map(),
            seeded: false,
        };
    }
    // Backfill for hot-reload if an older store shape is still in memory
    if (!g.__proCommunityStore.publicIdIndex) {
        g.__proCommunityStore.publicIdIndex = new Map();
    }
    return g.__proCommunityStore;
}

export function memSeedChannels(
    defaults: { slug: string; name: string; description: string }[]
) {
    const s = store();
    for (const d of defaults) {
        if (!s.rooms.find((r) => r.slug === d.slug)) {
            s.rooms.push({
                ...d,
                type: "channel",
                members: [],
                createdAt: new Date().toISOString(),
            });
        }
    }
    s.seeded = true;
}

export function memFindRoom(slug: string): MemRoom | undefined {
    return store().rooms.find((r) => r.slug === slug);
}

/** Whether identifier may read/write this room in the memory store. */
export function memCanAccessRoom(slug: string, identifier: string): boolean {
    const id = identifier.toLowerCase();
    const room = memFindRoom(slug);
    if (room) {
        if (room.type === "channel") return true;
        return room.members.includes(id);
    }
    // Unknown slug: allow only known public default channels; never invent DM access.
    if (isDmSlug(slug)) return false;
    return isDefaultChannelSlug(slug);
}

export function memListRooms(identifier?: string) {
    const s = store();
    return s.rooms.filter(
        (r) => r.type === "channel" || (identifier && r.members.includes(identifier.toLowerCase()))
    );
}

export function memUpsertDm(slug: string, name: string, members: string[], createdBy: string) {
    const s = store();
    let room = s.rooms.find((r) => r.slug === slug);
    if (!room) {
        room = {
            slug,
            name,
            description: "Direct message",
            type: "dm",
            members: members.map((m) => m.toLowerCase()),
            createdBy,
            createdAt: new Date().toISOString(),
        };
        s.rooms.push(room);
    }
    return room;
}

export function memGetMessages(roomSlug: string, after?: string, limit = 80) {
    const s = store();
    let list = s.messages.filter((m) => m.roomSlug === roomSlug);
    if (after) {
        const t = Date.parse(after);
        if (!Number.isNaN(t)) list = list.filter((m) => Date.parse(m.createdAt) > t);
    }
    return list.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)).slice(-limit);
}

export function memPostMessage(input: {
    roomSlug: string;
    senderId: string;
    senderName: string;
    body: string;
    replyToId?: string;
    replyToMessage?: { body: string; senderName: string; attachmentType?: string };
    attachmentUrl?: string;
    attachmentType?: string;
}) {
    const s = store();
    const msg: MemMessage = {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        roomSlug: input.roomSlug,
        senderId: input.senderId,
        senderName: input.senderName,
        body: input.body,
        replyToId: input.replyToId,
        replyToMessage: input.replyToMessage,
        attachmentUrl: input.attachmentUrl,
        attachmentType: input.attachmentType,
        createdAt: new Date().toISOString(),
    };
    s.messages.push(msg);
    if (s.messages.length > 5000) s.messages.splice(0, s.messages.length - 4000);
    return msg;
}

export function memTouchPresence(p: Presence, publicId: string) {
    const s = store();
    const id = p.identifier.toLowerCase();
    s.presence.set(id, { ...p, identifier: id, lastSeen: Date.now() });
    s.publicIdIndex.set(publicId, id);
}

export function memResolvePublicId(publicId: string): string | undefined {
    return store().publicIdIndex.get(publicId);
}

export function memOnline(withinMs = 45_000) {
    const s = store();
    const now = Date.now();
    return Array.from(s.presence.values())
        .filter((p) => now - p.lastSeen <= withinMs)
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function memDeleteMessages(messageIds: string[], senderId: string, isAdmin = false): boolean {
    const s = store();
    const cleanSender = senderId.toLowerCase();
    const beforeCount = s.messages.length;
    s.messages = s.messages.filter(m => {
        const isTarget = messageIds.includes(m.id);
        const isOwner = m.senderId.toLowerCase() === cleanSender;
        return !(isTarget && (isOwner || isAdmin));
    });
    return s.messages.length < beforeCount;
}

export function memPruneExpiredAttachments(roomSlug: string, limitMs: number) {
    const s = store();
    const now = Date.now();
    s.messages.forEach(m => {
        if (m.roomSlug === roomSlug && m.attachmentUrl && now - Date.parse(m.createdAt) > limitMs) {
            m.attachmentUrl = undefined;
            m.attachmentType = undefined;
        }
    });
}

/** Test helper — clear ephemeral store between unit tests. */
export function memResetForTests() {
    g.__proCommunityStore = {
        rooms: [],
        messages: [],
        presence: new Map(),
        publicIdIndex: new Map(),
        seeded: false,
    };
}
