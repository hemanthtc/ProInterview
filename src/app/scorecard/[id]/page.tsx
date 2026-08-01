"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Award, Loader2, Share2 } from "lucide-react";

interface PublicScorecard {
    shareId: string;
    candidateName: string;
    company: string;
    role: string;
    finalScore: number;
    technicalRating: number;
    behavioralRating: number;
    communicationRating: number;
    portfolioRating: number | string;
    summary: string;
    highlights: string[];
    createdAt?: string;
}

export default function PublicScorecardPage() {
    const params = useParams();
    const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

    const [data, setData] = useState<PublicScorecard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!id) {
            setError("Missing scorecard id");
            setLoading(false);
            return;
        }
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError("");
            try {
                const res = await fetch(`/api/scorecard?id=${encodeURIComponent(id)}`);
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "Not found");
                if (!cancelled) setData(json);
            } catch (e: any) {
                if (!cancelled) setError(e.message || "Failed to load scorecard");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, [id]);

    const scoreColor =
        (data?.finalScore ?? 0) >= 70 ? "text-emerald-400" : (data?.finalScore ?? 0) >= 50 ? "text-amber-400" : "text-red-400";

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans">
            <header className="px-4 sm:px-8 py-5 border-b border-white/10 flex items-center justify-between gap-2 print:border-black/10">
                <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-indigo-400 print:text-black" />
                    <span className="font-bold tracking-tight">ProInterview Scorecard</span>
                </div>
                {data && (
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 print:hidden cursor-pointer"
                    >
                        Print / PDF
                    </button>
                )}
            </header>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
                {loading && (
                    <div className="flex items-center justify-center gap-2 text-white/50 text-sm py-20">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading scorecard…
                    </div>
                )}

                {error && !loading && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {data && !loading && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-white/10 bg-[#111] p-6 sm:p-8 text-center space-y-3">
                            <div className="mx-auto w-14 h-14 rounded-full bg-indigo-500/15 flex items-center justify-center">
                                <Award className="w-7 h-7 text-indigo-300" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black">{data.candidateName}</h1>
                            <p className="text-sm text-white/50">
                                {[data.role, data.company].filter(Boolean).join(" · ") || "Interview performance"}
                            </p>
                            <p className={`text-5xl font-black ${scoreColor}`}>
                                {data.finalScore}
                                <span className="text-lg font-medium text-white/30">/100</span>
                            </p>
                            {data.createdAt && (
                                <p className="text-xs text-white/35">
                                    {new Date(data.createdAt).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <Metric label="Technical" value={data.technicalRating} />
                            <Metric label="Behavioral" value={data.behavioralRating} />
                            <Metric label="Communication" value={data.communicationRating} />
                            <Metric
                                label="Portfolio"
                                value={
                                    typeof data.portfolioRating === "number"
                                        ? data.portfolioRating
                                        : data.portfolioRating
                                }
                            />
                        </div>

                        {data.highlights?.length > 0 && (
                            <div className="rounded-2xl border border-white/10 bg-[#111] p-5 space-y-2">
                                <h2 className="text-xs uppercase tracking-wide text-white/40 font-semibold">Highlights</h2>
                                <ul className="space-y-2">
                                    {data.highlights.map((h, i) => (
                                        <li key={i} className="text-sm text-white/70 leading-relaxed flex gap-2">
                                            <span className="text-indigo-400 shrink-0">•</span>
                                            {h}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {data.summary && (
                            <div className="rounded-2xl border border-white/10 bg-[#111] p-5 space-y-2">
                                <h2 className="text-xs uppercase tracking-wide text-white/40 font-semibold">Summary</h2>
                                <div className="text-sm text-white/65 leading-relaxed whitespace-pre-wrap">{data.summary}</div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: number | string }) {
    const display = typeof value === "number" ? `${value}` : value || "N/A";
    return (
        <div className="rounded-xl border border-white/10 bg-[#111] px-3 py-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-white/40 mb-1">{label}</p>
            <p className="text-lg font-bold text-white">
                {display}
                {typeof value === "number" ? <span className="text-[10px] text-white/30 font-medium">/100</span> : null}
            </p>
        </div>
    );
}
