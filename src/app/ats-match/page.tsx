"use client";

import { useState } from "react";
import Link from "next/link";
import { FileSearch, Loader2 } from "lucide-react";

export default function AtsMatchPage() {
    const [resumeText, setResumeText] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [company, setCompany] = useState("");
    const [role, setRole] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function run() {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/ats-match", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resumeText, jobDescription, company, role }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "ATS match failed");
            setResult(data);
            if (data.readyForMock) {
                localStorage.setItem("atsMatchPercent", String(data.matchPercent || 0));
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-sky-300/80 flex items-center gap-2">
                            <FileSearch className="w-4 h-4" /> ATS match
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">JD vs resume score</h1>
                    </div>
                    <Link href="/labs" className="text-sm text-white/60 hover:text-white">
                        ← Labs
                    </Link>
                </div>

                <div className="grid md:grid-cols-2 gap-3 mb-3">
                    <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm" />
                    <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm" />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                    <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste resume text…" className="min-h-[240px] rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm" />
                    <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste job description…" className="min-h-[240px] rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm" />
                </div>
                <button type="button" onClick={() => void run()} disabled={loading || !resumeText || !jobDescription} className="mt-3 rounded-xl bg-sky-500 px-4 py-2 text-sm disabled:opacity-40">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Score match"}
                </button>
                {error && <p className="text-rose-300 text-sm mt-2">{error}</p>}
                {result && (
                    <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                        <div className="text-3xl font-bold text-sky-300">{result.matchPercent}% match</div>
                        <div>
                            <b>Hits:</b> {(result.keywordHits || []).join(", ") || "—"}
                        </div>
                        <div>
                            <b>Gaps:</b>{" "}
                            <span className="text-amber-200/90">
                                {(result.keywordGaps || []).join(", ") || "—"}
                            </span>
                        </div>
                        {(result.sectionAdvice || []).length > 0 && (
                            <div>
                                <p className="mb-1 text-xs uppercase text-white/40">Section advice</p>
                                <ul className="list-disc pl-5 text-white/70">
                                    {result.sectionAdvice.map((a: string, i: number) => (
                                        <li key={i}>{a}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {(result.rewrittenBullets || []).length > 0 && (
                            <div>
                                <p className="mb-1 text-xs uppercase text-emerald-300/80">Rewrite suggestions</p>
                                <ul className="space-y-1.5">
                                    {result.rewrittenBullets.map((b: string, i: number) => (
                                        <li key={i} className="rounded-lg bg-black/30 px-3 py-2 text-white/80">
                                            {b}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-3 pt-1">
                            {result.readyForMock && (
                                <Link href="/setup" className="text-sky-300 underline">
                                    Ready — start a mock interview →
                                </Link>
                            )}
                            <Link href="/prep" className="text-indigo-300 underline">
                                Prep dashboard →
                            </Link>
                            {(result.keywordGaps || []).length > 0 && (
                                <Link
                                    href={`/star-coach?question=${encodeURIComponent(`Tell me about experience with ${(result.keywordGaps || [])[0]}`)}&weakSpot=${encodeURIComponent("missing keyword evidence")}`}
                                    className="text-violet-300 underline"
                                >
                                    Practice a gap in STAR coach →
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
