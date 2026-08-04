"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, ExternalLink, Loader2, Share2 } from "lucide-react";

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
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-emerald-300/80 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> Job board
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">Open roles</h1>
                        {scorecardId && (
                            <p className="text-xs text-emerald-300/80 mt-1 flex items-center gap-1">
                                <Share2 className="w-3 h-3" /> Applying with scorecard {scorecardId}
                            </p>
                        )}
                    </div>
                    <Link href="/labs" className="text-sm text-white/60 hover:text-white">
                        ← Labs
                    </Link>
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
                        className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
                    />
                    <button type="submit" className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm">
                        Search
                    </button>
                </form>

                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white/40" />
                ) : (
                    <div className="space-y-3">
                        {jobs.map((job) => (
                            <div key={job.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="font-medium">
                                            {job.role} · {job.company}
                                        </h2>
                                        <p className="text-sm text-white/50">
                                            {job.location} · {job.type}
                                            {job.remote ? " · Remote ok" : ""}
                                            {job.salaryRange ? ` · ${job.salaryRange}` : ""}
                                        </p>
                                        <p className="text-sm text-white/70 mt-2">{job.description}</p>
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {job.tags.map((t) => (
                                                <span key={t} className="text-[10px] rounded-full border border-white/10 px-2 py-0.5 text-white/50">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => applyWithScorecard(job)}
                                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm"
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
