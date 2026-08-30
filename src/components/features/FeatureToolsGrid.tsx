"use client";

import Link from "next/link";
import {
    Briefcase,
    Code2,
    FileSearch,
    PenTool,
    Target,
    Users,
    Video,
    Play,
    Sparkles,
    FileText,
    ArrowRight,
} from "lucide-react";

type Badge = "New" | "Beta" | "Sign-in" | "Public";

interface FeatureToolsGridProps {
    isLight: boolean;
    isRealisticMode: boolean;
    theme?: "dark" | "light" | "eyeprotect";
    hiddenTools?: string[];
    onSelectAnalysis: () => void;
    onStartInterview: () => void;
    onSelectProInterviewer: () => void;
    onSelectAptitude?: () => void;
    onSelectEmailAnalyser?: () => void;
    onSelectPrepPack?: () => void;
    onSelectDrills?: () => void;
    onSelectNegotiate?: () => void;
    onSelectRoadmap?: () => void;
    onSelectStudyMaterials?: () => void;
    onSelectSyntheticData?: () => void;
    onSelectProgress?: () => void;
}

interface ToolItem {
    id: string;
    href?: string;
    onClick?: () => void;
    title: string;
    desc: string;
    icon: any;
    color: string;
    badges: Badge[];
}

interface Category {
    id: string;
    label: string;
    description: string;
    icon: any;
    color: string;
    items: ToolItem[];
}

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
};

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
    sky: {
        dark: { bg: "bg-sky-500/5", border: "border-sky-500/15", text: "text-sky-400", desc: "text-sky-300/40", iconBg: "bg-sky-500/15 text-sky-400" },
        light: { bg: "bg-sky-50/50", border: "border-sky-100", text: "text-sky-700", desc: "text-sky-500/60", iconBg: "bg-sky-100 text-sky-600" },
        eyeprotect: { bg: "bg-sky-50/30", border: "border-[#8c8578]/20", text: "text-sky-800", desc: "text-stone-500", iconBg: "bg-sky-100/80 text-sky-700" },
    },
};

const BADGE_CLASS: Record<Badge, string> = {
    New: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300",
    Beta: "border-amber-400/40 bg-amber-500/15 text-amber-300",
    "Sign-in": "border-sky-400/40 bg-sky-500/15 text-sky-300",
    Public: "border-white/20 bg-white/10 text-white/60",
};

export default function FeatureToolsGrid({
    isLight,
    isRealisticMode,
    theme,
    hiddenTools = [],
    onSelectAnalysis,
    onStartInterview,
    onSelectProInterviewer,
}: FeatureToolsGridProps) {
    const activeTheme = theme || (isLight ? "light" : "dark");
    const descColor = activeTheme === "eyeprotect" ? "text-stone-600 font-semibold" : activeTheme === "light" ? "text-slate-500 font-semibold" : "text-white/50";

    const CATEGORIES: Category[] = [
        {
            id: "interview_practice",
            label: "Interview Practice",
            description: "Simulate real interviews and build confidence",
            icon: Target,
            color: "indigo",
            items: [
                {
                    id: "start_interview",
                    onClick: onStartInterview,
                    title: "Start Interview",
                    desc: "Real-time AI mock interview",
                    icon: Play,
                    color: "sky",
                    badges: ["Sign-in"],
                },
                {
                    id: "panel_interview",
                    href: "/panel-interview",
                    title: "Panel Interviews",
                    desc: "Multi-interviewer rounds + end score",
                    icon: Users,
                    color: "orange",
                    badges: ["Sign-in", "Beta"],
                },
                {
                    id: "star_coach",
                    href: "/star-coach",
                    title: "STAR Coach",
                    desc: "Generate/custom Q, history, Film Room",
                    icon: Target,
                    color: "violet",
                    badges: ["New", "Sign-in"],
                },
                {
                    id: "system_design",
                    href: "/system-design",
                    title: "System Design Lab",
                    desc: "Shapes, freestyle, export, online eval",
                    icon: PenTool,
                    color: "cyan",
                    badges: ["New", "Sign-in"],
                },
                {
                    id: "coding_lab",
                    href: "/coding-lab",
                    title: "Coding Lab",
                    desc: "Progressive hidden tests + saved progress",
                    icon: Code2,
                    color: "amber",
                    badges: ["Sign-in", "Beta"],
                },
                {
                    id: "coding_assessment",
                    href: "/coding-assessment",
                    title: "Coding Assessment",
                    desc: "Timed HR-style test, AI face proctor, no tab switch",
                    icon: Code2,
                    color: "emerald",
                    badges: ["New", "Sign-in"],
                },
            ],
        },
        {
            id: "resume_profile",
            label: "Resume & Profile",
            description: "Craft winning resumes and optimize your profile",
            icon: FileText,
            color: "sky",
            items: [
                {
                    id: "pre_interview_analysis",
                    onClick: onSelectAnalysis,
                    title: "Pre-Interview Analysis",
                    desc: "AI resume & skills feedback",
                    icon: Sparkles,
                    color: "indigo",
                    badges: ["Sign-in"],
                },
                {
                    id: "resume_builder",
                    onClick: onSelectProInterviewer,
                    title: "Resume Builder",
                    desc: "ATS-optimized premium resumes",
                    icon: FileText,
                    color: "amber",
                    badges: ["Sign-in"],
                },
                {
                    id: "ats_match",
                    href: "/ats-match",
                    title: "ATS Match",
                    desc: "JD vs resume % + rewrite tips",
                    icon: FileSearch,
                    color: "sky",
                    badges: ["Sign-in"],
                },
            ],
        },
    ];

    // Filter out hidden tools
    const visibleCategories = CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => !hiddenTools.includes(item.id)),
    })).filter((cat) => cat.items.length > 0);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 px-2 md:px-4 z-10">
            {/* Header Title */}
            <div className="text-center mb-6">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/95 to-white/60 mb-3">
                    Features
                </h1>
                <p className={`text-sm max-w-xl mx-auto ${descColor}`}>
                    Select an option below to simulate real-time AI mock interviews, practice system design, build premium ATS resumes, or analyze your skills.
                </p>
            </div>

            {/* Categorized Tools Grid */}
            <div className="space-y-6 sm:space-y-8">
                {visibleCategories.map((category) => {
                    const CatIcon = category.icon;
                    const headerColors = categoryHeaderColors[category.color] || categoryHeaderColors.indigo;
                    const hc = headerColors[activeTheme];

                    return (
                        <section key={category.id} className="space-y-3">
                            {/* Category Title */}
                            <div className="flex items-center gap-2.5 px-1">
                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${hc.iconBg}`}>
                                    <CatIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <div className="text-left">
                                    <h2 className={`text-sm sm:text-base font-bold tracking-tight ${hc.text}`}>
                                        {category.label}
                                    </h2>
                                    <p className={`text-[10px] sm:text-xs ${hc.desc}`}>
                                        {category.description}
                                    </p>
                                </div>
                            </div>

                            {/* Options Grid */}
                            <div className={`grid ${isRealisticMode && category.id === 'interview_practice' ? 'grid-cols-1 max-w-xl' : 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3'} gap-3 sm:gap-4 w-full`}>
                                {category.items.map((item) => {
                                    const Icon = item.icon;
                                    const themeInfo = colorThemes[item.color] || colorThemes.indigo;
                                    const iconBg = isLight ? themeInfo.bgLight : themeInfo.bgDark;
                                    const iconText = isLight ? themeInfo.textLight : themeInfo.textDark;

                                    const CardContent = (
                                        <div className="flex flex-col gap-3 w-full h-full justify-between">
                                            <div className="flex flex-col gap-2.5">
                                                {/* Top Row: Icon and Badges */}
                                                <div className="flex items-center justify-between gap-2 w-full">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                                                        <Icon className={`w-4.5 h-4.5 ${iconText}`} />
                                                    </div>
                                                    
                                                    <div className="flex flex-wrap justify-end gap-1">
                                                        {item.badges.map((b) => (
                                                            <span
                                                                key={b}
                                                                className={`rounded px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black border tracking-tight ${
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
                                                        activeTheme === "light" ? "text-slate-800" : activeTheme === "eyeprotect" ? "text-stone-800" : "text-white group-hover:text-indigo-400"
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

                                            {/* Bottom indicator */}
                                            <div className="flex justify-end pt-1">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                                    isLight ? "bg-slate-100 text-slate-600" : "bg-white/5 text-white/50"
                                                } group-hover:bg-indigo-600 group-hover:text-white`}>
                                                    <ArrowRight className="w-3 h-3" />
                                                </div>
                                            </div>
                                        </div>
                                    );

                                    const className = `group rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between h-full ${
                                        activeTheme === "light"
                                            ? "bg-white border-slate-150 hover:border-indigo-500 hover:shadow-[0_8px_30px_rgb(241,245,249)] text-slate-900 shadow-sm"
                                            : activeTheme === "eyeprotect"
                                            ? "bg-[#fffcf5] border-[#8c8578]/20 hover:border-teal-700 hover:shadow-[0_8px_30px_rgb(230,225,215)] text-[#1c1917] shadow-sm"
                                            : "bg-[#0b1329]/80 border-white/5 hover:border-indigo-500/50 hover:bg-[#111c3a]/90 text-white shadow-lg shadow-black/20"
                                    } cursor-pointer`;

                                    if (item.href) {
                                        return (
                                            <Link
                                                key={item.id}
                                                href={item.href}
                                                className={className}
                                            >
                                                {CardContent}
                                            </Link>
                                        );
                                    }

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={item.onClick}
                                            className={className}
                                        >
                                            {CardContent}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
