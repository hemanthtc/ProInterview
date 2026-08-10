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
} from "lucide-react";
import { buildPrepSnapshot, loadStarHistory, type PrepSnapshot, type StarHistoryEntry } from "@/utils/labProgress";
import LabAuthBanner from "@/components/labs/LabAuthBanner";
import NotificationBell from "@/components/NotificationBell";

export default function PrepDashboardPage() {
    const [snap, setSnap] = useState<PrepSnapshot | null>(null);
    const [history, setHistory] = useState<StarHistoryEntry[]>([]);

    useEffect(() => {
        setSnap(buildPrepSnapshot());
        setHistory(loadStarHistory());
    }, []);

    const drills = [
        {
            href: "/star-coach",
            title: "STAR coach",
            desc: snap?.filmRoomGaps[0]
                ? `Practice gap: ${snap.filmRoomGaps[0]}`
                : "Generate or write a behavioral story",
            icon: Target,
            color: "text-violet-300",
        },
        {
            href: "/coding-lab",
            title: "Coding lab",
            desc: `${snap?.codingSolved ?? 0} problems unlocked (≥70%)`,
            icon: Code2,
            color: "text-amber-300",
        },
        {
            href: "/system-design",
            title: "System design",
            desc: "Whiteboard + online evaluation",
            icon: PenTool,
            color: "text-cyan-300",
        },
        {
            href: "/ats-match",
            title: "ATS match",
            desc:
                snap?.atsMatch != null
                    ? `Last match: ${snap.atsMatch}%`
                    : "Score resume vs a job description",
            icon: FileSearch,
            color: "text-sky-300",
        },
        {
            href: "/film-room",
            title: "Film room",
            desc: snap?.filmRoomGaps.length
                ? `${snap.filmRoomGaps.length} focus areas from last interview`
                : "Replay and annotate a past interview",
            icon: Clapperboard,
            color: "text-rose-300",
        },
        {
            href: "/jobs",
            title: "Open roles",
            desc: "Match openings to your resume + location",
            icon: Briefcase,
            color: "text-emerald-300",
        },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto max-w-5xl px-4 py-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-indigo-300/80">
                            <LayoutDashboard className="h-4 w-4" /> Prep dashboard
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold">Your unified practice plan</h1>
                        <p className="mt-1 text-sm text-white/45">
                            {snap?.company || snap?.role
                                ? `Target: ${[snap.role, snap.company].filter(Boolean).join(" · ")}`
                                : "Set company/role in Setup to personalize drills."}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <NotificationBell />
                        <Link href="/labs" className="text-sm text-white/60 hover:text-white">
                            ← Labs
                        </Link>
                    </div>
                </div>

                <LabAuthBanner feature="online coaching, grading, and question generation" />

                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat label="STAR stories saved" value={String(snap?.starStories ?? 0)} />
                    <Stat label="Coding unlocked" value={String(snap?.codingSolved ?? 0)} />
                    <Stat label="ATS match" value={snap?.atsMatch != null ? `${snap.atsMatch}%` : "—"} />
                    <Stat label="Film gaps" value={String(snap?.filmRoomGaps.length ?? 0)} />
                </div>

                {snap?.filmRoomGaps && snap.filmRoomGaps.length > 0 && (
                    <div className="mb-6 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                        <h2 className="text-sm font-medium text-violet-200">Practice these next</h2>
                        <ul className="mt-2 space-y-1.5 text-sm text-white/70">
                            {snap.filmRoomGaps.map((g) => (
                                <li key={g} className="flex flex-wrap items-center justify-between gap-2">
                                    <span>{g}</span>
                                    <Link
                                        href={`/star-coach?question=${encodeURIComponent(g)}&weakSpot=${encodeURIComponent("from film room")}`}
                                        className="text-xs text-violet-300 hover:underline"
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
                                className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                            >
                                <Icon className={`h-5 w-5 ${d.color}`} />
                                <h2 className="mt-3 font-medium">{d.title}</h2>
                                <p className="text-sm text-white/50">{d.desc}</p>
                            </Link>
                        );
                    })}
                </div>

                {history.length > 0 && (
                    <div className="mt-8">
                        <h2 className="mb-3 text-sm font-medium text-white/70">Recent STAR stories</h2>
                        <div className="space-y-2">
                            {history.map((h) => (
                                <Link
                                    key={h.id}
                                    href={`/star-coach?question=${encodeURIComponent(h.question)}&story=${encodeURIComponent(h.story.slice(0, 500))}&weakSpot=${encodeURIComponent(h.weakSpot)}`}
                                    className="block rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm hover:border-violet-400/30"
                                >
                                    <div className="flex justify-between gap-2">
                                        <span className="font-medium text-white/85 line-clamp-1">{h.question}</span>
                                        {h.score != null && (
                                            <span className="shrink-0 text-violet-300">{h.score}/100</span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 line-clamp-1 text-xs text-white/40">{h.story}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-8 flex flex-wrap gap-2 text-sm">
                    <Link href="/setup" className="rounded-xl bg-indigo-500/90 px-4 py-2">
                        Update target company / role
                    </Link>
                    <Link href="/panel-interview" className="rounded-xl border border-white/10 px-4 py-2 text-white/70">
                        Start panel interview
                    </Link>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="text-2xl font-semibold text-white">{value}</div>
            <div className="text-[11px] uppercase tracking-wide text-white/40">{label}</div>
        </div>
    );
}
