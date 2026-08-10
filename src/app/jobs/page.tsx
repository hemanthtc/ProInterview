"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, ExternalLink, Loader2, Share2, Moon, Sun, Eye } from "lucide-react";

interface Job {
    id: string;
    company: string;
    role: string;
    location: string;
    type: string;
    remote: boolean;
    tags: string[];
    salaryRange?: string;
    description: string;
    applyUrl?: string;
}

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [scorecardId, setScorecardId] = useState("");

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
        const params = new URLSearchParams(window.location.search);
        setScorecardId(params.get("scorecard") || "");
        void load("");
    }, []);

    async function load(query: string) {
        setLoading(true);
        try {
            const res = await fetch(`/api/jobs?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setJobs(data.jobs || []);
        } finally {
            setLoading(false);
        }
    }

    function applyWithScorecard(job: Job) {
        const base = job.applyUrl || "#";
        if (scorecardId) {
            const share = `${window.location.origin}/scorecard/${scorecardId}`;
            navigator.clipboard?.writeText(`Applying via ProInterview. Scorecard: ${share}`).catch(() => {});
            window.open(base, "_blank");
            return;
        }
        window.open(base, "_blank");
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
                        <p className={`text-xs uppercase tracking-widest flex items-center gap-2 ${isLight ? "text-emerald-700 font-bold" : "text-emerald-300/80"}`}>
                            <Briefcase className="w-4 h-4" /> Job board
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">Open roles</h1>
                        {scorecardId && (
                            <p className={`text-xs mt-1 flex items-center gap-1 font-semibold ${isLight ? "text-emerald-700" : "text-emerald-300/80"}`}>
                                <Share2 className="w-3 h-3" /> Applying with scorecard {scorecardId}
                            </p>
                        )}
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

                <form
                    className="flex gap-2 mb-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void load(q);
                    }}
                >
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search company, role, location…"
                        className={`flex-1 rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none transition ${
                            isLight
                                ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-emerald-500/50"
                        }`}
                    />
                    <button
                        type="submit"
                        className={`rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
                            theme === "eyeprotect"
                                ? "bg-[#0b5f58] hover:bg-[#084842] text-white"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        }`}
                    >
                        Search
                    </button>
                </form>

                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                ) : (
                    <div className="space-y-3">
                        {jobs.map((job) => (
                            <div
                                key={job.id}
                                className={`rounded-2xl border p-4 transition ${
                                    theme === "light"
                                        ? "bg-white border-slate-200 shadow-sm"
                                        : theme === "eyeprotect"
                                        ? "bg-[#fffcf5] border-[#8c8578]"
                                        : "bg-white/5 border-white/10"
                                }`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="font-semibold text-base">
                                            {job.role} · {job.company}
                                        </h2>
                                        <p className={`text-sm ${isLight ? "text-slate-500" : "text-white/50"}`}>
                                            {job.location} · {job.type}
                                            {job.remote ? " · Remote ok" : ""}
                                            {job.salaryRange ? ` · ${job.salaryRange}` : ""}
                                        </p>
                                        <p className={`text-sm mt-2 ${isLight ? "text-slate-700" : "text-white/70"}`}>{job.description}</p>
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {job.tags.map((t) => (
                                                <span
                                                    key={t}
                                                    className={`text-[10px] rounded-full border px-2 py-0.5 font-medium ${
                                                        isLight
                                                            ? "border-slate-300 bg-slate-100 text-slate-700"
                                                            : "border-white/10 text-white/50"
                                                    }`}
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => applyWithScorecard(job)}
                                        className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-sm font-bold transition cursor-pointer ${
                                            theme === "eyeprotect"
                                                ? "bg-[#0b5f58] hover:bg-[#084842] text-white"
                                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                        }`}
                                    >
                                        Apply <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
