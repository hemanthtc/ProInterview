"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCopy, Loader2, Plus, Shield } from "lucide-react";

interface Attempt {
    identifier: string;
    displayName: string;
    startedAt: number;
    submittedAt?: number;
    terminated?: boolean;
    scores: Record<string, number>;
    events: { at: number; reason: string }[];
    plagiarism?: { identifier: string; score: number }[];
}

interface Exam {
    code: string;
    title: string;
    durationSec: number;
    problemIds: string[];
    createdAt: number;
    attempts: Attempt[];
    joinPath?: string;
}

function avgScore(scores: Record<string, number>): number {
    const vals = Object.values(scores);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export default function FacultyExamsPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [title, setTitle] = useState("Campus coding exam");
    const [minutes, setMinutes] = useState(60);
    const [count, setCount] = useState(3);
    const [roster, setRoster] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [cfHint, setCfHint] = useState("");
    const [copied, setCopied] = useState("");

    async function refresh() {
        const res = await fetch("/api/exams");
        const data = await res.json();
        if (res.ok) setExams(data.exams || []);
        else setError(data.error || "Sign in to manage exams.");
    }

    useEffect(() => {
        void refresh();
    }, []);

    async function create() {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/exams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "create",
                    title,
                    durationSec: minutes * 60,
                    problemCount: count,
                    roster,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Could not create exam.");
                return;
            }
            await refresh();
        } finally {
            setLoading(false);
        }
    }

    function copyJoin(code: string) {
        const url = `${window.location.origin}/coding-assessment?exam=${code}`;
        void navigator.clipboard.writeText(url);
        setCopied(code);
        window.setTimeout(() => setCopied(""), 2000);
    }

    return (
        <div className="min-h-screen bg-[#0b141a] text-white">
            <div className="max-w-5xl mx-auto px-4 py-10">
                <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> Faculty
                </p>
                <h1 className="mt-2 text-3xl font-bold">Coding exam dashboard</h1>
                <p className="mt-2 text-sm text-white/55">
                    Create a join code, send it to students, and watch scores plus integrity warnings in one place.
                </p>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 grid gap-3 sm:grid-cols-[1fr_100px_100px_auto]">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="rounded-lg border border-white/15 bg-[#0b141a] px-3 py-2 text-sm"
                        placeholder="Exam title"
                    />
                    <input
                        type="number"
                        min={10}
                        max={180}
                        value={minutes}
                        onChange={(e) => setMinutes(Number(e.target.value))}
                        className="rounded-lg border border-white/15 bg-[#0b141a] px-3 py-2 text-sm"
                    />
                    <input
                        type="number"
                        min={2}
                        max={4}
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                        className="rounded-lg border border-white/15 bg-[#0b141a] px-3 py-2 text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => void create()}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1ba94c] px-4 py-2 text-sm font-bold disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Create
                    </button>
                </div>
                <textarea
                    value={roster}
                    onChange={(e) => setRoster(e.target.value)}
                    placeholder="Optional student roster (one email per line) for a campus batch"
                    className="mt-3 w-full min-h-[72px] rounded-lg border border-white/15 bg-[#0b141a] px-3 py-2 text-xs"
                />
                <p className="mt-1 text-[11px] text-white/35">Minutes · problem count (2–4). Free accounts: 3 exams, then Pro.</p>
                <button
                    type="button"
                    className="mt-2 text-xs font-bold text-emerald-400"
                    onClick={async () => {
                        const res = await fetch("/api/demo/seed", { method: "POST" });
                        const data = await res.json();
                        if (res.ok) await refresh();
                        else setError(data.error || "Seed failed");
                    }}
                >
                    Seed demo exam
                </button>
                <button
                    type="button"
                    className="mt-2 ml-4 text-xs font-bold text-sky-300"
                    onClick={async () => {
                        const res = await fetch("/api/codeforces");
                        const data = await res.json();
                        setCfHint(data.url ? `${data.title} — ${data.url}` : data.error || "");
                    }}
                >
                    Pull live Codeforces problem
                </button>
                {cfHint && <p className="mt-2 text-xs text-sky-200/80 break-all">{cfHint}</p>}
                {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

                <div className="mt-8 space-y-4">
                    {exams.map((exam) => (
                        <div key={exam.code} className="rounded-2xl border border-white/10 bg-[#111c24] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h2 className="font-bold">{exam.title}</h2>
                                    <p className="text-xs text-white/45">
                                        Code <span className="font-mono text-emerald-300">{exam.code}</span> · {Math.round(exam.durationSec / 60)} min ·{" "}
                                        {exam.problemIds.length} problems · {exam.attempts.length} students
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyJoin(exam.code)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold"
                                >
                                    <ClipboardCopy className="h-3.5 w-3.5" />
                                    {copied === exam.code ? "Copied" : "Copy student link"}
                                </button>
                                <button
                                    type="button"
                                    className="text-xs font-bold text-white/60"
                                    onClick={() => {
                                        const rows = [
                                            "name,avg,flags,status",
                                            ...exam.attempts.map((a) => {
                                                const avg = avgScore(a.scores);
                                                const status = a.terminated ? "terminated" : a.submittedAt ? "submitted" : "in_progress";
                                                return `${JSON.stringify(a.displayName)},${avg},${a.events.length},${status}`;
                                            }),
                                        ];
                                        const blob = new Blob([rows.join("\n")], { type: "text/csv" });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = `${exam.code}.csv`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                >
                                    Export CSV
                                </button>
                            </div>
                            <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="text-white/40">
                                        <tr>
                                            <th className="py-1 pr-3">Student</th>
                                            <th className="py-1 pr-3">Avg</th>
                                            <th className="py-1 pr-3">Flags</th>
                                            <th className="py-1">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {exam.attempts.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-3 text-white/35">
                                                    No attempts yet. Share the link.
                                                </td>
                                            </tr>
                                        )}
                                        {exam.attempts.map((a) => (
                                            <tr key={a.identifier} className="border-t border-white/5">
                                                <td className="py-2 pr-3 font-medium">{a.displayName}</td>
                                                <td className="py-2 pr-3">{avgScore(a.scores)}%</td>
                                                <td className="py-2 pr-3 text-amber-200">{a.events.length}</td>
                                                <td className="py-2">
                                                    {a.terminated ? (
                                                        <span className="text-rose-300">Terminated</span>
                                                    ) : a.submittedAt ? (
                                                        <span className="text-emerald-300">Submitted</span>
                                                    ) : (
                                                        <span className="text-white/45">In progress</span>
                                                    )}
                                                    {a.events[0] && (
                                                        <div className="text-white/35 mt-0.5">{a.events[a.events.length - 1]?.reason}</div>
                                                    )}
                                                    {a.plagiarism && a.plagiarism[0] && (
                                                        <div className="text-rose-300 mt-0.5">
                                                            Similar to {a.plagiarism[0].identifier} ({Math.round(a.plagiarism[0].score * 100)}%)
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>

                <Link href="/coding-assessment" className="mt-8 inline-block text-sm text-emerald-400 hover:underline">
                    Open student assessment →
                </Link>
            </div>
        </div>
    );
}
