"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Briefcase,
    Code2,
    Clapperboard,
    LayoutDashboard,
    PenTool,
    Target,
    FileSearch,
    Moon,
    Sun,
    Eye,
} from "lucide-react";
import { buildPrepSnapshot, loadStarHistory, type PrepSnapshot, type StarHistoryEntry } from "@/utils/labProgress";
import LabAuthBanner from "@/components/labs/LabAuthBanner";
import NotificationBell from "@/components/NotificationBell";

export default function PrepDashboardPage() {
    const [snap, setSnap] = useState<PrepSnapshot | null>(null);
    const [history, setHistory] = useState<StarHistoryEntry[]>([]);
    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");

    useEffect(() => {
        const savedTheme = localStorage.getItem("prointerview_theme") as "dark" | "light" | "eyeprotect" | null;
        if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTheme(savedTheme);
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSnap(buildPrepSnapshot());
        setHistory(loadStarHistory());
    }, []);

    const isLight = theme === "light" || theme === "eyeprotect";

    const cycleTheme = () => {
        const next = theme === "dark" ? "light" : theme === "light" ? "eyeprotect" : "dark";
        setTheme(next);
        localStorage.setItem("prointerview_theme", next);
        document.documentElement.classList.remove("theme-dark", "theme-light", "theme-eyeprotect");
        document.documentElement.classList.add(`theme-${next}`);
    };

    const drills = [
        {
            href: "/star-coach",
            title: "STAR coach",
            desc: snap?.filmRoomGaps[0]
                ? `Practice gap: ${snap.filmRoomGaps[0]}`
                : "Generate or write a behavioral story",
            icon: Target,
            color: "text-violet-500 dark:text-violet-300",
        },
        {
            href: "/coding-lab",
            title: "Coding lab",
            desc: `${snap?.codingSolved ?? 0} problems unlocked (≥70%)`,
            icon: Code2,
            color: "text-amber-500 dark:text-amber-300",
        },
        {
            href: "/system-design",
            title: "System design",
            desc: "Whiteboard + online evaluation",
            icon: PenTool,
            color: "text-cyan-500 dark:text-cyan-300",
        },
        {
            href: "/ats-match",
            title: "ATS match",
            desc:
                snap?.atsMatch != null
                    ? `Last match: ${snap.atsMatch}%`
                    : "Score resume vs a job description",
            icon: FileSearch,
            color: "text-sky-500 dark:text-sky-300",
        },
        {
            href: "/film-room",
            title: "Film room",
            desc: snap?.filmRoomGaps.length
                ? `${snap.filmRoomGaps.length} focus areas from last interview`
                : "Replay and annotate a past interview",
            icon: Clapperboard,
            color: "text-rose-500 dark:text-rose-300",
        },
        {
            href: "/jobs",
            title: "Open roles",
            desc: "Match openings to your resume + location",
            icon: Briefcase,
            color: "text-emerald-500 dark:text-emerald-300",
        },
    ];

    const cardBg = theme === "light"
        ? "bg-white border-slate-200 text-slate-900 shadow-sm"
        : theme === "eyeprotect"
        ? "bg-[#fffcf5] border-[#8c8578] text-[#1c1917]"
        : "bg-white/5 border-white/10 text-white";

    return (
        <div className={`min-h-screen transition-colors ${
            theme === "light"
                ? "bg-slate-50 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-slate-950 text-white"
        }`}>
            <div className="mx-auto max-w-5xl px-4 py-8">
                <div className="mb-6 flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <p className={`flex items-center gap-2 text-xs uppercase tracking-widest ${
                            theme === "eyeprotect"
                                ? "text-[#0b5f58] font-bold"
                                : isLight
                                ? "text-indigo-700 font-bold"
                                : "text-indigo-300/80"
                        }`}>
                            <LayoutDashboard className="h-4 w-4" /> Prep dashboard
                        </p>
                        <h1 className="mt-1 text-xl sm:text-2xl font-semibold">Your unified practice plan</h1>
                        <p className={`mt-1 text-xs sm:text-sm ${
                            theme === "eyeprotect"
                                ? "text-stone-600 font-medium"
                                : isLight
                                ? "text-slate-600"
                                : "text-white/45"
                        }`}>
                            {snap?.company || snap?.role
                                ? `Target: ${[snap.role, snap.company].filter(Boolean).join(" · ")}`
                                : "Set company/role in Setup to personalize drills."}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto pt-1">
                        <button
                            onClick={cycleTheme}
                            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
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
                        <NotificationBell theme={theme} />
                        <Link
                            href="/labs"
                            className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold border transition shadow-sm whitespace-nowrap ${
                                theme === "eyeprotect"
                                    ? "bg-[#0b5f58] text-[#fffcf5] border-[#084842] hover:bg-[#084842]"
                                    : isLight
                                    ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                    : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                            }`}
                        >
                            <span className="hidden sm:inline">← Back to Labs</span>
                            <span className="sm:hidden">← Labs</span>
                        </Link>
                    </div>
                </div>

                <LabAuthBanner feature="online coaching, grading, and question generation" />

                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat label="STAR stories saved" value={String(snap?.starStories ?? 0)} theme={theme} />
                    <Stat label="Coding unlocked" value={String(snap?.codingSolved ?? 0)} theme={theme} />
                    <Stat label="ATS match" value={snap?.atsMatch != null ? `${snap.atsMatch}%` : "—"} theme={theme} />
                    <Stat label="Film gaps" value={String(snap?.filmRoomGaps.length ?? 0)} theme={theme} />
                </div>

                {snap?.filmRoomGaps && snap.filmRoomGaps.length > 0 && (
                    <div className={`mb-6 rounded-2xl border p-4 ${
                        theme === "eyeprotect"
                            ? "bg-[#fffcf5] border-[#8c8578]"
                            : isLight
                            ? "bg-indigo-50 border-indigo-200"
                            : "border-violet-400/20 bg-violet-500/10"
                    }`}>
                        <h2 className={`text-sm font-medium ${isLight ? "text-indigo-900" : "text-violet-200"}`}>Practice these next</h2>
                        <ul className="mt-2 space-y-1.5 text-sm opacity-80">
                            {snap.filmRoomGaps.map((g) => (
                                <li key={g} className="flex flex-wrap items-center justify-between gap-2">
                                    <span>{g}</span>
                                    <Link
                                        href={`/star-coach?question=${encodeURIComponent(g)}&weakSpot=${encodeURIComponent("from film room")}`}
                                        className="text-xs font-semibold text-indigo-600 dark:text-violet-300 hover:underline"
                                    >
                                        Open in STAR coach →
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {drills.map((d) => {
                        const Icon = d.icon;
                        return (
                            <Link
                                key={d.href}
                                href={d.href}
                                className={`rounded-2xl border p-4 transition ${cardBg}`}
                            >
                                <Icon className={`h-5 w-5 ${d.color}`} />
                                <h2 className="mt-3 font-semibold">{d.title}</h2>
                                <p className="text-sm opacity-70 mt-0.5">{d.desc}</p>
                            </Link>
                        );
                    })}
                </div>

                {history.length > 0 && (
                    <div className="mt-8">
                        <h2 className="mb-3 text-sm font-bold opacity-80">Recent STAR stories</h2>
                        <div className="space-y-2">
                            {history.map((h) => (
                                <Link
                                    key={h.id}
                                    href={`/star-coach?question=${encodeURIComponent(h.question)}&story=${encodeURIComponent(h.story.slice(0, 500))}&weakSpot=${encodeURIComponent(h.weakSpot)}`}
                                    className={`block rounded-xl border p-3 text-sm transition ${cardBg}`}
                                >
                                    <div className="flex justify-between gap-2">
                                        <span className="font-semibold line-clamp-1">{h.question}</span>
                                        {h.score != null && (
                                            <span className="shrink-0 font-bold text-indigo-600 dark:text-violet-300">{h.score}/100</span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 line-clamp-1 text-xs opacity-60">{h.story}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-8 flex flex-wrap gap-2 text-sm">
                    <Link
                        href="/setup"
                        className={`rounded-xl px-4 py-2 font-bold shadow-sm transition ${
                            theme === "eyeprotect"
                                ? "bg-[#0b5f58] text-white hover:bg-[#084842]"
                                : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                    >
                        Update target company / role
                    </Link>
                    <Link
                        href="/panel-interview"
                        className={`rounded-xl border px-4 py-2 font-medium transition ${
                            theme === "eyeprotect"
                                ? "bg-[#fffcf5] border-[#8c8578] text-[#1c1917]"
                                : isLight
                                ? "bg-white border-slate-200 text-slate-800"
                                : "border-white/10 text-white/70 hover:bg-white/5"
                        }`}
                    >
                        Start panel interview
                    </Link>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, theme }: { label: string; value: string; theme: "dark" | "light" | "eyeprotect" }) {
    const isLight = theme === "light" || theme === "eyeprotect";
    return (
        <div className={`rounded-xl border p-3 transition ${
            theme === "light"
                ? "bg-white border-slate-200 shadow-sm text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#fffcf5] border-[#8c8578] text-[#1c1917]"
                : "bg-white/5 border-white/10 text-white"
        }`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className={`text-[11px] uppercase tracking-wide font-semibold mt-0.5 ${
                theme === "eyeprotect" ? "text-stone-600" : isLight ? "text-slate-500" : "text-white/40"
            }`}>{label}</div>
        </div>
    );
}
