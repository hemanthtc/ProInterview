/**
 * Ephemeral in-memory community store used when MongoDB is unavailable
 * (local demos / cold starts). Data resets on server restart.
 */

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
    seeded: boolean;
};

const g = globalThis as unknown as { __proCommunityStore?: Store };

function store(): Store {
    if (!g.__proCommunityStore) {
        g.__proCommunityStore = {
            rooms: [],
            messages: [],
            presence: new Map(),
            seeded: false,
        };
    }
    return g.__proCommunityStore;
}

export function memSeedChannels(
    defaults: { slug: string; name: string; description: string }[]
) {
    const s = store();
    if (s.seeded && s.rooms.some((r) => r.type === "channel")) return;
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
}) {
    const s = store();
    const msg: MemMessage = {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        roomSlug: input.roomSlug,
        senderId: input.senderId,
        senderName: input.senderName,
        body: input.body,
        createdAt: new Date().toISOString(),
    };
    s.messages.push(msg);
    if (s.messages.length > 5000) s.messages.splice(0, s.messages.length - 4000);
    return msg;
}

export function memTouchPresence(p: Presence) {
    const s = store();
    s.presence.set(p.identifier.toLowerCase(), { ...p, lastSeen: Date.now() });
}

export function memOnline(withinMs = 45_000) {
    const s = store();
    const now = Date.now();
    return Array.from(s.presence.values())
        .filter((p) => now - p.lastSeen <= withinMs)
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
