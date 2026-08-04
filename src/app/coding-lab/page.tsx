"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Code2, Loader2 } from "lucide-react";

interface Problem {
    id: string;
    title: string;
    difficulty: string;
    prompt: string;
    starterCode: Record<string, string>;
    nextId?: string;
    topics: string[];
}

export default function CodingLabPage() {
    const [problems, setProblems] = useState<Problem[]>([]);
    const [active, setActive] = useState<Problem | null>(null);
    const [code, setCode] = useState("");
    const [language, setLanguage] = useState("javascript");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch("/api/coding-problems?path=1")
            .then((r) => r.json())
            .then((d) => {
                const list = (d.problems || []).filter(Boolean);
                setProblems(list);
                if (list[0]) select(list[0]);
            });
    }, []);

    function select(p: Problem) {
        setActive(p);
        setCode(p.starterCode?.[language] || p.starterCode?.javascript || "");
        setResult(null);
    }

    async function grade() {
        if (!active) return;
        setLoading(true);
        try {
            const res = await fetch("/api/coding-problems", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ problemId: active.id, language, code }),
            });
            const data = await res.json();
            setResult(data);
            if (data.unlockedNext && data.nextId) {
                const next = problems.find((p) => p.id === data.nextId);
                if (next) {
                    // keep result visible; user can advance
                }
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-amber-300/80 flex items-center gap-2">
                            <Code2 className="w-4 h-4" /> Coding lab
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">Progressive problems + hidden tests</h1>
                    </div>
                    <Link href="/labs" className="text-sm text-white/60 hover:text-white">
                        ← Labs
                    </Link>
                </div>

                <div className="grid lg:grid-cols-[240px_1fr] gap-4">
                    <div className="space-y-2">
                        {problems.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => select(p)}
                                className={`w-full text-left rounded-xl border px-3 py-2 text-sm ${
                                    active?.id === p.id ? "border-amber-400/50 bg-amber-500/10" : "border-white/10 bg-white/5"
                                }`}
                            >
                                <div className="font-medium">{p.title}</div>
                                <div className="text-[10px] uppercase text-white/40">{p.difficulty}</div>
                            </button>
                        ))}
                    </div>
                    <div className="space-y-3">
                        {active && (
                            <>
                                <p className="text-sm text-white/70">{active.prompt}</p>
                                <div className="flex gap-2">
                                    <select
                                        value={language}
                                        onChange={(e) => {
                                            setLanguage(e.target.value);
                                            setCode(active.starterCode?.[e.target.value] || "");
                                        }}
                                        className="rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-sm"
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
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run hidden tests"}
                                    </button>
                                </div>
                                <textarea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full min-h-[320px] font-mono text-sm rounded-xl bg-black/50 border border-white/10 p-3"
                                />
                                {result && (
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
