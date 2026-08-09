"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Hash,
    Loader2,
    MessageCircle,
    Send,
    Users,
    ArrowLeft,
    Circle,
} from "lucide-react";
import { getStorageItem } from "../../utils/storage";

type Room = {
    slug: string;
    name: string;
    description?: string;
    type: "channel" | "dm";
    memberPublicIds?: string[];
};

type ChatMessage = {
    id: string;
    roomSlug: string;
    senderPublicId: string;
    senderName: string;
    body: string;
    createdAt: string;
    mine?: boolean;
};

type OnlineUser = {
    publicId: string;
    displayName: string;
    roomSlug?: string | null;
    isSelf?: boolean;
};

function formatTime(iso: string) {
    try {
        return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "";
    }
}

function initials(name: string) {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || "")
        .join("") || "?";
}

export default function CommunityPage() {
    const router = useRouter();
    const [ready, setReady] = useState(false);
    const [mePublicId, setMePublicId] = useState("");
    const [rooms, setRooms] = useState<Room[]>([]);
    const [activeSlug, setActiveSlug] = useState("general");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [online, setOnline] = useState<OnlineUser[]>([]);
    const [draft, setDraft] = useState("");
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [source, setSource] = useState<"mongo" | "memory" | "">("");
    const [mobileShowSidebar, setMobileShowSidebar] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);
    const lastStampRef = useRef<string>("");

    const activeRoom = useMemo(
        () => rooms.find((r) => r.slug === activeSlug) || rooms[0],
        [rooms, activeSlug]
    );

    useEffect(() => {
        const loggedIn = getStorageItem("userLoggedIn") === "true";
        if (!loggedIn) {
            router.push("/login");
            return;
        }
        setReady(true);
    }, [router]);

    const loadRooms = useCallback(async () => {
        setLoadingRooms(true);
        try {
            const res = await fetch("/api/community/rooms");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load rooms");
            const nextRooms: Room[] = data.rooms || [];
            setRooms(nextRooms);
            setSource(data.source || "");
            setActiveSlug((prev) => {
                if (nextRooms.some((r) => r.slug === prev)) return prev;
                return nextRooms[0]?.slug || "general";
            });
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load rooms");
        } finally {
            setLoadingRooms(false);
        }
    }, []);

    const loadMessages = useCallback(
        async (opts?: { incremental?: boolean }) => {
            if (!activeSlug) return;
            try {
                const after = opts?.incremental ? lastStampRef.current : "";
                const qs = new URLSearchParams({ room: activeSlug, limit: "100" });
                if (after) qs.set("after", after);
                const res = await fetch(`/api/community/messages?${qs.toString()}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to load chat");
                const incoming: ChatMessage[] = data.messages || [];
                if (!opts?.incremental) {
                    setMessages(incoming);
                } else if (incoming.length) {
                    setMessages((prev) => {
                        const ids = new Set(prev.map((m) => m.id));
                        const merged = [...prev];
                        for (const m of incoming) {
                            if (!ids.has(m.id)) merged.push(m);
                        }
                        return merged;
                    });
                }
                if (incoming.length) {
                    lastStampRef.current = incoming[incoming.length - 1].createdAt;
                } else if (!opts?.incremental) {
                    lastStampRef.current = "";
                }
                if (data.source) setSource(data.source);
                setError("");
            } catch (e: unknown) {
                if (!opts?.incremental) {
                    setError(e instanceof Error ? e.message : "Chat unavailable");
                }
            }
        },
        [activeSlug]
    );

    const loadPresence = useCallback(async () => {
        try {
            await fetch("/api/community/presence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomSlug: activeSlug }),
            });
            const res = await fetch("/api/community/presence");
            const data = await res.json();
            if (res.ok) {
                if (data.me?.publicId) setMePublicId(data.me.publicId);
                setOnline(data.online || []);
            }
        } catch {
            /* ignore */
        }
    }, [activeSlug]);

    useEffect(() => {
        if (!ready) return;
        void loadRooms();
    }, [ready, loadRooms]);

    useEffect(() => {
        if (!ready || !activeSlug) return;
        lastStampRef.current = "";
        setMessages([]);
        void loadMessages({ incremental: false });
        void loadPresence();
        const poll = window.setInterval(() => {
            void loadMessages({ incremental: true });
            void loadPresence();
        }, 4000);
        return () => window.clearInterval(poll);
    }, [ready, activeSlug, loadMessages, loadPresence]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length, activeSlug]);

    async function sendMessage(e?: React.FormEvent) {
        e?.preventDefault();
        if (!draft.trim() || sending) return;
        setSending(true);
        setError("");
        const body = draft.trim();
        setDraft("");
        try {
            const res = await fetch("/api/community/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomSlug: activeSlug, body }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send");
            if (data.message) {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === data.message.id)) return prev;
                    return [...prev, data.message];
                });
                lastStampRef.current = data.message.createdAt;
            }
        } catch (err: unknown) {
            setDraft(body);
            setError(err instanceof Error ? err.message : "Send failed");
        } finally {
            setSending(false);
        }
    }

    async function openDm(user: OnlineUser) {
        if (!user.publicId || user.isSelf || user.publicId === mePublicId) return;
        try {
            const res = await fetch("/api/community/rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ peerPublicId: user.publicId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not open DM");
            await loadRooms();
            if (data.room?.slug) {
                setActiveSlug(data.room.slug);
                setMobileShowSidebar(false);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "DM failed");
        }
    }

    if (!ready) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
        );
    }

    const channels = rooms.filter((r) => r.type === "channel");
    const dms = rooms.filter((r) => r.type === "dm");

    return (
        <div className="h-[100dvh] bg-slate-950 text-white flex flex-col">
            <header className="shrink-0 border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3 bg-slate-950/90 backdrop-blur">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/" className="text-white/50 hover:text-white shrink-0" aria-label="Back home">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-widest text-indigo-300/80 flex items-center gap-1.5">
                            <MessageCircle className="w-3.5 h-3.5" /> Community
                        </p>
                        <h1 className="font-semibold truncate">
                            {activeRoom ? (activeRoom.type === "channel" ? `# ${activeRoom.name}` : activeRoom.name) : "Student chat"}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {source === "memory" && (
                        <span className="hidden sm:inline text-[10px] rounded-full border border-amber-400/30 text-amber-200/80 px-2 py-0.5">
                            Live demo mode
                        </span>
                    )}
                    <button
                        type="button"
                        className="md:hidden rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/70"
                        onClick={() => setMobileShowSidebar((v) => !v)}
                    >
                        {mobileShowSidebar ? "Chat" : "Rooms"}
                    </button>
                    <Link href="/labs" className="hidden sm:inline text-xs text-white/50 hover:text-white">
                        Labs
                    </Link>
                </div>
            </header>

            <div className="flex-1 min-h-0 grid md:grid-cols-[240px_1fr_200px]">
                {/* Rooms */}
                <aside
                    className={`${
                        mobileShowSidebar ? "flex" : "hidden"
                    } md:flex flex-col border-r border-white/10 bg-black/20 overflow-y-auto`}
                >
                    <div className="p-3">
                        <p className="text-[10px] uppercase tracking-wide text-white/40 mb-2 px-1">Channels</p>
                        {loadingRooms ? (
                            <div className="flex justify-center py-6">
                                <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {channels.map((room) => (
                                    <button
                                        key={room.slug}
                                        type="button"
                                        onClick={() => {
                                            setActiveSlug(room.slug);
                                            setMobileShowSidebar(false);
                                        }}
                                        className={`w-full text-left rounded-lg px-2.5 py-2 text-sm flex items-center gap-2 ${
                                            activeSlug === room.slug
                                                ? "bg-indigo-500/25 text-white"
                                                : "text-white/60 hover:bg-white/5 hover:text-white"
                                        }`}
                                    >
                                        <Hash className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                        <span className="truncate">{room.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {dms.length > 0 && (
                            <>
                                <p className="text-[10px] uppercase tracking-wide text-white/40 mt-4 mb-2 px-1">Direct messages</p>
                                <div className="space-y-0.5">
                                    {dms.map((room) => (
                                        <button
                                            key={room.slug}
                                            type="button"
                                            onClick={() => {
                                                setActiveSlug(room.slug);
                                                setMobileShowSidebar(false);
                                            }}
                                            className={`w-full text-left rounded-lg px-2.5 py-2 text-sm truncate ${
                                                activeSlug === room.slug
                                                    ? "bg-indigo-500/25 text-white"
                                                    : "text-white/60 hover:bg-white/5 hover:text-white"
                                            }`}
                                        >
                                            {room.name}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </aside>

                {/* Messages */}
                <section
                    className={`${
                        mobileShowSidebar ? "hidden" : "flex"
                    } md:flex flex-col min-h-0 bg-gradient-to-b from-slate-950 to-[#0a0a12]`}
                >
                    {activeRoom?.description && (
                        <div className="px-4 py-2 border-b border-white/5 text-xs text-white/45">{activeRoom.description}</div>
                    )}

                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                        {messages.length === 0 && (
                            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center text-white/40 text-sm gap-2">
                                <Users className="w-8 h-8 opacity-40" />
                                <p>No messages yet — be the first to say hi.</p>
                            </div>
                        )}
                        {messages.map((m) => {
                            const mine = Boolean(m.mine) || m.senderPublicId === mePublicId;
                            return (
                                <div key={m.id} className={`flex gap-3 ${mine ? "justify-end" : "justify-start"}`}>
                                    {!mine && (
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/30 border border-indigo-400/20 flex items-center justify-center text-[10px] font-bold text-indigo-100 shrink-0">
                                            {initials(m.senderName)}
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm ${
                                            mine
                                                ? "bg-indigo-600 text-white rounded-br-md"
                                                : "bg-white/5 border border-white/10 text-white/90 rounded-bl-md"
                                        }`}
                                    >
                                        {!mine && (
                                            <div className="text-[10px] font-semibold text-indigo-300/90 mb-0.5">{m.senderName}</div>
                                        )}
                                        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                                        <div className={`text-[10px] mt-1 ${mine ? "text-white/60" : "text-white/35"}`}>
                                            {formatTime(m.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>

                    <form onSubmit={(e) => void sendMessage(e)} className="shrink-0 border-t border-white/10 p-3 bg-black/30">
                        {error && <p className="text-rose-300 text-xs mb-2 px-1">{error}</p>}
                        <div className="flex gap-2">
                            <input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                placeholder={`Message ${activeRoom?.type === "channel" ? "#" : ""}${activeRoom?.name || "channel"}…`}
                                maxLength={2000}
                                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50"
                            />
                            <button
                                type="submit"
                                disabled={sending || !draft.trim()}
                                className="rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 px-4 py-2.5"
                                aria-label="Send"
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Online */}
                <aside className="hidden md:flex flex-col border-l border-white/10 bg-black/20 overflow-y-auto">
                    <div className="p-3">
                        <p className="text-[10px] uppercase tracking-wide text-white/40 mb-2 px-1 flex items-center gap-1">
                            <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" /> Online · {online.length}
                        </p>
                        <div className="space-y-1">
                            {online.length === 0 && (
                                <p className="text-xs text-white/35 px-1 py-2">No one else here yet.</p>
                            )}
                            {online.map((u) => {
                                const isMe = Boolean(u.isSelf) || u.publicId === mePublicId;
                                return (
                                    <button
                                        key={u.publicId}
                                        type="button"
                                        disabled={isMe}
                                        onClick={() => void openDm(u)}
                                        title={isMe ? "You" : `Message ${u.displayName}`}
                                        className={`w-full text-left rounded-lg px-2 py-2 flex items-center gap-2 ${
                                            isMe ? "opacity-70 cursor-default" : "hover:bg-white/5"
                                        }`}
                                    >
                                        <span className="relative">
                                            <span className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center text-[10px] font-bold text-emerald-100">
                                                {initials(u.displayName)}
                                            </span>
                                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-xs font-medium truncate">
                                                {u.displayName}
                                                {isMe ? " (you)" : ""}
                                            </span>
                                            {!isMe && <span className="block text-[10px] text-white/35">Click to DM</span>}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
