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
    Sun,
    Moon,
    Eye,
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
    const authDeadRef = useRef(false);

    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");

    useEffect(() => {
        const savedTheme = localStorage.getItem("prointerview_theme") as "dark" | "light" | "eyeprotect" | null;
        if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTheme(savedTheme);
        }
    }, []);

    const isLight = theme === "light" || theme === "eyeprotect";

    const cycleTheme = () => {
        const next = theme === "dark" ? "light" : theme === "light" ? "eyeprotect" : "dark";
        setTheme(next);
        localStorage.setItem("prointerview_theme", next);
        document.documentElement.classList.remove("theme-dark", "theme-light", "theme-eyeprotect");
        document.documentElement.classList.add(`theme-${next}`);
    };

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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReady(true);
    }, [router]);

    /** Redirect to login on 401 and stop all further polling. */
    const handleAuthExpired = useCallback(() => {
        if (authDeadRef.current) return;
        authDeadRef.current = true;
        try { localStorage.removeItem("userLoggedIn"); } catch { /* ignore */ }
        router.push("/login");
    }, [router]);

    const loadRooms = useCallback(async () => {
        if (authDeadRef.current) return;
        setLoadingRooms(true);
        try {
            const res = await fetch("/api/community/rooms");
            if (res.status === 401) {
                handleAuthExpired();
                return;
            }
            if (!res.ok) throw new Error("Failed to fetch rooms");
            const data = await res.json();
            setRooms(data.rooms || []);
            setMePublicId(data.mePublicId || "");
            setSource(data.source || "");
        } catch {
            setError("Could not load community channels.");
        } finally {
            setLoadingRooms(false);
        }
    }, [handleAuthExpired]);

    const loadMessages = useCallback(async () => {
        if (authDeadRef.current) return;
        try {
            const res = await fetch(`/api/community/messages?room=${encodeURIComponent(activeSlug)}`);
            if (res.status === 401) {
                handleAuthExpired();
                return;
            }
            if (!res.ok) return;
            const data = await res.json();
            setMessages(data.messages || []);
            if (data.messages?.length) {
                const max = data.messages[data.messages.length - 1].createdAt;
                lastStampRef.current = max;
            }
        } catch {
            /* ignore polling errors */
        }
    }, [activeSlug, handleAuthExpired]);

    const loadOnline = useCallback(async () => {
        if (authDeadRef.current) return;
        try {
            const res = await fetch("/api/community/presence");
            if (res.status === 401) {
                handleAuthExpired();
                return;
            }
            if (!res.ok) return;
            const data = await res.json();
            setOnline(data.users || []);
        } catch {
            /* ignore */
        }
    }, [handleAuthExpired]);

    useEffect(() => {
        if (!ready) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadRooms();
    }, [ready, loadRooms]);

    useEffect(() => {
        if (!ready) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadMessages();
        const t = setInterval(() => void loadMessages(), 3000);
        return () => clearInterval(t);
    }, [ready, activeSlug, loadMessages]);

    useEffect(() => {
        if (!ready) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadOnline();
        const t = setInterval(() => void loadOnline(), 6000);
        return () => clearInterval(t);
    }, [ready, loadOnline]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = draft.trim();
        if (!text || sending) return;

        setSending(true);
        setError("");
        try {
            const res = await fetch("/api/community/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomSlug: activeSlug, body: text }),
            });
            if (res.status === 401) {
                handleAuthExpired();
                return;
            }
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || "Failed to send");
            }
            setDraft("");
            await loadMessages();
        } catch (err: any) {
            setError(err.message || "Sending failed");
        } finally {
            setSending(false);
        }
    };

    const openDm = async (user: OnlineUser) => {
        if (user.publicId === mePublicId) return;
        try {
            const res = await fetch("/api/community/rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetPublicId: user.publicId }),
            });
            if (res.status === 401) {
                handleAuthExpired();
                return;
            }
            if (!res.ok) return;
            const data = await res.json();
            if (data.room?.slug) {
                await loadRooms();
                setActiveSlug(data.room.slug);
                setMobileShowSidebar(false);
            }
        } catch {
            /* ignore */
        }
    };

    if (!ready) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${
                theme === "light" ? "bg-slate-100 text-slate-900" : theme === "eyeprotect" ? "bg-[#f3ede3] text-[#1c1917]" : "bg-slate-950 text-white"
            }`}>
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
        );
    }

    const channels = rooms.filter((r) => r.type === "channel");
    const dms = rooms.filter((r) => r.type === "dm");

    return (
        <div className={`h-[100dvh] flex flex-col transition-colors duration-300 ${
            theme === "light"
                ? "bg-slate-100 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-slate-950 text-white"
        }`}>
            <header className={`shrink-0 border-b px-4 py-3 flex items-center justify-between gap-3 backdrop-blur ${
                theme === "light"
                    ? "border-slate-200 bg-white/90 text-slate-900 shadow-sm"
                    : theme === "eyeprotect"
                    ? "border-[#8c8578] bg-[#fffcf5]/90 text-[#1c1917]"
                    : "border-white/10 bg-slate-950/90 text-white"
            }`}>
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/" className={`shrink-0 ${isLight ? "text-slate-500 hover:text-slate-900" : "text-white/50 hover:text-white"}`} aria-label="Back home">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="min-w-0">
                        <p className={`text-[10px] uppercase tracking-widest flex items-center gap-1.5 ${isLight ? "text-indigo-600 font-bold" : "text-indigo-300/80"}`}>
                            <MessageCircle className="w-3.5 h-3.5" /> Community
                        </p>
                        <h1 className="font-semibold truncate">
                            {activeRoom ? (activeRoom.type === "channel" ? `# ${activeRoom.name}` : activeRoom.name) : "Student chat"}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={cycleTheme}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                            isLight
                                ? "bg-white text-slate-800 border-slate-300 hover:bg-slate-50 shadow-sm"
                                : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                        }`}
                        title={`Current Theme: ${theme}. Click to switch.`}
                    >
                        {theme === "dark" && <><Moon className="w-3.5 h-3.5 text-indigo-400" /> <span className="hidden sm:inline">Dark</span></>}
                        {theme === "light" && <><Sun className="w-3.5 h-3.5 text-amber-500" /> <span className="hidden sm:inline">Light</span></>}
                        {theme === "eyeprotect" && <><Eye className="w-3.5 h-3.5 text-teal-600" /> <span className="hidden sm:inline">Eye Comfort</span></>}
                    </button>
                    {source === "memory" && (
                        <span className={`hidden sm:inline text-[10px] rounded-full border px-2 py-0.5 ${
                            isLight ? "border-amber-500/40 bg-amber-50 text-amber-800 font-semibold" : "border-amber-400/30 text-amber-200/80"
                        }`}>
                            Live demo mode
                        </span>
                    )}
                    <button
                        type="button"
                        className={`md:hidden rounded-lg border px-2.5 py-1.5 text-xs ${
                            isLight ? "border-slate-300 text-slate-700 bg-white" : "border-white/10 text-white/70 bg-white/5"
                        }`}
                        onClick={() => setMobileShowSidebar((v) => !v)}
                    >
                        {mobileShowSidebar ? "Chat" : "Rooms"}
                    </button>
                    <Link
                        href="/labs"
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition shadow-sm ${
                            theme === "eyeprotect"
                                ? "bg-[#0b5f58] text-[#fffcf5] border-[#084842] hover:bg-[#084842]"
                                : isLight
                                ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                        }`}
                    >
                        ← Back to Labs
                    </Link>
                </div>
            </header>

            <div className="flex-1 min-h-0 grid md:grid-cols-[240px_1fr_200px]">
                {/* Rooms */}
                <aside
                    className={`${
                        mobileShowSidebar ? "flex" : "hidden"
                    } md:flex flex-col border-r overflow-y-auto ${
                        theme === "light"
                            ? "border-slate-200 bg-slate-50/80"
                            : theme === "eyeprotect"
                            ? "border-[#8c8578] bg-[#e8dcc8]/40"
                            : "border-white/10 bg-black/20"
                    }`}
                >
                    <div className="p-3">
                        <p className={`text-[10px] uppercase tracking-wide mb-2 px-1 ${isLight ? "text-slate-500 font-bold" : "text-white/40"}`}>Channels</p>
                        {loadingRooms ? (
                            <div className="flex justify-center py-6">
                                <Loader2 className={`w-4 h-4 animate-spin ${isLight ? "text-slate-400" : "text-white/40"}`} />
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
                                        className={`w-full text-left rounded-lg px-2.5 py-2 text-sm flex items-center gap-2 transition ${
                                            activeSlug === room.slug
                                                ? (theme === "eyeprotect" ? "bg-[#0b5f58] text-[#fffcf5] font-bold" : isLight ? "bg-indigo-600 text-white font-bold" : "bg-indigo-500/25 text-white font-bold")
                                                : (isLight ? "text-slate-700 hover:bg-slate-200/60 hover:text-slate-900" : "text-white/60 hover:bg-white/5 hover:text-white")
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
                                <p className={`text-[10px] uppercase tracking-wide mt-4 mb-2 px-1 ${isLight ? "text-slate-500 font-bold" : "text-white/40"}`}>Direct messages</p>
                                <div className="space-y-0.5">
                                    {dms.map((room) => (
                                        <button
                                            key={room.slug}
                                            type="button"
                                            onClick={() => {
                                                setActiveSlug(room.slug);
                                                setMobileShowSidebar(false);
                                            }}
                                            className={`w-full text-left rounded-lg px-2.5 py-2 text-sm truncate transition ${
                                                activeSlug === room.slug
                                                    ? (theme === "eyeprotect" ? "bg-[#0b5f58] text-[#fffcf5] font-bold" : isLight ? "bg-indigo-600 text-white font-bold" : "bg-indigo-500/25 text-white font-bold")
                                                    : (isLight ? "text-slate-700 hover:bg-slate-200/60 hover:text-slate-900" : "text-white/60 hover:bg-white/5 hover:text-white")
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
                    } md:flex flex-col min-h-0 ${
                        theme === "light"
                            ? "bg-white text-slate-900"
                            : theme === "eyeprotect"
                            ? "bg-[#fffcf5] text-[#1c1917]"
                            : "bg-gradient-to-b from-slate-950 to-[#0a0a12] text-white"
                    }`}
                >
                    {activeRoom?.description && (
                        <div className={`px-4 py-2 border-b text-xs ${isLight ? "border-slate-200 text-slate-500 bg-slate-50/50" : "border-white/5 text-white/45"}`}>{activeRoom.description}</div>
                    )}

                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                        {messages.length === 0 && (
                            <div className={`h-full min-h-[200px] flex flex-col items-center justify-center text-center text-sm gap-2 ${isLight ? "text-slate-400" : "text-white/40"}`}>
                                <Users className="w-8 h-8 opacity-40" />
                                <p>No messages yet — be the first to say hi.</p>
                            </div>
                        )}
                        {messages.map((m) => {
                            const mine = Boolean(m.mine) || m.senderPublicId === mePublicId;
                            return (
                                <div key={m.id} className={`flex gap-3 ${mine ? "justify-end" : "justify-start"}`}>
                                    {!mine && (
                                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                            isLight ? "bg-indigo-100 border-indigo-300 text-indigo-800" : "bg-indigo-500/30 border-indigo-400/20 text-indigo-100"
                                        }`}>
                                            {initials(m.senderName)}
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm ${
                                            mine
                                                ? (theme === "eyeprotect" ? "bg-[#0b5f58] text-[#fffcf5] rounded-br-md font-medium" : "bg-indigo-600 text-white rounded-br-md font-medium")
                                                : (theme === "light"
                                                    ? "bg-slate-100 border border-slate-200 text-slate-900 rounded-bl-md shadow-sm"
                                                    : theme === "eyeprotect"
                                                    ? "bg-[#e8dcc8]/60 border border-[#8c8578]/40 text-[#1c1917] rounded-bl-md"
                                                    : "bg-white/5 border border-white/10 text-white/90 rounded-bl-md")
                                        }`}
                                    >
                                        {!mine && (
                                            <div className={`text-[10px] font-bold mb-0.5 ${isLight ? "text-indigo-700" : "text-indigo-300/90"}`}>{m.senderName}</div>
                                        )}
                                        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                                        <div className={`text-[10px] mt-1 ${mine ? (isLight ? "text-white/80" : "text-white/60") : (isLight ? "text-slate-500" : "text-white/35")}`}>
                                            {formatTime(m.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>

                    <form onSubmit={(e) => void sendMessage(e)} className={`shrink-0 border-t p-3 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-black/30"}`}>
                        {error && <p className="text-rose-500 text-xs mb-2 px-1 font-semibold">{error}</p>}
                        <div className="flex gap-2">
                            <input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                placeholder={`Message ${activeRoom?.type === "channel" ? "#" : ""}${activeRoom?.name || "channel"}…`}
                                maxLength={2000}
                                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm focus:outline-none transition ${
                                    isLight
                                        ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 shadow-sm"
                                        : "bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-indigo-500/50"
                                }`}
                            />
                            <button
                                type="submit"
                                disabled={sending || !draft.trim()}
                                className={`rounded-xl px-4 py-2.5 font-bold transition cursor-pointer ${
                                    theme === "eyeprotect"
                                        ? "bg-[#0b5f58] hover:bg-[#084842] text-white disabled:opacity-40"
                                        : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40"
                                }`}
                                aria-label="Send"
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Online */}
                <aside className={`hidden md:flex flex-col border-l overflow-y-auto ${
                    theme === "light"
                        ? "border-slate-200 bg-slate-50/80"
                        : theme === "eyeprotect"
                        ? "border-[#8c8578] bg-[#e8dcc8]/40"
                        : "border-white/10 bg-black/20"
                }`}>
                    <div className="p-3">
                        <p className={`text-[10px] uppercase tracking-wide mb-2 px-1 flex items-center gap-1 ${isLight ? "text-slate-500 font-bold" : "text-white/40"}`}>
                            <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" /> Online · {online.length}
                        </p>
                        <div className="space-y-1">
                            {online.length === 0 && (
                                <p className={`text-xs px-1 py-2 ${isLight ? "text-slate-400" : "text-white/35"}`}>No one else here yet.</p>
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
                                        className={`w-full text-left rounded-lg px-2 py-2 flex items-center gap-2 transition ${
                                            isMe ? "opacity-70 cursor-default" : isLight ? "hover:bg-slate-200/60" : "hover:bg-white/5"
                                        }`}
                                    >
                                        <span className="relative shrink-0">
                                            <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                                                isLight ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-emerald-500/20 border-emerald-400/20 text-emerald-100"
                                            }`}>
                                                {initials(u.displayName)}
                                            </span>
                                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className={`block text-xs font-semibold truncate ${isLight ? "text-slate-800" : "text-white"}`}>
                                                {u.displayName}
                                                {isMe ? " (you)" : ""}
                                            </span>
                                            {!isMe && <span className={`block text-[10px] ${isLight ? "text-slate-500" : "text-white/35"}`}>Click to DM</span>}
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
