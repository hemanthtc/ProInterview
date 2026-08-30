"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getStorageItem } from "@/utils/storage";
import {
    Briefcase,
    Code2,
    Globe2,
    Layers,
    Target,
    Users,
    Video,
    BookOpen,
    ListTodo,
    Mail,
    Map,
    TrendingUp,
    Dumbbell,
    CalendarClock,
    Handshake,
    Database,
    Settings,
    Wrench,
    Share2,
    Loader2,
    Moon,
    Sun,
    Eye,
} from "lucide-react";

type Badge = "New" | "Beta" | "Sign-in" | "Public";

interface ToolItem {
    id: string;
    href: string;
    title: string;
    desc: string;
    icon: typeof Users;
    color: string;
    badges: Badge[];
}

interface Category {
    id: string;
    label: string;
    description: string;
    icon: typeof Target;
    color: string;
    items: ToolItem[];
}

const CATEGORIES: Category[] = [
    {
        id: "preparation_study",
        label: "Preparation & Study",
        description: "Build knowledge, drill weak spots, master concepts",
        icon: BookOpen,
        color: "purple",
        items: [
            {
                id: "my_progress",
                href: "/features?tool=progress",
                title: "Dashboard",
                desc: "Track scores, strengths & growth",
                icon: TrendingUp,
                color: "sky",
                badges: ["Sign-in"],
            },
            {
                id: "mock_aptitude",
                href: "/features?tool=aptitude",
                title: "Mock Aptitude",
                desc: "Timed tests with explanations",
                icon: ListTodo,
                color: "pink",
                badges: ["Sign-in"],
            },
            {
                id: "spaced_drills",
                href: "/features?tool=drills",
                title: "Spaced Drills",
                desc: "Smart repetition for weak areas",
                icon: Dumbbell,
                color: "orange",
                badges: ["Sign-in"],
            },
            {
                id: "prep_packs",
                href: "/features?tool=prep_pack",
                title: "Prep Packs",
                desc: "Curated role-based prep bundles",
                icon: CalendarClock,
                color: "sky",
                badges: ["Sign-in"],
            },
            {
                id: "study_materials",
                href: "/features?tool=study_materials",
                title: "Study Materials",
                desc: "Notes, cheatsheets & resources",
                icon: BookOpen,
                color: "purple",
                badges: ["Sign-in"],
            },
            {
                id: "domain_packs",
                href: "/domains",
                title: "Domain Packs",
                desc: "ML, DevOps, Android…",
                icon: Layers,
                color: "lime",
                badges: ["Public"],
            },
            {
                id: "coding_assessment",
                href: "/coding-assessment",
                title: "Coding Assessment",
                desc: "HackerRank-style timed test + AI proctor",
                icon: Code2,
                color: "amber",
                badges: ["New", "Sign-in"],
            },
        ],
    },
    {
        id: "ai_tools",
        label: "AI Tools",
        description: "AI-powered utilities for emails, roadmaps, and data",
        icon: Wrench,
        color: "amber",
        items: [
            {
                id: "email_analyser",
                href: "/features?tool=email_analyser",
                title: "AI Email Analyser",
                desc: "Tone, grammar & clarity analysis",
                icon: Mail,
                color: "teal",
                badges: ["Sign-in"],
            },
            {
                id: "roadmap_generator",
                href: "/features?tool=roadmap_generator",
                title: "Roadmap Generator",
                desc: "Personalized learning path",
                icon: Map,
                color: "emerald",
                badges: ["Sign-in"],
            },
            {
                id: "synthetic_data",
                href: "/features?tool=synthetic_data",
                title: "Synthetic Data Generator",
                desc: "Mock datasets for practice",
                icon: Database,
                color: "teal",
                badges: ["Sign-in"],
            },
        ],
    },
    {
        id: "settings_analytics",
        label: "Settings & Analytics",
        description: "Track progress, connect with others, customize",
        icon: Settings,
        color: "rose",
        items: [
            {
                id: "community_chat",
                href: "/community",
                title: "Community Chat",
                desc: "Talk with other students",
                icon: Users,
                color: "violet",
                badges: ["Sign-in"],
            },
            {
                id: "language_sarvam",
                href: "/setup?mode=language_sarvam",
                title: "Language / Sarvam",
                desc: "Hindi + regional voice (Sarvam TTS)",
                icon: Globe2,
                color: "indigo",
                badges: ["New", "Sign-in"],
            },
        ],
    },
    {
        id: "career_jobs",
        label: "Career & Jobs",
        description: "Find jobs, negotiate offers, get coached",
        icon: Briefcase,
        color: "emerald",
        items: [
            {
                id: "open_jobs",
                href: "/jobs",
                title: "Open Job Roles",
                desc: "Resume + location matched openings",
                icon: Briefcase,
                color: "emerald",
                badges: ["Sign-in"],
            },
            {
                id: "offer_negotiation",
                href: "/features?tool=negotiate",
                title: "Offer Negotiation",
                desc: "Salary strategy & AI simulation",
                icon: Handshake,
                color: "green",
                badges: ["Sign-in"],
            },
            {
                id: "coach_marketplace",
                href: "/coaches",
                title: "Coach Marketplace",
                desc: "Book + pay + Jitsi video room",
                icon: Video,
                color: "pink",
                badges: ["New", "Sign-in"],
            },
            {
                id: "referrals",
                href: "/referrals",
                title: "Referrals",
                desc: "Invite & compare scorecards",
                icon: Share2,
                color: "orange",
                badges: ["Public"],
            },
        ],
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
    },
    green: {
        bgLight: "bg-green-50 border border-green-100",
        bgDark: "bg-green-500/10 border border-green-500/20",
        textLight: "text-green-600",
        textDark: "text-green-400"
    },
    purple: {
        bgLight: "bg-purple-50 border border-purple-100",
        bgDark: "bg-purple-500/10 border border-purple-500/20",
        textLight: "text-purple-600",
        textDark: "text-purple-400"
    },
};

// Category section header colors
const categoryHeaderColors: Record<string, {
    light: { bg: string; border: string; text: string; desc: string; iconBg: string };
    dark: { bg: string; border: string; text: string; desc: string; iconBg: string };
    eyeprotect: { bg: string; border: string; text: string; desc: string; iconBg: string };
}> = {
    indigo: {
        dark: { bg: "bg-indigo-500/5", border: "border-indigo-500/15", text: "text-indigo-400", desc: "text-indigo-300/40", iconBg: "bg-indigo-500/15 text-indigo-400" },
        light: { bg: "bg-indigo-50/50", border: "border-indigo-100", text: "text-indigo-700", desc: "text-indigo-500/60", iconBg: "bg-indigo-100 text-indigo-600" },
        eyeprotect: { bg: "bg-indigo-50/30", border: "border-[#8c8578]/20", text: "text-indigo-800", desc: "text-stone-500", iconBg: "bg-indigo-100/80 text-indigo-700" },
    },
    purple: {
        dark: { bg: "bg-purple-500/5", border: "border-purple-500/15", text: "text-purple-400", desc: "text-purple-300/40", iconBg: "bg-purple-500/15 text-purple-400" },
        light: { bg: "bg-purple-50/50", border: "border-purple-100", text: "text-purple-700", desc: "text-purple-500/60", iconBg: "bg-purple-100 text-purple-600" },
        eyeprotect: { bg: "bg-purple-50/30", border: "border-[#8c8578]/20", text: "text-purple-800", desc: "text-stone-500", iconBg: "bg-purple-100/80 text-purple-700" },
    },
    sky: {
        dark: { bg: "bg-sky-500/5", border: "border-sky-500/15", text: "text-sky-400", desc: "text-sky-300/40", iconBg: "bg-sky-500/15 text-sky-400" },
        light: { bg: "bg-sky-50/50", border: "border-sky-100", text: "text-sky-700", desc: "text-sky-500/60", iconBg: "bg-sky-100 text-sky-600" },
        eyeprotect: { bg: "bg-sky-50/30", border: "border-[#8c8578]/20", text: "text-sky-800", desc: "text-stone-500", iconBg: "bg-sky-100/80 text-sky-700" },
    },
    emerald: {
        dark: { bg: "bg-emerald-500/5", border: "border-emerald-500/15", text: "text-emerald-400", desc: "text-emerald-300/40", iconBg: "bg-emerald-500/15 text-emerald-400" },
        light: { bg: "bg-emerald-50/50", border: "border-emerald-100", text: "text-emerald-700", desc: "text-emerald-500/60", iconBg: "bg-emerald-100 text-emerald-600" },
        eyeprotect: { bg: "bg-emerald-50/30", border: "border-[#8c8578]/20", text: "text-emerald-800", desc: "text-stone-500", iconBg: "bg-emerald-100/80 text-emerald-700" },
    },
    amber: {
        dark: { bg: "bg-amber-500/5", border: "border-amber-500/15", text: "text-amber-400", desc: "text-amber-300/40", iconBg: "bg-amber-500/15 text-amber-400" },
        light: { bg: "bg-amber-50/50", border: "border-amber-100", text: "text-amber-700", desc: "text-amber-500/60", iconBg: "bg-amber-100 text-amber-600" },
        eyeprotect: { bg: "bg-amber-50/30", border: "border-[#8c8578]/20", text: "text-amber-800", desc: "text-stone-500", iconBg: "bg-amber-100/80 text-amber-700" },
    },
    rose: {
        dark: { bg: "bg-rose-500/5", border: "border-rose-500/15", text: "text-rose-400", desc: "text-rose-300/40", iconBg: "bg-rose-500/15 text-rose-400" },
        light: { bg: "bg-rose-50/50", border: "border-rose-100", text: "text-rose-700", desc: "text-rose-500/60", iconBg: "bg-rose-100 text-rose-600" },
        eyeprotect: { bg: "bg-rose-50/30", border: "border-[#8c8578]/20", text: "text-rose-800", desc: "text-stone-500", iconBg: "bg-rose-100/80 text-rose-700" },
    },
};

export default function LabsPage() {
    const router = useRouter();
    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [hiddenTools, setHiddenTools] = useState<string[]>([]);

    useEffect(() => {
        if (getStorageItem("userLoggedIn") !== "true") {
            router.push("/login?redirect=/labs");
        } else {
            Promise.resolve().then(() => {
                setIsCheckingAuth(false);
            });
        }
    }, [router]);

    // Fetch hidden tools from admin config
    useEffect(() => {
        fetch("/api/admin/labs-visibility")
            .then((r) => r.json())
            .then((d) => {
                if (d.hiddenTools) {
                    setHiddenTools(d.hiddenTools);
                }
            })
            .catch(() => {
                // If fetch fails, show all tools
                setHiddenTools([]);
            });
    }, []);

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

    // Filter out hidden tools from each category
    const visibleCategories = CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => !hiddenTools.includes(item.id)),
    })).filter((cat) => cat.items.length > 0);

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
                <div className="mb-6 space-y-1.5">
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
                            All tools organized by category — interview practice, preparation, resume building, career tools, and more.
                        </p>
                        <div className="mt-1.5">
                            <Link href="/" className="inline-flex items-center gap-1 font-bold text-xs sm:text-sm text-indigo-500 hover:text-indigo-400 hover:underline">
                                Go to home dashboard →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Category Sections */}
                <div className="space-y-5 sm:space-y-6">
                    {visibleCategories.map((category) => {
                        const CatIcon = category.icon;
                        const headerColors = categoryHeaderColors[category.color] || categoryHeaderColors.indigo;
                        const themeKey = theme === "eyeprotect" ? "eyeprotect" : theme;
                        const hc = headerColors[themeKey];

                        return (
                            <section key={category.id}>
                                {/* Category Header */}
                                <div className={`flex items-center gap-2.5 mb-3 px-1`}>
                                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${hc.iconBg}`}>
                                        <CatIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div>
                                        <h2 className={`text-sm sm:text-base font-bold tracking-tight ${hc.text}`}>
                                            {category.label}
                                        </h2>
                                        <p className={`text-[9.5px] sm:text-xs ${hc.desc}`}>
                                            {category.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Tools Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 w-full">
                                    {category.items.map((item) => {
                                        const Icon = item.icon;
                                        const themeInfo = colorThemes[item.color] || colorThemes.indigo;
                                        const iconBg = isLight ? themeInfo.bgLight : themeInfo.bgDark;
                                        const iconText = isLight ? themeInfo.textLight : themeInfo.textDark;

                                        return (
                                            <Link
                                                key={item.id}
                                                href={item.href}
                                                className={`rounded-2xl border p-4 transition-all duration-300 flex flex-col gap-3 ${
                                                    theme === "light"
                                                        ? "bg-white border-slate-100 hover:border-indigo-500 hover:shadow-[0_8px_30px_rgb(241,245,249)] text-slate-900 shadow-sm shadow-slate-100/50"
                                                        : theme === "eyeprotect"
                                                        ? "bg-[#fffcf5] border-[#8c8578]/20 hover:border-teal-700 hover:shadow-[0_8px_30px_rgb(230,225,215)] text-[#1c1917] shadow-sm shadow-stone-200/20"
                                                        : "bg-[#0b1329] border-white/5 hover:border-indigo-500/50 hover:bg-[#111c3a] text-white shadow-lg shadow-black/20"
                                                }`}
                                            >
                                                <div className="flex flex-col gap-3 w-full">
                                                    {/* Top Row: Icon Container and Badges */}
                                                    <div className="flex items-center justify-between gap-2 w-full">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                                                            <Icon className={`w-5 h-5 ${iconText}`} />
                                                        </div>
                                                        
                                                        <div className="flex flex-wrap justify-end gap-1">
                                                            {item.badges.map((b) => (
                                                                <span
                                                                    key={b}
                                                                    className={`rounded px-1.5 py-0.5 text-[8px] sm:text-[10px] font-black border tracking-tight ${
                                                                        isLight
                                                                            ? (b === "New" ? "border-emerald-250 bg-emerald-50 text-emerald-700"
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
                                                    
                                                    {/* Bottom Stack: Title and Description */}
                                                    <div className="space-y-1">
                                                        <h3 className={`font-bold text-xs sm:text-sm tracking-tight text-left transition-colors duration-300 ${
                                                            theme === "light" ? "text-slate-800" : theme === "eyeprotect" ? "text-stone-800" : "text-white"
                                                        }`}>
                                                            {item.title}
                                                        </h3>
                                                        
                                                        <p className={`text-[9.5px] sm:text-xs leading-relaxed text-left font-medium transition-colors duration-300 ${
                                                            isLight ? "text-slate-500" : "text-white/50"
                                                        }`}>
                                                            {item.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
