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
} from "lucide-react";

interface FeatureToolsGridProps {
    isLight: boolean;
    isRealisticMode: boolean;
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

/** Landing grid of feature tool cards shown when no tool is active — pure navigation, no local state. */
export default function FeatureToolsGrid({
    isLight,
    isRealisticMode,
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
    return (
        <>
            <div className="text-center mb-12 z-10 flex flex-col items-center">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/95 to-white/60 mb-6">
                    Features
                </h1>
                <p className="text-sm md:text-base text-white/50 max-w-xl mx-auto">
                    Select a tool below to configure target roles, analyze portfolios, or build premium resumes tailored for interviews.
                </p>
            </div>

            <div className={`grid ${isRealisticMode ? 'grid-cols-1 max-w-2xl' : 'grid-cols-1 md:grid-cols-2 max-w-4xl'} gap-6 w-full z-10 px-4`}>
                {/* Card A: Pre-Interview Analysis */}
                <div
                    onClick={onSelectAnalysis}
                    className={`group bg-[#0d0d12]/60 hover:bg-[#12121a]/80 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(79,70,229,0.05)] hover:shadow-[0_0_40px_rgba(79,70,229,0.15)] ${isLight ? "border-indigo-500/45 hover:border-indigo-600" : "border-indigo-500/20 hover:border-indigo-500/50"
                        }`}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0 ${isLight ? "bg-indigo-500/20 border border-indigo-500/30 text-indigo-700" : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                        }`}>
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className={`text-lg font-bold group-hover:text-indigo-400 transition-colors ${isLight ? "text-slate-800 group-hover:text-indigo-700" : "text-white"}`}>Pre-Interview Analysis</h3>
                </div>

                {/* Card B: Start Interview Session */}
                <div
                    onClick={onStartInterview}
                    className={`group bg-[#0d0d12]/60 hover:bg-[#12121a]/80 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(14,165,233,0.05)] hover:shadow-[0_0_40px_rgba(14,165,233,0.15)] ${isLight ? "border-sky-500/45 hover:border-sky-600" : "border-sky-500/20 hover:border-sky-500/50"
                        }`}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0 ${isLight ? "bg-sky-500/20 border border-sky-500/30 text-sky-700" : "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                        }`}>
                        <Play className="w-6 h-6" />
                    </div>
                    <h3 className={`text-lg font-bold group-hover:text-sky-400 transition-colors ${isLight ? "text-slate-800 group-hover:text-sky-700" : "text-white"}`}>Start Interview Session</h3>
                </div>

                {!isRealisticMode && (
                    <>
                        {/* Card C: Aptitude & On-Campus Prep */}
                        <div
                            onClick={onSelectAptitude}
                            className={`group bg-[#0d0d12]/60 hover:bg-[#1a1215]/80 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(236,72,153,0.05)] hover:shadow-[0_0_40px_rgba(236,72,153,0.15)] ${isLight ? "border-pink-500/45 hover:border-pink-600" : "border-pink-500/20 hover:border-pink-500/50"
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0 ${isLight ? "bg-pink-500/20 border border-pink-500/30 text-pink-700" : "bg-pink-500/10 border border-pink-500/20 text-pink-400"
                                }`}>
                                <ListTodo className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold group-hover:text-pink-400 transition-colors ${isLight ? "text-slate-800 group-hover:text-pink-700" : "text-white"}`}>Mock Aptitude</h3>
                        </div>

                        {/* Card D: AI Email Analyser */}
                        <div
                            onClick={onSelectEmailAnalyser}
                            className={`group bg-[#0d0d12]/60 hover:bg-[#121a18]/80 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(20,184,166,0.05)] hover:shadow-[0_0_40px_rgba(20,184,166,0.15)] ${isLight ? "border-teal-500/45 hover:border-teal-600" : "border-teal-500/20 hover:border-teal-500/50"
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0 ${isLight ? "bg-teal-500/20 border border-teal-500/30 text-teal-700" : "bg-teal-500/10 border border-teal-500/20 text-teal-400"
                                }`}>
                                <Mail className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold group-hover:text-teal-400 transition-colors ${isLight ? "text-slate-800 group-hover:text-teal-700" : "text-white"}`}>AI Email Analyser</h3>
                        </div>

                        {/* Card: Prep Packs */}
                        <div
                            onClick={onSelectPrepPack}
                            className={`group bg-[#0d0d12]/60 hover:bg-[#12151a]/80 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(56,189,248,0.05)] hover:shadow-[0_0_40px_rgba(56,189,248,0.15)] ${isLight ? "border-sky-500/45 hover:border-sky-600" : "border-sky-500/20 hover:border-sky-500/50"
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0 ${isLight ? "bg-sky-500/20 border border-sky-500/30 text-sky-700" : "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                                }`}>
                                <CalendarClock className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold group-hover:text-sky-400 transition-colors ${isLight ? "text-slate-800 group-hover:text-sky-700" : "text-white"}`}>Prep Packs</h3>
                        </div>

                        {/* Card: Spaced Drills */}
                        <div
                            onClick={onSelectDrills}
                            className={`group bg-[#0d0d12]/60 hover:bg-[#1a1512]/80 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(249,115,22,0.05)] hover:shadow-[0_0_40px_rgba(249,115,22,0.15)] ${isLight ? "border-orange-500/45 hover:border-orange-600" : "border-orange-500/20 hover:border-orange-500/50"
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0 ${isLight ? "bg-orange-500/20 border border-orange-500/30 text-orange-700" : "bg-orange-500/10 border border-orange-500/20 text-orange-400"
                                }`}>
                                <Dumbbell className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold group-hover:text-orange-400 transition-colors ${isLight ? "text-slate-800 group-hover:text-orange-700" : "text-white"}`}>Spaced Drills</h3>
                        </div>

                        {/* Card: Offer Negotiation */}
                        <div
                            onClick={onSelectNegotiate}
                            className={`group bg-[#0d0d12]/60 hover:bg-[#15121a]/80 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(34,197,94,0.05)] hover:shadow-[0_0_40px_rgba(34,197,94,0.15)] ${isLight ? "border-green-500/45 hover:border-green-600" : "border-green-500/20 hover:border-green-500/50"
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0 ${isLight ? "bg-green-500/20 border border-green-500/30 text-green-700" : "bg-green-500/10 border border-green-500/20 text-green-400"
                                }`}>
                                <Handshake className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold group-hover:text-green-400 transition-colors ${isLight ? "text-slate-800 group-hover:text-green-700" : "text-white"}`}>Offer Negotiation</h3>
                        </div>

                        {/* Card E: Preparation Roadmap Generator */}
                        <div
                            onClick={onSelectRoadmap}
                            className={`group bg-[#0d0d12]/60 hover:bg-[#121a15]/80 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.05)] hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] ${isLight ? "border-emerald-500/45 hover:border-emerald-600" : "border-emerald-500/20 hover:border-emerald-500/50"
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0 ${isLight ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-700" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                }`}>
                                <Map className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold group-hover:text-emerald-400 transition-colors ${isLight ? "text-slate-800 group-hover:text-emerald-700" : "text-white"}`}>Roadmap Generator</h3>
                        </div>

                        {/* Card F: Pro Interviewer Code */}
                        <div
                            onClick={onSelectProInterviewer}
                            className={`group bg-[#0d0d12]/60 hover:bg-[#1f1a12]/80 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(245,158,11,0.05)] hover:shadow-[0_0_40px_rgba(245,158,11,0.15)] ${isLight ? "border-amber-500/45 hover:border-amber-600" : "border-amber-500/20 hover:border-amber-500/50"
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0 ${isLight ? "bg-amber-500/20 border border-amber-500/30 text-amber-700" : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                                }`}>
                                <Code className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold group-hover:text-amber-400 transition-colors ${isLight ? "text-slate-800 group-hover:text-amber-700" : "text-white"}`}>Resume Builder</h3>
                        </div>

                        {/* Card G: Study Materials */}
                        <div
                            onClick={onSelectStudyMaterials}
                            className={`group bg-[#0d0d12]/60 hover:bg-[#18121a]/80 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(168,85,247,0.05)] hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] ${isLight ? "border-purple-500/45 hover:border-purple-600" : "border-purple-500/20 hover:border-purple-500/50"
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0 ${isLight ? "bg-purple-500/20 border border-purple-500/30 text-purple-700" : "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                                }`}>
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold group-hover:text-purple-400 transition-colors ${isLight ? "text-slate-800 group-hover:text-purple-700" : "text-white"}`}>Study Materials</h3>
                        </div>

                        {/* Card: Synthetic Data Generator */}
                        <div
                            onClick={onSelectSyntheticData}
                            className={`group bg-[#0d0d12]/60 hover:bg-[#121a18]/80 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(15,118,110,0.05)] hover:shadow-[0_0_40px_rgba(15,118,110,0.15)] ${isLight ? "border-teal-500/45 hover:border-teal-600" : "border-teal-500/20 hover:border-teal-500/50"
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0 ${isLight ? "bg-teal-500/20 border border-teal-500/30 text-teal-700" : "bg-teal-500/10 border border-teal-500/20 text-teal-400"
                                }`}>
                                <Database className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold group-hover:text-teal-400 transition-colors ${isLight ? "text-slate-800 group-hover:text-teal-700" : "text-white"}`}>Synthetic Data Generator</h3>
                        </div>

                        {/* Card H: My Progress */}
                        <div
                            onClick={onSelectProgress}
                            className={`group bg-[#0d0d12]/60 hover:bg-[#12171a]/80 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(14,165,233,0.05)] hover:shadow-[0_0_40px_rgba(14,165,233,0.15)] ${isLight ? "border-sky-500/45 hover:border-sky-600" : "border-sky-500/20 hover:border-sky-500/50"
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0 ${isLight ? "bg-sky-500/20 border border-sky-500/30 text-sky-700" : "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                                }`}>
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold group-hover:text-sky-400 transition-colors ${isLight ? "text-slate-800 group-hover:text-sky-700" : "text-white"}`}>My Progress</h3>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
