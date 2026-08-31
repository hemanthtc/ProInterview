"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Award, ChevronDown, ChevronUp, Clock, TrendingUp, Video, Film, Share2, Download, Loader2, Sparkles, X, ShieldCheck, Trash2, AlertTriangle } from "lucide-react";
import { getStorageItem } from "../../utils/storage";
import { deleteSessionFromCloud, deleteMockAptitudeFromCloud, clearTabHistoryFromCloud, pullSessionsFromCloud } from "../../utils/cloudSync";

interface ProgressPanelProps {
    isLight: boolean;
    defaultTab?: "filmroom" | "interview" | "aptitude";
    onClose?: () => void;
}

interface DeleteModalState {
    isOpen: boolean;
    type: "filmroom" | "interview" | "aptitude" | "clear_tab";
    id?: string;
    timestamp?: number;
    title?: string;
}

function formatSessionDate(timestamp?: number | string | null): string {
    if (!timestamp) return "Recent";
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "Recent";
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
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

    const [interviewData, setInterviewData] = useState<any[]>([]);
    const [mockData, setMockData] = useState<any[]>([]);
    const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [mountTime] = useState(() => (typeof window !== "undefined" ? Date.now() : 0));

    const loadData = () => {
        try {
            const rawInterviews = getStorageItem("interviewSessions");
            if (rawInterviews) setInterviewData(JSON.parse(rawInterviews));
            const rawMocks = getStorageItem("mockAptitudeSessions");
            if (rawMocks) setMockData(JSON.parse(rawMocks));
        } catch (e) {
            console.error("Failed to parse progress data", e);
        }
    };

    useEffect(() => {
        loadData();

        void pullSessionsFromCloud().then(() => {
            loadData();
        });
    }, []);

    const totalInterviews = interviewData.length;
    const avgScore = useMemo(() => {
        if (interviewData.length === 0) return 0;
        const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
        let weightedSum = 0, totalWeight = 0;
        interviewData.forEach((s: any) => {
            const ageMs = mountTime ? mountTime - s.timestamp : 0;
            const weight = Math.max(0, 1 - ageMs / ONE_YEAR_MS);
            weightedSum += (s.finalScore || s.interviewRating || 0) * weight;
            totalWeight += weight;
        });
        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    }, [interviewData, mountTime]);

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

    const handleConfirmDelete = async () => {
        if (!deleteModal) return;
        setIsDeleting(true);
        const { type, id, timestamp } = deleteModal;

        try {
            if (type === "filmroom") {
                if (timestamp) {
                    fetch(`/api/film-room?timestamp=${timestamp}`, { method: "DELETE" }).catch(() => {});
                    localStorage.removeItem(`filmRoom_${timestamp}`);
                }
                setToastMsg("Film Room analysis deleted.");
            } else if (type === "interview") {
                await deleteSessionFromCloud(id, timestamp);
                setInterviewData(JSON.parse(getStorageItem("interviewSessions") || "[]"));
                setToastMsg("Interview attempt and associated Film Room data deleted.");
            } else if (type === "aptitude") {
                await deleteMockAptitudeFromCloud(id, timestamp);
                setMockData(JSON.parse(getStorageItem("mockAptitudeSessions") || "[]"));
                setToastMsg("Mock aptitude assessment deleted.");
            } else if (type === "clear_tab") {
                const currentTab = progressTab;
                await clearTabHistoryFromCloud(currentTab);
                setInterviewData(JSON.parse(getStorageItem("interviewSessions") || "[]"));
                setMockData(JSON.parse(getStorageItem("mockAptitudeSessions") || "[]"));
                setToastMsg(`All ${currentTab} history cleared.`);
            }
        } catch (e: any) {
            setToastMsg("Failed to delete record.");
        } finally {
            setIsDeleting(false);
            setDeleteModal(null);
            setTimeout(() => setToastMsg(null), 3000);
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
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        title="Close Dashboard"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Row 1: KPI Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-2xl border ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-white/5 border-white/10"}`}>
                    <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">Total Mock Sessions</span>
                    <span className="text-2xl font-black text-white">{totalInterviews}</span>
                </div>
                <div className={`p-4 rounded-2xl border ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-white/5 border-white/10"}`}>
                    <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">Weighted Avg Score</span>
                    <span className="text-2xl font-black text-sky-400">{avgScore > 0 ? `${avgScore}/100` : "N/A"}</span>
                </div>
                <div className={`p-4 rounded-2xl border ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-white/5 border-white/10"}`}>
                    <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">Candidate Benchmark</span>
                    <span className={`text-sm font-black truncate block mt-1 ${benchmarkColor}`}>{benchmark}</span>
                </div>
                <div className={`p-4 rounded-2xl border flex flex-col justify-between ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-white/5 border-white/10"}`}>
                    <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">AI Growth Guidance</span>
                    <button
                        type="button"
                        onClick={fetchGuidance}
                        disabled={loadingGuidance || totalInterviews === 0}
                        className="w-full py-1.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-sky-500/10"
                    >
                        {loadingGuidance ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                        ) : (
                            <><Sparkles className="w-3.5 h-3.5" /> Get AI Coaching</>
                        )}
                    </button>
                </div>
            </div>

            {/* AI Guidance Accordion */}
            {guidanceOpen && (
                <div className={`p-4 rounded-2xl border animate-in slide-in-from-top-2 duration-300 ${isLight ? "bg-sky-50 border-sky-200 text-slate-800" : "bg-sky-950/20 border-sky-500/30 text-sky-200"}`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-sky-400" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-sky-400">Personalized AI Performance Guidance</h4>
                        </div>
                        <button type="button" onClick={() => setGuidanceOpen(false)} className="text-white/40 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="text-xs leading-relaxed whitespace-pre-line font-medium opacity-90">
                        {guidance}
                    </div>
                </div>
            )}

            {/* Row 3: My Progress & Learning (Tabs & Lists Section) */}
            <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-sky-400" />
                            <h3 className="text-base sm:text-lg font-extrabold text-white">My Progress & Learning</h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Auto-cleanup active (30-day retention) &bull; MongoDB synced</span>
                        </div>
                    </div>

                    {/* Navigation Toggle & Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 shrink-0">
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
                                Film Room ({interviewData.length})
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
                                Interview Attempts ({interviewData.length})
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
                                Mock Assessments ({mockData.length})
                            </button>
                        </div>

                        {/* Clear Tab History Button */}
                        {((progressTab === "interview" || progressTab === "filmroom") && interviewData.length > 0) || (progressTab === "aptitude" && mockData.length > 0) ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteModal({
                                        isOpen: true,
                                        type: "clear_tab",
                                        title: `Clear all ${progressTab === "aptitude" ? "Mock Assessment" : "Interview / Film Room"} records`
                                    });
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
                                title="Clear All History for this tab"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Clear Tab
                            </button>
                        ) : null}
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
                                        const dateString = formatSessionDate(sess.timestamp);

                                        const index = interviewData.findIndex((s: any) => s.timestamp === sess.timestamp);
                                        const sessId = sess.id || `idx_${index}`;

                                        return (
                                            <div
                                                key={sessId}
                                                className={`p-4 flex items-center justify-between border rounded-2xl text-left transition-all duration-200 ${isLight
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
                                                    <Link
                                                        href={`/film-room?t=${sess.timestamp}`}
                                                        className="text-[10px] font-black text-sky-400 border border-sky-500/20 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        Analyze Replay
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setDeleteModal({
                                                                isOpen: true,
                                                                type: "filmroom",
                                                                id: sess.id,
                                                                timestamp: sess.timestamp,
                                                                title: `${sess.role || "Mock Interview"} (Film Room Analysis)`
                                                            });
                                                        }}
                                                        className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                                                        title="Delete Film Room analysis"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
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
                                        const dateString = formatSessionDate(sess.timestamp);

                                        return (
                                            <div key={sessId} className={`border rounded-xl transition-all duration-200 overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#16161f] border-white/5"
                                                }`}>
                                                <div
                                                    onClick={() => setExpandedProgressInterviewId(isExpanded ? null : sessId)}
                                                    className="p-3.5 sm:p-4 flex flex-col gap-2.5 cursor-pointer hover:bg-white/[0.01]"
                                                >
                                                    {/* Header Top Row: Title + Date on Left, Final Score + Delete on Right */}
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

                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <div className="text-right">
                                                                <span className="text-[8px] uppercase font-bold text-sky-400 block font-extrabold">Final Score</span>
                                                                <span className="text-xs sm:text-sm font-black text-sky-400">{sess.finalScore || sess.interviewRating || 0}/100</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeleteModal({
                                                                        isOpen: true,
                                                                        type: "interview",
                                                                        id: sess.id || sessId,
                                                                        timestamp: sess.timestamp,
                                                                        title: `${sess.role || "Mock Interview"} ${sess.company ? `(${sess.company})` : ""}`
                                                                    });
                                                                }}
                                                                className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                                title="Delete interview session"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                                                        </div>
                                                    </div>

                                                    {/* Header Bottom Row */}
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
                                                        {/* 5 ratings grid */}
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
                                                            <div className={`p-2.5 sm:p-3 rounded-xl border text-center ${isLight ? "bg-white border-slate-300 shadow-sm" : "bg-white/10"}`}>
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
                                        const dateString = formatSessionDate(sess.timestamp);

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

                                                        <div className="flex items-center gap-3">
                                                            <div className="text-right">
                                                                <span className="text-[8px] uppercase font-bold text-emerald-400 block font-extrabold">Final Score</span>
                                                                <span className="text-xs font-black text-emerald-450">{sess.score ?? 0}/100</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeleteModal({
                                                                        isOpen: true,
                                                                        type: "aptitude",
                                                                        id: sess.id,
                                                                        timestamp: sess.timestamp,
                                                                        title: "Mock Aptitude Assessment"
                                                                    });
                                                                }}
                                                                className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                                title="Delete mock assessment"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {deleteModal?.isOpen && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => !isDeleting && setDeleteModal(null)}
                >
                    <div
                        className="bg-[#11121c] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl shadow-black/80 relative text-left"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4 mb-5">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h4 className="text-base font-extrabold text-white mb-1">Confirm Deletion</h4>
                                <p className="text-xs text-white/60 leading-relaxed">
                                    Are you sure you want to delete <strong className="text-white">{deleteModal.title || "this item"}</strong>? This action permanently purges database and cloud storage records.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleConfirmDelete}
                                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/20"
                            >
                                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                {isDeleting ? "Deleting..." : "Delete Permanently"}
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setDeleteModal(null)}
                                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-bold py-2.5 rounded-xl transition-colors text-xs cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Float notification toast */}
            {toastMsg && (
                <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-indigo-950 border border-indigo-500/20 bg-indigo-900/90 backdrop-blur-md px-4 py-3 text-xs text-white shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
                    <span className="font-semibold">{toastMsg}</span>
                </div>
            )}
        </div>
    );
}
