"use client";

import {
    BookOpen,
    CalendarClock,
    Code,
    Database,
    Dumbbell,
    Handshake,
    ListTodo,
    Mail,
    Map,
    Play,
    Sparkles,
    TrendingUp,
    ArrowRight,
} from "lucide-react";

interface FeatureToolsGridProps {
    isLight: boolean;
    isRealisticMode: boolean;
    theme?: "dark" | "light" | "eyeprotect";
    onSelectAnalysis: () => void;
    onStartInterview: () => void;
    onSelectAptitude: () => void;
    onSelectEmailAnalyser: () => void;
    onSelectPrepPack: () => void;
    onSelectDrills: () => void;
    onSelectNegotiate: () => void;
    onSelectRoadmap: () => void;
    onSelectProInterviewer: () => void;
    onSelectStudyMaterials: () => void;
    onSelectSyntheticData: () => void;
    onSelectProgress: () => void;
}

const cardThemes: Record<string, {
    eyeprotect: string;
    light: string;
    dark: string;
}> = {
    indigo: {
        eyeprotect: "border-[#8c8578]/40 md:hover:border-indigo-600 max-md:border-indigo-600 bg-[#fffcf5] md:hover:bg-indigo-50 max-md:bg-indigo-50 shadow-sm",
        light: "border-indigo-500/45 md:hover:border-indigo-600 max-md:border-indigo-600 bg-white md:hover:bg-indigo-50 max-md:bg-indigo-50 shadow-[0_0_30px_rgba(79,70,229,0.05)] md:hover:shadow-[0_0_40px_rgba(79,70,229,0.15)] max-md:shadow-[0_0_40px_rgba(79,70,229,0.15)]",
        dark: "border-indigo-500/20 md:hover:border-indigo-500/50 max-md:border-indigo-500/50 bg-[#0d0d12]/60 md:hover:bg-[#12121a]/80 max-md:bg-[#12121a]/80 shadow-[0_0_30px_rgba(79,70,229,0.05)] md:hover:shadow-[0_0_40px_rgba(79,70,229,0.15)] max-md:shadow-[0_0_40px_rgba(79,70,229,0.15)]"
    },
    sky: {
        eyeprotect: "border-[#8c8578]/40 md:hover:border-sky-600 max-md:border-sky-600 bg-[#fffcf5] md:hover:bg-sky-50 max-md:bg-sky-50 shadow-sm",
        light: "border-sky-500/45 md:hover:border-sky-600 max-md:border-sky-600 bg-white md:hover:bg-sky-50 max-md:bg-sky-50 shadow-[0_0_30px_rgba(14,165,233,0.05)] md:hover:shadow-[0_0_40px_rgba(14,165,233,0.15)] max-md:shadow-[0_0_40px_rgba(14,165,233,0.15)]",
        dark: "border-sky-500/20 md:hover:border-sky-500/50 max-md:border-sky-500/50 bg-[#0d0d12]/60 md:hover:bg-[#12151a]/80 max-md:bg-[#12151a]/80 shadow-[0_0_30px_rgba(14,165,233,0.05)] md:hover:shadow-[0_0_40px_rgba(14,165,233,0.15)] max-md:shadow-[0_0_40px_rgba(14,165,233,0.15)]"
    },
    pink: {
        eyeprotect: "border-[#8c8578]/40 md:hover:border-pink-600 max-md:border-pink-600 bg-[#fffcf5] md:hover:bg-pink-50 max-md:bg-pink-50 shadow-sm",
        light: "border-pink-500/45 md:hover:border-pink-600 max-md:border-pink-600 bg-white md:hover:bg-pink-50 max-md:bg-pink-50 shadow-[0_0_30px_rgba(236,72,153,0.05)] md:hover:shadow-[0_0_40px_rgba(236,72,153,0.15)] max-md:shadow-[0_0_40px_rgba(236,72,153,0.15)]",
        dark: "border-pink-500/20 md:hover:border-pink-500/50 max-md:border-pink-500/50 bg-[#0d0d12]/60 md:hover:bg-[#1a1215]/80 max-md:bg-[#1a1215]/80 shadow-[0_0_30px_rgba(236,72,153,0.05)] md:hover:shadow-[0_0_40px_rgba(236,72,153,0.15)] max-md:shadow-[0_0_40px_rgba(236,72,153,0.15)]"
    },
    teal: {
        eyeprotect: "border-[#8c8578]/40 md:hover:border-teal-600 max-md:border-teal-600 bg-[#fffcf5] md:hover:bg-teal-50 max-md:bg-teal-50 shadow-sm",
        light: "border-teal-500/45 md:hover:border-teal-600 max-md:border-teal-600 bg-white md:hover:bg-teal-50 max-md:bg-teal-50 shadow-[0_0_30px_rgba(15,118,110,0.05)] md:hover:shadow-[0_0_40px_rgba(15,118,110,0.15)] max-md:shadow-[0_0_40px_rgba(15,118,110,0.15)]",
        dark: "border-teal-500/20 md:hover:border-teal-500/50 max-md:border-teal-500/50 bg-[#0d0d12]/60 md:hover:bg-[#121a18]/80 max-md:bg-[#121a18]/80 shadow-[0_0_30px_rgba(15,118,110,0.05)] md:hover:shadow-[0_0_40px_rgba(15,118,110,0.15)] max-md:shadow-[0_0_40px_rgba(15,118,110,0.15)]"
    },
    orange: {
        eyeprotect: "border-[#8c8578]/40 md:hover:border-orange-600 max-md:border-orange-600 bg-[#fffcf5] md:hover:bg-orange-50 max-md:bg-orange-50 shadow-sm",
        light: "border-orange-500/45 md:hover:border-orange-600 max-md:border-orange-600 bg-white md:hover:bg-orange-50 max-md:bg-orange-50 shadow-[0_0_30px_rgba(249,115,22,0.05)] md:hover:shadow-[0_0_40px_rgba(249,115,22,0.15)] max-md:shadow-[0_0_40px_rgba(249,115,22,0.15)]",
        dark: "border-orange-500/20 md:hover:border-orange-500/50 max-md:border-orange-500/50 bg-[#0d0d12]/60 md:hover:bg-[#1a1512]/80 max-md:bg-[#1a1512]/80 shadow-[0_0_30px_rgba(249,115,22,0.05)] md:hover:shadow-[0_0_40px_rgba(249,115,22,0.15)] max-md:shadow-[0_0_40px_rgba(249,115,22,0.15)]"
    },
    green: {
        eyeprotect: "border-[#8c8578]/40 md:hover:border-green-600 max-md:border-green-600 bg-[#fffcf5] md:hover:bg-green-50 max-md:bg-green-50 shadow-sm",
        light: "border-green-500/45 md:hover:border-green-600 max-md:border-green-600 bg-white md:hover:bg-green-50 max-md:bg-green-50 shadow-[0_0_30px_rgba(34,197,94,0.05)] md:hover:shadow-[0_0_40px_rgba(34,197,94,0.15)] max-md:shadow-[0_0_40px_rgba(34,197,94,0.15)]",
        dark: "border-green-500/20 md:hover:border-green-500/50 max-md:border-green-500/50 bg-[#0d0d12]/60 md:hover:bg-[#121a14]/80 max-md:bg-[#121a14]/80 shadow-[0_0_30px_rgba(34,197,94,0.05)] md:hover:shadow-[0_0_40px_rgba(34,197,94,0.15)] max-md:shadow-[0_0_40px_rgba(34,197,94,0.15)]"
    },
    emerald: {
        eyeprotect: "border-[#8c8578]/40 md:hover:border-emerald-600 max-md:border-emerald-600 bg-[#fffcf5] md:hover:bg-emerald-50 max-md:bg-emerald-50 shadow-sm",
        light: "border-emerald-500/45 md:hover:border-emerald-600 max-md:border-emerald-600 bg-white md:hover:bg-emerald-50 max-md:bg-emerald-50 shadow-[0_0_30px_rgba(16,185,129,0.05)] md:hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] max-md:shadow-[0_0_40px_rgba(16,185,129,0.15)]",
        dark: "border-emerald-500/20 md:hover:border-emerald-500/50 max-md:border-emerald-500/50 bg-[#0d0d12]/60 md:hover:bg-[#121a14]/80 max-md:bg-[#121a14]/80 shadow-[0_0_30px_rgba(16,185,129,0.05)] md:hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] max-md:shadow-[0_0_40px_rgba(16,185,129,0.15)]"
    },
    amber: {
        eyeprotect: "border-[#8c8578]/40 md:hover:border-amber-600 max-md:border-amber-600 bg-[#fffcf5] md:hover:bg-amber-50 max-md:bg-amber-50 shadow-sm",
        light: "border-amber-500/45 md:hover:border-amber-600 max-md:border-amber-600 bg-white md:hover:bg-amber-50 max-md:bg-amber-50 shadow-[0_0_30px_rgba(245,158,11,0.05)] md:hover:shadow-[0_0_40px_rgba(245,158,11,0.15)] max-md:shadow-[0_0_40px_rgba(245,158,11,0.15)]",
        dark: "border-amber-500/20 md:hover:border-amber-500/50 max-md:border-amber-500/50 bg-[#0d0d12]/60 md:hover:bg-[#1a1812]/80 max-md:bg-[#1a1812]/80 shadow-[0_0_30px_rgba(245,158,11,0.05)] md:hover:shadow-[0_0_40px_rgba(245,158,11,0.15)] max-md:shadow-[0_0_40px_rgba(245,158,11,0.15)]"
    },
    purple: {
        eyeprotect: "border-[#8c8578]/40 md:hover:border-purple-600 max-md:border-purple-600 bg-[#fffcf5] md:hover:bg-purple-50 max-md:bg-purple-50 shadow-sm",
        light: "border-purple-500/45 md:hover:border-purple-600 max-md:border-purple-600 bg-white md:hover:bg-purple-50 max-md:bg-purple-50 shadow-[0_0_30px_rgba(168,85,247,0.05)] md:hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] max-md:shadow-[0_0_40px_rgba(168,85,247,0.15)]",
        dark: "border-purple-500/20 md:hover:border-purple-500/50 max-md:border-purple-500/50 bg-[#0d0d12]/60 md:hover:bg-[#18121a]/80 max-md:bg-[#18121a]/80 shadow-[0_0_30px_rgba(168,85,247,0.05)] md:hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] max-md:shadow-[0_0_40px_rgba(168,85,247,0.15)]"
    }
};

const headingColors: Record<string, {
    eyeprotect: string;
    light: string;
    dark: string;
}> = {
    indigo: {
        eyeprotect: "text-stone-800 md:group-hover:text-indigo-700 max-md:text-indigo-700",
        light: "text-slate-800 md:group-hover:text-indigo-700 max-md:text-indigo-700",
        dark: "text-white md:group-hover:text-indigo-400 max-md:text-indigo-400"
    },
    sky: {
        eyeprotect: "text-stone-800 md:group-hover:text-sky-700 max-md:text-sky-700",
        light: "text-slate-800 md:group-hover:text-sky-700 max-md:text-sky-700",
        dark: "text-white md:group-hover:text-sky-400 max-md:text-sky-400"
    },
    pink: {
        eyeprotect: "text-stone-800 md:group-hover:text-pink-700 max-md:text-pink-700",
        light: "text-slate-800 md:group-hover:text-pink-700 max-md:text-pink-700",
        dark: "text-white md:group-hover:text-pink-400 max-md:text-pink-400"
    },
    teal: {
        eyeprotect: "text-stone-800 md:group-hover:text-teal-700 max-md:text-teal-700",
        light: "text-slate-800 md:group-hover:text-teal-700 max-md:text-teal-700",
        dark: "text-white md:group-hover:text-teal-400 max-md:text-teal-400"
    },
    orange: {
        eyeprotect: "text-stone-800 md:group-hover:text-orange-700 max-md:text-orange-700",
        light: "text-slate-800 md:group-hover:text-orange-700 max-md:text-orange-700",
        dark: "text-white md:group-hover:text-orange-400 max-md:text-orange-400"
    },
    green: {
        eyeprotect: "text-stone-800 md:group-hover:text-green-700 max-md:text-green-700",
        light: "text-slate-800 md:group-hover:text-green-700 max-md:text-green-700",
        dark: "text-white md:group-hover:text-green-400 max-md:text-green-400"
    },
    emerald: {
        eyeprotect: "text-stone-800 md:group-hover:text-emerald-700 max-md:text-emerald-700",
        light: "text-slate-800 md:group-hover:text-emerald-700 max-md:text-emerald-700",
        dark: "text-white md:group-hover:text-emerald-400 max-md:text-emerald-400"
    },
    amber: {
        eyeprotect: "text-stone-800 md:group-hover:text-amber-700 max-md:text-amber-700",
        light: "text-slate-800 md:group-hover:text-amber-700 max-md:text-amber-700",
        dark: "text-white md:group-hover:text-amber-400 max-md:text-amber-400"
    },
    purple: {
        eyeprotect: "text-stone-800 md:group-hover:text-purple-700 max-md:text-purple-700",
        light: "text-slate-800 md:group-hover:text-purple-700 max-md:text-purple-700",
        dark: "text-white md:group-hover:text-purple-400 max-md:text-purple-400"
    }
};

const arrowThemes: Record<string, {
    eyeprotect: string;
    light: string;
    dark: string;
}> = {
    indigo: {
        eyeprotect: "bg-indigo-100 text-indigo-700 md:group-hover:bg-indigo-600 md:group-hover:text-white max-md:bg-indigo-600 max-md:text-white border border-indigo-200/50",
        light: "bg-indigo-50 text-indigo-600 md:group-hover:bg-indigo-600 md:group-hover:text-white max-md:bg-indigo-600 max-md:text-white",
        dark: "bg-indigo-500/10 text-indigo-400 md:group-hover:bg-indigo-500 md:group-hover:text-white max-md:bg-indigo-500 max-md:text-white"
    },
    sky: {
        eyeprotect: "bg-sky-100 text-sky-700 md:group-hover:bg-sky-600 md:group-hover:text-white max-md:bg-sky-600 max-md:text-white border border-sky-200/50",
        light: "bg-sky-50 text-sky-600 md:group-hover:bg-sky-600 md:group-hover:text-white max-md:bg-sky-600 max-md:text-white",
        dark: "bg-sky-500/10 text-sky-400 md:group-hover:bg-sky-500 md:group-hover:text-white max-md:bg-sky-500 max-md:text-white"
    },
    pink: {
        eyeprotect: "bg-pink-100 text-pink-700 md:group-hover:bg-pink-600 md:group-hover:text-white max-md:bg-pink-600 max-md:text-white border border-pink-200/50",
        light: "bg-pink-50 text-pink-600 md:group-hover:bg-pink-600 md:group-hover:text-white max-md:bg-pink-600 max-md:text-white",
        dark: "bg-pink-500/10 text-pink-400 md:group-hover:bg-pink-500 md:group-hover:text-white max-md:bg-pink-500 max-md:text-white"
    },
    teal: {
        eyeprotect: "bg-teal-100 text-teal-700 md:group-hover:bg-teal-600 md:group-hover:text-white max-md:bg-teal-600 max-md:text-white border border-teal-200/50",
        light: "bg-teal-50 text-teal-600 md:group-hover:bg-teal-600 md:group-hover:text-white max-md:bg-teal-600 max-md:text-white",
        dark: "bg-teal-500/10 text-teal-400 md:group-hover:bg-teal-500 md:group-hover:text-white max-md:bg-teal-500 max-md:text-white"
    },
    orange: {
        eyeprotect: "bg-orange-100 text-orange-700 md:group-hover:bg-orange-600 md:group-hover:text-white max-md:bg-orange-600 max-md:text-white border border-orange-200/50",
        light: "bg-orange-50 text-orange-600 md:group-hover:bg-orange-600 md:group-hover:text-white max-md:bg-orange-600 max-md:text-white",
        dark: "bg-orange-500/10 text-orange-400 md:group-hover:bg-orange-500 md:group-hover:text-white max-md:bg-orange-500 max-md:text-white"
    },
    green: {
        eyeprotect: "bg-green-100 text-green-700 md:group-hover:bg-green-600 md:group-hover:text-white max-md:bg-green-600 max-md:text-white border border-green-200/50",
        light: "bg-green-50 text-green-600 md:group-hover:bg-green-600 md:group-hover:text-white max-md:bg-green-600 max-md:text-white",
        dark: "bg-green-500/10 text-green-400 md:group-hover:bg-green-500 md:group-hover:text-white max-md:bg-green-500 max-md:text-white"
    },
    emerald: {
        eyeprotect: "bg-emerald-100 text-emerald-700 md:group-hover:bg-emerald-600 md:group-hover:text-white max-md:bg-emerald-600 max-md:text-white border border-emerald-200/50",
        light: "bg-emerald-50 text-emerald-600 md:group-hover:bg-emerald-600 md:group-hover:text-white max-md:bg-emerald-600 max-md:text-white",
        dark: "bg-emerald-500/10 text-emerald-400 md:group-hover:bg-emerald-500 md:group-hover:text-white max-md:bg-emerald-500 max-md:text-white"
    },
    amber: {
        eyeprotect: "bg-amber-100 text-amber-700 md:group-hover:bg-amber-600 md:group-hover:text-white max-md:bg-amber-600 max-md:text-white border border-amber-200/50",
        light: "bg-amber-50 text-amber-600 md:group-hover:bg-amber-600 md:group-hover:text-white max-md:bg-amber-600 max-md:text-white",
        dark: "bg-amber-500/10 text-amber-400 md:group-hover:bg-amber-500 md:group-hover:text-white max-md:bg-amber-500 max-md:text-white"
    },
    purple: {
        eyeprotect: "bg-purple-100 text-purple-700 md:group-hover:bg-purple-600 md:group-hover:text-white max-md:bg-purple-600 max-md:text-white border border-purple-200/50",
        light: "bg-purple-50 text-purple-600 md:group-hover:bg-purple-600 md:group-hover:text-white max-md:bg-purple-600 max-md:text-white",
        dark: "bg-purple-500/10 text-purple-400 md:group-hover:bg-purple-500 md:group-hover:text-white max-md:bg-purple-500 max-md:text-white"
    }
};

export default function FeatureToolsGrid({
    isLight,
    isRealisticMode,
    theme,
    onSelectAnalysis,
    onStartInterview,
    onSelectAptitude,
    onSelectEmailAnalyser,
    onSelectPrepPack,
    onSelectDrills,
    onSelectNegotiate,
    onSelectRoadmap,
    onSelectProInterviewer,
    onSelectStudyMaterials,
    onSelectSyntheticData,
    onSelectProgress,
}: FeatureToolsGridProps) {
    const activeTheme = theme || (isLight ? "light" : "dark");
    const descColor = activeTheme === "eyeprotect" ? "text-stone-600 font-semibold" : activeTheme === "light" ? "text-slate-500 font-semibold" : "text-white/50";

    return (
        <>
            <div className="text-center mb-12 z-10 flex flex-col items-center">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/95 to-white/60 mb-6">
                    Features
                </h1>
                <p className={`text-sm md:text-base max-w-xl mx-auto ${descColor}`}>
                    Select a tool below to configure target roles, analyze portfolios, or build premium resumes tailored for interviews.
                </p>
            </div>

            <div className={`grid ${isRealisticMode ? 'grid-cols-1 max-w-2xl' : 'grid-cols-2 md:grid-cols-2 max-w-4xl'} gap-3 md:gap-6 w-full z-10 px-2 md:px-4`}>
                {/* Card A: Pre-Interview Analysis */}
                <div
                    onClick={onSelectAnalysis}
                    className={`group transition-all duration-300 flex flex-col justify-between cursor-pointer h-full rounded-2xl p-3 md:p-4.5 border backdrop-blur-sm ${cardThemes.indigo[activeTheme]}`}
                >
                    <div>
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeTheme === "eyeprotect" ? "bg-indigo-500/20 text-indigo-750 border border-indigo-500/30" : isLight ? "bg-indigo-500/20 text-indigo-700 border border-indigo-500/30" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"}`}>
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <h3 className={`text-[10.5px] md:text-sm font-extrabold transition-colors leading-tight text-left ${headingColors.indigo[activeTheme]}`}>
                                Pre-Interview Analysis
                            </h3>
                        </div>
                        <p className={`text-[8.5px] md:text-[11px] text-left leading-relaxed mt-2 ${descColor}`}>
                            Analyze your resume, skills and target role to personalize your interview experience.
                        </p>
                    </div>
                    <div className="flex justify-end mt-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${arrowThemes.indigo[activeTheme]}`}>
                            <ArrowRight className="w-2.5 h-2.5" />
                        </div>
                    </div>
                </div>

                {/* Card B: Start Interview Session */}
                <div
                    onClick={onStartInterview}
                    className={`group transition-all duration-300 flex flex-col justify-between cursor-pointer h-full rounded-2xl p-3 md:p-4.5 border backdrop-blur-sm ${cardThemes.sky[activeTheme]}`}
                >
                    <div>
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeTheme === "eyeprotect" ? "bg-sky-500/20 text-sky-750 border border-sky-500/30" : isLight ? "bg-sky-500/20 text-sky-700 border border-sky-500/30" : "bg-sky-500/10 text-sky-400 border border-sky-500/20"}`}>
                                <Play className="w-4 h-4" />
                            </div>
                            <h3 className={`text-[10.5px] md:text-sm font-extrabold transition-colors leading-tight text-left ${headingColors.sky[activeTheme]}`}>
                                Start Interview Session
                            </h3>
                        </div>
                        <p className={`text-[8.5px] md:text-[11px] text-left leading-relaxed mt-2 ${descColor}`}>
                            Begin a real-time AI interview with dynamic questions and instant feedback.
                        </p>
                    </div>
                    <div className="flex justify-end mt-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${arrowThemes.sky[activeTheme]}`}>
                            <ArrowRight className="w-2.5 h-2.5" />
                        </div>
                    </div>
                </div>

                {!isRealisticMode && (
                    <>
                        {/* Card C: Aptitude & On-Campus Prep */}
                        <div
                            onClick={onSelectAptitude}
                            className={`group transition-all duration-300 flex flex-col justify-between cursor-pointer h-full rounded-2xl p-3 md:p-4.5 border backdrop-blur-sm ${cardThemes.pink[activeTheme]}`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeTheme === "eyeprotect" ? "bg-pink-500/20 text-pink-750 border border-pink-500/30" : isLight ? "bg-pink-500/20 text-pink-700 border border-pink-500/30" : "bg-pink-500/10 text-pink-400 border border-pink-500/20"}`}>
                                        <ListTodo className="w-4 h-4" />
                                    </div>
                                    <h3 className={`text-[10.5px] md:text-sm font-extrabold transition-colors leading-tight text-left ${headingColors.pink[activeTheme]}`}>
                                        Mock Aptitude
                                    </h3>
                                </div>
                                <p className={`text-[8.5px] md:text-[11px] text-left leading-relaxed mt-2 ${descColor}`}>
                                    Practice aptitude questions with timed tests and detailed explanations.
                                </p>
                            </div>
                            <div className="flex justify-end mt-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${arrowThemes.pink[activeTheme]}`}>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                </div>
                            </div>
                        </div>

                        {/* Card D: Email Analyser */}
                        <div
                            onClick={onSelectEmailAnalyser}
                            className={`group transition-all duration-300 flex flex-col justify-between cursor-pointer h-full rounded-2xl p-3 md:p-4.5 border backdrop-blur-sm ${cardThemes.teal[activeTheme]}`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeTheme === "eyeprotect" ? "bg-teal-500/20 text-teal-750 border border-teal-500/30" : isLight ? "bg-teal-500/20 text-teal-700 border border-teal-500/30" : "bg-teal-500/10 text-teal-400 border border-teal-500/20"}`}>
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <h3 className={`text-[10.5px] md:text-sm font-extrabold transition-colors leading-tight text-left ${headingColors.teal[activeTheme]}`}>
                                        AI Email Analyser
                                    </h3>
                                </div>
                                <p className={`text-[8.5px] md:text-[11px] text-left leading-relaxed mt-2 ${descColor}`}>
                                    Analyze emails and drafts for clarity, tone, grammar and professionalism.
                                </p>
                            </div>
                            <div className="flex justify-end mt-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${arrowThemes.teal[activeTheme]}`}>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                </div>
                            </div>
                        </div>

                        {/* Card: Prep Packs */}
                        <div
                            onClick={onSelectPrepPack}
                            className={`group transition-all duration-300 flex flex-col justify-between cursor-pointer h-full rounded-2xl p-3 md:p-4.5 border backdrop-blur-sm ${cardThemes.sky[activeTheme]}`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeTheme === "eyeprotect" ? "bg-sky-500/20 text-sky-750 border border-sky-500/30" : isLight ? "bg-sky-500/20 text-sky-700 border border-sky-500/30" : "bg-sky-500/10 text-sky-400 border border-sky-500/20"}`}>
                                        <CalendarClock className="w-4 h-4" />
                                    </div>
                                    <h3 className={`text-[10.5px] md:text-sm font-extrabold transition-colors leading-tight text-left ${headingColors.sky[activeTheme]}`}>
                                        Prep Packs
                                    </h3>
                                </div>
                                <p className={`text-[8.5px] md:text-[11px] text-left leading-relaxed mt-2 ${descColor}`}>
                                    Curated interview prep packs for different roles and experience levels.
                                </p>
                            </div>
                            <div className="flex justify-end mt-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${arrowThemes.sky[activeTheme]}`}>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                </div>
                            </div>
                        </div>

                        {/* Card: Spaced Drills */}
                        <div
                            onClick={onSelectDrills}
                            className={`group transition-all duration-300 flex flex-col justify-between cursor-pointer h-full rounded-2xl p-3 md:p-4.5 border backdrop-blur-sm ${cardThemes.orange[activeTheme]}`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeTheme === "eyeprotect" ? "bg-orange-500/20 text-orange-750 border border-orange-500/30" : isLight ? "bg-orange-500/20 text-orange-700 border border-orange-500/30" : "bg-orange-500/10 text-orange-400 border border-orange-500/20"}`}>
                                        <Dumbbell className="w-4 h-4" />
                                    </div>
                                    <h3 className={`text-[10.5px] md:text-sm font-extrabold transition-colors leading-tight text-left ${headingColors.orange[activeTheme]}`}>
                                        Spaced Drills
                                    </h3>
                                </div>
                                <p className={`text-[8.5px] md:text-[11px] text-left leading-relaxed mt-2 ${descColor}`}>
                                    Smart spaced repetition drills to strengthen your weak areas effectively.
                                </p>
                            </div>
                            <div className="flex justify-end mt-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${arrowThemes.orange[activeTheme]}`}>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                </div>
                            </div>
                        </div>

                        {/* Card E: Offer Negotiation */}
                        <div
                            onClick={onSelectNegotiate}
                            className={`group transition-all duration-300 flex flex-col justify-between cursor-pointer h-full rounded-2xl p-3 md:p-4.5 border backdrop-blur-sm ${cardThemes.green[activeTheme]}`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeTheme === "eyeprotect" ? "bg-green-500/20 text-green-750 border border-green-500/30" : isLight ? "bg-green-500/20 text-green-700 border border-green-500/30" : "bg-green-500/10 text-green-400 border border-green-500/20"}`}>
                                        <Handshake className="w-4 h-4" />
                                    </div>
                                    <h3 className={`text-[10.5px] md:text-sm font-extrabold transition-colors leading-tight text-left ${headingColors.green[activeTheme]}`}>
                                        Offer Negotiation
                                    </h3>
                                </div>
                                <p className={`text-[8.5px] md:text-[11px] text-left leading-relaxed mt-2 ${descColor}`}>
                                    Learn strategies and get AI simulations to negotiate your best offer.
                                </p>
                            </div>
                            <div className="flex justify-end mt-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${arrowThemes.green[activeTheme]}`}>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                </div>
                            </div>
                        </div>

                        {/* Card F: Roadmap Generator */}
                        <div
                            onClick={onSelectRoadmap}
                            className={`group transition-all duration-300 flex flex-col justify-between cursor-pointer h-full rounded-2xl p-3 md:p-4.5 border backdrop-blur-sm ${cardThemes.emerald[activeTheme]}`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeTheme === "eyeprotect" ? "bg-emerald-500/20 text-emerald-750 border border-emerald-500/30" : isLight ? "bg-emerald-500/20 text-emerald-700 border border-emerald-500/30" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                                        <Map className="w-4 h-4" />
                                    </div>
                                    <h3 className={`text-[10.5px] md:text-sm font-extrabold transition-colors leading-tight text-left ${headingColors.emerald[activeTheme]}`}>
                                        Roadmap Generator
                                    </h3>
                                </div>
                                <p className={`text-[8.5px] md:text-[11px] text-left leading-relaxed mt-2 ${descColor}`}>
                                    Get a personalized learning roadmap to reach your dream role faster.
                                </p>
                            </div>
                            <div className="flex justify-end mt-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${arrowThemes.emerald[activeTheme]}`}>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                </div>
                            </div>
                        </div>

                        {/* Card G: Resume Builder */}
                        <div
                            onClick={onSelectProInterviewer}
                            className={`group transition-all duration-300 flex flex-col justify-between cursor-pointer h-full rounded-2xl p-3 md:p-4.5 border backdrop-blur-sm ${cardThemes.amber[activeTheme]}`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeTheme === "eyeprotect" ? "bg-amber-500/20 text-amber-750 border border-amber-500/30" : isLight ? "bg-amber-500/20 text-amber-700 border border-amber-500/30" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                                        <Code className="w-4 h-4" />
                                    </div>
                                    <h3 className={`text-[10.5px] md:text-sm font-extrabold transition-colors leading-tight text-left ${headingColors.amber[activeTheme]}`}>
                                        Resume Builder
                                    </h3>
                                </div>
                                <p className={`text-[8.5px] md:text-[11px] text-left leading-relaxed mt-2 ${descColor}`}>
                                    Build premium, ATS-optimized resumes with real-time score feedback.
                                </p>
                            </div>
                            <div className="flex justify-end mt-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${arrowThemes.amber[activeTheme]}`}>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                </div>
                            </div>
                        </div>

                        {/* Card: Study Materials */}
                        <div
                            onClick={onSelectStudyMaterials}
                            className={`group transition-all duration-300 flex flex-col justify-between cursor-pointer h-full rounded-2xl p-3 md:p-4.5 border backdrop-blur-sm ${cardThemes.purple[activeTheme]}`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeTheme === "eyeprotect" ? "bg-purple-500/20 text-purple-750 border border-purple-500/30" : isLight ? "bg-purple-500/20 text-purple-700 border border-purple-500/30" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"}`}>
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <h3 className={`text-[10.5px] md:text-sm font-extrabold transition-colors leading-tight text-left ${headingColors.purple[activeTheme]}`}>
                                        Study Materials
                                    </h3>
                                </div>
                                <p className={`text-[8.5px] md:text-[11px] text-left leading-relaxed mt-2 ${descColor}`}>
                                    Access notes, cheatsheets and resources to master key concepts.
                                </p>
                            </div>
                            <div className="flex justify-end mt-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${arrowThemes.purple[activeTheme]}`}>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                </div>
                            </div>
                        </div>

                        {/* Card: Synthetic Data Generator */}
                        <div
                            onClick={onSelectSyntheticData}
                            className={`group transition-all duration-300 flex flex-col justify-between cursor-pointer h-full rounded-2xl p-3 md:p-4.5 border backdrop-blur-sm ${cardThemes.teal[activeTheme]}`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeTheme === "eyeprotect" ? "bg-teal-500/20 text-teal-750 border border-teal-500/30" : isLight ? "bg-teal-500/20 text-teal-700 border border-teal-500/30" : "bg-teal-500/10 text-teal-400 border border-teal-500/20"}`}>
                                        <Database className="w-4 h-4" />
                                    </div>
                                    <h3 className={`text-[10.5px] md:text-sm font-extrabold transition-colors leading-tight text-left ${headingColors.teal[activeTheme]}`}>
                                        Synthetic Data Generator
                                    </h3>
                                </div>
                                <p className={`text-[8.5px] md:text-[11px] text-left leading-relaxed mt-2 ${descColor}`}>
                                    Generate mock datasets for practice, testing and interviews.
                                </p>
                            </div>
                            <div className="flex justify-end mt-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${arrowThemes.teal[activeTheme]}`}>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                </div>
                            </div>
                        </div>

                        {/* Card H: My Progress */}
                        <div
                            onClick={onSelectProgress}
                            className={`group transition-all duration-300 flex flex-col justify-between cursor-pointer h-full rounded-2xl p-3 md:p-4.5 border backdrop-blur-sm ${cardThemes.sky[activeTheme]}`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeTheme === "eyeprotect" ? "bg-sky-500/20 text-sky-750 border border-sky-500/30" : isLight ? "bg-sky-500/20 text-sky-700 border border-sky-500/30" : "bg-sky-500/10 text-sky-400 border border-sky-500/20"}`}>
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                    <h3 className={`text-[10.5px] md:text-sm font-extrabold transition-colors leading-tight text-left ${headingColors.sky[activeTheme]}`}>
                                        My Progress
                                    </h3>
                                </div>
                                <p className={`text-[8.5px] md:text-[11px] text-left leading-relaxed mt-2 ${descColor}`}>
                                    Track your progress, strengths, weaknesses and improvement over time.
                                </p>
                            </div>
                            <div className="flex justify-end mt-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${arrowThemes.sky[activeTheme]}`}>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
