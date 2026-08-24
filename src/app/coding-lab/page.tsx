"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Code2, Loader2, Moon, Sun, Eye } from "lucide-react";
import LabAuthBanner from "@/components/labs/LabAuthBanner";
import { loadCodingProgress, saveCodingProgress, type CodingProgress } from "@/utils/labProgress";

interface Problem {
    id: string;
    title: string;
    difficulty: string;
    prompt: string;
    starterCode: Record<string, string>;
    nextId?: string;
    topics: string[];
}

interface GradeResult {
    score?: number;
    passedCount?: number;
    total?: number;
    unlockedNext?: boolean;
    nextId?: string;
    error?: string;
    results?: { passed: boolean; hidden: boolean }[];
}

export default function CodingLabPage() {
    const [problems, setProblems] = useState<Problem[]>([]);
    const [active, setActive] = useState<Problem | null>(null);
    const [code, setCode] = useState("");
    const [language, setLanguage] = useState("javascript");
    const [result, setResult] = useState<GradeResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<CodingProgress>({ solvedIds: [], bestScores: {} });
    const [error, setError] = useState("");
    const codeRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (codeRef.current) {
            codeRef.current.style.height = "auto";
            codeRef.current.style.height = `${Math.max(320, codeRef.current.scrollHeight)}px`;
        }
    }, [code]);

    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");

    useEffect(() => {
        const savedTheme = localStorage.getItem("prointerview_theme") as "dark" | "light" | "eyeprotect" | null;
        if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProgress(loadCodingProgress());
        fetch("/api/coding-problems?path=1")
            .then((r) => r.json())
            .then((d) => {
                const list = (d.problems || []).filter(Boolean) as Problem[];
                setProblems(list);
                const saved = loadCodingProgress();
                const last = list.find((p) => p.id === saved.lastProblemId) || list[0];
                if (last) select(last, "javascript");
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function select(p: Problem, lang = language) {
        setActive(p);
        setCode(p.starterCode?.[lang] || p.starterCode?.javascript || "");
        setResult(null);
        setError("");
    }

    async function grade() {
        if (!active) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/coding-problems", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ problemId: active.id, language, code }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Grading failed — sign in required for online sandbox.");
                setResult(data);
                return;
            }
            setResult(data);
            setResult(data);
            if (typeof data.score === "number") {
                setProgress(saveCodingProgress({ problemId: active.id, score: data.score }));
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={`min-h-screen transition-colors duration-300 ${
            theme === "light"
                ? "bg-slate-100 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-slate-950 text-white"
        }`}>
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] sm:text-xs uppercase tracking-widest flex items-center gap-1.5 font-bold ${isLight ? "text-amber-700" : "text-amber-300/80"}`}>
                            <Code2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Coding lab
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
                            <button
                                onClick={cycleTheme}
                                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
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
                                className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold border transition shadow-sm whitespace-nowrap ${
                                    theme === "eyeprotect"
                                        ? "bg-[#0b5f58] text-[#fffcf5] border-[#084842] hover:bg-[#084842]"
                                        : isLight
                                        ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                        : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                                }`}
                            >
                                <span className="hidden sm:inline">← Back to Labs</span>
                                <span className="sm:hidden">← Labs</span>
                            </Link>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">Progressive problems + hidden tests</h1>
                            <p className={`text-xs sm:text-sm mt-1 ${isLight ? "text-slate-600 font-medium" : "text-white/45"}`}>
                                {progress.solvedIds.length} unlocked · progress saved on this device
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/" className="text-xs font-bold text-indigo-400 hover:underline">
                                Home dashboard →
                            </Link>
                        </div>
                    </div>
                </div>

                <LabAuthBanner feature="sandboxed code grading" />

                <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
                    <div className="space-y-2">
                        {problems.map((p) => {
                            const best = progress.bestScores[p.id];
                            const solved = progress.solvedIds.includes(p.id);
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => select(p)}
                                    className={`w-full text-left rounded-xl border px-3.5 py-2.5 text-sm transition ${
                                        active?.id === p.id
                                            ? (theme === "eyeprotect"
                                                ? "bg-[#0b5f58] border-[#0b5f58] text-white font-bold"
                                                : isLight
                                                ? "bg-indigo-600 border-indigo-600 text-white font-bold"
                                                : "border-amber-400/50 bg-amber-500/20 text-white font-bold")
                                            : (isLight
                                                ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 shadow-sm"
                                                : "border-white/10 bg-white/5 text-white/70 hover:text-white")
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="font-semibold">{p.title}</div>
                                        {solved && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                                    </div>
                                    <div className={`text-[10px] uppercase font-bold ${active?.id === p.id ? "text-white/80" : isLight ? "text-slate-500" : "text-white/40"}`}>
                                        {p.difficulty}
                                        {best != null ? ` · best ${best}%` : ""}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <div className="space-y-3">
                        {active && (
                            <>
                                <p className={`text-sm leading-relaxed ${isLight ? "text-slate-700 font-medium" : "text-white/80"}`}>{active.prompt}</p>
                                <div className="flex flex-wrap gap-2">
                                    <select
                                        value={language}
                                        onChange={(e) => {
                                            setLanguage(e.target.value);
                                            setCode(active.starterCode?.[e.target.value] || "");
                                        }}
                                        className={`rounded-lg border px-3 py-1.5 text-sm focus:outline-none transition ${
                                            isLight ? "bg-white border-slate-300 text-slate-800 shadow-sm" : "bg-black/40 border-white/10 text-white"
                                        }`}
                                    >
                                        <option value="javascript">JavaScript</option>
                                        <option value="python">Python</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => void grade()}
                                        disabled={loading}
                                        className={`rounded-lg px-4 py-1.5 text-sm font-bold transition cursor-pointer ${
                                            theme === "eyeprotect"
                                                ? "bg-[#0b5f58] hover:bg-[#084842] text-white disabled:opacity-50"
                                                : "bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
                                        }`}
                                    >
                                        {loading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            "Run hidden tests"
                                        )}
                                    </button>
                                </div>
                                <textarea
                                    ref={codeRef}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className={`w-full min-h-[320px] font-mono text-sm rounded-xl border p-4 focus:outline-none transition overflow-hidden ${
                                        isLight
                                            ? "bg-slate-900 text-amber-300 border-slate-700 shadow-inner"
                                            : "bg-black/60 text-amber-200 border-white/10"
                                    }`}
                                />
                                {error && <p className="text-sm text-rose-300">{error}</p>}
                                {result && result.score != null && (
                                    <div className={`rounded-xl border p-4 text-sm ${
                                        theme === "light"
                                            ? "bg-white border-slate-200 shadow-sm"
                                            : theme === "eyeprotect"
                                            ? "bg-[#fffcf5] border-[#8c8578]"
                                            : "bg-white/5 border-white/10"
                                    }`}>
                                        <div className="font-bold text-base">
                                            Score: <span className="text-amber-600 dark:text-amber-400">{result.score}</span> ({result.passedCount}/{result.total})
                                        </div>
                                        {result.unlockedNext && (
                                            <button
                                                type="button"
                                                className="mt-2 text-amber-600 dark:text-amber-300 font-bold underline cursor-pointer"
                                                onClick={() => {
                                                    const next = problems.find((p) => p.id === result.nextId);
                                                    if (next) select(next);
                                                }}
                                            >
                                                Unlock next: {result.nextId}
                                            </button>
                                        )}
                                        <ul className={`mt-2 space-y-1 font-medium ${isLight ? "text-slate-700" : "text-white/70"}`}>
                                            {(result.results || []).map((r: any, i: number) => (
                                                <li key={i}>
                                                    {r.passed ? "✓" : "✗"} {r.hidden ? "Hidden test" : "Public test"}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
