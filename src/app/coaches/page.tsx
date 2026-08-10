"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Loader2, Star, Users, Video } from "lucide-react";
import LabAuthBanner from "@/components/labs/LabAuthBanner";

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
}

interface BookingResult {
    success?: boolean;
    error?: string;
    message?: string;
    meetLink?: string | null;
    bookingId?: string;
    coach?: string;
    slot?: string;
    demo?: boolean;
    paid?: boolean;
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

    useEffect(() => {
        fetch("/api/coaches")
            .then((r) => r.json())
            .then((d) => {
                setCoaches(d.coaches || []);
                setPaymentsConfigured(Boolean(d.paymentsConfigured));
            });

        if (!document.querySelector('script[src*="checkout.razorpay.com"]')) {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

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
                const order = await orderRes.json();
                if (!orderRes.ok) throw new Error(order.error || "Could not create order");

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
                    setBooking(await confirmRes.json());
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
                                const data = await confirmRes.json();
                                if (!confirmRes.ok) throw new Error(data.error || "Confirm failed");
                                setBooking(data);
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
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Booking failed");
                setBooking(data);
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Booking failed");
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto max-w-4xl px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-pink-300/80">
                            <Users className="h-4 w-4" /> Coach marketplace
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold">Human coaches after AI warm-up</h1>
                        <p className="mt-1 text-sm text-white/45">
                            {paymentsConfigured
                                ? "Pay with Razorpay · get an instant Jitsi video room"
                                : "Book a session · instant Jitsi video room (payments optional when Razorpay is configured)"}
                        </p>
                    </div>
                    <Link href="/labs" className="text-sm text-white/60 hover:text-white">
                        ← Labs
                    </Link>
                </div>

                <LabAuthBanner feature="coach booking" />

                {booking?.success && (
                    <div className="mb-4 rounded-xl border border-pink-400/30 bg-pink-500/10 p-4 text-sm space-y-2">
                        <p>{booking.message}</p>
                        {booking.meetLink && (
                            <a
                                className="inline-flex items-center gap-2 rounded-lg bg-pink-500/90 px-3 py-2 text-xs font-medium"
                                href={booking.meetLink}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Video className="h-3.5 w-3.5" /> Join video room
                            </a>
                        )}
                        {booking.bookingId && (
                            <p className="text-xs text-white/40">Booking ID: {booking.bookingId}</p>
                        )}
                    </div>
                )}
                {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}

                <div className="space-y-3">
                    {coaches.map((c) => (
                        <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex flex-wrap justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <h2 className="font-medium">{c.name}</h2>
                                    <p className="text-sm text-white/60">{c.headline}</p>
                                    <p className="mt-2 text-sm text-white/70">{c.bio}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/50">
                                        <span className="inline-flex items-center gap-1">
                                            <Star className="h-3 w-3 text-amber-300" /> {c.rating}
                                        </span>
                                        <span>
                                            ₹{c.rateInr}/session · ~${c.rateUsd}
                                        </span>
                                        <span>{c.durationMin || 45} min</span>
                                        <span>{c.companies.join(" · ")}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {c.slots.map((slot) => (
                                        <button
                                            key={slot}
                                            type="button"
                                            disabled={busy === c.id}
                                            onClick={() => void book(c, slot)}
                                            className="flex items-center gap-1 rounded-lg bg-pink-500/90 px-3 py-1.5 text-xs disabled:opacity-50"
                                        >
                                            {busy === c.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <Calendar className="h-3 w-3" />
                                            )}
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
