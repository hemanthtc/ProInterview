"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
    Briefcase,
    ExternalLink,
    FileUp,
    Loader2,
    MapPin,
    RefreshCw,
    Share2,
    Sparkles,
} from "lucide-react";

interface MatchedJob {
    id: string;
    company: string;
    role: string;
    location: string;
    type: string;
    remote: boolean;
    tags: string[];
    salaryRange?: string;
    description: string;
    applyUrl: string;
    postedAt?: string;
    source?: string;
    matchPercent?: number;
    matchReasons?: string[];
}

interface ResumeProfile {
    roles: string[];
    skills: string[];
    keywords: string[];
    seniority: string;
    summary: string;
}

interface WebSearchLink {
    label: string;
    url: string;
}

type Step = "intake" | "results";

const QUICK_LOCATIONS = ["Bangalore", "Hyderabad", "Pune", "Remote India"];

export default function JobsPage() {
    const [step, setStep] = useState<Step>("intake");
    const [jobs, setJobs] = useState<MatchedJob[]>([]);
    const [profile, setProfile] = useState<ResumeProfile | null>(null);
    const [webSearches, setWebSearches] = useState<WebSearchLink[]>([]);
    const [location, setLocation] = useState("");
    const [resumeText, setResumeText] = useState("");
    const [resumeFileName, setResumeFileName] = useState("");
    const [loading, setLoading] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [error, setError] = useState("");
    const [scorecardId, setScorecardId] = useState("");
    const [sourcesTried, setSourcesTried] = useState<string[]>([]);
    const [usedFallback, setUsedFallback] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setScorecardId(params.get("scorecard") || "");

        const savedLocation = localStorage.getItem("preferredJobLocation") || "";
        const savedResume =
            localStorage.getItem("userResumeCvText") ||
            localStorage.getItem("resumeText") ||
            "";
        const savedName = localStorage.getItem("userResumeCvName") || "";
        if (savedLocation) setLocation(savedLocation);
        if (savedResume) {
            setResumeText(savedResume);
            if (savedName) setResumeFileName(savedName);
        }
    }, []);

    async function onResumeFile(file: File | null) {
        if (!file) return;
        setError("");
        setParsing(true);
        setResumeFileName(file.name);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to parse resume");
            const text = String(data.text || "").trim();
            if (!text || text.length < 40) {
                throw new Error("Could not extract enough text from that file. Try PDF/TXT or paste your resume.");
            }
            setResumeText(text);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Resume upload failed");
            setResumeFileName("");
        } finally {
            setParsing(false);
        }
    }

    async function findMatchingJobs(e?: FormEvent) {
        e?.preventDefault();
        setError("");
        if (!resumeText.trim() || resumeText.trim().length < 40) {
            setError("Upload or paste your resume first.");
            return;
        }
        if (!location.trim()) {
            setError("Enter your preferred location (city, country, or Remote).");
            return;
        }

        setLoading(true);
        try {
            localStorage.setItem("preferredJobLocation", location.trim());
            const res = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resumeText: resumeText.trim(),
                    location: location.trim(),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Job search failed");
            setJobs(data.jobs || []);
            setProfile(data.profile || null);
            setWebSearches(data.webSearches || []);
            setSourcesTried(data.sourcesTried || []);
            setUsedFallback(Boolean(data.usedFallback));
            setStep("results");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Job search failed");
        } finally {
            setLoading(false);
        }
    }

    function applyWithScorecard(job: MatchedJob) {
        const base = job.applyUrl || "#";
        if (scorecardId) {
            const share = `${window.location.origin}/scorecard/${scorecardId}`;
            navigator.clipboard
                ?.writeText(`Applying via ProInterview. Scorecard: ${share}`)
                .catch(() => {});
        }
        window.open(base, "_blank", "noopener,noreferrer");
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-emerald-300/80 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> Job board
                        </p>
                        <h1 className="text-2xl font-semibold mt-1">Open job roles</h1>
                        <p className="text-sm text-white/50 mt-1">
                            Match live openings to your resume and preferred location.
                        </p>
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

                {step === "intake" && (
                    <form
                        onSubmit={findMatchingJobs}
                        className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-5"
                    >
                        <div>
                            <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2 mb-2">
                                <FileUp className="w-3.5 h-3.5" /> Resume
                            </p>
                            <label className="block rounded-xl border border-dashed border-white/20 bg-black/30 px-4 py-6 text-center cursor-pointer hover:border-emerald-400/40 transition">
                                <input
                                    type="file"
                                    accept=".pdf,.txt,.doc,.docx"
                                    className="hidden"
                                    onChange={(ev) => void onResumeFile(ev.target.files?.[0] || null)}
                                />
                                {parsing ? (
                                    <span className="inline-flex items-center gap-2 text-sm text-white/60">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Parsing resume…
                                    </span>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium">
                                            {resumeFileName || "Upload resume (PDF / TXT)"}
                                        </p>
                                        <p className="text-xs text-white/40 mt-1">
                                            Or paste resume text below
                                        </p>
                                    </>
                                )}
                            </label>
                            <textarea
                                value={resumeText}
                                onChange={(e) => setResumeText(e.target.value)}
                                rows={8}
                                placeholder="Paste your resume text here…"
                                className="mt-3 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2 mb-2">
                                <MapPin className="w-3.5 h-3.5" /> Preferred location
                            </label>
                            <input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="e.g. Bangalore, Hyderabad, Remote, Berlin…"
                                className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
                                required
                            />
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {QUICK_LOCATIONS.map((loc) => (
                                    <button
                                        key={loc}
                                        type="button"
                                        onClick={() => setLocation(loc)}
                                        className={`text-xs rounded-full border px-2.5 py-1 transition ${
                                            location === loc
                                                ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                                                : "border-white/10 text-white/50 hover:border-emerald-400/30 hover:text-emerald-200"
                                        }`}
                                    >
                                        {loc}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading || parsing}
                            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-4 py-3 text-sm font-medium inline-flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Searching matching jobs…
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" /> Find open roles for me
                                </>
                            )}
                        </button>
                    </form>
                )}

                {step === "results" && (
                    <>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm text-white/70">
                                        Preferred location: <span className="text-white">{location}</span>
                                    </p>
                                    {profile && (
                                        <p className="text-xs text-white/45 mt-1">
                                            Profile: {profile.summary || profile.roles.join(", ")} ·{" "}
                                            {profile.skills.slice(0, 6).join(", ")}
                                        </p>
                                    )}
                                    {sourcesTried.length > 0 && (
                                        <p className="text-xs text-white/35 mt-1">
                                            Searched: {sourcesTried.join(", ")}
                                        </p>
                                    )}
                                    {usedFallback && (
                                        <p className="text-xs text-amber-200/80 mt-1">
                                            Live boards returned few hits — included curated fallback listings. Use Google
                                            Jobs / LinkedIn links below for more local openings.
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep("intake");
                                        setError("");
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-sm text-white/70 hover:text-white"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" /> Change resume / location
                                </button>
                            </div>
                            {webSearches.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {webSearches.map((link) => (
                                        <a
                                            key={link.url}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs rounded-lg border border-white/10 px-2.5 py-1 text-emerald-300/90 hover:bg-white/5"
                                        >
                                            {link.label} ↗
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>

                        {error && (
                            <p className="text-sm text-rose-300 mb-4">{error}</p>
                        )}

                        {jobs.length === 0 ? (
                            <p className="text-sm text-white/50">
                                No strong matches yet. Try a broader location (e.g. Remote) or add more skills to your resume text.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {jobs.map((job) => (
                                    <div key={job.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h2 className="font-medium">
                                                        {job.role} · {job.company}
                                                    </h2>
                                                    {typeof job.matchPercent === "number" && (
                                                        <span className="text-[11px] rounded-md bg-emerald-500/15 text-emerald-300 px-2 py-0.5">
                                                            {job.matchPercent}% match
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-white/50">
                                                    {job.location} · {job.type}
                                                    {job.remote ? " · Remote ok" : ""}
                                                    {job.salaryRange ? ` · ${job.salaryRange}` : ""}
                                                    {job.source ? ` · via ${job.source}` : ""}
                                                </p>
                                                <p className="text-sm text-white/70 mt-2">{job.description}</p>
                                                {job.matchReasons && job.matchReasons.length > 0 && (
                                                    <ul className="mt-2 text-xs text-white/45 list-disc pl-4 space-y-0.5">
                                                        {job.matchReasons.map((reason) => (
                                                            <li key={reason}>{reason}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                                <div className="flex flex-wrap gap-1.5 mt-3">
                                                    {job.tags.map((t) => (
                                                        <span
                                                            key={t}
                                                            className="text-[10px] rounded-full border border-white/10 px-2 py-0.5 text-white/50"
                                                        >
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                                {job.applyUrl && (
                                                    <p className="text-[11px] text-white/35 mt-2 break-all">
                                                        Apply link: {job.applyUrl}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => applyWithScorecard(job)}
                                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm shrink-0"
                                            >
                                                Apply <ExternalLink className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
