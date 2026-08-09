"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Loader2, Star, Users } from "lucide-react";

interface Coach {
    id: string;
    name: string;
    headline: string;
    domains: string[];
    companies: string[];
    rateUsd: number;
    rating: number;
    slots: string[];
    bio: string;
}

export default function CoachesPage() {
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [booking, setBooking] = useState<any>(null);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/coaches")
            .then((r) => r.json())
            .then((d) => setCoaches(d.coaches || []));
    }, []);

    async function book(coachId: string, slot: string) {
        setBusy(coachId);
        try {
            const res = await fetch("/api/coaches", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coachId, slot }),
            });
            setBooking(await res.json());
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-pink-300/80 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Recruiter marketplace
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">Human coaches after AI warm-up</h1>
                    </div>
                    <Link href="/labs" className="text-sm text-white/60 hover:text-white">
                        ← Labs
                    </Link>
                </div>

                {booking?.success && (
                    <div className="mb-4 rounded-xl border border-pink-400/30 bg-pink-500/10 p-3 text-sm">
                        {booking.message}
                        {booking.meetLink && (
                            <div className="mt-1">
                                Meet:{" "}
                                <a className="underline" href={booking.meetLink} target="_blank" rel="noreferrer">
                                    {booking.meetLink}
                                </a>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-3">
                    {coaches.map((c) => (
                        <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex flex-wrap justify-between gap-3">
                                <div>
                                    <h2 className="font-medium">{c.name}</h2>
                                    <p className="text-sm text-white/60">{c.headline}</p>
                                    <p className="text-sm text-white/70 mt-2">{c.bio}</p>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-white/50">
                                        <span className="inline-flex items-center gap-1">
                                            <Star className="w-3 h-3 text-amber-300" /> {c.rating}
                                        </span>
                                        <span>${c.rateUsd}/session</span>
                                        <span>{c.companies.join(" · ")}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {c.slots.map((slot) => (
                                        <button
                                            key={slot}
                                            type="button"
                                            disabled={busy === c.id}
                                            onClick={() => void book(c.id, slot)}
                                            className="flex items-center gap-1 rounded-lg bg-pink-500/90 px-3 py-1.5 text-xs disabled:opacity-50"
                                        >
                                            {busy === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />}
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
