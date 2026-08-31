"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Camera, Clock, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import LabAuthBanner from "@/components/labs/LabAuthBanner";
import { MAX_INTEGRITY_WARNINGS, useAssessmentProctor } from "@/hooks/useAssessmentProctor";

interface Problem {
    id: string;
    title: string;
    difficulty: string;
    prompt: string;
    constraints?: string;
    starterCode: Record<string, string>;
    source: string;
    sourceLabel: string;
    ioMode: string;
    topics: string[];
    hiddenTestCount?: number;
}

interface GradeResult {
    score?: number;
    passedCount?: number;
    total?: number;
    error?: string;
    results?: { passed: boolean; hidden: boolean }[];
}

function formatClock(sec: number): string {
    const m = Math.floor(Math.max(0, sec) / 60);
    const s = Math.max(0, sec) % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const EXPRESSION_LABEL: Record<string, string> = {
    neutral: "Neutral",
    focused: "Focused",
    smiling: "Smiling",
    frowning: "Tense",
    surprised: "Surprised",
    looking_away: "Looking away",
    no_face: "No face",
};

export default function CodingAssessmentPage() {
    const [phase, setPhase] = useState<"lobby" | "live" | "submitted">("lobby");
    const [problems, setProblems] = useState<Problem[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [language, setLanguage] = useState("javascript");
    const [codeByProblem, setCodeByProblem] = useState<Record<string, string>>({});
    const [grades, setGrades] = useState<Record<string, GradeResult>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [remaining, setRemaining] = useState(60 * 60);
    const [durationSec, setDurationSec] = useState(60 * 60);
    const [loadError, setLoadError] = useState("");

    const onProctorTerminate = useCallback(() => {
        setPhase("submitted");
    }, []);

    const {
        videoRef,
        canvasRef,
        expression,
        faceVisible,
        attention,
        warningCount,
        startCamera,
        requestFullscreen,
    } = useAssessmentProctor(phase === "live", onProctorTerminate);
    const active = problems[activeIndex] || null;
    const code = active ? codeByProblem[active.id] || "" : "";

    useEffect(() => {
        fetch("/api/coding-problems?mode=assessment&count=3")
            .then((r) => r.json())
            .then((d) => {
                const list = (d.problems || []).filter(Boolean) as Problem[];
                setProblems(list);
                setDurationSec(Number(d.durationSec) || 3600);
                setRemaining(Number(d.durationSec) || 3600);
                const initial: Record<string, string> = {};
                for (const p of list) {
                    initial[p.id] = p.starterCode?.javascript || "";
                }
                setCodeByProblem(initial);
            })
            .catch(() => setLoadError("Could not load a random assessment set."));
    }, []);

    useEffect(() => {
        if (phase !== "live") return;
        const id = window.setInterval(() => {
            setRemaining((sec) => {
                if (sec <= 1) {
                    setPhase("submitted");
                    return 0;
                }
                return sec - 1;
            });
        }, 1000);
        return () => window.clearInterval(id);
    }, [phase]);

    const startAssessment = useCallback(async () => {
        const cam = await startCamera();
        if (!cam) return;
        await requestFullscreen();
        setPhase("live");
        setRemaining(durationSec);
    }, [startCamera, requestFullscreen, durationSec]);

    const setCode = (value: string) => {
        if (!active) return;
        setCodeByProblem((prev) => ({ ...prev, [active.id]: value }));
    };

    async function gradeCurrent() {
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
                setError(data.error || "Grading failed — sign in required.");
                return;
            }
            setGrades((prev) => ({ ...prev, [active.id]: data }));
        } finally {
            setLoading(false);
        }
    }

    function finish() {
        setPhase("submitted");
        proctor.stopCamera();
        if (document.fullscreenElement) {
            void document.exitFullscreen().catch(() => undefined);
        }
    }

    const totals = useMemo(() => {
        const scores = problems.map((p) => grades[p.id]?.score).filter((n): n is number => typeof n === "number");
        const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / problems.length) : 0;
        return { graded: scores.length, avg };
    }, [problems, grades]);

    if (phase === "submitted") {
        return (
            <div className="min-h-screen bg-[#0b141a] text-white flex items-center justify-center p-6">
                <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-[#111c24] p-8 text-center">
                    {proctor.terminated ? (
                        <>
                            <ShieldAlert className="mx-auto h-12 w-12 text-red-400" />
                            <h1 className="mt-4 text-2xl font-bold text-red-300">Assessment terminated</h1>
                            <p className="mt-2 text-sm text-white/60">
                                Too many integrity violations (tab switch, focus loss, or camera). This attempt is recorded as incomplete.
                            </p>
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="mx-auto h-12 w-12 text-emerald-400" />
                            <h1 className="mt-4 text-2xl font-bold">Assessment submitted</h1>
                            <p className="mt-2 text-sm text-white/60">
                                Average score {totals.avg}% across {totals.graded}/{problems.length} submitted questions.
                            </p>
                        </>
                    )}
                    <ul className="mt-6 space-y-2 text-left text-sm">
                        {problems.map((p) => (
                            <li key={p.id} className="rounded-lg border border-white/10 px-3 py-2">
                                <div className="font-semibold">{p.title}</div>
                                <div className="text-white/45 text-xs">
                                    {p.sourceLabel} · {grades[p.id]?.score != null ? `${grades[p.id]?.score}%` : "Not submitted"}
                                </div>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-4 text-xs text-white/40">Integrity warnings: {proctor.warningCount}</p>
                    <Link href="/coding-lab" className="mt-6 inline-block text-sm font-bold text-emerald-400 hover:underline">
                        Back to coding lab
                    </Link>
                </div>
            </div>
        );
    }

    if (phase === "lobby") {
        return (
            <div className="min-h-screen bg-[#0b141a] text-white">
                <div className="max-w-3xl mx-auto px-4 py-12">
                    <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Timed coding assessment</p>
                    <h1 className="mt-2 text-3xl font-bold">HackerRank-style coding round</h1>
                    <p className="mt-3 text-sm text-white/60 leading-relaxed">
                        You will get a random mix of problems in the style of LeetCode, HackerRank, Codeforces, and CodeChef.
                        An AI proctor watches your webcam for face presence and expression. Tab switching and leaving this window count as violations.
                    </p>
                    <LabAuthBanner feature="sandboxed grading and AI face monitoring" />
                    <div className="mt-6 grid gap-3 text-sm">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">3 questions · 60 minutes · JS / Python</div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            Camera required. {MAX_INTEGRITY_WARNINGS} integrity warnings ends the test.
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            Copy, paste, and right-click are blocked while the test is live.
                        </div>
                    </div>
                    {loadError && <p className="mt-4 text-sm text-rose-300">{loadError}</p>}
                    {proctor.cameraError && <p className="mt-4 text-sm text-rose-300">{proctor.cameraError}</p>}
                    <button
                        type="button"
                        disabled={problems.length === 0}
                        onClick={() => void startAssessment()}
                        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#1ba94c] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#159143] disabled:opacity-50"
                    >
                        <Camera className="h-4 w-4" />
                        Enable camera and start
                    </button>
                    <div className="mt-4">
                        <Link href="/coding-lab" className="text-xs text-white/45 hover:text-white">
                            Practice mode (no proctor) →
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0e1621] text-[#e8eef2] flex flex-col">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0b141a] px-4 py-2.5">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-black tracking-tight text-[#1ba94c]">ProInterview Test</span>
                    <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-white/40">
                        {active?.sourceLabel} · {active?.difficulty}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <span className={`inline-flex items-center gap-1.5 font-mono font-bold ${remaining < 300 ? "text-red-400" : "text-amber-300"}`}>
                        <Clock className="h-4 w-4" />
                        {formatClock(remaining)}
                    </span>
                    <button
                        type="button"
                        onClick={finish}
                        className="rounded-md bg-[#1ba94c] px-3 py-1.5 text-xs font-bold hover:bg-[#159143]"
                    >
                        Submit test
                    </button>
                </div>
            </header>

            {proctor.lastWarning && (
                <div className="flex items-center gap-2 bg-red-600/90 px-4 py-1.5 text-xs font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Warning {proctor.warningCount}/{MAX_INTEGRITY_WARNINGS}: {proctor.lastWarning}
                </div>
            )}

            <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
                <aside className="lg:w-[44%] border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto p-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {problems.map((p, i) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setActiveIndex(i)}
                                className={`rounded-md px-3 py-1 text-xs font-bold border ${
                                    i === activeIndex
                                        ? "bg-[#1ba94c] border-[#1ba94c] text-white"
                                        : "border-white/15 text-white/70 hover:bg-white/5"
                                }`}
                            >
                                Q{i + 1}
                                {grades[p.id]?.score != null ? ` · ${grades[p.id]?.score}` : ""}
                            </button>
                        ))}
                    </div>
                    {active && (
                        <>
                            <h1 className="text-xl font-bold">{active.title}</h1>
                            <p className="mt-1 text-[11px] uppercase tracking-wider text-white/40">
                                {active.sourceLabel} · {active.difficulty} · {active.ioMode === "stdio" ? "stdin / stdout" : "function"}
                            </p>
                            <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap text-white/80">{active.prompt}</p>
                            {active.constraints && (
                                <p className="mt-3 text-xs text-white/50">Constraints: {active.constraints}</p>
                            )}
                            <p className="mt-3 text-xs text-white/40">{active.hiddenTestCount ?? 0} hidden tests run on submit.</p>
                        </>
                    )}
                </aside>

                <section className="flex-1 flex flex-col min-h-0">
                    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
                        <select
                            value={language}
                            onChange={(e) => {
                                const next = e.target.value;
                                setLanguage(next);
                                if (active) {
                                    setCodeByProblem((prev) => ({
                                        ...prev,
                                        [active.id]: active.starterCode?.[next] || prev[active.id] || "",
                                    }));
                                }
                            }}
                            className="rounded-md border border-white/15 bg-[#0b141a] px-2 py-1 text-xs"
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                        </select>
                        <button
                            type="button"
                            onClick={() => void gradeCurrent()}
                            disabled={loading}
                            className="rounded-md bg-[#1ba94c] px-3 py-1 text-xs font-bold disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Run tests"}
                        </button>
                    </div>
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        spellCheck={false}
                        className="flex-1 min-h-[280px] w-full resize-none bg-[#1b1b1b] p-4 font-mono text-sm text-[#d4d4d4] focus:outline-none"
                    />
                    {error && <p className="px-3 py-2 text-xs text-rose-300">{error}</p>}
                    {active && grades[active.id] && grades[active.id].score != null && (
                        <div className="border-t border-white/10 px-3 py-3 text-sm">
                            Score: <span className="font-bold text-emerald-400">{grades[active.id].score}%</span> (
                            {grades[active.id].passedCount}/{grades[active.id].total})
                            <ul className="mt-1 text-xs text-white/60">
                                {(grades[active.id].results || []).map((r, i) => (
                                    <li key={i}>
                                        {r.passed ? "✓" : "✗"} {r.hidden ? "Hidden test" : "Sample test"}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>

                <aside className="lg:w-[200px] border-t lg:border-t-0 lg:border-l border-white/10 p-3 space-y-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">AI proctor</p>
                    <div className="relative overflow-hidden rounded-lg border border-white/15 bg-black">
                        <video ref={videoRef} muted playsInline className="h-32 w-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <div className="text-xs space-y-1">
                        <div>
                            Face:{" "}
                            <span className={faceVisible ? "text-emerald-400" : "text-red-400"}>
                                {faceVisible ? "visible" : "missing"}
                            </span>
                        </div>
                        <div>
                            Expression: <span className="text-amber-200">{EXPRESSION_LABEL[expression] || expression}</span>
                        </div>
                        <div>
                            Attention: <span className="text-white/70">{attention.replace("_", " ")}</span>
                        </div>
                        <div>
                            Warnings: {warningCount}/{MAX_INTEGRITY_WARNINGS}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
