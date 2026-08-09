"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, Target } from "lucide-react";

export default function StarCoachPage() {
    const [question, setQuestion] = useState("Tell me about a time you disagreed with a teammate.");
    const [weakSpot, setWeakSpot] = useState("unclear impact metrics");
    const [story, setStory] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        try {
            const keys = Object.keys(localStorage).filter((k) => k.startsWith("filmRoom_"));
            if (!keys.length) return;
            const raw = localStorage.getItem(keys.sort().reverse()[0] || "");
            if (!raw) return;
            const data = JSON.parse(raw);
            const gap = (data.annotations || []).find((a: any) => a.kind === "gap");
            if (gap?.text) setWeakSpot(String(gap.text).slice(0, 180));
            if (data.practiceFocus?.[0]) setQuestion(`Practice: ${data.practiceFocus[0]}`);
            if (data.retakePrompts?.[0]) setQuestion(data.retakePrompts[0]);
        } catch {
            /* ignore */
        }
    }, []);

    async function run(mode: "coach" | "score" | "retake") {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/star-coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    story,
                    question,
                    weakSpot,
                    mode,
                    company: localStorage.getItem("targetCompany") || "",
                    role: localStorage.getItem("preferredRoles") || "",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Coach failed");
            setResult(data);
            if (mode === "retake" && data.retakePrompt) setQuestion(data.retakePrompt);
            if (data.improvedStory && mode === "coach") setStory(data.improvedStory);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-3xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-violet-300/80 flex items-center gap-2">
                            <Target className="w-4 h-4" /> STAR coach
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">Behavioral drills with retakes</h1>
                    </div>
                    <Link href="/labs" className="text-sm text-white/60 hover:text-white">
                        ← Labs
                    </Link>
                </div>

                <div className="space-y-3">
                    <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
                        placeholder="Behavioral question"
                    />
                    <input
                        value={weakSpot}
                        onChange={(e) => setWeakSpot(e.target.value)}
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
                        placeholder="Weak spot from film room"
                    />
                    <textarea
                        value={story}
                        onChange={(e) => setStory(e.target.value)}
                        className="w-full min-h-[180px] rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
                        placeholder="Draft your STAR story…"
                    />
                    <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={loading} onClick={() => void run("coach")} className="rounded-xl bg-violet-500 px-4 py-2 text-sm disabled:opacity-50">
                            Rewrite with coach
                        </button>
                        <button type="button" disabled={loading} onClick={() => void run("score")} className="rounded-xl bg-white/10 px-4 py-2 text-sm disabled:opacity-50">
                            Score story
                        </button>
                        <button type="button" disabled={loading} onClick={() => void run("retake")} className="rounded-xl bg-white/10 px-4 py-2 text-sm disabled:opacity-50">
                            New retake prompt
                        </button>
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-white/50 self-center" />}
                    </div>
                    {error && <p className="text-rose-300 text-sm">{error}</p>}
                    {result && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 text-sm">
                            <div className="flex items-center gap-2 text-violet-300">
                                <Sparkles className="w-4 h-4" /> Score: {result.score ?? "—"}/100
                            </div>
                            {result.starBreakdown && (
                                <div className="grid sm:grid-cols-2 gap-2">
                                    {Object.entries(result.starBreakdown).map(([k, v]) => (
                                        <div key={k} className="rounded-lg bg-black/30 p-2">
                                            <div className="text-[10px] uppercase text-white/40">{k}</div>
                                            <div className="text-white/80">{String(v)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {result.tips && (
                                <ul className="list-disc pl-5 text-white/70">
                                    {result.tips.map((t: string, i: number) => (
                                        <li key={i}>{t}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
