"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileSearch, Loader2, Moon, Sun, Eye } from "lucide-react";

export default function AtsMatchPage() {
    const [resumeText, setResumeText] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [company, setCompany] = useState("");
    const [role, setRole] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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

    async function run() {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/ats-match", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resumeText, jobDescription, company, role }),
            });
            let data: any;
            const contentType = res.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                data = await res.json();
            } else {
                const text = await res.text();
                throw new Error(text || `Server returned HTTP ${res.status}`);
            }
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
        <div className={`min-h-screen transition-colors duration-300 ${
            theme === "light"
                ? "bg-slate-100 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-slate-950 text-white"
        }`}>
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <p className={`text-xs uppercase tracking-widest flex items-center gap-2 ${isLight ? "text-sky-700 font-bold" : "text-sky-300/80"}`}>
                            <FileSearch className="w-4 h-4" /> ATS match
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">JD vs resume score</h1>
                    </div>
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

                <div className="grid md:grid-cols-2 gap-3 mb-3">
                    <input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Company"
                        className={`rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none transition ${
                            isLight
                                ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-sky-500/50"
                        }`}
                    />
                    <input
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="Role"
                        className={`rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none transition ${
                            isLight
                                ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-sky-500/50"
                        }`}
                    />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                    <textarea
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste resume text…"
                        className={`min-h-[240px] rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none transition ${
                            isLight
                                ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-sky-500/50"
                        }`}
                    />
                    <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste job description…"
                        className={`min-h-[240px] rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none transition ${
                            isLight
                                ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-sky-500/50"
                        }`}
                    />
                </div>
                <button
                    type="button"
                    onClick={() => void run()}
                    disabled={loading || !resumeText || !jobDescription}
                    className={`mt-3 rounded-xl px-5 py-2.5 text-sm font-bold transition cursor-pointer ${
                        theme === "eyeprotect"
                            ? "bg-[#0b5f58] hover:bg-[#084842] text-white disabled:opacity-40"
                            : "bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40"
                    }`}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Score match"}
                </button>
                {error && <p className="text-rose-500 text-sm font-semibold mt-2">{error}</p>}
                {result && (
                    <div className={`mt-4 rounded-2xl border p-5 space-y-2 text-sm ${
                        theme === "light"
                            ? "bg-white border-slate-200 shadow-sm"
                            : theme === "eyeprotect"
                            ? "bg-[#fffcf5] border-[#8c8578]"
                            : "bg-white/5 border-white/10"
                    }`}>
                        <div className={`text-3xl font-bold ${isLight ? "text-sky-700" : "text-sky-300"}`}>{result.matchPercent}% match</div>
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
                                <p className={`mb-1 text-xs uppercase ${isLight ? "text-slate-500" : "text-white/40"}`}>Section advice</p>
                                <ul className={`list-disc pl-5 ${isLight ? "text-slate-700" : "text-white/70"}`}>
                                    {result.sectionAdvice.map((a: string, i: number) => (
                                        <li key={i}>{a}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {result.readyForMock && (
                            <Link href="/setup" className={`inline-block mt-2 font-bold underline ${isLight ? "text-sky-700" : "text-sky-300"}`}>
                                Ready — start a mock interview →
                            </Link>
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
