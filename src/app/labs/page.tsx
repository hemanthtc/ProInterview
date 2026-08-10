"use client";

import Link from "next/link";
import {
    Briefcase,
    Code2,
    FileSearch,
    Globe2,
    Layers,
    Mic2,
    PenTool,
    Share2,
    Target,
    Users,
    Video,
    Wallet,
} from "lucide-react";

const ITEMS = [
    { href: "/community", title: "Community chat", desc: "Talk with other students", icon: Users, color: "text-indigo-300" },
    { href: "/panel-interview", title: "Panel interviews", desc: "Multi-interviewer rounds", icon: Users, color: "text-indigo-300" },
    { href: "/system-design", title: "System design lab", desc: "Interactive board + online eval", icon: PenTool, color: "text-cyan-300" },
    { href: "/star-coach", title: "STAR coach", desc: "Behavioral drills + retakes", icon: Target, color: "text-violet-300" },
    { href: "/jobs", title: "Job board", desc: "Apply with scorecard", icon: Briefcase, color: "text-emerald-300" },
    { href: "/coding-lab", title: "Coding lab", desc: "Progressive hidden tests", icon: Code2, color: "text-amber-300" },
    { href: "/coaches", title: "Coach marketplace", desc: "Book human coaches", icon: Video, color: "text-pink-300" },
    { href: "/ats-match", title: "ATS match", desc: "JD vs resume %", icon: FileSearch, color: "text-sky-300" },
    { href: "/domains", title: "Domain packs", desc: "ML, DevOps, Android…", icon: Layers, color: "text-lime-300" },
    { href: "/referrals", title: "Referrals", desc: "Invite & compare", icon: Share2, color: "text-orange-300" },
    { href: "/features", title: "Salary intel", desc: "Inside Negotiate tool", icon: Wallet, color: "text-teal-300" },
    { href: "/setup", title: "Language / Sarvam", desc: "Hindi + regional voice", icon: Globe2, color: "text-fuchsia-300" },
    { href: "/features", title: "Prep + Gmail", desc: "Invites, aptitude, mocks", icon: Mic2, color: "text-rose-300" },
];

export default function LabsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-5xl mx-auto px-4 py-10">
                <div className="mb-8">
                    <p className="text-xs uppercase tracking-widest text-white/40">ProInterview Labs</p>
                    <h1 className="text-3xl font-semibold mt-1">New practice surfaces</h1>
                    <p className="text-white/50 mt-2 max-w-2xl text-sm">
                        Working MVPs for the product backlog — panel loops, design grading, STAR retakes, jobs, coding progression, coaches, and more.
                    </p>
                    <Link href="/" className="inline-block mt-3 text-sm text-indigo-300 hover:underline">
                        ← Home
                    </Link>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href + item.title}
                                href={item.href}
                                className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4"
                            >
                                <Icon className={`w-5 h-5 ${item.color}`} />
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
