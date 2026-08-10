"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, PenTool, RefreshCw, Sparkles, Wifi } from "lucide-react";
import InteractiveWhiteboard from "@/components/system-design/InteractiveWhiteboard";
import type { SystemDesignQuestion } from "@/data/systemDesignQuestions";
import { BoardShape, summarizeBoard } from "@/utils/systemDesignBoard";

interface EvalResult {
    overall?: number;
    scores?: Record<string, number>;
    strengths?: string[];
    gaps?: string[];
    modelAnswerOutline?: string[];
    followUpQuestions?: string[];
    source?: string;
}

export default function SystemDesignPage() {
    const [questions, setQuestions] = useState<SystemDesignQuestion[]>([]);
    const [activeId, setActiveId] = useState<string>("");
    const [prompt, setPrompt] = useState("");
    const [notes, setNotes] = useState("");
    const [shapes, setShapes] = useState<BoardShape[]>([]);
    const [hasFreehand, setHasFreehand] = useState(false);
    const [result, setResult] = useState<EvalResult | null>(null);
    const [loadingEval, setLoadingEval] = useState(false);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [questionSource, setQuestionSource] = useState<"online" | "seed" | "">("");
    const [difficulty, setDifficulty] = useState<"mixed" | "easy" | "medium" | "hard">("mixed");
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");

    const active = questions.find((q) => q.id === activeId) || null;

    const applyQuestions = useCallback((list: SystemDesignQuestion[], source: "online" | "seed") => {
        setQuestions(list);
        setQuestionSource(source);
        if (list[0]) {
            setActiveId(list[0].id);
            setPrompt(list[0].prompt);
        }
        setResult(null);
        setShapes([]);
        setHasFreehand(false);
        setNotes("");
    }, []);

    const fetchQuestions = useCallback(
        async (opts?: { silent?: boolean }) => {
            setLoadingQuestions(true);
            setError("");
            setInfo("");
            try {
                const res = await fetch("/api/system-design-questions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        count: 8,
                        difficulty: difficulty === "mixed" ? undefined : difficulty,
                        exclude: questions.map((q) => q.prompt).slice(0, 20),
                    }),
                });
                const data = await res.json();
                if (!res.ok) {
                    if (res.status === 401) {
                        // Fall back to public seed GET for browsing without auth
                        const seedRes = await fetch(
                            `/api/system-design-questions?count=8${
                                difficulty !== "mixed" ? `&difficulty=${difficulty}` : ""
                            }`
                        );
                        const seedData = await seedRes.json();
                        applyQuestions(seedData.questions || [], "seed");
                        setInfo("Sign in to fetch fresh online questions and run online evaluation.");
                        return;
                    }
                    throw new Error(data.error || "Failed to fetch questions");
                }
                applyQuestions(data.questions || [], data.source === "online" ? "online" : "seed");
                if (data.warning) setInfo(data.warning);
                else if (!opts?.silent) {
                    setInfo(
                        data.source === "online"
                            ? "Loaded a fresh random set from the online generator."
                            : "Loaded shuffled seed questions."
                    );
                }
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Failed to load questions");
            } finally {
                setLoadingQuestions(false);
            }
        },
        [applyQuestions, difficulty, questions]
    );

    useEffect(() => {
        void fetchQuestions({ silent: true });
        // initial load only
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function selectQuestion(q: SystemDesignQuestion) {
        setActiveId(q.id);
        setPrompt(q.prompt);
        setResult(null);
    }

    async function evaluate() {
        setLoadingEval(true);
        setError("");
        setInfo("");
        try {
            const boardSummary = summarizeBoard(shapes, hasFreehand);
            const res = await fetch("/api/evaluate-system-design", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt,
                    notes,
                    boardSummary,
                    sketchDescription: boardSummary,
                    company: localStorage.getItem("targetCompany") || "",
                    role: localStorage.getItem("preferredRoles") || "",
                    level: localStorage.getItem("interviewLevel") || "intermediate",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Online evaluation failed");
            setResult(data);
            setInfo("Scored online via Gemini — no local heuristic scoring.");
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed");
            setResult(null);
        } finally {
            setLoadingEval(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-300/80">
                            <PenTool className="h-4 w-4" /> System design lab
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold">Interactive whiteboard + online eval</h1>
                        <p className="mt-1 max-w-xl text-sm text-white/45">
                            Pull random prompts online, drag shapes or draw freestyle, then grade the design online only.
                        </p>
                    </div>
                    <Link href="/labs" className="shrink-0 text-sm text-white/60 hover:text-white">
                        ← Labs
                    </Link>
                </div>

                <div className="mb-5 flex flex-wrap items-center gap-2">
                    <select
                        value={difficulty}
                        onChange={(e) =>
                            setDifficulty(e.target.value as "mixed" | "easy" | "medium" | "hard")
                        }
                        className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                    >
                        <option value="mixed">Mixed difficulty</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => void fetchQuestions()}
                        disabled={loadingQuestions}
                        className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 disabled:opacity-50"
                    >
                        {loadingQuestions ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        Fetch random questions
                    </button>
                    {questionSource && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/50">
                            <Wifi className="h-3 w-3" />
                            Source: {questionSource}
                        </span>
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-white/40">Prompts</p>
                        {questions.length === 0 && !loadingQuestions && (
                            <p className="text-sm text-white/40">No questions yet — fetch a set.</p>
                        )}
                        {questions.map((q) => (
                            <button
                                key={q.id}
                                type="button"
                                onClick={() => selectQuestion(q)}
                                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                                    activeId === q.id
                                        ? "border-cyan-400/50 bg-cyan-500/10"
                                        : "border-white/10 bg-white/5 hover:bg-white/10"
                                }`}
                            >
                                <div className="font-medium leading-snug">{q.title}</div>
                                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/40">
                                    {q.difficulty}
                                    {q.topics?.[0] ? ` · ${q.topics[0]}` : ""}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-3">
                            <label className="text-xs text-white/50">Active prompt</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={3}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                            />
                            {active?.constraints?.length ? (
                                <ul className="flex flex-wrap gap-1.5">
                                    {active.constraints.map((c) => (
                                        <li
                                            key={c}
                                            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/55"
                                        >
                                            {c}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}

                            <InteractiveWhiteboard
                                shapes={shapes}
                                onShapesChange={setShapes}
                                onFreehandChange={setHasFreehand}
                            />

                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Components, APIs, capacity estimates, tradeoffs…"
                                className="min-h-[110px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => void evaluate()}
                                disabled={loadingEval || !prompt.trim()}
                                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/90 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                            >
                                {loadingEval ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                Evaluate online
                            </button>
                            {info && <p className="text-sm text-cyan-200/70">{info}</p>}
                            {error && <p className="text-sm text-rose-300">{error}</p>}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            {!result ? (
                                <p className="text-sm text-white/40">
                                    Online scores for latency thinking, capacity, APIs, and tradeoffs appear here after
                                    evaluation.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-4xl font-bold text-cyan-300">
                                        {result.overall ?? "—"}
                                        <span className="text-lg text-white/40">/100</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {result.scores &&
                                            Object.entries(result.scores).map(([k, v]) => (
                                                <div
                                                    key={k}
                                                    className="flex justify-between rounded-lg bg-black/30 px-3 py-2"
                                                >
                                                    <span className="capitalize text-white/50">{k}</span>
                                                    <span>{String(v)}</span>
                                                </div>
                                            ))}
                                    </div>
                                    <div>
                                        <h3 className="mb-1 text-sm font-medium text-emerald-300">Strengths</h3>
                                        <ul className="list-disc pl-5 text-sm text-white/70">
                                            {(result.strengths || []).map((s, i) => (
                                                <li key={i}>{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="mb-1 text-sm font-medium text-amber-300">Gaps</h3>
                                        <ul className="list-disc pl-5 text-sm text-white/70">
                                            {(result.gaps || []).map((s, i) => (
                                                <li key={i}>{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    {result.followUpQuestions && result.followUpQuestions.length > 0 && (
                                        <div>
                                            <h3 className="mb-1 text-sm font-medium text-sky-300">Follow-ups</h3>
                                            <ul className="list-disc pl-5 text-sm text-white/70">
                                                {result.followUpQuestions.map((s, i) => (
                                                    <li key={i}>{s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {result.modelAnswerOutline && result.modelAnswerOutline.length > 0 && (
                                        <div>
                                            <h3 className="mb-1 text-sm font-medium text-violet-300">
                                                Stronger outline
                                            </h3>
                                            <ol className="list-decimal pl-5 text-sm text-white/70">
                                                {result.modelAnswerOutline.map((s, i) => (
                                                    <li key={i}>{s}</li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
