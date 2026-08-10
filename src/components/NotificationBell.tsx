"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { getStorageItem } from "@/utils/storage";

interface NotificationItem {
    _id: string;
    kind: "prep" | "coach" | "gmail" | "referral" | "system";
    title: string;
    body: string;
    href?: string;
    read: boolean;
    createdAt: string;
}

const POLL_MS = 60_000;

function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

/** Bell icon with unread badge + dropdown, polling GET /api/notifications every 60s while logged in. */
export default function NotificationBell({ className = "" }: { className?: string }) {
    const [loggedIn, setLoggedIn] = useState(false);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications");
            if (!res.ok) return;
            const data = await res.json();
            setItems(Array.isArray(data.notifications) ? data.notifications : []);
            setUnreadCount(Number(data.unreadCount) || 0);
        } catch {
            /* offline — keep last known state */
        }
    }, []);

    useEffect(() => {
        const isLoggedIn = getStorageItem("userLoggedIn") === "true";
        setLoggedIn(isLoggedIn);
        if (!isLoggedIn) return;

        void load();
        const interval = setInterval(load, POLL_MS);
        return () => clearInterval(interval);
    }, [load]);

    useEffect(() => {
        if (!open) return;
        const onClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, [open]);

    const markRead = async (id: string) => {
        setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
        } catch {
            /* best-effort */
        }
    };

    const markAllRead = async () => {
        setLoading(true);
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllRead: true }),
            });
        } catch {
            /* best-effort */
        } finally {
            setLoading(false);
        }
    };

    if (!loggedIn) return null;

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => {
                    setOpen((v) => !v);
                    if (!open) void load();
                }}
                className="relative p-2 sm:p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/80 hover:text-white transition-all flex items-center justify-center shrink-0 cursor-pointer"
                title="Notifications"
            >
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-indigo-500 text-[9px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-[#111] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <span className="text-sm font-bold text-white">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => void markAllRead()}
                                disabled={loading}
                                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-300 hover:text-indigo-200 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {items.length === 0 ? (
                            <div className="px-4 py-8 text-center text-xs text-white/40">
                                You&apos;re all caught up.
                            </div>
                        ) : (
                            items.map((n) => {
                                const content = (
                                    <div
                                        className={`px-4 py-3 border-b border-white/5 flex items-start gap-2.5 transition-colors ${
                                            n.read ? "opacity-60" : "bg-indigo-500/[0.04]"
                                        } hover:bg-white/[0.03]`}
                                    >
                                        <span
                                            className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                                                n.read ? "bg-white/20" : "bg-indigo-400"
                                            }`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white leading-snug">{n.title}</p>
                                            <p className="text-[11px] text-white/50 leading-snug mt-0.5 line-clamp-2">{n.body}</p>
                                            <p className="text-[10px] text-white/30 mt-1">{timeAgo(n.createdAt)}</p>
                                        </div>
                                        {!n.read && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    void markRead(n._id);
                                                }}
                                                className="shrink-0 p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
                                                title="Mark read"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                                return n.href ? (
                                    <Link
                                        key={n._id}
                                        href={n.href}
                                        onClick={() => {
                                            setOpen(false);
                                            if (!n.read) void markRead(n._id);
                                        }}
                                        className="block"
                                    >
                                        {content}
                                    </Link>
                                ) : (
                                    <div key={n._id}>{content}</div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
