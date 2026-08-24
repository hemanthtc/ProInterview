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
        color: "indigo",
        badges: ["New"],
    },
    {
        href: "/community",
        title: "Community chat",
        desc: "Talk with other students",
        icon: Users,
        color: "violet",
        badges: ["Sign-in"],
    },
    {
        href: "/panel-interview",
        title: "Panel interviews",
        desc: "Multi-interviewer rounds + end score",
        icon: Users,
        color: "orange",
        badges: ["Sign-in", "Beta"],
    },
    {
        href: "/system-design",
        title: "System design lab",
        desc: "Shapes, freestyle, export PNG, online eval",
        icon: PenTool,
        color: "cyan",
        badges: ["New", "Sign-in"],
    },
    {
        href: "/star-coach",
        title: "STAR coach",
        desc: "Generate/custom Q, history, Film Room links",
        icon: Target,
        color: "violet",
        badges: ["New", "Sign-in"],
    },
    {
        href: "/jobs",
        title: "Open job roles",
        desc: "Resume + location matched openings",
        icon: Briefcase,
        color: "emerald",
        badges: ["Sign-in"],
    },
    {
        href: "/coding-lab",
        title: "Coding lab",
        desc: "Progressive hidden tests + saved progress",
        icon: Code2,
        color: "amber",
        badges: ["Sign-in", "Beta"],
    },
    {
        href: "/coaches",
        title: "Coach marketplace",
        desc: "Book + pay + Jitsi video room",
        icon: Video,
        color: "pink",
        badges: ["New", "Sign-in"],
    },
    {
        href: "/ats-match",
        title: "ATS match",
        desc: "JD vs resume % + rewrite tips",
        icon: FileSearch,
        color: "sky",
        badges: ["Sign-in"],
    },
    {
        href: "/domains",
        title: "Domain packs",
        desc: "ML, DevOps, Android…",
        icon: Layers,
        color: "lime",
        badges: ["Public"],
    },
    {
        href: "/referrals",
        title: "Referrals",
        desc: "Invite & compare scorecards",
        icon: Share2,
        color: "orange",
        badges: ["Public"],
    },
    {
        href: "/features",
        title: "Salary intel",
        desc: "Inside Negotiate tool",
        icon: Wallet,
        color: "teal",
        badges: ["Sign-in"],
    },
    {
        href: "/setup",
        title: "Language / Sarvam",
        desc: "Hindi + regional voice (Sarvam TTS/chat)",
        icon: Globe2,
        color: "indigo",
        badges: ["New", "Sign-in"],
    },
    {
        href: "/features",
        title: "Prep + Gmail",
        desc: "Invites, aptitude, mocks",
        icon: Mic2,
        color: "rose",
        badges: ["Sign-in"],
    },
];

const BADGE_CLASS: Record<Badge, string> = {
    New: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300",
    Beta: "border-amber-400/40 bg-amber-500/15 text-amber-300",
    "Sign-in": "border-sky-400/40 bg-sky-500/15 text-sky-300",
    Public: "border-white/20 bg-white/10 text-white/60",
};

const colorThemes: Record<string, {
    bgLight: string;
    bgDark: string;
    textLight: string;
    textDark: string;
}> = {
    indigo: {
        bgLight: "bg-indigo-50 border border-indigo-100",
        bgDark: "bg-indigo-500/10 border border-indigo-500/20",
        textLight: "text-indigo-600",
        textDark: "text-indigo-400"
    },
    violet: {
        bgLight: "bg-violet-50 border border-violet-100",
        bgDark: "bg-violet-500/10 border border-violet-500/20",
        textLight: "text-violet-600",
        textDark: "text-violet-400"
    },
    orange: {
        bgLight: "bg-orange-50 border border-orange-100",
        bgDark: "bg-orange-500/10 border border-orange-500/20",
        textLight: "text-orange-600",
        textDark: "text-orange-400"
    },
    cyan: {
        bgLight: "bg-cyan-50 border border-cyan-100",
        bgDark: "bg-cyan-500/10 border border-cyan-500/20",
        textLight: "text-cyan-600",
        textDark: "text-cyan-400"
    },
    fuchsia: {
        bgLight: "bg-fuchsia-50 border border-fuchsia-100",
        bgDark: "bg-fuchsia-500/10 border border-fuchsia-500/20",
        textLight: "text-fuchsia-600",
        textDark: "text-fuchsia-400"
    },
    emerald: {
        bgLight: "bg-emerald-50 border border-emerald-100",
        bgDark: "bg-emerald-500/10 border border-emerald-500/20",
        textLight: "text-emerald-600",
        textDark: "text-emerald-400"
    },
    amber: {
        bgLight: "bg-amber-50 border border-amber-100",
        bgDark: "bg-amber-500/10 border border-amber-500/20",
        textLight: "text-amber-600",
        textDark: "text-amber-400"
    },
    pink: {
        bgLight: "bg-pink-50 border border-pink-100",
        bgDark: "bg-pink-500/10 border border-pink-500/20",
        textLight: "text-pink-600",
        textDark: "text-pink-400"
    },
    sky: {
        bgLight: "bg-sky-50 border border-sky-100",
        bgDark: "bg-sky-500/10 border border-sky-500/20",
        textLight: "text-sky-600",
        textDark: "text-sky-400"
    },
    lime: {
        bgLight: "bg-lime-50 border border-lime-100",
        bgDark: "bg-lime-500/10 border border-lime-500/20",
        textLight: "text-lime-700",
        textDark: "text-lime-400"
    },
    teal: {
        bgLight: "bg-teal-50 border border-teal-100",
        bgDark: "bg-teal-500/10 border border-teal-500/20",
        textLight: "text-teal-600",
        textDark: "text-teal-400"
    },
    rose: {
        bgLight: "bg-rose-50 border border-rose-100",
        bgDark: "bg-rose-500/10 border border-rose-500/20",
        textLight: "text-rose-600",
        textDark: "text-rose-400"
    }
};

export default function LabsPage() {
    const router = useRouter();
    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        if (getStorageItem("userLoggedIn") !== "true") {
            router.push("/login?redirect=/labs");
        } else {
            Promise.resolve().then(() => {
                setIsCheckingAuth(false);
            });
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
                <div className="grid grid-cols-2 md:grid-cols-2 gap-2.5 sm:gap-4 w-full z-10">
                    {ITEMS.map((item) => {
                        const Icon = item.icon;
                        const themeInfo = colorThemes[item.color] || colorThemes.indigo;
                        const iconBg = isLight ? themeInfo.bgLight : themeInfo.bgDark;
                        const iconText = isLight ? themeInfo.textLight : themeInfo.textDark;

                        return (
                            <Link
                                key={item.href + item.title}
                                href={item.href}
                                className={`rounded-2xl border p-3.5 transition-all duration-300 flex flex-row gap-3 items-start ${
                                    theme === "light"
                                        ? "bg-white border-slate-100 hover:border-indigo-500 hover:shadow-[0_8px_30px_rgb(241,245,249)] text-slate-900 shadow-sm shadow-slate-100/50"
                                        : theme === "eyeprotect"
                                        ? "bg-[#fffcf5] border-[#8c8578]/20 hover:border-teal-700 hover:shadow-[0_8px_30px_rgb(230,225,215)] text-[#1c1917] shadow-sm shadow-stone-200/20"
                                        : "bg-[#0b1329] border-white/5 hover:border-indigo-500/50 hover:bg-[#111c3a] text-white shadow-lg shadow-black/20"
                                }`}
                            >
                                {/* Left: Rounded Icon Container */}
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                                    <Icon className={`w-5 h-5 ${iconText}`} />
                                </div>

                                {/* Right: Title, Badges, and Description */}
                                <div className="flex-1 min-w-0 flex flex-col">
                                    <div className="flex items-start justify-between gap-1.5 w-full">
                                        <h2 className={`font-bold text-[12.5px] sm:text-base tracking-tight truncate text-left transition-colors duration-300 ${
                                            theme === "light" ? "text-slate-800" : theme === "eyeprotect" ? "text-stone-800" : "text-white"
                                        }`}>
                                            {item.title}
                                        </h2>
                                        
                                        <div className="flex flex-wrap justify-end gap-1 shrink-0">
                                            {item.badges.map((b) => (
                                                <span
                                                    key={b}
                                                    className={`rounded px-1 py-0.5 text-[7.5px] sm:text-[9.5px] font-black border tracking-tight ${
                                                        isLight
                                                            ? (b === "New" ? "border-emerald-250 bg-emerald-50 text-emerald-800"
                                                                : b === "Beta" ? "border-amber-250 bg-amber-50 text-amber-800"
                                                                : b === "Sign-in" ? "border-sky-250 bg-sky-50 text-sky-800"
                                                                : "border-slate-200 bg-slate-50 text-slate-700")
                                                            : BADGE_CLASS[b]
                                                    }`}
                                                >
                                                    {b}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <p className={`text-[9.5px] sm:text-xs mt-1 leading-relaxed text-left font-medium transition-colors duration-300 ${
                                        isLight ? "text-slate-500" : "text-white/50"
                                    }`}>
                                        {item.desc}
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

