"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getStorageItem } from "../../utils/storage";
import { ArrowLeft, Clapperboard, Loader2, Target } from "lucide-react";

interface FilmAnnotation {
    t: number;
    label: string;
    kind: "strength" | "gap" | "moment" | "tip";
    quote?: string;
    note: string;
}

interface FilmRoomResult {
    title: string;
    overallTake: string;
    annotations: FilmAnnotation[];
    keyMoments: string[];
    practiceFocus: string[];
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
                const res = await fetch("/api/film-room", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        transcript: session!.transcript,
                        summary: session!.summary || "",
                        scores: {
                            technical: session!.technicalRating,
                            behavioral: session!.behavioralRating,
                            communication: session!.communicationRating,
                            final: session!.finalScore,
                        },
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Film room failed");
                if (!cancelled) setResult(data);
            } catch (e: any) {
                if (!cancelled) setError(e.message || "Failed to load film room");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void run();
        return () => {
            cancelled = true;
        };
    }, [session]);

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans">
            <header className="px-4 sm:px-8 py-4 border-b border-white/10 flex items-center gap-3 sticky top-0 bg-[#050505]/90 backdrop-blur-md z-10">
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
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                {!tParam && (
                    <EmptyState message="Open Film Room with a session timestamp (?t=…). Pick a past interview from your profile or features history." />
                )}
                {tParam && !session && (
                    <EmptyState message="No local session matched that timestamp. Make sure you're signed in on the same device where the interview was saved." />
                )}

                {session && (
                    <div className="rounded-2xl border border-white/10 bg-[#111] p-5 space-y-2">
                        <p className="text-sm text-white/50">
                            {new Date(session.timestamp).toLocaleString()}
                            {session.userName ? ` · ${session.userName}` : ""}
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
                                <h2 className="text-lg font-semibold">{result.title}</h2>
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
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>

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
