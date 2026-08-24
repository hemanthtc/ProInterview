"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, ChevronDown, ChevronUp, Clock, TrendingUp, Video, Film, Share2, Download, Loader2, Sparkles, X } from "lucide-react";
import { getStorageItem } from "../../utils/storage";

interface ProgressPanelProps {
    isLight: boolean;
    defaultTab?: "filmroom" | "interview" | "aptitude";
    onClose?: () => void;
}

/** "My Progress" dashboard — interview attempt history + mock aptitude assessment history, read from localStorage. */
export default function ProgressPanel({ isLight, defaultTab = "interview", onClose }: ProgressPanelProps) {
    const [progressTab, setProgressTab] = useState<"filmroom" | "interview" | "aptitude">(defaultTab);
    const [expandedProgressMockId, setExpandedProgressMockId] = useState<string | null>(null);
    const [expandedProgressInterviewId, setExpandedProgressInterviewId] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const [guidanceOpen, setGuidanceOpen] = useState(false);
    const [loadingGuidance, setLoadingGuidance] = useState(false);
    const [guidance, setGuidance] = useState("");

    const interviewData = JSON.parse(getStorageItem("interviewSessions") || "[]");
    const mockData = JSON.parse(getStorageItem("mockAptitudeSessions") || "[]");

    const totalInterviews = interviewData.length;
    const avgScore = (() => {
        if (interviewData.length === 0) return 0;
        const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        let weightedSum = 0, totalWeight = 0;
        interviewData.forEach((s: any) => {
            const ageMs = now - s.timestamp;
            const weight = Math.max(0, 1 - ageMs / ONE_YEAR_MS);
            weightedSum += (s.finalScore || s.interviewRating || 0) * weight;
            totalWeight += weight;
        });
        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    })();

    const benchmark = avgScore >= 80 ? "Top Tier Candidate" : avgScore >= 60 ? "Proficient" : avgScore > 0 ? "Needs Improvement" : "No Data Yet";
    const benchmarkColor = avgScore >= 80 ? "text-green-400" : avgScore >= 60 ? "text-yellow-400" : avgScore > 0 ? "text-red-400" : "text-white/40";

    const fetchGuidance = async () => {
        if (interviewData.length === 0) return;
        setLoadingGuidance(true);
        setGuidanceOpen(true);
        setGuidance("");
        try {
            const res = await fetch("/api/profile-guidance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessions: interviewData })
            });
            const data = await res.json();
            setGuidance(data.guidance || "Could not generate guidance at this time.");
        } catch {
            setGuidance("Failed to fetch guidance. Please check your connection.");
        }
        setLoadingGuidance(false);
    };

    const downloadTranscript = (text: string, date: number) => {
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Interview_${new Date(date).toLocaleDateString().replace(/\//g, "-")}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const shareSessionScorecard = async (sess: any) => {
        try {
            const res = await fetch("/api/scorecard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidateName: sess.userName || sess.userIdentifier || "Candidate",
                    company: sess.company || "",
                    role: sess.role || "",
                    finalScore: sess.finalScore || sess.interviewRating || 0,
                    technicalRating: sess.technicalRating || 0,
                    behavioralRating: sess.behavioralRating || 0,
                    communicationRating: sess.communicationRating || 0,
                    portfolioRating: sess.portfolioRating || "N/A",
                    summary: sess.summary || "",
                    highlights: sess.highlights || [],
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Share failed");
            const url = data.url?.startsWith("http")
                ? data.url
                : `${window.location.origin}${data.url || `/scorecard/${data.shareId}`}`;
            try {
                await navigator.clipboard.writeText(url);
            } catch { /* ignore */ }
            setToastMsg(`Scorecard link copied (expires in 30 days): ${url}`);
            setTimeout(() => setToastMsg(null), 4000);
        } catch (e: any) {
            setToastMsg(e.message || "Failed to share scorecard");
            setTimeout(() => setToastMsg(null), 4000);
        }
    };

    return (
        <div className="space-y-6 text-left animate-in fade-in duration-300 font-sans relative">
            {/* Top Modal Header */}
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-sky-400" />
                    <h3 className="text-xl font-extrabold text-white tracking-tight">Dashboard</h3>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                        title="Close Dashboard"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                )}
            </div>

            {/* Row 1: Top 3 Stats Cards (2 per row on mobile, 3 on desktop) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
                {/* Stat Card 1: Total Interviews */}
                <div className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-5 group shadow-xl transition-all duration-300 backdrop-blur-xl ${
                    isLight 
                        ? "bg-white border-slate-300 shadow-slate-200/50" 
                        : "bg-gradient-to-b from-indigo-950/20 via-black/30 to-black/30 border-white/10"
                }`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-all" />
                    <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className={`w-2 h-2 rounded-full animate-pulse ${isLight ? "bg-indigo-600" : "bg-indigo-400"}`} />
                            <h3 className={`font-extrabold text-[10px] sm:text-[11px] tracking-wider uppercase ${isLight ? "text-indigo-900" : "text-indigo-300"}`}>
                                Total Interviews
                            </h3>
                        </div>
                        <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
                            isLight ? "bg-indigo-100 border border-indigo-300 text-indigo-700" : "bg-indigo-500/15 border border-indigo-400/30 text-indigo-300"
                        }`}>
                            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-1 sm:mb-2">
                        <p className={`text-2xl sm:text-4xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                            {totalInterviews}
                        </p>
                        <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border self-start sm:self-auto ${
                            isLight ? "bg-indigo-100 text-indigo-900 border-indigo-200" : "bg-indigo-500/10 text-indigo-300/80 border-indigo-500/20"
                        }`}>
                            Last 12 mos
                        </span>
                    </div>
                    <p className={`text-[10px] sm:text-[11px] font-semibold ${isLight ? "text-slate-600" : "text-white/40"}`}>Logged & synced attempts</p>
                </div>

                {/* Stat Card 2: Weighted Avg Score */}
                <div className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-5 group shadow-xl transition-all duration-300 backdrop-blur-xl ${
                    isLight 
                        ? "bg-white border-slate-300 shadow-slate-200/50" 
                        : "bg-gradient-to-b from-purple-950/20 via-black/30 to-black/30 border-white/10"
                }`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition-all" />
                    <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className={`w-2 h-2 rounded-full animate-pulse ${isLight ? "bg-purple-600" : "bg-purple-400"}`} />
                            <h3 className={`font-extrabold text-[10px] sm:text-[11px] tracking-wider uppercase ${isLight ? "text-purple-900" : "text-purple-300"}`}>
                                Weighted Avg Score
                            </h3>
                        </div>
                        <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
                            isLight ? "bg-purple-100 border border-purple-300 text-purple-700" : "bg-purple-500/15 border border-purple-400/30 text-purple-300"
                        }`}>
                            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-1 sm:mb-2">
                        <p className={`text-2xl sm:text-4xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                            {avgScore} <span className={`text-xs sm:text-sm font-bold ${isLight ? "text-slate-500" : "text-white/30"}`}>/ 100</span>
                        </p>
                        <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border self-start sm:self-auto ${
                            isLight ? "bg-purple-100 text-purple-900 border-purple-200" : "bg-purple-500/10 text-purple-300/80 border-purple-500/20"
                        }`}>
                            Recency weighted
                        </span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden mt-2 ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, avgScore))}%` }}
                        />
                    </div>
                </div>

                {/* Stat Card 3: Hiring Benchmark */}
                <div className={`col-span-2 sm:col-span-1 relative overflow-hidden rounded-2xl border p-3.5 sm:p-5 group shadow-xl transition-all duration-300 backdrop-blur-xl ${
                    isLight 
                        ? "bg-white border-slate-300 shadow-slate-200/50" 
                        : "bg-gradient-to-b from-emerald-950/20 via-black/30 to-black/30 border-white/10"
                }`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
                    <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className={`w-2 h-2 rounded-full animate-pulse ${isLight ? "bg-emerald-600" : "bg-emerald-400"}`} />
                            <h3 className={`font-extrabold text-[10px] sm:text-[11px] tracking-wider uppercase ${isLight ? "text-emerald-900" : "text-emerald-300"}`}>
                                Hiring Benchmark
                            </h3>
                        </div>
                        <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
                            isLight ? "bg-emerald-100 border border-emerald-300 text-emerald-700" : "bg-emerald-500/15 border border-emerald-400/30 text-emerald-300"
                        }`}>
                            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between min-h-[32px] sm:min-h-[40px]">
                        {interviewData.length === 0 ? (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-extrabold text-xs ${
                                isLight ? "bg-slate-100 border-slate-300 text-slate-800" : "bg-white/5 border-white/10 text-white/50"
                            }`}>
                                No Data Yet
                            </span>
                        ) : (
                            <p className={`text-base sm:text-lg font-extrabold tracking-tight ${benchmarkColor}`}>{benchmark}</p>
                        )}
                    </div>
                    <p className={`text-[10px] sm:text-[11px] font-semibold mt-2 ${isLight ? "text-slate-600" : "text-white/40"}`}>Industry hiring bar evaluation</p>
                </div>
            </div>

            {/* Row 2: AI Career Coach (Full Width) */}
            <div className={`w-full border rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl ${
                isLight 
                    ? "bg-gradient-to-r from-indigo-50 via-purple-50 to-white border-slate-300" 
                    : "bg-gradient-to-r from-indigo-950/30 via-purple-950/10 to-black border-white/10"
            }`}>
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isLight ? "bg-indigo-100 border border-indigo-300 text-indigo-700" : "bg-indigo-500/20 border border-indigo-500/30 text-indigo-400"
                        }`}>
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className={`font-black text-sm sm:text-base ${isLight ? "text-slate-900" : "text-white"}`}>AI Career Coach</h2>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                                    isLight ? "bg-indigo-100 text-indigo-900 border-indigo-300" : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                                }`}>
                                    Personalized
                                </span>
                            </div>
                            <p className={`text-xs font-semibold line-clamp-1 ${isLight ? "text-slate-600" : "text-white/60"}`}>Get custom guidance & action plan based on your interview history</p>
                        </div>
                    </div>
                    <button
                        onClick={guidanceOpen ? () => setGuidanceOpen(false) : fetchGuidance}
                        disabled={loadingGuidance || interviewData.length === 0}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-all px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg shadow-indigo-500/25 shrink-0 whitespace-nowrap w-full sm:w-auto cursor-pointer"
                    >
                        {loadingGuidance ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                        ) : guidanceOpen ? (
                            "Close Plan"
                        ) : (
                            "Get My Plan"
                        )}
                    </button>
                </div>

                {guidanceOpen && (
                    <div className="border-t border-white/10 p-5 sm:p-6 bg-black/30 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {loadingGuidance ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-2 text-white/50">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                                <p className="text-xs font-medium">Analyzing sessions and crafting your personalized plan...</p>
                            </div>
                        ) : (
                            <div className="prose prose-invert max-w-none space-y-2 text-left">
                                {guidance.split("\n").map((line, i) => {
                                    const isBold = /^\*\*.+\*\*/.test(line);
                                    const cleaned = line.replace(/\*\*/g, "").replace(/^#+\s*/, "");
                                    if (!cleaned.trim()) return <div key={i} className="h-2" />;
                                    if (isBold) return <p key={i} className="font-extrabold text-indigo-300 text-sm mt-3 mb-1">{cleaned}</p>;
                                    if (line.startsWith("- ") || line.startsWith("• ")) return <p key={i} className="text-white/80 text-xs pl-4 before:content-['•'] before:text-indigo-400 before:mr-2">{cleaned.replace(/^[-•]\s*/, "")}</p>;
                                    return <p key={i} className="text-white/70 text-xs leading-relaxed">{cleaned}</p>;
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Row 3: My Progress & Learning (Tabs & Lists Section) */}
            <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-sky-400" />
                        <h3 className="text-base sm:text-lg font-extrabold text-white">My Progress & Learning</h3>
                    </div>

                    {/* Navigation Toggle */}
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 shrink-0 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => {
                                setProgressTab("filmroom");
                                setExpandedProgressInterviewId(null);
                            }}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${progressTab === "filmroom"
                                ? "bg-sky-500 text-white shadow-md shadow-sky-500/10"
                                : "text-white/60 hover:text-white"
                                }`}
                        >
                            Film Room
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setProgressTab("interview");
                                setExpandedProgressInterviewId(null);
                            }}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${progressTab === "interview"
                                ? "bg-sky-500 text-white shadow-md shadow-sky-500/10"
                                : "text-white/60 hover:text-white"
                                }`}
                        >
                            Interview Attempts
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setProgressTab("aptitude");
                                setExpandedProgressMockId(null);
                            }}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${progressTab === "aptitude"
                                ? "bg-sky-500 text-white shadow-md shadow-sky-500/10"
                                : "text-white/60 hover:text-white"
                                }`}
                        >
                            Mock Assessments
                        </button>
                    </div>
                </div>

                {/* Active Tab Content */}
                <div className="w-full">
                    {progressTab === "filmroom" ? (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {interviewData.length === 0 ? (
                                <div className="border border-dashed border-white/10 rounded-2xl p-8 text-center space-y-3">
                                    <Film className="w-8 h-8 text-white/20 mx-auto animate-pulse" />
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-white">No Sessions Available</h4>
                                        <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                                            Complete a mock or practice interview session first to enable Film Room coaching review.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {interviewData.map((sess: any) => {
                                        const dateString = new Date(sess.timestamp || Date.now()).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        });

                                        const index = interviewData.findIndex((s: any) => s.timestamp === sess.timestamp);
                                        const sessId = sess.id || `idx_${index}`;
                                        const isExpanded = expandedProgressInterviewId === sessId;

                                        return (
                                            <Link
                                                key={sessId}
                                                href={`/film-room?t=${sess.timestamp}`}
                                                className={`p-4 flex items-center justify-between border rounded-2xl text-left transition-all duration-200 cursor-pointer ${isLight
                                                    ? "bg-white border-slate-200 hover:border-indigo-500 shadow-sm shadow-slate-100/10"
                                                    : "bg-[#0b0c15] border-white/5 hover:border-indigo-500/40 hover:bg-[#111222]"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                                                        <Film className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className={`text-xs font-black capitalize tracking-tight ${isLight ? "text-slate-800" : "text-white"}`}>
                                                            {sess.role ? `${sess.role} Mock` : "Mock Interview"} {sess.company ? `(${sess.company})` : ""}
                                                        </h4>
                                                        <span className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                                                            <Clock className="w-3 h-3" /> {dateString}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`text-[10px] font-black text-sky-400 border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 rounded-lg`}>
                                                        Analyze Replay
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : progressTab === "interview" ? (
                        <div className="space-y-4">
                            {interviewData.length === 0 ? (
                                <div className="border border-dashed border-white/10 rounded-2xl p-8 text-center space-y-3">
                                    <Video className="w-8 h-8 text-white/20 mx-auto animate-pulse" />
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-white">No Interview History</h4>
                                        <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                                            Your completed mock interview sessions, dynamic ratings, and correct answer breakdowns will be logged here.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {interviewData.map((sess: any, index: number) => {
                                        const isExpanded = expandedProgressInterviewId === sess.id || expandedProgressInterviewId === `idx_${index}`;
                                        const sessId = sess.id || `idx_${index}`;
                                        // eslint-disable-next-line react-hooks/purity
                                        const dateString = new Date(sess.timestamp || Date.now()).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        });

                                        return (
                                            <div key={sessId} className={`border rounded-xl transition-all duration-200 overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#16161f] border-white/5"
                                                }`}>
                                                <div
                                                    onClick={() => setExpandedProgressInterviewId(isExpanded ? null : sessId)}
                                                    className="p-3.5 sm:p-4 flex flex-col gap-2.5 cursor-pointer hover:bg-white/[0.01]"
                                                >
                                                    {/* Header Top Row: Title + Date on Left, Final Score + Chevron on Right */}
                                                    <div className="flex items-center justify-between gap-3 w-full">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {interviewData.length - index}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className={`text-xs font-black capitalize tracking-tight truncate ${isLight ? "text-slate-800" : "text-white"}`}>
                                                                    {sess.role ? `${sess.role} Mock` : "Mock Interview"} {sess.company ? `(${sess.company})` : ""}
                                                                </h4>
                                                                <span className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                                                                    <Clock className="w-3 h-3" /> {dateString}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <div className="text-right">
                                                                <span className="text-[8px] uppercase font-bold text-sky-400 block font-extrabold">Final Score</span>
                                                                <span className="text-xs sm:text-sm font-black text-sky-400">{sess.finalScore || sess.interviewRating || 0}/100</span>
                                                            </div>
                                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                                                        </div>
                                                    </div>

                                                    {/* Header Bottom Row: Technical, Behavioral, Communication side-by-side */}
                                                    <div className="flex items-center gap-4 sm:gap-6 text-left flex-wrap border-t border-white/5 pt-2">
                                                        <div>
                                                            <span className="text-[8px] uppercase font-bold text-white/30 block">Technical</span>
                                                            <span className={`text-[10px] font-black ${isLight ? "text-slate-700" : "text-white"}`}>{sess.technicalRating || 0}/100</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[8px] uppercase font-bold text-white/30 block">Behavioral</span>
                                                            <span className={`text-[10px] font-black ${isLight ? "text-slate-700" : "text-white"}`}>{sess.behavioralRating || 0}/100</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[8px] uppercase font-bold text-white/30 block">Communication</span>
                                                            <span className={`text-[10px] font-black ${isLight ? "text-slate-700" : "text-white"}`}>{sess.communicationRating || 0}/100</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className={`border-t p-3 sm:p-4 space-y-3 text-left ${isLight ? "border-slate-200 bg-slate-50/60" : "border-white/5 bg-black/20"}`}>
                                                        {/* 5 ratings grid with overflow protection */}
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                                                            <div className={`p-2.5 sm:p-3 rounded-xl border text-center ${isLight ? "bg-white border-slate-300 shadow-sm" : "bg-white/5 border-white/10"}`}>
                                                                <span className={`text-[8.5px] sm:text-[9.5px] uppercase font-bold block mb-0.5 tracking-tight truncate ${isLight ? "text-sky-700 font-extrabold" : "text-sky-400 font-extrabold"}`}>Final Score</span>
                                                                <span className={`text-xs sm:text-sm font-black ${isLight ? "text-sky-700" : "text-sky-400"}`}>{sess.finalScore || sess.interviewRating || 0}/100</span>
                                                            </div>
                                                            <div className={`p-2.5 sm:p-3 rounded-xl border text-center ${isLight ? "bg-white border-slate-300 shadow-sm" : "bg-white/5 border-white/10"}`}>
                                                                <span className={`text-[8.5px] sm:text-[9.5px] uppercase font-bold block mb-0.5 tracking-tight truncate ${isLight ? "text-slate-600 font-extrabold" : "text-white/40"}`}>Technical</span>
                                                                <span className={`text-xs sm:text-sm font-black ${isLight ? "text-slate-900" : "text-white"}`}>{sess.technicalRating || 0}/100</span>
                                                            </div>
                                                            <div className={`p-2.5 sm:p-3 rounded-xl border text-center ${isLight ? "bg-white border-slate-300 shadow-sm" : "bg-white/10"}`}>
                                                                <span className={`text-[8.5px] sm:text-[9.5px] uppercase font-bold block mb-0.5 tracking-tight truncate ${isLight ? "text-slate-600 font-extrabold" : "text-white/40"}`}>Behavioral</span>
                                                                <span className={`text-xs sm:text-sm font-black ${isLight ? "text-slate-900" : "text-white"}`}>{sess.behavioralRating || 0}/100</span>
                                                            </div>
                                                            <div className={`p-2.5 sm:p-3 rounded-xl border text-center ${isLight ? "bg-white border-slate-300 shadow-sm" : "bg-white/5 border-white/10"}`}>
                                                                <span className={`text-[8.5px] sm:text-[9.5px] uppercase font-bold block mb-0.5 tracking-tight truncate ${isLight ? "text-slate-600 font-extrabold" : "text-white/40"}`}>Communication</span>
                                                                <span className={`text-xs sm:text-sm font-black ${isLight ? "text-slate-900" : "text-white"}`}>{sess.communicationRating || 0}/100</span>
                                                            </div>
                                                            <div className={`col-span-2 sm:col-span-1 lg:col-span-1 p-2.5 sm:p-3 rounded-xl border text-center ${isLight ? "bg-white border-slate-300 shadow-sm" : "bg-white/5 border-white/10"}`}>
                                                                <span className={`text-[8.5px] sm:text-[9.5px] uppercase font-bold block mb-0.5 tracking-tight truncate ${isLight ? "text-slate-600 font-extrabold" : "text-white/40"}`}>Portfolio</span>
                                                                <span className={`text-xs sm:text-sm font-black ${isLight ? "text-slate-900" : "text-white"}`}>{sess.portfolioRating || "N/A"}</span>
                                                            </div>
                                                        </div>

                                                        {/* Actions Panel */}
                                                        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-t pt-3 ${isLight ? "border-slate-200" : "border-white/5"}`}>
                                                            <Link
                                                                href={`/film-room?t=${sess.timestamp}`}
                                                                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${isLight
                                                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                                                    : "bg-indigo-650/20 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                                                                    }`}
                                                            >
                                                                <Film className="w-3.5 h-3.5 shrink-0" />
                                                                Analyze tape (Film Room)
                                                            </Link>
                                                            <button
                                                                type="button"
                                                                onClick={() => shareSessionScorecard(sess)}
                                                                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${isLight
                                                                    ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                                                                    : "bg-purple-650/20 border-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                                                                    }`}
                                                            >
                                                                <Share2 className="w-3.5 h-3.5 shrink-0" />
                                                                Share Scorecard
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => downloadTranscript(sess.transcript || "", sess.timestamp)}
                                                                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${isLight
                                                                    ? "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                                                                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                                                                    }`}
                                                            >
                                                                <Download className="w-3.5 h-3.5 shrink-0" />
                                                                Download Transcript
                                                            </button>
                                                        </div>

                                                        {sess.summary && (
                                                            <div className="space-y-1.5">
                                                                <span className="text-[9px] uppercase font-bold text-sky-400 block tracking-wider font-extrabold">Evaluation Summary</span>
                                                                <div className={`leading-relaxed whitespace-pre-line font-medium ${isLight ? "text-slate-700" : "text-white/80"}`}>
                                                                    {sess.summary}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="space-y-2">
                                                            <span className="text-[9px] uppercase font-bold text-sky-400 block tracking-wider font-extrabold">Annotated Transcript & Corrections</span>
                                                            <div className={`rounded-xl p-4 font-mono text-[10px] max-h-[350px] overflow-y-auto leading-relaxed border ${isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/30 border-white/5 text-indigo-200"
                                                                }`}>
                                                                {sess.transcript ? (
                                                                    <div className="whitespace-pre-wrap">{sess.transcript}</div>
                                                                ) : (
                                                                    <span className="text-white/30 italic">No transcript recorded for this session.</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {mockData.length === 0 ? (
                                <div className="border border-dashed border-white/10 rounded-2xl p-8 text-center space-y-3">
                                    <Award className="w-8 h-8 text-white/20 mx-auto animate-pulse" />
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-white">No Mock Assessment History</h4>
                                        <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                                            Your dynamically generated Mock Aptitude test results, MCQ analytics, and coding evaluations will be logged here.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {mockData.map((sess: any, index: number) => {
                                        const isExpanded = expandedProgressMockId === sess.id;
                                        // eslint-disable-next-line react-hooks/purity
                                        const dateString = new Date(sess.timestamp || Date.now()).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        });

                                        return (
                                            <div key={sess.id || index} className={`border rounded-xl transition-all duration-200 overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#16161f] border-white/5"
                                                }`}>
                                                <div
                                                    onClick={() => setExpandedProgressMockId(isExpanded ? null : sess.id)}
                                                    className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.01]"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                                                            {mockData.length - index}
                                                        </div>
                                                        <div>
                                                            <h4 className={`text-xs font-black capitalize tracking-tight ${isLight ? "text-slate-800" : "text-white"}`}>
                                                                Mock Aptitude Assessment
                                                            </h4>
                                                            <span className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                                                                <Clock className="w-3 h-3" /> {dateString}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-3.5 text-left flex-wrap">
                                                            <div>
                                                                <span className="text-[8px] uppercase font-bold text-white/30 block">Aptitude Correct</span>
                                                                <span className={`text-[10px] font-black ${isLight ? "text-slate-700" : "text-white"}`}>{sess.correctAnswers ?? 0}/{sess.totalQuestions ?? 10}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <div className="text-right">
                                                                <span className="text-[8px] uppercase font-bold text-emerald-400 block font-extrabold">Final Score</span>
                                                                <span className="text-xs font-black text-emerald-450">{sess.score ?? 0}/100</span>
                                                            </div>
                                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                                                        </div>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="border-t border-white/5 p-4 bg-black/10 space-y-4 text-left">
                                                        <div className="space-y-2">
                                                            <span className="text-[9px] uppercase font-bold text-emerald-400 block tracking-wider font-extrabold">Aptitude Assessment Performance</span>
                                                            <div className={`p-4 rounded-xl border grid grid-cols-2 gap-4 ${isLight ? "bg-slate-50 border-slate-200 text-slate-850" : "bg-black/20 border-white/5 text-white/80"
                                                                }`}>
                                                                <div className="space-y-1">
                                                                    <span className="text-[9px] uppercase font-bold text-white/30 block">Total MCQ Questions</span>
                                                                    <span className={`text-base font-black ${isLight ? "text-slate-800" : "text-white"}`}>{sess.totalQuestions ?? 10}</span>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <span className="text-[9px] uppercase font-bold text-white/30 block">Correct Answers</span>
                                                                    <span className="text-emerald-400 text-base font-black">{sess.correctAnswers ?? 0}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3 pt-2">
                                                            <span className="text-[9px] uppercase font-bold text-emerald-400 block tracking-wider font-extrabold">Coding Lab Exercises</span>
                                                            {sess.codingGradings && Object.keys(sess.codingGradings).length > 0 ? (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {Object.entries(sess.codingGradings).map(([qId, grading]: [string, any]) => (
                                                                        <div key={qId} className={`p-4 rounded-xl border space-y-2.5 ${isLight ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/5"
                                                                            }`}>
                                                                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                                                <span className={`text-xs font-bold ${isLight ? "text-slate-800" : "text-white"}`}>Coding Question ID: {qId}</span>
                                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${grading.score >= 7
                                                                                    ? "bg-green-500/10 border border-green-500/20 text-green-400"
                                                                                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                                                                                    }`}>
                                                                                    Score: {grading.score}/10
                                                                                </span>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <div className="flex justify-between text-[10px]">
                                                                                    <span className="text-white/40 font-bold">Status:</span>
                                                                                    <span className="text-sky-400 font-extrabold uppercase">{grading.status}</span>
                                                                                </div>
                                                                                <div className="flex justify-between text-[10px]">
                                                                                    <span className="text-white/40 font-bold">Time Complexity:</span>
                                                                                    <span className={`font-mono font-bold ${isLight ? "text-slate-700" : "text-white"}`}>{grading.timeComplexity || "N/A"}</span>
                                                                                </div>
                                                                                <div className="flex justify-between text-[10px]">
                                                                                    <span className="text-white/40 font-bold">Space Complexity:</span>
                                                                                    <span className={`font-mono font-bold ${isLight ? "text-slate-700" : "text-white"}`}>{grading.spaceComplexity || "N/A"}</span>
                                                                                </div>
                                                                            </div>
                                                                            {grading.recommendations && (
                                                                                <div className="space-y-1 border-t border-white/5 pt-2">
                                                                                    <span className="text-[9px] uppercase font-bold text-white/30 block">AI Suggestions</span>
                                                                                    <p className={`text-[10px] leading-relaxed font-semibold italic ${isLight ? "text-slate-650" : "text-white/60"}`}>
                                                                                        &quot;{grading.recommendations}&quot;
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-white/30 italic">No coding evaluations recorded for this session.</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Float notification toast */}
            {toastMsg && (
                <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-indigo-950 border border-indigo-500/20 bg-indigo-900/90 backdrop-blur-md px-4 py-3 text-xs text-white shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
                    <span className="font-semibold">{toastMsg}</span>
                </div>
            )}
        </div>
    );
}
