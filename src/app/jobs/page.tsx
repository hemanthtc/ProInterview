"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStorageItem } from "@/utils/storage";
import {
    Briefcase,
    ExternalLink,
    Filter,
    Loader2,
    MapPin,
    RefreshCw,
    Share2,
    Sparkles,
    Moon,
    Sun,
    Eye,
    CheckCircle2,
    XCircle,
    FileText,
    UploadCloud,
    ChevronDown,
} from "lucide-react";
import { authFetch, handleSessionExpired } from "@/utils/authExpiry";

type ExperienceFilter = "all" | "fresher" | "intern" | "1year" | "2year" | "3plus" | "on_campus" | "off_campus" | "custom";
type WorkModeFilter = "all" | "onsite" | "offsite" | "remote";

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
    education?: {
        degree?: string;
        field?: string;
        specialization?: string;
        level?: string;
        graduationYear?: string;
        normalizedDegree?: string;
        normalizedField?: string;
    };
    primaryDomains?: string[];
    secondaryDomains?: string[];
    roles: string[];
    skills: string[];
    technicalSkills?: string[];
    professionalSkills?: string[];
    projects?: {
        title: string;
        domain?: string;
        technologies?: string[];
        skills?: string[];
    }[];
    experience?: string[];
    certifications?: string[];
    languages?: string[];
    keywords: string[];
    seniority: string;
    summary: string;
}

interface WebSearchLink {
    label: string;
    url: string;
}

interface TrackedJob {
    jobId: string;
    company: string;
    role: string;
    location: string;
    applyUrl: string;
    status: "pending" | "applied" | "interviewing" | "rejected" | "cancelled";
    appliedAt: string;
    updatedAt?: string;
}

const QUICK_LOCATIONS = ["Bangalore", "Hyderabad", "Pune", "Remote India"];

export default function JobsPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<MatchedJob[]>([]);
    const [profile, setProfile] = useState<ResumeProfile | null>(null);
    const [webSearches, setWebSearches] = useState<WebSearchLink[]>([]);
    const [location, setLocation] = useState("");
    const [jobSearchQuery, setJobSearchQuery] = useState("");
    const [resumeText, setResumeText] = useState("");
    const [resumeFileName, setResumeFileName] = useState("");
    const [loading, setLoading] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [error, setError] = useState("");
    const [scorecardId, setScorecardId] = useState("");
    const [sourcesTried, setSourcesTried] = useState<string[]>([]);
    const [usedFallback, setUsedFallback] = useState(false);

    // Multi-step layout states
    const [step, setStep] = useState<"intake" | "results">("intake");
    const [hasSearched, setHasSearched] = useState(false);

    // Resume settings states
    const [resumeTab, setResumeTab] = useState<"fetch" | "upload">("fetch");
    const [isResumeTemporary, setIsResumeTemporary] = useState(false);
    const [fetchingProfile, setFetchingProfile] = useState(false);

    // Job application tracker states
    const [trackedJobs, setTrackedJobs] = useState<TrackedJob[]>([]);
    const [trackingLoading, setTrackingLoading] = useState(false);

    // ATS match state per job card
    const [atsMatches, setAtsMatches] = useState<Record<string, {
        loading: boolean;
        error?: string;
        matchPercent?: number;
        readyForMock?: boolean;
        summaryVerdict?: string;
        breakdown?: {
            skillsMatch: number;
            experienceMatch: number;
            toolsMatch: number;
            educationMatch: number;
        };
        keywordHits?: string[];
        keywordGaps?: string[];
        sectionAdvice?: string[];
        rewrittenBullets?: string[];
    }>>({});
    const [expandedAts, setExpandedAts] = useState<Record<string, boolean>>({});

    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [experienceFilter, setExperienceFilter] = useState<ExperienceFilter>("all");
    const [workModeFilter, setWorkModeFilter] = useState<WorkModeFilter>("all");
    const [customExpYears, setCustomExpYears] = useState("");

    // Filter jobs based on selected experience and work mode filters
    const filteredJobs = jobs.filter((job) => {
        // Experience & Hiring Type filter
        if (experienceFilter !== "all") {
            const desc = (job.description + " " + job.role + " " + job.tags.join(" ")).toLowerCase();
            if (experienceFilter === "fresher") {
                if (!desc.match(/\b(fresher|freshers|entry[\s-]?level|0[\s-]?year|0[\s-]?yr|graduate|junior)\b/i)) return false;
            } else if (experienceFilter === "intern") {
                const isIntern =
                    job.type === "intern" ||
                    job.role.toLowerCase().includes("intern") ||
                    desc.match(/\b(intern|internship|trainee|apprentice|student|summer|campus|fellow|co-op)\b/i);
                if (!isIntern) return false;
            } else if (experienceFilter === "1year") {
                if (!desc.match(/\b(0\s*-\s*1|1\s*[\+\-]?\s*year|1\s*yr|1\s*year|entry)\b/i) && !desc.match(/\b(fresher|freshers)\b/i)) return false;
            } else if (experienceFilter === "2year") {
                if (!desc.match(/\b([0-2]\s*-\s*[2-3]|2\s*[\+\-]?\s*year|2\s*yr|1\s*-\s*2|0\s*-\s*2)\b/i)) return false;
            } else if (experienceFilter === "3plus") {
                if (!desc.match(/\b([3-9]\s*[\+\-]?\s*year|[3-9]\s*yr|senior|lead|mid)\b/i)) return false;
            } else if (experienceFilter === "on_campus") {
                if (!desc.match(/\b(campus|university|college|grad|graduate|fresher|intern|trainee)\b/i)) return false;
            } else if (experienceFilter === "off_campus") {
                if (!desc.match(/\b(off[\s-]?campus|direct|experienced|lateral|full[\s-]?time|industry)\b/i) && desc.match(/\bon[\s-]?campus\b/i)) return false;
            } else if (experienceFilter === "custom" && customExpYears) {
                const yrs = parseInt(customExpYears);
                if (!isNaN(yrs)) {
                    const matches = Array.from(desc.matchAll(/(\d+)\s*(?:\+|plus)?\s*(?:-|to|or)\s*(\d+)\s*(?:\+|plus)?\s*(?:year|yr)s?/gi));
                    const singles = Array.from(desc.matchAll(/(\d+)\s*(\+|plus)?\s*(?:year|yr)s?/gi));
                    const allMatches = [...matches, ...singles];
                    if (allMatches.length > 0) {
                        let hasMatchedRange = false;
                        for (const m of allMatches) {
                            const low = parseInt(m[1]);
                            let high = low;
                            if (m[2] && /^\d+$/.test(m[2])) {
                                high = parseInt(m[2]);
                            } else if (m[2] === "+" || m[2] === "plus" || m[0].includes("+")) {
                                high = 99;
                            }
                            if (yrs >= low && yrs <= high) {
                                hasMatchedRange = true;
                                break;
                            }
                        }
                        if (!hasMatchedRange) return false;
                    }
                }
            }
        }
        // Work mode filter
        if (workModeFilter !== "all") {
            const loc = (job.location + " " + job.description).toLowerCase();
            if (workModeFilter === "remote") {
                if (!job.remote && !loc.match(/\bremote\b/)) return false;
            } else if (workModeFilter === "onsite") {
                const hasNegativeRemote = loc.match(/\b(no|not|non|zero)\s+remote\b/) || loc.match(/\bremote\s+(not\s+allowed|no\b)/);
                if (job.remote || (loc.match(/\bremote\b/) && !hasNegativeRemote)) return false;
            } else if (workModeFilter === "offsite") {
                if (!loc.match(/\b(hybrid|off[\s-]?site|work from home|wfh)\b/)) return false;
            }
        }
        return true;
    });

    useEffect(() => {
        async function init() {
            if (getStorageItem("userLoggedIn") !== "true") {
                router.push("/login?redirect=/jobs");
                return;
            }

            const savedTheme = localStorage.getItem("prointerview_theme") as "dark" | "light" | "eyeprotect" | null;
            if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
                setTheme(savedTheme);
            }

            const params = new URLSearchParams(window.location.search);
            setScorecardId(params.get("scorecard") || "");

            // If URL says step=results, restore that view
            const urlStep = params.get("step");
            if (urlStep === "results") {
                setStep("results");
            }

            // Keep location and resume fields empty on fresh load
            setLocation("");
            setResumeText("");
            setResumeFileName("");

            // Load tracked jobs (Disabled for now)
            // await loadTrackedJobs();
            setIsCheckingAuth(false);
        }
        void init();
    }, [router]);

    // Listen for browser back/forward navigation
    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const urlStep = params.get("step") as "intake" | "results" | null;
            setStep(urlStep === "results" ? "results" : "intake");
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    // Triggers search automatically if both fields are valid
    useEffect(() => {
        if (location.trim() && resumeText.trim().length >= 40) {
            const delayDebounceFn = setTimeout(() => {
                void findMatchingJobs(true);
            }, 800);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [location, resumeText, jobSearchQuery]);

    const isLight = theme === "light" || theme === "eyeprotect";

    const cycleTheme = () => {
        const next = theme === "dark" ? "light" : theme === "light" ? "eyeprotect" : "dark";
        setTheme(next);
        localStorage.setItem("prointerview_theme", next);
        document.documentElement.classList.remove("theme-dark", "theme-light", "theme-eyeprotect");
        document.documentElement.classList.add(`theme-${next}`);
    };

    // Fetch user profile resume from database
    const fetchProfileResume = async (silent = false) => {
        const userIdentifier = localStorage.getItem("userIdentifier");
        if (!userIdentifier) return;
        if (!silent) setFetchingProfile(true);
        setError("");
        try {
            const userType = localStorage.getItem("userType") || "user";
            const res = await fetch(
                `/api/auth/profile?identifier=${encodeURIComponent(userIdentifier)}&accountType=${encodeURIComponent(userType)}`
            );
            const data = await res.json();
            if (res.ok && data.user) {
                const text = data.user.resumeCvText || "";
                const name = data.user.resumeCvName || "";
                setResumeText(text);
                setResumeFileName(name);
                setIsResumeTemporary(false);
                if (text) {
                    localStorage.setItem("userResumeCvText", text);
                    localStorage.setItem("userResumeCvName", name);
                }
            } else {
                if (!silent) setError(data.error || "Failed to fetch resume from profile.");
            }
        } catch (err) {
            console.error("Failed to fetch profile resume:", err);
            if (!silent) setError("Error contacting profile service.");
        } finally {
            setFetchingProfile(false);
        }
    };

    // Parse uploaded resume file (marked temporary/in-memory only)
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
            setIsResumeTemporary(true); // Flagged temporary: will not be written to profile/cache
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Resume upload failed");
            setResumeFileName("");
        } finally {
            setParsing(false);
        }
    }

    // Load tracked jobs from API and sync local offline data
    const loadTrackedJobs = async () => {
        setTrackingLoading(true);
        try {
            const res = await fetch("/api/jobs/applications");
            const serverData = await res.json();
            if (res.ok && Array.isArray(serverData)) {
                // Get local storage data
                const localStr = localStorage.getItem("prointerview_applied_jobs");
                const localList: TrackedJob[] = localStr ? JSON.parse(localStr) : [];
                
                // Find any local items that are newer or missing from the server
                const outOfSync = localList.filter((localItem) => {
                    const serverItem = serverData.find((s) => s.jobId === localItem.jobId);
                    if (!serverItem) return true; // Missing on server
                    // If local is newer, it needs syncing
                    const localDate = new Date(localItem.updatedAt || localItem.appliedAt).getTime();
                    const serverDate = new Date(serverItem.updatedAt || serverItem.appliedAt).getTime();
                    return localDate > serverDate;
                });

                if (outOfSync.length > 0) {
                    console.log(`Syncing ${outOfSync.length} offline applications to the server...`);
                    // POST each out of sync item to the server
                    for (const item of outOfSync) {
                        try {
                            await fetch("/api/jobs/applications", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(item)
                            });
                        } catch (syncErr) {
                            console.error("Failed to sync item:", item.jobId, syncErr);
                        }
                    }
                    // Fetch the fresh reconciled list from server
                    const refreshRes = await fetch("/api/jobs/applications");
                    const refreshedData = await refreshRes.json();
                    if (refreshRes.ok && Array.isArray(refreshedData)) {
                        setTrackedJobs(refreshedData);
                        localStorage.setItem("prointerview_applied_jobs", JSON.stringify(refreshedData));
                    }
                } else {
                    setTrackedJobs(serverData);
                    localStorage.setItem("prointerview_applied_jobs", JSON.stringify(serverData));
                }
            } else {
                const local = localStorage.getItem("prointerview_applied_jobs");
                if (local) setTrackedJobs(JSON.parse(local));
            }
        } catch (err) {
            console.error("Failed to load tracked jobs:", err);
            const local = localStorage.getItem("prointerview_applied_jobs");
            if (local) setTrackedJobs(JSON.parse(local));
        } finally {
            setTrackingLoading(false);
        }
    };

    // Track a job application (triggered when Apply is clicked)
    const trackJob = async (job: MatchedJob) => {
        const newApp: TrackedJob = {
            jobId: job.id,
            company: job.company,
            role: job.role,
            location: job.location,
            applyUrl: job.applyUrl,
            status: "pending", // Default to pending when clicked
            appliedAt: new Date().toISOString()
        };

        // Optimistically update UI state & localStorage
        const updated = [newApp, ...trackedJobs.filter((j) => j.jobId !== job.id)];
        setTrackedJobs(updated);
        localStorage.setItem("prointerview_applied_jobs", JSON.stringify(updated));

        try {
            await fetch("/api/jobs/applications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newApp)
            });
        } catch (err) {
            console.error("Failed to persist tracked job:", err);
        }
    };

    // Update status of a job application in the tracker
    const updateJobStatus = async (jobId: string, newStatus: TrackedJob["status"]) => {
        const updated = trackedJobs.map((j) => {
            if (j.jobId === jobId) {
                return { ...j, status: newStatus, updatedAt: new Date().toISOString() };
            }
            return j;
        });
        setTrackedJobs(updated);
        localStorage.setItem("prointerview_applied_jobs", JSON.stringify(updated));

        const appToUpdate = updated.find((j) => j.jobId === jobId);
        if (!appToUpdate) return;

        try {
            await fetch("/api/jobs/applications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(appToUpdate)
            });
        } catch (err) {
            console.error("Failed to update job status:", err);
        }
    };

    const runAtsMatchForJob = async (job: MatchedJob) => {
        let activeResume = resumeText;
        if (!activeResume) {
            activeResume = localStorage.getItem("userResumeCvText") || "";
            if (activeResume) {
                setResumeText(activeResume);
            }
        }

        if (!activeResume) {
            const userIdentifier = localStorage.getItem("userIdentifier");
            if (userIdentifier) {
                try {
                    const userType = localStorage.getItem("userType") || "user";
                    const res = await fetch(
                        `/api/auth/profile?identifier=${encodeURIComponent(userIdentifier)}&accountType=${encodeURIComponent(userType)}`
                    );
                    const data = await res.json();
                    if (res.ok && data.user && data.user.resumeCvText) {
                        activeResume = data.user.resumeCvText;
                        setResumeText(activeResume);
                        if (data.user.resumeCvName) {
                            setResumeFileName(data.user.resumeCvName);
                        }
                    }
                } catch (e) {
                    console.warn("Auto-fetching resume failed", e);
                }
            }
        }

        if (!activeResume) {
            setAtsMatches(prev => ({
                ...prev,
                [job.id]: {
                    loading: false,
                    error: "Please enter or upload your resume first."
                }
            }));
            return;
        }

        setAtsMatches(prev => ({
            ...prev,
            [job.id]: { loading: true }
        }));

        try {
            const descriptionToPass = (job.description || "").trim() || `Job Role: ${job.role} at ${job.company}. Location: ${job.location || "India"}. Responsibilities, domain requirements, and qualifications for ${job.role}.`;
            const res = await authFetch("/api/ats-match", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resumeText: activeResume,
                    jobDescription: descriptionToPass,
                    company: job.company,
                    role: job.role
                })
            });

            if (res.status === 401) {
                handleSessionExpired("Your session has expired. Please sign in again to compute ATS match.");
                return;
            }

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || "Failed to compute match. Please retry.");
            }
            setAtsMatches(prev => ({
                ...prev,
                [job.id]: {
                    loading: false,
                    matchPercent: typeof data.matchPercent === "number" ? data.matchPercent : 0,
                    readyForMock: !!data.readyForMock,
                    summaryVerdict: data.summaryVerdict || "",
                    breakdown: data.breakdown,
                    keywordHits: data.keywordHits || [],
                    keywordGaps: data.keywordGaps || [],
                    sectionAdvice: data.sectionAdvice || [],
                    rewrittenBullets: data.rewrittenBullets || []
                }
            }));
        } catch (err: any) {
            setAtsMatches(prev => ({
                ...prev,
                [job.id]: {
                    loading: false,
                    error: err.message || "Failed to analyze. Please click recheck to try again."
                }
            }));
        }
    };

    const toggleAtsMatch = async (job: MatchedJob) => {
        if (expandedAts[job.id]) {
            setExpandedAts(prev => ({ ...prev, [job.id]: false }));
            return;
        }

        setExpandedAts(prev => ({ ...prev, [job.id]: true }));

        // If not analyzed yet or if the previous analysis errored, compute it
        if (!atsMatches[job.id] || atsMatches[job.id]?.error) {
            await runAtsMatchForJob(job);
        }
    };

    // Delete a tracked job from S3 / Database
    const deleteTrackedJob = async (jobId: string) => {
        const filtered = trackedJobs.filter((j) => j.jobId !== jobId);
        setTrackedJobs(filtered);
        localStorage.setItem("prointerview_applied_jobs", JSON.stringify(filtered));

        try {
            await fetch("/api/jobs/applications", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId })
            });
        } catch (err) {
            console.error("Failed to delete tracked job:", err);
        }
    };

    // Find matched jobs based on resume & location
    async function findMatchingJobs(silent = false) {
        if (!silent) setError("");
        if (!resumeText.trim() || resumeText.trim().length < 40) {
            if (!silent) setError("Upload or paste your resume first.");
            return;
        }
        if (!location.trim()) {
            if (!silent) setError("Enter your preferred location.");
            return;
        }

        if (!silent) setLoading(true);
        try {
            localStorage.setItem("preferredJobLocation", location.trim());
            // Only persist to localStorage cache if it's not a temporary uploaded resume
            if (!isResumeTemporary) {
                localStorage.setItem("userResumeCvText", resumeText.trim());
                if (resumeFileName) localStorage.setItem("userResumeCvName", resumeFileName);
            }

            const res = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resumeText: resumeText.trim(),
                    location: location.trim(),
                    experienceFilter,
                    jobSearchQuery: jobSearchQuery.trim(),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Job search failed");
            setJobs(data.jobs || []);
            setProfile(data.profile || null);
            setWebSearches(data.webSearches || []);
            setSourcesTried(data.sourcesTried || []);
            setUsedFallback(Boolean(data.usedFallback));
            setHasSearched(true);
            if (!silent) {
                window.history.pushState({ step: "results" }, "", "?step=results");
                setStep("results");
            }
        } catch (err: unknown) {
            if (!silent) setError(err instanceof Error ? err.message : "Job search failed");
        } finally {
            if (!silent) setLoading(false);
        }
    }

    const handleAutoRefresh = () => {
        if (location.trim() && resumeText.trim().length >= 40) {
            void findMatchingJobs(true);
        }
    };

    function applyWithScorecard(job: MatchedJob) {
        const base = job.applyUrl || "#";
        if (scorecardId) {
            const share = `${window.location.origin}/scorecard/${scorecardId}`;
            navigator.clipboard
                ?.writeText(`Applying via ProInterview. Scorecard: ${share}`)
                .catch(() => {});
        }
        window.open(base, "_blank", "noopener,noreferrer");
        void trackJob(job);
    }

    // Tracker stats calculations
    const stats = {
        total: trackedJobs.length,
        pending: trackedJobs.filter((j) => j.status === "pending").length,
        applied: trackedJobs.filter((j) => j.status === "applied").length,
        interviewing: trackedJobs.filter((j) => j.status === "interviewing").length,
        rejected: trackedJobs.filter((j) => j.status === "rejected").length,
        cancelled: trackedJobs.filter((j) => j.status === "cancelled").length,
    };

    if (isCheckingAuth) {
        return (
            <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
                theme === "light"
                    ? "bg-slate-100 text-slate-900"
                    : theme === "eyeprotect"
                    ? "bg-[#f3ede3] text-[#1c1917]"
                    : "bg-slate-950 text-white"
            }`}>
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className={`min-h-screen transition-colors duration-300 ${
            theme === "light"
                ? "bg-slate-100 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-slate-950 text-white"
        }`}>
            <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 space-y-6">
                
                {/* Header */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] sm:text-xs uppercase tracking-widest flex items-center gap-1.5 font-bold ${isLight ? "text-emerald-700" : "text-emerald-300/80"}`}>
                            <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Job board
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
                            <button
                                onClick={cycleTheme}
                                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
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

                            {step === "results" && (
                                <button
                                    onClick={() => {
                                        const params = new URLSearchParams(window.location.search);
                                        if (params.get("step") === "results") {
                                            window.history.back();
                                        } else {
                                            setStep("intake");
                                        }
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold border transition shadow-sm whitespace-nowrap cursor-pointer ${
                                        theme === "eyeprotect"
                                            ? "bg-[#0b5f58]/20 text-emerald-300 border-emerald-500/40 hover:bg-[#0b5f58]/30"
                                            : isLight
                                            ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                                    }`}
                                >
                                    ← Update Resume/Location
                                </button>
                            )}

                            <Link
                                href="/labs"
                                className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold border transition shadow-sm whitespace-nowrap ${
                                    theme === "eyeprotect"
                                        ? "bg-[#0b5f58] text-[#fffcf5] border-[#084842] hover:bg-[#084842]"
                                        : isLight
                                        ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                        : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                                }`}
                            >
                                <span className="hidden sm:inline">← Back to Labs</span>
                                <span className="sm:hidden">← Labs</span>
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">Open job roles</h1>
                        <p className={`text-xs sm:text-sm mt-1 ${
                            theme === "light"
                                ? "text-slate-600 font-medium"
                                : theme === "eyeprotect"
                                ? "text-[#57534e] font-semibold"
                                : "text-white/50"
                        }`}>
                            Match live openings to your resume and preferred location automatically.
                        </p>
                        {scorecardId && (
                            <p className={`text-xs mt-1 flex items-center gap-1 font-semibold ${isLight ? "text-emerald-700" : "text-emerald-300/80"}`}>
                                <Share2 className="w-3 h-3" /> Applying with scorecard {scorecardId}
                            </p>
                        )}
                    </div>
                </div>

                {/* Section 1: Resume & Location Input */}
                {step === "intake" && (
                    <>
                    <div
                        className={`rounded-2xl border px-3.5 sm:px-5 py-3.5 space-y-4 shadow-sm ${
                            theme === "light"
                                ? "bg-white border-slate-200"
                                : theme === "eyeprotect"
                                ? "bg-[#fffcf5] border-[#8c8578]"
                                : "bg-white/5 border-white/10"
                        }`}
                    >
                    {/* Resume Selector Header */}
                    <div>
                        <p className={`text-xs uppercase tracking-widest flex items-center gap-2 mb-2 font-bold ${
                            isLight ? (theme === "eyeprotect" ? "text-[#57534e]" : "text-slate-600") : "text-white/40"
                        }`}>
                            <FileText className="w-3.5 h-3.5" /> Resume settings
                        </p>
                        
                        {/* Tabs */}
                        <div className="flex border-b border-white/10 mb-3">
                            <button
                                type="button"
                                onClick={() => setResumeTab("fetch")}
                                className={`px-4 py-2 text-xs font-semibold cursor-pointer border-b-2 transition ${
                                    resumeTab === "fetch"
                                        ? (isLight ? "border-emerald-600 text-emerald-700 font-bold" : "border-emerald-400 text-emerald-300 font-bold")
                                        : "border-transparent text-slate-500 hover:text-slate-300"
                                }`}
                            >
                                Fetch profile resume
                            </button>
                            <button
                                type="button"
                                onClick={() => setResumeTab("upload")}
                                className={`px-4 py-2 text-xs font-semibold cursor-pointer border-b-2 transition ${
                                    resumeTab === "upload"
                                        ? (isLight ? "border-emerald-600 text-emerald-700 font-bold" : "border-emerald-400 text-emerald-300 font-bold")
                                        : "border-transparent text-slate-500 hover:text-slate-300"
                                }`}
                            >
                                Upload resume
                            </button>
                        </div>

                        {/* Tab Content */}
                        {resumeTab === "fetch" ? (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-500/5 border border-white/5">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold">Account Profile Resume</p>
                                    <p className="text-[11px] text-slate-500 truncate">
                                        {isResumeTemporary ? "Revert to persistent database profile" : resumeFileName || "Stored resume on profile"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void fetchProfileResume()}
                                    disabled={fetchingProfile}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                        isLight
                                            ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                                            : "bg-white/5 border-white/10 text-white/90 hover:bg-white/10"
                                    }`}
                                >
                                    {fetchingProfile ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin" /> Fetching...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5" /> Fetch from DB
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <label className={`block rounded-xl border border-dashed px-3 sm:px-4 py-3 text-center cursor-pointer transition ${
                                theme === "light"
                                    ? "border-slate-300 bg-slate-50 hover:border-emerald-600"
                                    : theme === "eyeprotect"
                                    ? "border-[#8c8578] bg-[#f5efe6] hover:border-teal-700"
                                    : "border-white/20 bg-black/30 hover:border-emerald-400/40"
                            }`}>
                                <input
                                    type="file"
                                    accept=".pdf,.txt,.doc,.docx"
                                    className="hidden"
                                    onChange={(ev) => void onResumeFile(ev.target.files?.[0] || null)}
                                    onBlur={handleAutoRefresh}
                                />
                                {parsing ? (
                                    <span className={`inline-flex items-center gap-2 text-xs ${isLight ? "text-slate-600" : "text-white/60"}`}>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" /> Parsing resume…
                                    </span>
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <UploadCloud className="w-6 h-6 text-emerald-500" />
                                        <p className="text-xs font-medium">
                                            {isResumeTemporary ? resumeFileName : "Click to upload a temporary PDF/TXT resume"}
                                        </p>
                                    </div>
                                )}
                            </label>
                        )}
                    </div>

                    {/* Resume Textarea */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className={`text-xs uppercase tracking-widest font-bold ${
                                isLight ? (theme === "eyeprotect" ? "text-[#57534e]" : "text-slate-600") : "text-white/40"
                            }`}>
                                Resume details
                            </label>
                            {isResumeTemporary && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                                    Temporary uploaded resume (Will not persist)
                                </span>
                            )}
                        </div>
                        <textarea
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                            onBlur={handleAutoRefresh}
                            rows={8}
                            placeholder="Paste or upload your resume text here…"
                            className={`w-full min-h-[160px] rounded-xl border px-3 py-2.5 text-xs focus:outline-none transition ${
                                theme === "light"
                                    ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 shadow-sm"
                                    : theme === "eyeprotect"
                                    ? "bg-[#fffcf5] border-[#8c8578] text-[#1c1917] placeholder:text-[#78716c] focus:border-teal-700"
                                    : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-emerald-500/50"
                            }`}
                        />
                    </div>

                    {/* Location Input */}
                    <div>
                        <label className={`text-xs uppercase tracking-widest flex items-center gap-2 mb-2 font-bold ${
                            isLight ? (theme === "eyeprotect" ? "text-[#57534e]" : "text-slate-600") : "text-white/40"
                        }`}>
                            <MapPin className="w-3.5 h-3.5" /> Preferred location
                        </label>
                        <input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            onBlur={handleAutoRefresh}
                            placeholder="e.g. Bangalore, Hyderabad, Remote, Berlin…"
                            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition ${
                                theme === "light"
                                    ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 shadow-sm"
                                    : theme === "eyeprotect"
                                    ? "bg-[#fffcf5] border-[#8c8578] text-[#1c1917] placeholder:text-[#78716c] focus:border-teal-700"
                                    : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-emerald-500/50"
                            }`}
                            required
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {QUICK_LOCATIONS.map((loc) => (
                                <button
                                    key={loc}
                                    type="button"
                                    onClick={() => {
                                        setLocation(loc);
                                        handleAutoRefresh();
                                    }}
                                    className={`text-xs rounded-full border px-2.5 py-1 transition cursor-pointer font-medium ${
                                        location === loc
                                            ? (theme === "eyeprotect"
                                                ? "border-[#0b5f58] bg-[#0b5f58] text-white font-bold"
                                                : isLight
                                                ? "border-emerald-600 bg-emerald-600 text-white font-bold"
                                                : "border-emerald-400/50 bg-emerald-500/15 text-emerald-200 font-bold")
                                            : (theme === "light"
                                                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-sm"
                                                : theme === "eyeprotect"
                                                ? "border-[#8c8578] bg-[#f5efe6] text-[#1c1917] hover:bg-[#e8dcc8]"
                                                : "border-white/10 text-white/50 hover:border-emerald-400/30 hover:text-emerald-200")
                                    }`}
                                >
                                    {loc}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Optional Specific Job Search Field */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className={`text-xs uppercase tracking-widest flex items-center gap-2 font-bold ${
                                isLight ? (theme === "eyeprotect" ? "text-[#57534e]" : "text-slate-600") : "text-white/40"
                            }`}>
                                <Briefcase className="w-3.5 h-3.5 text-emerald-500" /> Search for a specific job (optional)
                            </label>
                            <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-white/40"}`}>
                                Optional query
                            </span>
                        </div>
                        <input
                            value={jobSearchQuery}
                            onChange={(e) => setJobSearchQuery(e.target.value)}
                            onBlur={handleAutoRefresh}
                            placeholder="Example: Accountant, Marketing Executive, Data Analyst…"
                            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition ${
                                theme === "light"
                                    ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 shadow-sm"
                                    : theme === "eyeprotect"
                                    ? "bg-[#fffcf5] border-[#8c8578] text-[#1c1917] placeholder:text-[#78716c] focus:border-teal-700"
                                    : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-emerald-500/50"
                            }`}
                        />
                        <p className={`text-[11px] mt-1 ${isLight ? "text-slate-500" : "text-white/40"}`}>
                            Leave empty to automatically discover roles derived from your education and career domain.
                        </p>
                    </div>

                    {/* Filter Option Below Location */}
                    <div>
                        <label className={`text-xs uppercase tracking-widest flex items-center justify-between mb-2 font-bold ${
                            isLight ? (theme === "eyeprotect" ? "text-[#57534e]" : "text-slate-600") : "text-white/40"
                        }`}>
                            <span className="flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5 text-emerald-500" /> Filter Experience & Hiring Mode
                            </span>
                            <span className="text-[11px] font-normal opacity-60">
                                {experienceFilter === "all" ? "Showing all" : experienceFilter}
                            </span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                { id: "all", label: "🌟 All Opportunities", desc: "All roles & hiring types" },
                                { id: "intern", label: "🎓 Internships", desc: "Interns & college trainees" },
                                { id: "fresher", label: "🌱 Freshers (0 YOE)", desc: "Entry-level & new grads" },
                                { id: "1year", label: "⚡ 1 Year Exp", desc: "0-1 year experience" },
                                { id: "2year", label: "🚀 2 Years Exp", desc: "1-2 years experience" },
                                { id: "3plus", label: "🔥 3+ Years Exp", desc: "Mid & Senior professionals" },
                                { id: "on_campus", label: "🏫 On-Campus", desc: "University hiring drives" },
                                { id: "off_campus", label: "💼 Off-Campus", desc: "Direct lateral openings" },
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setExperienceFilter(f.id as ExperienceFilter)}
                                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                        experienceFilter === f.id
                                            ? (theme === "eyeprotect"
                                                ? "bg-[#0b5f58]/20 border-[#0b5f58] text-[#0b5f58] shadow-md ring-1 ring-[#0b5f58]"
                                                : isLight
                                                ? "bg-emerald-50 border-emerald-600 text-emerald-700 shadow-md ring-1 ring-emerald-600"
                                                : "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-500")
                                            : (theme === "light"
                                                ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                                : theme === "eyeprotect"
                                                ? "bg-[#f5efe6] border-[#8c8578] text-[#1c1917] hover:bg-[#e8dcc8]"
                                                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white")
                                    }`}
                                >
                                    <span className="block font-bold text-xs">{f.label}</span>
                                    <span className={`text-[10px] leading-tight block mt-0.5 ${isLight ? "text-slate-500" : "opacity-60"}`}>{f.desc}</span>
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
                            type="button"
                            onClick={() => void findMatchingJobs()}
                            disabled={loading || parsing}
                            className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 ${
                                theme === "eyeprotect"
                                    ? "bg-[#0b5f58] hover:bg-[#084842] text-white"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching matching roles…
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" /> {hasSearched ? "Refresh Matching Job Roles" : "Find Matching Job Roles"}
                                </>
                            )}
                        </button>
                    </div>

                    {/* Section 3: Job Application Tracker (Coming Soon) */}
                    <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${
                        theme === "light"
                            ? "bg-amber-50 border-amber-200"
                            : theme === "eyeprotect"
                            ? "bg-[#f5efe6] border-[#8c8578]"
                            : "bg-amber-500/5 border-amber-500/15"
                    }`}>
                        <Briefcase className={`w-4 h-4 shrink-0 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
                        <p className={`text-xs font-semibold ${isLight ? "text-amber-800" : "text-amber-300"}`}>
                            My Job Application Tracker is coming soon!
                        </p>
                    </div>
                    </>
                )}

                {/* Section 2: Matched Job Openings */}
                {step === "results" && (
                    <div className="space-y-3 w-full max-w-full">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold flex items-center gap-2 flex-wrap">
                            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" /> Matched job openings ({filteredJobs.length})
                            {location && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    isLight
                                        ? "bg-slate-100 border-slate-300 text-slate-700"
                                        : "bg-white/5 border-white/10 text-emerald-300"
                                }`}>
                                    {location}
                                </span>
                            )}
                        </h2>
                        <div className="flex items-center gap-2">
                            {loading && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin text-emerald-500" /> Updating…
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                    showFilters
                                        ? (isLight
                                            ? "bg-emerald-600 text-white border-emerald-600"
                                            : "bg-emerald-500/30 text-emerald-300 border-emerald-500/50")
                                        : (isLight
                                            ? "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 shadow-sm"
                                            : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10")
                                }`}
                            >
                                <Filter className="w-3.5 h-3.5" />
                                <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                                {(experienceFilter !== "all" || workModeFilter !== "all") && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className={`p-3 rounded-xl border space-y-3 transition-all ${
                            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-white/5 border-white/10"
                        }`}>
                            {/* Experience Filter */}
                            <div>
                                <p className={`text-[10px] uppercase font-bold mb-1.5 ${isLight ? "text-slate-500" : "text-white/40"}`}>Experience & Hiring Mode</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {([
                                        { value: "all", label: "All" },
                                        { value: "intern", label: "Intern" },
                                        { value: "fresher", label: "Fresher" },
                                        { value: "1year", label: "1 Year" },
                                        { value: "2year", label: "2 Years" },
                                        { value: "3plus", label: "3+ Years" },
                                        { value: "on_campus", label: "On-Campus" },
                                        { value: "off_campus", label: "Off-Campus" },
                                    ] as { value: ExperienceFilter; label: string }[]).map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setExperienceFilter(opt.value)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                                experienceFilter === opt.value
                                                    ? (isLight
                                                        ? "bg-emerald-600 text-white border-emerald-600"
                                                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50")
                                                    : (isLight
                                                        ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                                        : "bg-white/5 text-white/50 border-white/10 hover:border-white/20")
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Work Mode Filter */}
                            <div>
                                <p className={`text-[10px] uppercase font-bold mb-1.5 ${isLight ? "text-slate-500" : "text-white/40"}`}>Work Mode</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {([
                                        { value: "all", label: "All" },
                                        { value: "onsite", label: "On-site" },
                                        { value: "offsite", label: "Off-site" },
                                        { value: "remote", label: "Remote" },
                                    ] as { value: WorkModeFilter; label: string }[]).map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setWorkModeFilter(opt.value)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                                workModeFilter === opt.value
                                                    ? (isLight
                                                        ? "bg-emerald-600 text-white border-emerald-600"
                                                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50")
                                                    : (isLight
                                                        ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                                        : "bg-white/5 text-white/50 border-white/10 hover:border-white/20")
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Clear All */}
                            {(experienceFilter !== "all" || workModeFilter !== "all") && (
                                <button
                                    type="button"
                                    onClick={() => { setExperienceFilter("all"); setWorkModeFilter("all"); setCustomExpYears(""); }}
                                    className={`text-[10px] font-bold underline transition cursor-pointer ${
                                        isLight ? "text-rose-600 hover:text-rose-700" : "text-rose-400 hover:text-rose-300"
                                    }`}
                                >
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    )}

                    {profile && (
                        <div className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1.5 ${isLight ? "bg-white border-slate-200" : "bg-white/5 border-white/5"}`}>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold">Education Domain:</span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 text-[11px]">
                                    {profile.education?.normalizedDegree || profile.education?.degree || profile.primaryDomains?.join(" / ") || "Profile"}
                                </span>
                                {profile.education?.normalizedField && (
                                    <span className="opacity-75 text-[11px]">({profile.education.normalizedField})</span>
                                )}
                            </div>
                            <div className="text-[11px] opacity-80">
                                <span className="font-semibold">Target Job Families: </span>
                                {profile.roles.slice(0, 5).join(", ")}
                            </div>
                            {profile.skills.length > 0 && (
                                <div className="text-[11px] opacity-70">
                                    <span className="font-semibold">Key Skills: </span>
                                    {profile.skills.slice(0, 8).join(", ")}
                                </div>
                            )}
                        </div>
                    )}

                    {webSearches.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl border border-white/5 bg-slate-500/5 mt-2">
                            <span className={`text-xs font-bold ${isLight ? "text-slate-600" : "text-white/50"}`}>
                                External Job Boards:
                            </span>
                            {webSearches.map((link) => (
                                <a
                                    key={link.url}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                        isLight
                                            ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
                                            : "bg-white/5 border-white/10 text-emerald-300 hover:bg-white/10"
                                    }`}
                                >
                                    {link.label} ↗
                                </a>
                            ))}
                        </div>
                    )}

                    {jobs.length === 0 ? (
                        <div className={`p-6 rounded-2xl border text-center ${isLight ? "bg-white border-slate-200" : "bg-white/5 border-white/10"}`}>
                            <p className={`text-sm ${isLight ? "text-slate-500" : "text-white/50"}`}>
                                No strong matches yet. Try entering a broader location (e.g. Remote) or updating the resume details.
                            </p>
                        </div>
                    ) : filteredJobs.length === 0 ? (
                        <div className={`p-6 rounded-2xl border text-center ${isLight ? "bg-white border-slate-200" : "bg-white/5 border-white/10"}`}>
                            <p className={`text-sm ${isLight ? "text-slate-500" : "text-white/50"}`}>
                                No job openings match your selected filters. Try clearing your filters or choosing a different combination.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-3 w-full max-w-full">
                            {filteredJobs.map((job) => (
                                <div
                                    key={job.id}
                                    className={`rounded-2xl border p-4 transition w-full max-w-full overflow-hidden ${
                                        theme === "light"
                                            ? "bg-white border-slate-200 shadow-sm"
                                            : theme === "eyeprotect"
                                            ? "bg-[#fffcf5] border-[#8c8578]"
                                            : "bg-white/5 border-white/10"
                                    }`}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3 w-full">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-semibold text-sm">
                                                    {job.role} · {job.company}
                                                </h3>
                                                {typeof job.matchPercent === "number" && (
                                                    <span className={`text-[10px] rounded-md px-1.5 py-0.5 font-bold ${
                                                        isLight ? "bg-emerald-100 text-emerald-800" : "bg-emerald-500/15 text-emerald-300"
                                                    }`}>
                                                        {job.matchPercent}% match
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-white/50"}`}>
                                                {job.location} · {job.type}
                                                {job.remote ? " · Remote ok" : ""}
                                                {job.salaryRange ? ` · ${job.salaryRange}` : ""}
                                                {job.source ? ` · via ${job.source}` : ""}
                                            </p>
                                            <p className={`text-xs mt-2 ${isLight ? "text-slate-700" : "text-white/70"}`}>{job.description}</p>
                                            
                                            {job.matchReasons && job.matchReasons.length > 0 && (
                                                <div className={`mt-2.5 p-2 rounded-xl border text-[11px] ${
                                                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/5"
                                                }`}>
                                                    <span className="font-bold text-[10px] uppercase tracking-wider block mb-1 opacity-70">
                                                        Why this job matches:
                                                    </span>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
                                                        {job.matchReasons.map((reason, idx) => (
                                                            <div key={idx} className="flex items-start gap-1 leading-snug">
                                                                <span className={reason.startsWith("✓") ? "text-emerald-500 font-bold" : reason.startsWith("△") ? "text-amber-500 font-bold" : "opacity-60"}>
                                                                    {reason.startsWith("✓") || reason.startsWith("△") ? "" : "• "}
                                                                </span>
                                                                <span className={reason.startsWith("✓") ? (isLight ? "text-slate-800" : "text-white/80") : isLight ? "text-slate-600" : "text-white/60"}>
                                                                    {reason}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {job.tags.map((t) => (
                                                    <span
                                                        key={t}
                                                        className={`text-[9px] rounded-full border px-2 py-0.5 font-medium ${
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
                                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => void toggleAtsMatch(job)}
                                                className={`inline-flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                                    expandedAts[job.id]
                                                        ? "bg-indigo-600 text-white"
                                                        : theme === "eyeprotect"
                                                        ? "bg-[#e5dfd3] hover:bg-[#d5cebf] text-slate-800"
                                                        : "bg-white/10 hover:bg-white/20 text-white"
                                                }`}
                                            >
                                                <Sparkles className="w-3 h-3 text-indigo-400" />
                                                {expandedAts[job.id] ? "Hide ATS" : "ATS Match"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyWithScorecard(job)}
                                                className={`inline-flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                                    theme === "eyeprotect"
                                                        ? "bg-[#0b5f58] hover:bg-[#084842] text-white"
                                                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                                }`}
                                            >
                                                Apply <ExternalLink className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>

                                    {expandedAts[job.id] && (
                                        <div className={`mt-4 p-4 rounded-xl border ${
                                            isLight ? "border-slate-200 bg-slate-50" : "border-white/5 bg-white/5"
                                        }`}>
                                            {atsMatches[job.id]?.loading ? (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                                    Evaluating Resume vs Job Description...
                                                </div>
                                            ) : atsMatches[job.id]?.error ? (
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                                    <p className="text-red-400 text-xs font-medium">
                                                        {atsMatches[job.id]?.error}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            runAtsMatchForJob(job);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 active:scale-95 transition cursor-pointer self-start sm:self-auto shrink-0 shadow-sm"
                                                        title="Click to retry ATS match calculation"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" /> Recheck ATS Match
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold">ATS Compatibility:</span>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                                                            (atsMatches[job.id]?.matchPercent || 0) >= 80
                                                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                                : (atsMatches[job.id]?.matchPercent || 0) >= 60
                                                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                                                        }`}>
                                                            {atsMatches[job.id]?.matchPercent}% Match
                                                        </span>
                                                    </div>

                                                    {atsMatches[job.id]?.sectionAdvice && (atsMatches[job.id]?.sectionAdvice?.length || 0) > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-indigo-400 mb-1 flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Resume Optimization Tips:
                                                            </h4>
                                                            <ul className="list-disc pl-4 space-y-1 text-xs">
                                                                {atsMatches[job.id]?.sectionAdvice?.map((advice, i) => (
                                                                    <li key={i}>{advice}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {atsMatches[job.id]?.keywordGaps && (atsMatches[job.id]?.keywordGaps?.length || 0) > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-red-400 mb-1 flex items-center gap-1">
                                                                <XCircle className="w-3.5 h-3.5" />
                                                                Missing Keywords (Gaps):
                                                            </h4>
                                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                                {atsMatches[job.id]?.keywordGaps?.map((gap, i) => (
                                                                    <span key={i} className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md font-medium">
                                                                        {gap}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {atsMatches[job.id]?.keywordHits && (atsMatches[job.id]?.keywordHits?.length || 0) > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Matching Keywords (Hits):
                                                            </h4>
                                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                                {atsMatches[job.id]?.keywordHits?.map((hit, i) => (
                                                                    <span key={i} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-medium">
                                                                        {hit}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                )}



            </div>
        </div>
    );
}
