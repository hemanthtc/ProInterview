"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
<<<<<<< HEAD
import { Loader2, PenTool, Sparkles, Moon, Sun, Eye } from "lucide-react";
=======
import { Loader2, PenTool, RefreshCw, Sparkles, Wifi } from "lucide-react";
import InteractiveWhiteboard from "@/components/system-design/InteractiveWhiteboard";
import type { SystemDesignQuestion } from "@/data/systemDesignQuestions";
import { BoardShape, summarizeBoard } from "@/utils/systemDesignBoard";
>>>>>>> 8fa80ea9fdffb5a8528435e76b5395ce0bf52091

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

<<<<<<< HEAD
    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");

    useEffect(() => {
        const savedTheme = localStorage.getItem("prointerview_theme") as "dark" | "light" | "eyeprotect" | null;
        if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
            setTheme(savedTheme);
        }
    }, []);

    const isLight = theme === "light" || theme === "eyeprotect";

    const cycleTheme = () => {
        const next = theme === "dark" ? "light" : theme === "light" ? "eyeprotect" : "dark";
        setTheme(next);
        localStorage.setItem("prointerview_theme", next);
        document.documentElement.classList.remove("theme-dark", "theme-light", "theme-eyeprotect");
        document.documentElement.classList.add(`theme-${next}`);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = theme === "light" ? "#f8fafc" : theme === "eyeprotect" ? "#fffcf5" : "#0b1220";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = theme === "light" ? "#4f46e5" : theme === "eyeprotect" ? "#0b5f58" : "#a5b4fc";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";

        const pos = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect();
            return {
                x: ((e.clientX - r.left) / r.width) * canvas.width,
                y: ((e.clientY - r.top) / r.height) * canvas.height,
            };
        };
        const down = (e: PointerEvent) => {
            drawing.current = true;
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
        };
        const move = (e: PointerEvent) => {
            if (!drawing.current) return;
            const p = pos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        };
        const up = () => {
            drawing.current = false;
        };
        canvas.addEventListener("pointerdown", down);
        canvas.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        return () => {
            canvas.removeEventListener("pointerdown", down);
            canvas.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
    }, [theme]);
=======
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
>>>>>>> 8fa80ea9fdffb5a8528435e76b5395ce0bf52091

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
<<<<<<< HEAD
        <div className={`min-h-screen transition-colors duration-300 ${
            theme === "light"
                ? "bg-slate-100 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-slate-950 text-white"
        }`}>
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <p className={`text-xs uppercase tracking-widest flex items-center gap-2 ${isLight ? "text-cyan-700 font-bold" : "text-cyan-300/80"}`}>
                            <PenTool className="w-4 h-4" /> System design lab
=======
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
>>>>>>> 8fa80ea9fdffb5a8528435e76b5395ce0bf52091
                        </p>
                    </div>
<<<<<<< HEAD
                    <div className="flex items-center gap-3">
                        <button
                            onClick={cycleTheme}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                                isLight
                                    ? "bg-white text-slate-800 border-slate-300 hover:bg-slate-50 shadow-sm"
                                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                            }`}
                            title={`Current Theme: ${theme}. Click to switch.`}
                        >
                            {theme === "dark" && <><Moon className="w-3.5 h-3.5 text-indigo-400" /> <span className="hidden sm:inline">Dark</span></>}
                            {theme === "light" && <><Sun className="w-3.5 h-3.5 text-amber-500" /> <span className="hidden sm:inline">Light</span></>}
                            {theme === "eyeprotect" && <><Eye className="w-3.5 h-3.5 text-teal-600" /> <span className="hidden sm:inline">Eye Comfort</span></>}
                        </button>

                        <Link
                            href="/labs"
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition shadow-sm ${
                                theme === "eyeprotect"
                                    ? "bg-[#0b5f58] text-[#fffcf5] border-[#084842] hover:bg-[#084842]"
                                    : isLight
                                    ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                    : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                            }`}
                        >
                            ← Back to Labs
                        </Link>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className={`text-xs ${isLight ? "text-slate-600 font-semibold" : "text-white/50"}`}>Prompt</label>
                        <select
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition ${
                                isLight
                                    ? "bg-white border-slate-300 text-slate-900 shadow-sm"
                                    : "bg-black/40 border-white/10 text-white"
                            }`}
                        >
                            {PROMPTS.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                        <canvas
                            ref={canvasRef}
                            width={900}
                            height={560}
                            className={`w-full rounded-2xl border touch-none cursor-crosshair ${
                                isLight ? "border-slate-300 shadow-sm" : "border-white/10"
                            }`}
                        />
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Components, APIs, capacity estimates, tradeoffs…"
                            className={`w-full min-h-[120px] rounded-xl border px-3 py-2 text-sm focus:outline-none transition ${
                                isLight
                                    ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                    : "bg-black/40 border-white/10 text-white placeholder:text-white/40"
                            }`}
                        />
                        <button
                            type="button"
                            onClick={() => void evaluate()}
                            disabled={loading}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
                                theme === "eyeprotect"
                                    ? "bg-[#0b5f58] hover:bg-[#084842] text-white disabled:opacity-50"
                                    : "bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
                            }`}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Auto-evaluate design
                        </button>
                        {error && <p className="text-rose-500 text-sm font-semibold">{error}</p>}
                    </div>

                    <div className={`rounded-2xl border p-5 ${
                        theme === "light"
                            ? "bg-white border-slate-200 shadow-sm"
                            : theme === "eyeprotect"
                            ? "bg-[#fffcf5] border-[#8c8578]"
                            : "bg-white/5 border-white/10"
                    }`}>
                        {!result ? (
                            <p className={`text-sm ${isLight ? "text-slate-500" : "text-white/40"}`}>Scores for latency, capacity, APIs, and tradeoffs appear here.</p>
                        ) : (
                            <div className="space-y-4">
                                <div className={`text-4xl font-bold ${isLight ? "text-cyan-700" : "text-cyan-300"}`}>{result.overall ?? "—"}<span className={`text-lg ${isLight ? "text-slate-400" : "text-white/40"}`}>/100</span></div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {result.scores &&
                                        Object.entries(result.scores).map(([k, v]) => (
                                            <div key={k} className={`rounded-lg px-3 py-2 flex justify-between border ${
                                                isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/30 border-white/5 text-white"
                                            }`}>
                                                <span className={`capitalize ${isLight ? "text-slate-500" : "text-white/50"}`}>{k}</span>
                                                <span className="font-semibold">{String(v)}</span>
                                            </div>
                                        ))}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-300 mb-1">Strengths</h3>
                                    <ul className={`text-sm list-disc pl-5 ${isLight ? "text-slate-700" : "text-white/70"}`}>
                                        {(result.strengths || []).map((s: string, i: number) => (
                                            <li key={i}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-amber-600 dark:text-amber-300 mb-1">Gaps</h3>
                                    <ul className={`text-sm list-disc pl-5 ${isLight ? "text-slate-700" : "text-white/70"}`}>
                                        {(result.gaps || []).map((s: string, i: number) => (
                                            <li key={i}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
=======
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
>>>>>>> 8fa80ea9fdffb5a8528435e76b5395ce0bf52091
                    </div>
                </div>
            </div>
        </div>
    );
}
