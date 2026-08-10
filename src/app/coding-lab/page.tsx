"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Code2, Loader2 } from "lucide-react";
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

    useEffect(() => {
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
            if (typeof data.score === "number") {
                setProgress(saveCodingProgress({ problemId: active.id, score: data.score }));
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-300/80">
                            <Code2 className="h-4 w-4" /> Coding lab
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold">Progressive problems + hidden tests</h1>
                        <p className="mt-1 text-sm text-white/45">
                            {progress.solvedIds.length} unlocked · progress saved on this device
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-sm">
                        <Link href="/prep" className="text-indigo-300 hover:underline">
                            Prep dashboard
                        </Link>
                        <Link href="/labs" className="text-white/60 hover:text-white">
                            ← Labs
                        </Link>
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
                                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                                        active?.id === p.id
                                            ? "border-amber-400/50 bg-amber-500/10"
                                            : "border-white/10 bg-white/5"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="font-medium">{p.title}</div>
                                        {solved && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                                    </div>
                                    <div className="text-[10px] uppercase text-white/40">
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
                                <p className="text-sm text-white/70">{active.prompt}</p>
                                <div className="flex flex-wrap gap-2">
                                    <select
                                        value={language}
                                        onChange={(e) => {
                                            setLanguage(e.target.value);
                                            setCode(active.starterCode?.[e.target.value] || "");
                                        }}
                                        className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-sm"
                                    >
                                        <option value="javascript">JavaScript</option>
                                        <option value="python">Python</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => void grade()}
                                        disabled={loading}
                                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            "Run hidden tests"
                                        )}
                                    </button>
                                </div>
                                <textarea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="min-h-[320px] w-full rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-sm"
                                />
                                {error && <p className="text-sm text-rose-300">{error}</p>}
                                {result && result.score != null && (
                                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                                        <div>
                                            Score: <b>{result.score}</b> ({result.passedCount}/{result.total})
                                        </div>
                                        {result.unlockedNext && (
                                            <button
                                                type="button"
                                                className="mt-2 text-amber-300 underline"
                                                onClick={() => {
                                                    const next = problems.find((p) => p.id === result.nextId);
                                                    if (next) select(next);
                                                }}
                                            >
                                                Unlock next: {result.nextId}
                                            </button>
                                        )}
                                        <ul className="mt-2 space-y-1 text-white/60">
                                            {(result.results || []).map((r, i) => (
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
