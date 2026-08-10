"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Loader2, Star, Users, Moon, Sun, Eye } from "lucide-react";

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
                        <h1 className="text-2xl font-semibold mt-1">Human coaches after AI warm-up</h1>
                    </div>
                    <div className="flex items-center gap-3">
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

                {booking?.success && (
                    <div className={`mb-4 rounded-xl border p-3 text-sm ${
                        isLight ? "bg-pink-50 border-pink-200 text-pink-900" : "border-pink-400/30 bg-pink-500/10 text-white"
                    }`}>
                        {booking.message}
                        {booking.meetLink && (
                            <div className="mt-1 font-semibold">
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
                                            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                                                theme === "eyeprotect"
                                                    ? "bg-[#0b5f58] hover:bg-[#084842] text-white disabled:opacity-50"
                                                    : "bg-pink-600 hover:bg-pink-500 text-white disabled:opacity-50"
                                            }`}
                                        >
                                            {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
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
