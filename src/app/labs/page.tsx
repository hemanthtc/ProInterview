"use client";

import Link from "next/link";
import {
    Briefcase,
    Code2,
    FileSearch,
    Globe2,
    LayoutDashboard,
    Layers,
    Mic2,
    PenTool,
    Share2,
    Target,
    Users,
    Video,
    Wallet,
} from "lucide-react";

type Badge = "New" | "Beta" | "Sign-in" | "Public";

const ITEMS: {
    href: string;
    title: string;
    desc: string;
    icon: typeof Users;
    color: string;
    badges: Badge[];
}[] = [
    {
        href: "/prep",
        title: "Prep dashboard",
        desc: "Unified drills, gaps, and progress",
        icon: LayoutDashboard,
        color: "text-indigo-300",
        badges: ["New"],
    },
    {
        href: "/community",
        title: "Community chat",
        desc: "Talk with other students",
        icon: Users,
        color: "text-indigo-300",
        badges: ["Sign-in"],
    },
    {
        href: "/panel-interview",
        title: "Panel interviews",
        desc: "Multi-interviewer rounds + end score",
        icon: Users,
        color: "text-indigo-300",
        badges: ["Sign-in", "Beta"],
    },
    {
        href: "/system-design",
        title: "System design lab",
        desc: "Shapes, freestyle, export PNG, online eval",
        icon: PenTool,
        color: "text-cyan-300",
        badges: ["New", "Sign-in"],
    },
    {
        href: "/star-coach",
        title: "STAR coach",
        desc: "Generate/custom Q, history, Film Room links",
        icon: Target,
        color: "text-violet-300",
        badges: ["New", "Sign-in"],
    },
    {
        href: "/jobs",
        title: "Open job roles",
        desc: "Resume + location matched openings",
        icon: Briefcase,
        color: "text-emerald-300",
        badges: ["Sign-in"],
    },
    {
        href: "/coding-lab",
        title: "Coding lab",
        desc: "Progressive hidden tests + saved progress",
        icon: Code2,
        color: "text-amber-300",
        badges: ["Sign-in", "Beta"],
    },
    {
        href: "/coaches",
        title: "Coach marketplace",
        desc: "Book human coaches",
        icon: Video,
        color: "text-pink-300",
        badges: ["Beta"],
    },
    {
        href: "/ats-match",
        title: "ATS match",
        desc: "JD vs resume % + rewrite tips",
        icon: FileSearch,
        color: "text-sky-300",
        badges: ["Sign-in"],
    },
    {
        href: "/domains",
        title: "Domain packs",
        desc: "ML, DevOps, Android…",
        icon: Layers,
        color: "text-lime-300",
        badges: ["Public"],
    },
    {
        href: "/referrals",
        title: "Referrals",
        desc: "Invite & compare scorecards",
        icon: Share2,
        color: "text-orange-300",
        badges: ["Public"],
    },
    {
        href: "/features",
        title: "Salary intel",
        desc: "Inside Negotiate tool",
        icon: Wallet,
        color: "text-teal-300",
        badges: ["Sign-in"],
    },
    {
        href: "/setup",
        title: "Language / Sarvam",
        desc: "Hindi + regional voice",
        icon: Globe2,
        color: "text-fuchsia-300",
        badges: ["Sign-in"],
    },
    {
        href: "/features",
        title: "Prep + Gmail",
        desc: "Invites, aptitude, mocks",
        icon: Mic2,
        color: "text-rose-300",
        badges: ["Sign-in"],
    },
];

const BADGE_CLASS: Record<Badge, string> = {
    New: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
    Beta: "border-amber-400/40 bg-amber-500/15 text-amber-100",
    "Sign-in": "border-sky-400/40 bg-sky-500/15 text-sky-100",
    Public: "border-white/20 bg-white/10 text-white/60",
};

export default function LabsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto max-w-5xl px-4 py-10">
                <div className="mb-8">
                    <p className="text-xs uppercase tracking-widest text-white/40">ProInterview Labs</p>
                    <h1 className="mt-1 text-3xl font-semibold">Practice surfaces</h1>
                    <p className="mt-2 max-w-2xl text-sm text-white/50">
                        Panel loops, design grading, STAR retakes, jobs, coding progression, coaches, and a unified prep
                        dashboard.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                        <Link href="/prep" className="text-indigo-300 hover:underline">
                            Open prep dashboard →
                        </Link>
                        <Link href="/" className="text-white/50 hover:text-white">
                            ← Home
                        </Link>
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href + item.title}
                                href={item.href}
                                className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <Icon className={`h-5 w-5 ${item.color}`} />
                                    <div className="flex flex-wrap justify-end gap-1">
                                        {item.badges.map((b) => (
                                            <span
                                                key={b}
                                                className={`rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${BADGE_CLASS[b]}`}
                                            >
                                                {b}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <h2 className="mt-3 font-medium">{item.title}</h2>
                                <p className="text-sm text-white/50">{item.desc}</p>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
