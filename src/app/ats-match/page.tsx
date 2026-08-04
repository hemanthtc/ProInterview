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
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm">
                        <div className="text-3xl font-bold text-sky-300">{result.matchPercent}% match</div>
                        <div>
                            <b>Hits:</b> {(result.keywordHits || []).join(", ")}
                        </div>
                        <div>
                            <b>Gaps:</b> {(result.keywordGaps || []).join(", ")}
                        </div>
                        {result.readyForMock && (
                            <Link href="/setup" className="inline-block mt-2 text-sky-300 underline">
                                Ready — start a mock interview →
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
