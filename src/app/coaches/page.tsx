"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, CalendarPlus, Loader2, Star, Users, Moon, Sun, Eye, Video, X } from "lucide-react";
import LabAuthBanner from "@/components/labs/LabAuthBanner";
import NotificationBell from "@/components/NotificationBell";
import { getStorageItem } from "@/utils/storage";
import { readApiError } from "@/utils/apiError";

interface Coach {
    id: string;
    name: string;
    headline: string;
    domains: string[];
    companies: string[];
    rateUsd: number;
    rateInr: number;
    rating: number;
    slots: string[];
    bio: string;
    durationMin: number;
    slotInventory?: Record<string, number>;
}

interface BookingResult {
    success?: boolean;
    error?: string;
    message?: string;
    meetLink?: string | null;
    googleCalendarLink?: string;
    bookingId?: string;
    coach?: string;
    slot?: string;
    demo?: boolean;
    paid?: boolean;
}

interface MyBooking {
    bookingId: string;
    coachName: string;
    slot: string;
    status: "pending" | "paid" | "confirmed" | "cancelled";
    meetLink: string;
    googleCalendarLink?: string;
    createdAt: string;
}

declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
    }
}

export default function CoachesPage() {
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [paymentsConfigured, setPaymentsConfigured] = useState(false);
    const [booking, setBooking] = useState<BookingResult | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
    const [cancelling, setCancelling] = useState<string | null>(null);
    const [loggedIn, setLoggedIn] = useState(false);

    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");

    useEffect(() => {
        const savedTheme = localStorage.getItem("prointerview_theme") as "dark" | "light" | "eyeprotect" | null;
        if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
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

    const loadMyBookings = useCallback(async () => {
        try {
            const res = await fetch("/api/coaches/bookings");
            if (!res.ok) return;
            const data = await res.json();
            setMyBookings(Array.isArray(data.bookings) ? data.bookings : []);
        } catch {
            /* ignore — bookings list is a non-critical enhancement */
        }
    }, []);

    useEffect(() => {
        const isLoggedIn = getStorageItem("userLoggedIn") === "true" || localStorage.getItem("userLoggedIn") === "true";
        setLoggedIn(isLoggedIn);

        fetch("/api/coaches")
            .then((r) => r.json())
            .then((d) => {
                setCoaches(d.coaches || []);
                setPaymentsConfigured(Boolean(d.paymentsConfigured));
            });

        if (isLoggedIn) void loadMyBookings();

        if (!document.querySelector('script[src*="checkout.razorpay.com"]')) {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            document.body.appendChild(script);
        }
    }, [loadMyBookings]);

    async function book(coach: Coach, slot: string) {
        setBusy(coach.id);
        setError("");
        setBooking(null);
        try {
            if (paymentsConfigured && window.Razorpay) {
                const orderRes = await fetch("/api/coaches", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ coachId: coach.id, slot, mode: "create_order" }),
                });
                if (!orderRes.ok) {
                    const { message } = await readApiError(orderRes);
                    throw new Error(message);
                }
                const order = await orderRes.json();

                if (!order.paymentsConfigured || !order.orderId) {
                    const confirmRes = await fetch("/api/coaches", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            coachId: coach.id,
                            slot,
                            mode: "confirm",
                            bookingId: order.bookingId,
                        }),
                    });
                    if (!confirmRes.ok) {
                        const { message } = await readApiError(confirmRes);
                        throw new Error(message);
                    }
                    setBooking(await confirmRes.json());
                    void loadMyBookings();
                    return;
                }

                await new Promise<void>((resolve, reject) => {
                    const rzp = new window.Razorpay!({
                        key: order.keyId,
                        amount: order.amount,
                        currency: order.currency || "INR",
                        name: "ProInterview Coach",
                        description: `${coach.name} · ${slot}`,
                        order_id: order.orderId,
                        handler: async (response: {
                            razorpay_payment_id: string;
                            razorpay_order_id: string;
                            razorpay_signature: string;
                        }) => {
                            try {
                                const confirmRes = await fetch("/api/coaches", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        coachId: coach.id,
                                        slot,
                                        mode: "confirm",
                                        bookingId: order.bookingId,
                                        ...response,
                                    }),
                                });
                                if (!confirmRes.ok) {
                                    const { message } = await readApiError(confirmRes);
                                    throw new Error(message);
                                }
                                setBooking(await confirmRes.json());
                                void loadMyBookings();
                                resolve();
                            } catch (e) {
                                reject(e);
                            }
                        },
                        modal: {
                            ondismiss: () => resolve(),
                        },
                        theme: { color: "#ec4899" },
                    });
                    rzp.open();
                });
            } else {
                const res = await fetch("/api/coaches", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ coachId: coach.id, slot, mode: "confirm" }),
                });
                if (!res.ok) {
                    const { message } = await readApiError(res);
                    throw new Error(message);
                }
                setBooking(await res.json());
                void loadMyBookings();
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Booking failed");
        } finally {
            setBusy(null);
        }
    }

    async function cancelBooking(bookingId: string) {
        setCancelling(bookingId);
        setError("");
        try {
            const res = await fetch("/api/coaches/bookings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId }),
            });
            if (!res.ok) {
                const { message } = await readApiError(res);
                throw new Error(message);
            }
            await loadMyBookings();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Cancel failed");
        } finally {
            setCancelling(null);
        }
    }

    return (
        <div className={`min-h-screen transition-colors duration-300 ${
            theme === "light"
                ? "bg-slate-100 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-slate-950 text-white"
        }`}>
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <p className={`text-xs uppercase tracking-widest flex items-center gap-2 ${isLight ? "text-pink-700 font-bold" : "text-pink-300/80"}`}>
                            <Users className="w-4 h-4" /> Coach marketplace
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold">Human coaches after AI warm-up</h1>
                        <p className={`mt-1 text-sm ${isLight ? "text-slate-600" : "text-white/45"}`}>
                            {paymentsConfigured
                                ? "Pay with Razorpay · get an instant Jitsi video room"
                                : "Book a session · instant Jitsi video room (payments optional when Razorpay is configured)"}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
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
                        <NotificationBell />
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
                </div>

                <LabAuthBanner feature="coach booking" />

                {booking?.success && (
                    <div className={`mb-4 rounded-xl border p-4 text-sm space-y-2 ${
                        isLight ? "bg-pink-50 border-pink-200 text-pink-900" : "border-pink-400/30 bg-pink-500/10 text-white"
                    }`}>
                        <p>{booking.message}</p>
                        <div className="flex flex-wrap gap-2">
                            {booking.meetLink && (
                                <a
                                    className="inline-flex items-center gap-2 rounded-lg bg-pink-500/90 px-3 py-2 text-xs font-medium text-white"
                                    href={booking.meetLink}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Video className="h-3.5 w-3.5" /> Join video room
                                </a>
                            )}
                            {booking.googleCalendarLink && (
                                <a
                                    className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/15"
                                    href={booking.googleCalendarLink}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <CalendarPlus className="h-3.5 w-3.5" /> Add to Google Calendar
                                </a>
                            )}
                        </div>
                        {booking.bookingId && (
                            <p className="text-xs opacity-70">Booking ID: {booking.bookingId}</p>
                        )}
                    </div>
                )}
                {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}

                {loggedIn && myBookings.some((b) => b.status !== "cancelled") && (
                    <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <h2 className="mb-3 text-sm font-medium text-white/80">Your bookings</h2>
                        <div className="space-y-2">
                            {myBookings
                                .filter((b) => b.status !== "cancelled")
                                .map((b) => (
                                    <div
                                        key={b.bookingId}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-medium">{b.coachName}</p>
                                            <p className="text-xs text-white/50">
                                                {b.slot} · <span className="capitalize">{b.status}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {b.status === "confirmed" && (
                                                <a
                                                    href={b.meetLink}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="rounded-lg bg-pink-500/80 px-2.5 py-1 text-xs"
                                                >
                                                    Join
                                                </a>
                                            )}
                                            <button
                                                type="button"
                                                disabled={cancelling === b.bookingId}
                                                onClick={() => void cancelBooking(b.bookingId)}
                                                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                                            >
                                                {cancelling === b.bookingId ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <X className="h-3 w-3" />
                                                )}
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {coaches.map((c) => (
                        <div
                            key={c.id}
                            className={`rounded-2xl border p-5 transition ${
                                theme === "light"
                                    ? "bg-white border-slate-200 shadow-sm"
                                    : theme === "eyeprotect"
                                    ? "bg-[#fffcf5] border-[#8c8578]"
                                    : "bg-white/5 border-white/10"
                            }`}
                        >
                            <div className="flex flex-wrap justify-between gap-3">
                                <div>
                                    <h2 className="font-semibold text-lg">{c.name}</h2>
                                    <p className={`text-sm ${isLight ? "text-slate-500 font-medium" : "text-white/60"}`}>{c.headline}</p>
                                    <p className={`text-sm mt-2 ${isLight ? "text-slate-700" : "text-white/70"}`}>{c.bio}</p>
                                    <div className={`flex items-center gap-3 mt-3 text-xs ${isLight ? "text-slate-600 font-semibold" : "text-white/50"}`}>
                                        <span className="inline-flex items-center gap-1">
                                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> {c.rating}
                                        </span>
                                        <span>
                                            ₹{c.rateInr}/session · ~${c.rateUsd}
                                        </span>
                                        <span>{c.durationMin || 45} min</span>
                                        <span>{c.companies.join(" · ")}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {c.slots.map((slot) => {
                                        const remaining = c.slotInventory?.[slot];
                                        const soldOut = remaining !== undefined && remaining <= 0;
                                        return (
                                            <button
                                                key={slot}
                                                type="button"
                                                disabled={busy === c.id || soldOut}
                                                onClick={() => void book(c, slot)}
                                                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                                                    theme === "eyeprotect"
                                                        ? "bg-[#0b5f58] hover:bg-[#084842] text-white disabled:opacity-50"
                                                        : "bg-pink-600 hover:bg-pink-500 text-white disabled:opacity-50"
                                                }`}
                                            >
                                                {busy === c.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Calendar className="w-3.5 h-3.5" />
                                                )}
                                                {slot}
                                                {remaining !== undefined && (
                                                    <span className="opacity-80">
                                                        {soldOut ? "· full" : `· ${remaining} left`}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
