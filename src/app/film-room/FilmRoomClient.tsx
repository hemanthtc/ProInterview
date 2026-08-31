"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getStorageItem, setStorageItem } from "../../utils/storage";
import { ArrowLeft, Clapperboard, Loader2, Target, RefreshCw, Sparkles, ChevronRight, TrendingUp, Award } from "lucide-react";

interface FilmAnnotation {
    t: number;
    label: string;
    kind: "strength" | "gap" | "moment" | "tip";
    quote?: string;
    note: string;
    rewrite?: string;
    retakePrompt?: string;
}

interface FilmRoomResult {
    title: string;
    overallTake: string;
    annotations: FilmAnnotation[];
    keyMoments: string[];
    practiceFocus: string[];
    retakePrompts?: string[];
    fallback?: boolean;
}

interface InterviewSession {
    timestamp: number;
    transcript?: string;
    summary?: string;
    finalScore?: number;
    technicalRating?: number;
    behavioralRating?: number;
    communicationRating?: number;
    portfolioRating?: number | string;
    userName?: string;
    userIdentifier?: string;
    company?: string;
    role?: string;
}

const kindStyles: Record<FilmAnnotation["kind"], string> = {
    strength: "border-emerald-500/30 bg-emerald-500/10 text-emerald-250",
    gap: "border-red-500/30 bg-red-500/10 text-red-200",
    moment: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    tip: "border-amber-500/30 bg-amber-500/10 text-amber-200",
};

const lightKindStyles: Record<FilmAnnotation["kind"], string> = {
    strength: "border-emerald-200 bg-emerald-50 text-emerald-900",
    gap: "border-red-200 bg-red-50 text-red-900",
    moment: "border-sky-250 bg-sky-50 text-sky-900",
    tip: "border-amber-250 bg-amber-50 text-amber-900",
};

function formatTime(seconds: number): string {
    const s = Math.max(0, Math.round(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
}

function startFocusedRematch(prompt: string, session?: InterviewSession | null) {
    setStorageItem("focusedRetakePrompt", prompt);
    setStorageItem("interviewLevel", getStorageItem("interviewLevel") || "intermediate");
    if (session?.company) setStorageItem("targetCompany", session.company);
    if (session?.role) setStorageItem("preferredRoles", session.role);
    setStorageItem("globalInterviewMode", getStorageItem("globalInterviewMode") || "technical");
    setStorageItem("interviewType", getStorageItem("globalInterviewMode") || "technical");
}

export default function FilmRoomClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tParam = searchParams.get("t");

    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">(() => {
        if (typeof window === "undefined") return "dark";
        const savedTheme = localStorage.getItem("globalTheme") as "dark" | "light" | "eyeprotect" | null;
        if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
            return savedTheme;
        }
        return "dark";
    });
    const isLight = theme === "light" || theme === "eyeprotect";

    useEffect(() => {
        const syncTheme = () => {
            const savedTheme = localStorage.getItem("globalTheme") as "dark" | "light" | "eyeprotect" | null;
            if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
                setTheme(savedTheme);
            }
        };
        window.addEventListener("storage", syncTheme);
        return () => window.removeEventListener("storage", syncTheme);
    }, []);

    const session = useMemo(() => {
        if (!tParam) return null;
        const target = Number(tParam);
        if (!Number.isFinite(target)) return null;
        try {
            const raw = getStorageItem("interviewSessions");
            const list: InterviewSession[] = raw ? JSON.parse(raw) : [];
            return list.find((s) => s.timestamp === target) || null;
        } catch {
            return null;
        }
    }, [tParam]);

    const allSessions = useMemo(() => {
        try {
            const raw = getStorageItem("interviewSessions");
            const list: InterviewSession[] = raw ? JSON.parse(raw) : [];
            const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            const currentIdentifier = getStorageItem("userIdentifier") || "";
            const currentUserName = getStorageItem("userName") || "";

            return list
                .filter((s: InterviewSession) => {
                    if (now - s.timestamp >= ONE_YEAR_MS) return false;
                    if (!s.userName && !s.userIdentifier) return true;
                    if (currentIdentifier && s.userIdentifier === currentIdentifier) return true;
                    if (s.userName === currentUserName) return true;
                    if (currentIdentifier && s.userName === currentIdentifier) return true;
                    return false;
                })
                .sort((a, b) => b.timestamp - a.timestamp);
        } catch {
            return [];
        }
    }, []);

    const totalInterviews = allSessions.length;
    const avgScore = useMemo(() => {
        if (allSessions.length === 0) return 0;
        const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        let weightedSum = 0, totalWeight = 0;
        allSessions.forEach((s: InterviewSession) => {
            const ageMs = now - s.timestamp;
            const weight = Math.max(0, 1 - ageMs / ONE_YEAR_MS);
            weightedSum += (s.finalScore || 0) * weight;
            totalWeight += weight;
        });
        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    }, [allSessions]);
    const benchmark = avgScore >= 80 ? "Top Tier Candidate" : avgScore >= 60 ? "Proficient" : avgScore > 0 ? "Needs Improvement" : "No Data Yet";
    const benchmarkColor = avgScore >= 80 ? "text-emerald-400" : avgScore >= 60 ? "text-amber-400" : avgScore > 0 ? "text-rose-400" : "text-white/40";

    const [guidanceOpen, setGuidanceOpen] = useState(false);
    const [loadingGuidance, setLoadingGuidance] = useState(false);
    const [guidance, setGuidance] = useState("");

    const fetchGuidance = async () => {
        if (allSessions.length === 0) return;
        setLoadingGuidance(true);
        setGuidanceOpen(true);
        try {
            const res = await fetch("/api/profile-guidance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessions: allSessions }),
            });
            const data = await res.json();
            if (data.guidance) {
                setGuidance(data.guidance);
            } else {
                setGuidance("Focus on practicing behavioral responses using the STAR method and review technical gap analyses.");
            }
        } catch {
            setGuidance("Focus on practicing behavioral responses using the STAR method and review technical gap analyses.");
        } finally {
            setLoadingGuidance(false);
        }
    };

    const [result, setResult] = useState<FilmRoomResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!session?.transcript) return;
        let cancelled = false;

        async function run() {
            setLoading(true);
            setError("");
            try {
                const cacheKey = `filmRoom_${session!.timestamp}`;
                const cached = getStorageItem(cacheKey);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (!cancelled) setResult(parsed);
                        if (!cancelled) setLoading(false);
                        return;
                    } catch { /* rebuild */ }
                }

                // Check S3 cloud cache via GET first
                try {
                    const cachedRes = await fetch(`/api/film-room?timestamp=${session!.timestamp}`);
                    if (cachedRes.ok) {
                        const cachedData = await cachedRes.json();
                        if (!cancelled) {
                            setResult(cachedData);
                            setStorageItem(cacheKey, JSON.stringify(cachedData));
                            setLoading(false);
                        }
                        return;
                    }
                } catch (err) {
                    console.warn("S3 cache lookup failed, generating anew", err);
                }

                const res = await fetch("/api/film-room", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        transcript: session!.transcript,
                        summary: session!.summary || "",
                        timestamp: session!.timestamp,
                        scores: {
                            final: session!.finalScore,
                            technical: session!.technicalRating,
                            behavioral: session!.behavioralRating,
                            communication: session!.communicationRating,
                        },
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to build film room");
                if (!cancelled) {
                    setResult(data);
                    setStorageItem(cacheKey, JSON.stringify(data));
                }
            } catch (e: any) {
                if (!cancelled) setError(e.message || "Film room failed");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void run();
        return () => {
            cancelled = true;
        };
    }, [session]);

    const handleRetake = (prompt: string) => {
        startFocusedRematch(prompt, session);
        router.push("/setup");
    };

    const practiceInStarCoach = (prompt: string, weakSpot?: string) => {
        const q = encodeURIComponent(prompt);
        const w = encodeURIComponent(weakSpot || "from film room");
        router.push(`/star-coach?question=${q}&weakSpot=${w}`);
    };

    const rebuild = async () => {
        if (!session?.transcript) return;
        setStorageItem(`filmRoom_${session.timestamp}`, "");
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/film-room", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transcript: session.transcript,
                    summary: session.summary || "",
                    scores: {
                        final: session.finalScore,
                        technical: session.technicalRating,
                        behavioral: session.behavioralRating,
                        communication: session.communicationRating,
                    },
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to rebuild");
            setResult(data);
            setStorageItem(`filmRoom_${session.timestamp}`, JSON.stringify(data));
        } catch (e: any) {
            setError(e.message || "Rebuild failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen transition-colors duration-300 ${
            theme === "light" ? "bg-slate-100 text-slate-900" : theme === "eyeprotect" ? "bg-[#f3ede3] text-[#1c1917]" : "bg-[#050505] text-white"
        } font-sans`}>
            <header className={`px-4 sm:px-8 py-4 border-b flex items-center justify-between gap-3 sticky top-0 backdrop-blur-md z-10 transition-colors ${
                theme === "light" ? "bg-white/90 border-slate-200" : theme === "eyeprotect" ? "bg-[#fffcf5]/90 border-[#8c8578]/20" : "bg-[#050505]/90 border-white/10"
            }`}>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className={`p-2 rounded-lg transition-colors ${
                            isLight ? "hover:bg-slate-150 text-slate-650 animate-fade-in" : "hover:bg-white/10 text-white/60"
                        }`}
                        aria-label="Back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 text-left">
                        <Clapperboard className={`w-5 h-5 ${isLight ? "text-indigo-600" : "text-indigo-400"}`} />
                        <h1 className="text-lg font-bold">Film Room</h1>
                    </div>
                </div>
                {session && result && (
                    <button
                        type="button"
                        onClick={() => void rebuild()}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                            isLight ? "text-teal-700 hover:text-teal-800" : "text-teal-400 hover:text-teal-300"
                        }`}
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Rebuild
                    </button>
                )}
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 w-full items-start">
                    {/* Left Column: Profile Stats and AI Career Coach */}
                    <div className="md:col-span-4 lg:col-span-4 space-y-5 flex flex-col w-full">
                        {/* Stat Card 1: Total Interviews */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-indigo-950/20 via-black/30 to-black/30 border border-white/10 p-5 group shadow-xl transition-all duration-300 backdrop-blur-xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-all" />
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                                    <h3 className="text-indigo-300 font-extrabold text-[11px] tracking-wider uppercase">Total Interviews</h3>
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 group-hover:scale-110 transition-transform">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline justify-between mb-2">
                                <p className="text-4xl font-black text-white group-hover:text-indigo-200 transition-colors tracking-tight">
                                    {totalInterviews}
                                </p>
                                <span className="text-[10px] font-semibold text-indigo-300/80 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                    Last 12 mos
                                </span>
                            </div>
                            <p className="text-[11px] text-white/40 mt-2 font-medium">Logged & synced attempts</p>
                        </div>

                        {/* Stat Card 2: Weighted Avg Score */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-purple-950/20 via-black/30 to-black/30 border border-white/10 p-5 group shadow-xl transition-all duration-300 backdrop-blur-xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition-all" />
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                    <h3 className="text-purple-300 font-extrabold text-[11px] tracking-wider uppercase">Weighted Avg Score</h3>
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0 group-hover:scale-110 transition-transform">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline justify-between mb-2">
                                <p className="text-4xl font-black text-white group-hover:text-purple-200 transition-colors tracking-tight">
                                    {avgScore} <span className="text-sm font-bold text-white/30">/ 100</span>
                                </p>
                                <span className="text-[10px] font-semibold text-purple-300/80 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                    Recency weighted
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-400 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, Math.max(0, avgScore))}%` }}
                                />
                            </div>
                        </div>

                        {/* Stat Card 3: Hiring Benchmark */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-950/20 via-black/30 to-black/30 border border-white/10 p-5 group shadow-xl transition-all duration-300 backdrop-blur-xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <h3 className="text-emerald-300 font-extrabold text-[11px] tracking-wider uppercase">Hiring Benchmark</h3>
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 group-hover:scale-110 transition-transform">
                                    <Award className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between min-h-[40px]">
                                {allSessions.length === 0 ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 font-bold text-xs">
                                        Pending Session Data
                                    </span>
                                ) : (
                                    <p className={`text-lg font-extrabold tracking-tight ${benchmarkColor}`}>{benchmark}</p>
                                )}
                            </div>
                            <p className="text-[11px] text-white/40 mt-2 font-medium">Industry hiring bar evaluation</p>
                        </div>

                        {/* Stat Card 4: AI Career Coach */}
                        <div className="bg-gradient-to-r from-indigo-950/30 via-purple-950/10 to-black border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(79,70,229,0.08)] backdrop-blur-xl">
                            <div className="p-5 flex flex-col gap-4">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                                        <Sparkles className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h2 className="font-extrabold text-sm sm:text-base text-white">AI Career Coach</h2>
                                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-bold uppercase tracking-wider border border-indigo-500/30">
                                                Personalized
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-white/60 line-clamp-1">Get custom guidance & action plan</p>
                                    </div>
                                </div>
                                <button
                                    onClick={guidanceOpen ? () => setGuidanceOpen(false) : fetchGuidance}
                                    disabled={loadingGuidance || allSessions.length === 0}
                                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-all px-4 py-2 rounded-xl font-bold text-xs text-white shadow-lg shadow-indigo-500/25 shrink-0 whitespace-nowrap w-full cursor-pointer"
                                >
                                    {loadingGuidance ? (
                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                                    ) : guidanceOpen ? (
                                        "Close Plan"
                                    ) : (
                                        "Get My Plan"
                                    )}
                                </button>
                            </div>

                            {guidanceOpen && (
                                <div className="border-t border-white/10 p-5 bg-black/30 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {loadingGuidance ? (
                                        <div className="flex flex-col items-center justify-center py-4 gap-2 text-white/50">
                                            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                                            <p className="text-[11px] font-medium">Analyzing sessions...</p>
                                        </div>
                                    ) : (
                                        <div className="prose prose-invert max-w-none space-y-2 text-left">
                                            {guidance.split("\n").map((line, i) => {
                                                const isBold = /^\*\*.+\*\*/.test(line);
                                                const cleaned = line.replace(/\*\*/g, "").replace(/^#+\s*/, "");
                                                if (!cleaned.trim()) return <div key={i} className="h-2" />;
                                                if (isBold) return <p key={i} className="font-extrabold text-indigo-300 text-[11px] mt-3 mb-1">{cleaned}</p>;
                                                if (line.startsWith("- ") || line.startsWith("• ")) return <p key={i} className="text-white/80 text-[11px] pl-3 before:content-['•'] before:text-indigo-400 before:mr-1.5">{cleaned.replace(/^[-•]\s*/, "")}</p>;
                                                return <p key={i} className="text-white/70 text-[11px] leading-relaxed">{cleaned}</p>;
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Main Film Room Content */}
                    <div className="md:col-span-8 lg:col-span-8 w-full space-y-6">
                {/* Fallback Selection list when no timestamp parameter is present or no session matched */}
                {(!tParam || !session) && (
                    <div className="space-y-6">
                        <div className="text-center max-w-md mx-auto py-4">
                            <Clapperboard className={`w-12 h-12 ${isLight ? "text-indigo-600" : "text-indigo-400"} mx-auto mb-3`} />
                            <h2 className="text-xl font-extrabold">Select a Session to Analyze</h2>
                            <p className={`text-xs mt-1.5 leading-relaxed ${isLight ? "text-slate-500" : "text-white/50"}`}>
                                Rewatch your answers like sports game film. Pick any past mock or panel interview from your history to begin.
                            </p>
                        </div>

                        {allSessions.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {allSessions.map((s) => (
                                    <div
                                        key={s.timestamp}
                                        onClick={() => router.push(`/film-room?t=${s.timestamp}`)}
                                        className={`group border rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-all duration-300 ${
                                            theme === "light"
                                                ? "bg-white border-slate-200 hover:border-indigo-500 hover:shadow-md hover:shadow-slate-100 text-slate-900 shadow-sm"
                                                : theme === "eyeprotect"
                                                ? "bg-[#fffcf5] border-[#8c8578]/20 hover:border-teal-700 hover:shadow-md hover:shadow-stone-200 text-[#1c1917] shadow-sm"
                                                : "bg-[#111] border-white/5 hover:border-indigo-500/50 hover:bg-[#161622] shadow-lg shadow-black/20"
                                        }`}
                                    >
                                        <div className="space-y-1 text-left min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] font-mono opacity-60">
                                                    {new Date(s.timestamp).toLocaleDateString()} at {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {s.company && (
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                                        isLight ? "bg-slate-100 text-slate-700" : "bg-white/5 text-white/50"
                                                    }`}>
                                                        {s.company}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="font-extrabold text-sm sm:text-base truncate">
                                                {s.role || "Mock Interview"}
                                            </h4>
                                            {s.summary && (
                                                <p className="text-xs line-clamp-1 opacity-60 leading-relaxed">
                                                    {s.summary}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right">
                                                <div className="text-lg font-black leading-none">
                                                    {s.finalScore ?? "—"}
                                                    <span className="text-[10px] font-medium opacity-40">/100</span>
                                                </div>
                                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Score</span>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                                isLight ? "bg-slate-100 text-slate-650" : "bg-white/5 text-white/40"
                                            } group-hover:bg-indigo-600 group-hover:text-white`}>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState message="No past mock interview sessions found on this device. Complete an interview first to view sessions here." />
                        )}
                    </div>
                )}

                {tParam && session && (
                    <div className={`rounded-2xl border p-5 space-y-2 text-left ${
                        theme === "light" ? "bg-white border-slate-200" : theme === "eyeprotect" ? "bg-[#fffcf5] border-[#8c8578]/25" : "bg-[#111] border-white/10"
                    }`}>
                        <p className="text-xs opacity-50">
                            {new Date(session.timestamp).toLocaleString()}
                            {session.userName ? ` · ${session.userName}` : ""}
                            {session.company ? ` · ${session.company}` : ""}
                            {session.role ? ` · ${session.role}` : ""}
                        </p>
                        <p className="text-2xl font-black">
                            {session.finalScore ?? "—"}
                            <span className="text-sm font-medium opacity-40">/100</span>
                        </p>
                        {session.summary && (
                            <p className="text-sm opacity-70 leading-relaxed">{session.summary}</p>
                        )}
                    </div>
                )}

                {tParam && loading && (
                    <div className="flex items-center gap-2 opacity-65 text-sm py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Building timeline annotations…
                    </div>
                )}
                {tParam && error && <p className="text-sm text-red-400 py-4">{error}</p>}

                {tParam && result && (
                    <div className="space-y-6">
                        <div className={`rounded-2xl border p-5 space-y-2.5 text-left ${
                            theme === "light" ? "bg-white border-slate-200" : theme === "eyeprotect" ? "bg-[#fffcf5] border-[#8c8578]/25" : "bg-[#111] border-white/10"
                        }`}>
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-violet-400" />
                                    {result.title}
                                </h2>
                                {result.fallback && (
                                    <span className="text-[10px] uppercase tracking-wide opacity-45">Offline coach</span>
                                )}
                            </div>
                            <p className="text-sm opacity-75 leading-relaxed">{result.overallTake}</p>
                            {result.practiceFocus && result.practiceFocus.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-2">
                                    {result.practiceFocus.map((f) => (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => practiceInStarCoach(f)}
                                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                                                isLight 
                                                    ? "border-indigo-250 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" 
                                                    : "border-indigo-500/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20"
                                            }`}
                                        >
                                            <Target className="h-3 w-3" />
                                            {f} · STAR →
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs uppercase tracking-wide opacity-50 font-black text-left">Timeline Analysis</h3>
                            <ol className="relative border-l border-indigo-500/20 ml-2.5 space-y-5">
                                {result.annotations.map((a, i) => (
                                    <li key={`${a.t}-${i}`} className="ml-4 pl-1 text-left relative">
                                        <span className="absolute -left-5 mt-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 border border-[#050505]" />
                                        <div className={`rounded-xl border p-4 space-y-2 ${isLight ? lightKindStyles[a.kind] : kindStyles[a.kind]}`}>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs sm:text-sm font-black tracking-tight">{a.label}</span>
                                                <span className="text-[10px] opacity-75 font-mono font-bold">{formatTime(a.t)}</span>
                                            </div>
                                            {a.quote && (
                                                <p className="text-xs italic opacity-75 leading-relaxed">&ldquo;{a.quote}&rdquo;</p>
                                            )}
                                            <p className="text-xs leading-relaxed opacity-90">{a.note}</p>
                                            {a.rewrite && (
                                                <p className={`text-xs mt-2 pt-2 border-t text-teal-600 dark:text-teal-200/90 ${isLight ? "border-slate-200" : "border-white/10"}`}>
                                                    <span className="font-bold">Model Answer: </span>
                                                    {a.rewrite}
                                                </p>
                                            )}
                                            {a.retakePrompt && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRetake(a.retakePrompt!)}
                                                    className={`mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer border transition-colors ${
                                                        isLight 
                                                            ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900" 
                                                            : "bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10"
                                                    }`}
                                                >
                                                    <RefreshCw className="w-3 h-3" /> Practice this answer
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {result.retakePrompts && result.retakePrompts.length > 0 && (
                            <div className={`rounded-2xl border p-4 sm:p-5 space-y-3 text-left ${
                                theme === "light" 
                                    ? "bg-violet-50/60 border-violet-200" 
                                    : theme === "eyeprotect" 
                                    ? "bg-[#f5efe6] border-[#8c8578]/25" 
                                    : "bg-violet-500/5 border-violet-500/20"
                            }`}>
                                <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? "text-violet-750" : "text-violet-300"}`}>Retake Scenarios</h3>
                                <div className="space-y-3.5">
                                    {result.retakePrompts.map((p, i) => (
                                        <div key={i} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                            i < result.retakePrompts!.length - 1 ? "border-b pb-3.5" : ""
                                        }`} style={{ borderColor: isLight ? "rgba(109, 40, 217, 0.08)" : "rgba(255, 255, 255, 0.05)" }}>
                                            <p className="text-xs sm:text-sm opacity-80 font-medium">
                                                {i + 1}. {p}
                                            </p>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRetake(p)}
                                                    className={`text-[10px] font-bold cursor-pointer transition-colors px-2 py-1 rounded ${
                                                        isLight ? "bg-violet-100 hover:bg-violet-200 text-violet-750" : "text-violet-300 hover:text-violet-200"
                                                    }`}
                                                >
                                                    Full rematch →
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => practiceInStarCoach(p)}
                                                    className={`text-[10px] font-bold cursor-pointer transition-colors px-2 py-1 rounded ${
                                                        isLight ? "bg-indigo-100 hover:bg-indigo-200 text-indigo-755" : "text-indigo-300 hover:text-indigo-200"
                                                    }`}
                                                >
                                                    STAR coach →
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.keyMoments && result.keyMoments.length > 0 && (
                            <div className={`rounded-2xl border p-4 text-left ${
                                theme === "light" ? "bg-white border-slate-200" : theme === "eyeprotect" ? "bg-[#fffcf5] border-[#8c8578]/25" : "bg-[#111] border-white/10"
                            }`}>
                                <p className="text-[10px] uppercase tracking-wide opacity-45 font-bold mb-2">
                                    Key moments
                                </p>
                                <ul className="space-y-1.5 text-xs opacity-75 list-disc list-inside">
                                    {result.keyMoments.map((m) => (
                                        <li key={m} className="font-semibold">{m}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
                    </div>
                </div>
            </main>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 dark:bg-[#111]/60 p-8 text-center text-sm opacity-60">
            {message}
        </div>
    );
}
