"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Sparkles, Target, Wifi } from "lucide-react";
import {
    STAR_CATEGORY_LABELS,
    type StarCoachQuestion,
    type StarQuestionCategory,
} from "@/data/starCoachQuestions";

interface CoachResult {
    score?: number;
    starBreakdown?: Record<string, string>;
    missing?: string[];
    improvedStory?: string;
    retakePrompt?: string;
    tips?: string[];
}

export default function StarCoachPage() {
    const [question, setQuestion] = useState("Tell me about a time you disagreed with a teammate.");
    const [weakSpot, setWeakSpot] = useState("unclear impact metrics");
    const [story, setStory] = useState("");
    const [category, setCategory] = useState<StarQuestionCategory>("mixed");
    const [questionHint, setQuestionHint] = useState("");
    const [questionSource, setQuestionSource] = useState<"custom" | "online" | "seed" | "">("");
    const [result, setResult] = useState<CoachResult | null>(null);
    const [loadingCoach, setLoadingCoach] = useState(false);
    const [loadingQuestion, setLoadingQuestion] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");

    useEffect(() => {
        try {
            const keys = Object.keys(localStorage).filter((k) => k.startsWith("filmRoom_"));
            if (!keys.length) return;
            const raw = localStorage.getItem(keys.sort().reverse()[0] || "");
            if (!raw) return;
            const data = JSON.parse(raw);
            const gap = (data.annotations || []).find((a: { kind?: string; text?: string }) => a.kind === "gap");
            if (gap?.text) setWeakSpot(String(gap.text).slice(0, 180));
            if (data.practiceFocus?.[0]) {
                setQuestion(String(data.practiceFocus[0]));
                setQuestionSource("custom");
            }
            if (data.retakePrompts?.[0]) {
                setQuestion(data.retakePrompts[0]);
                setQuestionSource("custom");
            }
        } catch {
            /* ignore */
        }
    }, []);

    function applyGeneratedQuestion(q: StarCoachQuestion, source: "online" | "seed") {
        setQuestion(q.question);
        setWeakSpot(q.suggestedWeakSpot);
        setQuestionHint(q.hint || q.focus);
        setQuestionSource(source);
        setResult(null);
        setStory("");
    }

    async function generateQuestion() {
        setLoadingQuestion(true);
        setError("");
        setInfo("");
        try {
            const res = await fetch("/api/star-coach-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    count: 1,
                    category,
                    exclude: [question],
                    company: localStorage.getItem("targetCompany") || "",
                    role: localStorage.getItem("preferredRoles") || "",
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 401) {
                    const seedRes = await fetch(
                        `/api/star-coach-questions?count=1${
                            category !== "mixed" ? `&category=${category}` : ""
                        }`
                    );
                    const seedData = await seedRes.json();
                    const q = seedData.questions?.[0];
                    if (q) applyGeneratedQuestion(q, "seed");
                    setInfo("Sign in to generate fresh online questions.");
                    return;
                }
                throw new Error(data.error || "Failed to generate question");
            }
            const q = data.questions?.[0];
            if (!q) throw new Error("No question returned");
            applyGeneratedQuestion(q, data.source === "online" ? "online" : "seed");
            if (data.warning) setInfo(data.warning);
            else setInfo("New practice question loaded — draft your STAR answer below.");
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to generate question");
        } finally {
            setLoadingQuestion(false);
        }
    }

    async function run(mode: "coach" | "score" | "retake") {
        if (!question.trim()) {
            setError("Enter a question or generate one first.");
            return;
        }
        setLoadingCoach(true);
        setError("");
        setInfo("");
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
            if (mode === "retake" && data.retakePrompt) {
                setQuestion(data.retakePrompt);
                setQuestionSource("custom");
            }
            if (data.improvedStory && mode === "coach") setStory(data.improvedStory);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed");
        } finally {
            setLoadingCoach(false);
        }
    }

    const busy = loadingCoach || loadingQuestion;

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto max-w-3xl px-4 py-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-violet-300/80">
                            <Target className="h-4 w-4" /> STAR coach
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold">Behavioral drills with retakes</h1>
                        <p className="mt-1 text-sm text-white/45">
                            Type your own question or generate one, then practice Situation → Task → Action → Result.
                        </p>
                    </div>
                    <Link href="/labs" className="shrink-0 text-sm text-white/60 hover:text-white">
                        ← Labs
                    </Link>
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="text-xs font-medium uppercase tracking-wide text-white/50">
                                Behavioral question
                            </label>
                            {questionSource && questionSource !== "custom" && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
                                    <Wifi className="h-3 w-3" />
                                    {questionSource}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as StarQuestionCategory)}
                                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                            >
                                {(Object.entries(STAR_CATEGORY_LABELS) as [StarQuestionCategory, string][]).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    )
                                )}
                            </select>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void generateQuestion()}
                                className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-sm text-violet-100 disabled:opacity-50"
                            >
                                {loadingQuestion ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                Generate question
                            </button>
                        </div>

                        <textarea
                            value={question}
                            onChange={(e) => {
                                setQuestion(e.target.value);
                                setQuestionSource("custom");
                                setQuestionHint("");
                            }}
                            rows={2}
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                            placeholder="Or type your own behavioral question…"
                        />
                        {questionHint && (
                            <p className="text-xs text-violet-200/70">
                                <span className="text-white/40">Focus: </span>
                                {questionHint}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">
                            Weak spot to improve
                        </label>
                        <input
                            value={weakSpot}
                            onChange={(e) => setWeakSpot(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                            placeholder="e.g. unclear impact metrics, too much 'we', rambling"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">
                            Your STAR story
                        </label>
                        <textarea
                            value={story}
                            onChange={(e) => setStory(e.target.value)}
                            className="min-h-[180px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                            placeholder="Situation → Task → Action → Result…"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run("coach")}
                            className="rounded-xl bg-violet-500 px-4 py-2 text-sm disabled:opacity-50"
                        >
                            Rewrite with coach
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run("score")}
                            className="rounded-xl bg-white/10 px-4 py-2 text-sm disabled:opacity-50"
                        >
                            Score story
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run("retake")}
                            className="rounded-xl bg-white/10 px-4 py-2 text-sm disabled:opacity-50"
                        >
                            New retake prompt
                        </button>
                        {loadingCoach && (
                            <Loader2 className="h-4 w-4 animate-spin self-center text-white/50" />
                        )}
                    </div>

                    {info && <p className="text-sm text-violet-200/70">{info}</p>}
                    {error && <p className="text-sm text-rose-300">{error}</p>}

                    {result && (
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                            <div className="flex items-center gap-2 text-violet-300">
                                <Sparkles className="h-4 w-4" /> Score: {result.score ?? "—"}/100
                            </div>

                            {result.starBreakdown && (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {Object.entries(result.starBreakdown).map(([k, v]) => (
                                        <div key={k} className="rounded-lg bg-black/30 p-2">
                                            <div className="text-[10px] uppercase text-white/40">{k}</div>
                                            <div className="text-white/80">{v}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {result.missing && result.missing.length > 0 && (
                                <div>
                                    <h3 className="mb-1 text-xs font-medium uppercase text-amber-300/90">Missing</h3>
                                    <ul className="list-disc pl-5 text-white/70">
                                        {result.missing.map((m, i) => (
                                            <li key={i}>{m}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.improvedStory && (
                                <div>
                                    <h3 className="mb-1 text-xs font-medium uppercase text-emerald-300/90">
                                        Improved story
                                    </h3>
                                    <p className="whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-white/80">
                                        {result.improvedStory}
                                    </p>
                                </div>
                            )}

                            {result.tips && result.tips.length > 0 && (
                                <div>
                                    <h3 className="mb-1 text-xs font-medium uppercase text-sky-300/90">Tips</h3>
                                    <ul className="list-disc pl-5 text-white/70">
                                        {result.tips.map((t, i) => (
                                            <li key={i}>{t}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
