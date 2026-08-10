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
    Moon,
    Sun,
    Eye,
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
                        <h1 className="text-2xl font-semibold mt-1">Open job roles</h1>
                        <p className="text-sm text-white/50 mt-1">
                            Match live openings to your resume and preferred location.
                        </p>
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

                {step === "intake" && (
                    <form
                        onSubmit={findMatchingJobs}
                        className={`rounded-2xl border p-5 space-y-5 ${
                            theme === "light"
                                ? "bg-white border-slate-200 shadow-sm"
                                : theme === "eyeprotect"
                                ? "bg-[#fffcf5] border-[#8c8578]"
                                : "bg-white/5 border-white/10"
                        }`}
                    >
                        <div>
                            <p className={`text-xs uppercase tracking-widest flex items-center gap-2 mb-2 ${
                                isLight ? "text-slate-500 font-semibold" : "text-white/40"
                            }`}>
                                <FileUp className="w-3.5 h-3.5" /> Resume
                            </p>
                            <label className={`block rounded-xl border border-dashed px-4 py-6 text-center cursor-pointer transition ${
                                isLight
                                    ? "border-slate-300 bg-slate-50 hover:border-emerald-600"
                                    : "border-white/20 bg-black/30 hover:border-emerald-400/40"
                            }`}>
                                <input
                                    type="file"
                                    accept=".pdf,.txt,.doc,.docx"
                                    className="hidden"
                                    onChange={(ev) => void onResumeFile(ev.target.files?.[0] || null)}
                                />
                                {parsing ? (
                                    <span className={`inline-flex items-center gap-2 text-sm ${isLight ? "text-slate-600" : "text-white/60"}`}>
                                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> Parsing resume…
                                    </span>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium">
                                            {resumeFileName || "Upload resume (PDF / TXT)"}
                                        </p>
                                        <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-white/40"}`}>
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
                                className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition ${
                                    isLight
                                        ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                        : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-emerald-500/50"
                                }`}
                            />
                        </div>

                        <div>
                            <label className={`text-xs uppercase tracking-widest flex items-center gap-2 mb-2 ${
                                isLight ? "text-slate-500 font-semibold" : "text-white/40"
                            }`}>
                                <MapPin className="w-3.5 h-3.5" /> Preferred location
                            </label>
                            <input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="e.g. Bangalore, Hyderabad, Remote, Berlin…"
                                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition ${
                                    isLight
                                        ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                        : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-emerald-500/50"
                                }`}
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
                            <p className="text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading || parsing}
                            className={`w-full rounded-xl px-4 py-3 text-sm font-medium inline-flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 ${
                                theme === "eyeprotect"
                                    ? "bg-[#0b5f58] hover:bg-[#084842] text-white"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            }`}
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
                        <div className={`rounded-2xl border p-4 mb-5 ${
                            theme === "light"
                                ? "bg-white border-slate-200 shadow-sm"
                                : theme === "eyeprotect"
                                ? "bg-[#fffcf5] border-[#8c8578]"
                                : "bg-white/5 border-white/10"
                        }`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className={`text-sm ${isLight ? "text-slate-600" : "text-white/70"}`}>
                                        Preferred location: <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{location}</span>
                                    </p>
                                    {profile && (
                                        <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-white/45"}`}>
                                            Profile: {profile.summary || profile.roles.join(", ")} ·{" "}
                                            {profile.skills.slice(0, 6).join(", ")}
                                        </p>
                                    )}
                                    {sourcesTried.length > 0 && (
                                        <p className={`text-xs mt-1 ${isLight ? "text-slate-400" : "text-white/35"}`}>
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
                                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                                        isLight
                                            ? "border-slate-300 text-slate-700 hover:bg-slate-100"
                                            : "border-white/15 text-white/70 hover:text-white hover:bg-white/10"
                                    }`}
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
                                            className={`text-xs rounded-lg border px-2.5 py-1 font-medium transition ${
                                                isLight
                                                    ? "border-slate-300 text-emerald-700 hover:bg-slate-100"
                                                    : "border-white/10 text-emerald-300/90 hover:bg-white/5"
                                            }`}
                                        >
                                            {link.label} ↗
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>

                        {error && (
                            <p className="text-sm text-rose-500 mb-4">{error}</p>
                        )}

                        {jobs.length === 0 ? (
                            <p className={`text-sm ${isLight ? "text-slate-500" : "text-white/50"}`}>
                                No strong matches yet. Try a broader location (e.g. Remote) or add more skills to your resume text.
                            </p>
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
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h2 className="font-semibold text-base">
                                                        {job.role} · {job.company}
                                                    </h2>
                                                    {typeof job.matchPercent === "number" && (
                                                        <span className={`text-[11px] rounded-md px-2 py-0.5 font-bold ${
                                                            isLight ? "bg-emerald-100 text-emerald-800" : "bg-emerald-500/15 text-emerald-300"
                                                        }`}>
                                                            {job.matchPercent}% match
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`text-sm ${isLight ? "text-slate-500" : "text-white/50"}`}>
                                                    {job.location} · {job.type}
                                                    {job.remote ? " · Remote ok" : ""}
                                                    {job.salaryRange ? ` · ${job.salaryRange}` : ""}
                                                    {job.source ? ` · via ${job.source}` : ""}
                                                </p>
                                                <p className={`text-sm mt-2 ${isLight ? "text-slate-700" : "text-white/70"}`}>{job.description}</p>
                                                {job.matchReasons && job.matchReasons.length > 0 && (
                                                    <ul className={`mt-2 text-xs list-disc pl-4 space-y-0.5 ${isLight ? "text-slate-500" : "text-white/45"}`}>
                                                        {job.matchReasons.map((reason) => (
                                                            <li key={reason}>{reason}</li>
                                                        ))}
                                                    </ul>
                                                )}
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
                                                {job.applyUrl && (
                                                    <p className={`text-[11px] mt-2 break-all ${isLight ? "text-slate-400" : "text-white/35"}`}>
                                                        Apply link: {job.applyUrl}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => applyWithScorecard(job)}
                                                className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-sm font-bold transition cursor-pointer shrink-0 ${
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
                    </>
                )}
            </div>
        </div>
    );
}
