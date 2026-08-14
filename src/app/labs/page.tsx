"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getStorageItem } from "@/utils/storage";
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
    Sun,
    Moon,
    Eye,
    Loader2,
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
        color: "text-indigo-400",
        badges: ["New"],
    },
    {
        href: "/community",
        title: "Community chat",
        desc: "Talk with other students",
        icon: Users,
        color: "text-indigo-400",
        badges: ["Sign-in"],
    },
    {
        href: "/panel-interview",
        title: "Panel interviews",
        desc: "Multi-interviewer rounds + end score",
        icon: Users,
        color: "text-indigo-400",
        badges: ["Sign-in", "Beta"],
    },
    {
        href: "/system-design",
        title: "System design lab",
        desc: "Shapes, freestyle, export PNG, online eval",
        icon: PenTool,
        color: "text-cyan-400",
        badges: ["New", "Sign-in"],
    },
    {
        href: "/star-coach",
        title: "STAR coach",
        desc: "Generate/custom Q, history, Film Room links",
        icon: Target,
        color: "text-violet-400",
        badges: ["New", "Sign-in"],
    },
    {
        href: "/jobs",
        title: "Open job roles",
        desc: "Resume + location matched openings",
        icon: Briefcase,
        color: "text-emerald-400",
        badges: ["Sign-in"],
    },
    {
        href: "/coding-lab",
        title: "Coding lab",
        desc: "Progressive hidden tests + saved progress",
        icon: Code2,
        color: "text-amber-400",
        badges: ["Sign-in", "Beta"],
    },
    {
        href: "/coaches",
        title: "Coach marketplace",
        desc: "Book + pay + Jitsi video room",
        icon: Video,
        color: "text-pink-400",
        badges: ["New", "Sign-in"],
    },
    {
        href: "/ats-match",
        title: "ATS match",
        desc: "JD vs resume % + rewrite tips",
        icon: FileSearch,
        color: "text-sky-400",
        badges: ["Sign-in"],
    },
    {
        href: "/domains",
        title: "Domain packs",
        desc: "ML, DevOps, Android…",
        icon: Layers,
        color: "text-lime-400",
        badges: ["Public"],
    },
    {
        href: "/referrals",
        title: "Referrals",
        desc: "Invite & compare scorecards",
        icon: Share2,
        color: "text-orange-400",
        badges: ["Public"],
    },
    {
        href: "/features",
        title: "Salary intel",
        desc: "Inside Negotiate tool",
        icon: Wallet,
        color: "text-teal-400",
        badges: ["Sign-in"],
    },
    {
        href: "/setup",
        title: "Language / Sarvam",
        desc: "Hindi + regional voice (Sarvam TTS/chat)",
        icon: Globe2,
        color: "text-fuchsia-400",
        badges: ["New", "Sign-in"],
    },
    {
        href: "/features",
        title: "Prep + Gmail",
        desc: "Invites, aptitude, mocks",
        icon: Mic2,
        color: "text-rose-400",
        badges: ["Sign-in"],
    },
];

const BADGE_CLASS: Record<Badge, string> = {
    New: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300",
    Beta: "border-amber-400/40 bg-amber-500/15 text-amber-300",
    "Sign-in": "border-sky-400/40 bg-sky-500/15 text-sky-300",
    Public: "border-white/20 bg-white/10 text-white/60",
};

export default function LabsPage() {
    const router = useRouter();
    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        if (getStorageItem("userLoggedIn") !== "true") {
            router.push("/login?redirect=/labs");
        } else {
            setIsCheckingAuth(false);
        }
    }, [router]);

    useEffect(() => {
        const savedTheme = (localStorage.getItem("globalTheme") || localStorage.getItem("prointerview_theme")) as "dark" | "light" | "eyeprotect" | null;
        let active: "dark" | "light" | "eyeprotect" = "dark";

        if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
            active = savedTheme;
        } else if (typeof document !== "undefined") {
            if (document.documentElement.classList.contains("theme-eyeprotect")) {
                active = "eyeprotect";
            } else if (document.documentElement.classList.contains("theme-light")) {
                active = "light";
            }
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTheme(active);
        localStorage.setItem("globalTheme", active);
        localStorage.setItem("prointerview_theme", active);

        document.documentElement.classList.remove("theme-dark", "theme-light", "theme-eyeprotect");
        if (active === "eyeprotect") {
            document.documentElement.classList.add("theme-light", "theme-eyeprotect");
            document.documentElement.style.colorScheme = "light";
        } else {
            document.documentElement.classList.add(`theme-${active}`);
            document.documentElement.style.colorScheme = active;
        }
    }, []);

    const isLight = theme === "light" || theme === "eyeprotect";

    const cycleTheme = () => {
        const next = theme === "dark" ? "light" : theme === "light" ? "eyeprotect" : "dark";
        setTheme(next);
        localStorage.setItem("globalTheme", next);
        localStorage.setItem("prointerview_theme", next);
        document.documentElement.classList.remove("theme-dark", "theme-light", "theme-eyeprotect");
        if (next === "eyeprotect") {
            document.documentElement.classList.add("theme-light", "theme-eyeprotect");
            document.documentElement.style.colorScheme = "light";
        } else {
            document.documentElement.classList.add(`theme-${next}`);
            document.documentElement.style.colorScheme = next;
        }
    };

    if (isCheckingAuth) {
        return (
            <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
                theme === "light"
                    ? "bg-slate-100 text-slate-900"
                    : theme === "eyeprotect"
                    ? "bg-[#f3ede3] text-[#1c1917]"
                    : "bg-[#050816] text-white"
            }`}>
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className={`min-h-screen transition-colors duration-300 ${
            theme === "light"
                ? "bg-slate-100 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-[#050816] text-white"
        }`}>
            <div className="max-w-5xl mx-auto px-4 pt-3 pb-6 sm:pt-4 sm:pb-8">
                {/* Header Container */}
                <div className="mb-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                        <p className={`text-[11px] sm:text-xs uppercase tracking-widest font-bold ${isLight ? "text-indigo-600" : "text-indigo-300/80"}`}>
                            ProInterview Labs
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
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
                                {theme === "eyeprotect" && <><Eye className="w-3.5 h-3.5 text-teal-600" /> <span className="hidden sm:inline">Eye Protect</span></>}
                            </button>

                            <Link
                                href="/"
                                className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold border transition whitespace-nowrap ${
                                    isLight
                                        ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-sm"
                                        : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30"
                                }`}
                            >
                                Home →
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">Practice surfaces</h1>
                        <p className={`mt-1 max-w-2xl text-xs sm:text-sm ${isLight ? "text-slate-600" : "text-white/50"}`}>
                            Panel loops, design grading, STAR retakes, jobs, coding progression, coaches, and a unified prep dashboard.
                        </p>
                        <div className="mt-1.5">
                            <Link href="/prep" className="inline-flex items-center gap-1 font-bold text-xs sm:text-sm text-indigo-500 hover:text-indigo-400 hover:underline">
                                Open prep dashboard →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Labs Cards Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href + item.title}
                                href={item.href}
                                className={`rounded-2xl border transition p-4 flex flex-col justify-between ${
                                    theme === "light"
                                        ? "bg-white border-slate-200 hover:border-indigo-500 hover:shadow-md text-slate-900"
                                        : theme === "eyeprotect"
                                        ? "bg-[#fffcf5] border-[#8c8578] hover:border-teal-700 hover:shadow-md text-[#1c1917]"
                                        : "bg-[#0b1329] border-white/10 hover:border-indigo-500/50 hover:bg-[#111c3a] text-white shadow-lg shadow-black/20"
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <Icon className={`w-5 h-5 ${item.color}`} />
                                        <div className="flex flex-wrap gap-1">
                                            {item.badges.map((b) => (
                                                <span
                                                    key={b}
                                                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                                                        isLight
                                                            ? (b === "New" ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                                                                : b === "Beta" ? "border-amber-300 bg-amber-100 text-amber-800"
                                                                : b === "Sign-in" ? "border-sky-300 bg-sky-100 text-sky-800"
                                                                : "border-slate-300 bg-slate-100 text-slate-700")
                                                            : BADGE_CLASS[b]
                                                    }`}
                                                >
                                                    {b}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <h2 className="font-semibold text-base">{item.title}</h2>
                                    <p className={`text-xs mt-1 ${isLight ? "text-slate-600" : "text-white/50"}`}>{item.desc}</p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

