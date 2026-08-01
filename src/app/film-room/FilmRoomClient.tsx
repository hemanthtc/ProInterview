"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getStorageItem, setStorageItem } from "../../utils/storage";
import { ArrowLeft, Clapperboard, Loader2, Target, RefreshCw, Sparkles } from "lucide-react";

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
    company?: string;
    role?: string;
}

const kindStyles: Record<FilmAnnotation["kind"], string> = {
    strength: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    gap: "border-red-500/30 bg-red-500/10 text-red-200",
    moment: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    tip: "border-amber-500/30 bg-amber-500/10 text-amber-200",
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

                const res = await fetch("/api/film-room", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        transcript: session!.transcript,
                        summary: session!.summary || "",
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
        <div className="min-h-screen bg-[#050505] text-white font-sans">
            <header className="px-4 sm:px-8 py-4 border-b border-white/10 flex items-center justify-between gap-3 sticky top-0 bg-[#050505]/90 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60"
                        aria-label="Back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Clapperboard className="w-5 h-5 text-indigo-400" />
                        <h1 className="text-lg font-bold">Film Room</h1>
                    </div>
                </div>
                {session && (
                    <button
                        type="button"
                        onClick={() => void rebuild()}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:text-teal-300"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Rebuild
                    </button>
                )}
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                {!tParam && (
                    <EmptyState message="Open Film Room with a session timestamp (?t=…). Pick a past interview from your profile." />
                )}
                {tParam && !session && (
                    <EmptyState message="No local session matched that timestamp. Sign in on the device where the interview was saved, or sync from cloud." />
                )}

                {session && (
                    <div className="rounded-2xl border border-white/10 bg-[#111] p-5 space-y-2">
                        <p className="text-sm text-white/50">
                            {new Date(session.timestamp).toLocaleString()}
                            {session.userName ? ` · ${session.userName}` : ""}
                            {session.company ? ` · ${session.company}` : ""}
                        </p>
                        <p className="text-2xl font-black">
                            {session.finalScore ?? "—"}
                            <span className="text-sm font-medium text-white/35">/100</span>
                        </p>
                        {session.summary && (
                            <p className="text-sm text-white/60 leading-relaxed line-clamp-4">{session.summary}</p>
                        )}
                    </div>
                )}

                {loading && (
                    <div className="flex items-center gap-2 text-white/50 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Building timeline annotations…
                    </div>
                )}
                {error && <p className="text-sm text-red-400">{error}</p>}

                {result && (
                    <div className="space-y-5">
                        <div className="rounded-2xl border border-white/10 bg-[#111] p-5 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-violet-300" />
                                    {result.title}
                                </h2>
                                {result.fallback && (
                                    <span className="text-[10px] uppercase tracking-wide text-white/35">Offline coach</span>
                                )}
                            </div>
                            <p className="text-sm text-white/65 leading-relaxed">{result.overallTake}</p>
                            {result.practiceFocus?.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {result.practiceFocus.map((f) => (
                                        <span
                                            key={f}
                                            className="inline-flex items-center gap-1 text-[11px] rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 px-2.5 py-1"
                                        >
                                            <Target className="w-3 h-3" />
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs uppercase tracking-wide text-white/40 font-semibold">Timeline</h3>
                            <ol className="relative border-l border-white/10 ml-2 space-y-4">
                                {result.annotations.map((a, i) => (
                                    <li key={`${a.t}-${i}`} className="ml-4 pl-1">
                                        <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-indigo-500/80 border border-[#050505]" />
                                        <div className={`rounded-xl border p-3 space-y-1.5 ${kindStyles[a.kind]}`}>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-semibold">{a.label}</span>
                                                <span className="text-[11px] opacity-70 font-mono">{formatTime(a.t)}</span>
                                            </div>
                                            {a.quote && (
                                                <p className="text-xs italic opacity-80">&ldquo;{a.quote}&rdquo;</p>
                                            )}
                                            <p className="text-xs leading-relaxed opacity-90">{a.note}</p>
                                            {a.rewrite && (
                                                <p className="text-xs mt-1.5 pt-1.5 border-t border-white/10 text-teal-200/90">
                                                    <span className="font-bold">Rewrite: </span>
                                                    {a.rewrite}
                                                </p>
                                            )}
                                            {a.retakePrompt && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRetake(a.retakePrompt!)}
                                                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg cursor-pointer"
                                                >
                                                    <RefreshCw className="w-3 h-3" /> Try this answer again
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {(result.retakePrompts?.length || 0) > 0 && (
                            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-2">
                                <h3 className="text-xs font-black uppercase tracking-wider text-violet-300">Retake These</h3>
                                {result.retakePrompts!.map((p, i) => (
                                    <div key={i} className="flex items-start justify-between gap-3">
                                        <p className="text-sm text-white/75">
                                            {i + 1}. {p}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => handleRetake(p)}
                                            className="shrink-0 text-[11px] font-bold text-violet-300 hover:text-violet-200 cursor-pointer"
                                        >
                                            Practice →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {result.keyMoments?.length > 0 && (
                            <div className="rounded-2xl border border-white/10 bg-[#111] p-4">
                                <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold mb-2">
                                    Key moments
                                </p>
                                <ul className="space-y-1 text-sm text-white/65 list-disc list-inside">
                                    {result.keyMoments.map((m) => (
                                        <li key={m}>{m}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-white/15 bg-[#111]/60 p-8 text-center text-sm text-white/50">
            {message}
        </div>
    );
}
