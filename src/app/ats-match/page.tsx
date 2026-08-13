"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileSearch, Loader2, Moon, Sun, Eye, FileUp, UserCheck, Trash2, X, Image as ImageIcon } from "lucide-react";

export default function AtsMatchPage() {
    const [resumeText, setResumeText] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [company, setCompany] = useState("");
    const [role, setRole] = useState("");
    const [resumeFileName, setResumeFileName] = useState("");
    const [jdFileName, setJdFileName] = useState("");
    const [parsing, setParsing] = useState(false);
    const [parsingJd, setParsingJd] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");

    useEffect(() => {
        Promise.resolve().then(() => {
            const savedTheme = localStorage.getItem("prointerview_theme") as "dark" | "light" | "eyeprotect" | null;
            if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
                setTheme(savedTheme);
            }

            const storedText = localStorage.getItem("atsMatch_resumeText");
            const storedName = localStorage.getItem("atsMatch_resumeFileName");
            if (storedText) {
                setResumeText(storedText);
                if (storedName) setResumeFileName(storedName);
            }

            const storedJd = localStorage.getItem("atsMatch_jobDescription");
            const storedJdName = localStorage.getItem("atsMatch_jdFileName");
            if (storedJd) {
                setJobDescription(storedJd);
                if (storedJdName) setJdFileName(storedJdName);
            }
        });
    }, []);

    useEffect(() => {
        if (resumeText) {
            localStorage.setItem("atsMatch_resumeText", resumeText);
        } else {
            localStorage.removeItem("atsMatch_resumeText");
        }
        if (resumeFileName) {
            localStorage.setItem("atsMatch_resumeFileName", resumeFileName);
        } else {
            localStorage.removeItem("atsMatch_resumeFileName");
        }
    }, [resumeText, resumeFileName]);

    useEffect(() => {
        if (jobDescription) {
            localStorage.setItem("atsMatch_jobDescription", jobDescription);
        } else {
            localStorage.removeItem("atsMatch_jobDescription");
        }
        if (jdFileName) {
            localStorage.setItem("atsMatch_jdFileName", jdFileName);
        } else {
            localStorage.removeItem("atsMatch_jdFileName");
        }
    }, [jobDescription, jdFileName]);

    const isLight = theme === "light" || theme === "eyeprotect";

    const cycleTheme = () => {
        const next = theme === "dark" ? "light" : theme === "light" ? "eyeprotect" : "dark";
        setTheme(next);
        localStorage.setItem("prointerview_theme", next);
        document.documentElement.classList.remove("theme-dark", "theme-light", "theme-eyeprotect");
        document.documentElement.classList.add(`theme-${next}`);
    };

    async function onResumeFile(file: File | null) {
        if (!file) return;
        setError("");
        setParsing(true);
        setResumeFileName(file.name);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            let data: any = {};
            try {
                data = await res.json();
            } catch {
                throw new Error(`Server returned status ${res.status}. Could not parse file output.`);
            }
            if (!res.ok) throw new Error(data.error || "Failed to parse resume");
            const text = String(data.text || "").trim();
            if (!text || text.length < 40) {
                throw new Error("Could not extract enough text from file.");
            }
            setResumeText(text);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Upload failed");
            setResumeFileName("");
        } finally {
            setParsing(false);
        }
    }

    async function fetchProfileResume() {
        setError("");
        setParsing(true);
        try {
            // 1. Check all local storage keys
            let text =
                localStorage.getItem("userResumeCvText") ||
                localStorage.getItem("resumeCvText") ||
                localStorage.getItem("resumeText") ||
                "";
            let name =
                localStorage.getItem("userResumeCvName") ||
                localStorage.getItem("resumeCvName") ||
                localStorage.getItem("resumeFileName") ||
                "";

            if (!text) {
                try {
                    const profileRaw = localStorage.getItem("prointerview_user_profile");
                    if (profileRaw) {
                        const parsed = JSON.parse(profileRaw);
                        text = parsed.resumeCvText || parsed.resumeText || "";
                        name = name || parsed.resumeCvName || parsed.resumeFileName || "";
                    }
                } catch {
                    /* ignore json parse error */
                }
            }

            // 2. Fallback to /api/auth/profile if missing from localStorage
            if (!text) {
                const identifier =
                    localStorage.getItem("userIdentifier") ||
                    localStorage.getItem("userEmail") ||
                    "";
                if (identifier) {
                    const res = await fetch(`/api/auth/profile?identifier=${encodeURIComponent(identifier)}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.user?.resumeCvText) {
                            text = data.user.resumeCvText;
                            name = name || data.user.resumeCvName || "Profile_Resume.pdf";
                            localStorage.setItem("userResumeCvText", text);
                            if (name) localStorage.setItem("userResumeCvName", name);
                        }
                    }
                }
            }

            if (text && text.trim()) {
                setResumeText(text.trim());
                setResumeFileName(name || "Profile_Resume");
                localStorage.setItem("atsMatch_resumeText", text.trim());
                if (name) localStorage.setItem("atsMatch_resumeFileName", name);
            } else {
                throw new Error("No saved resume found in your account profile. Please upload a resume first or add one in Profile Settings.");
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to fetch profile resume");
        } finally {
            setParsing(false);
        }
    }

    function clearResume() {
        setResumeText("");
        setResumeFileName("");
        localStorage.removeItem("atsMatch_resumeText");
        localStorage.removeItem("atsMatch_resumeFileName");
    }

    async function onJdFile(file: File | null) {
        if (!file) return;
        setError("");
        setParsingJd(true);
        setJdFileName(file.name);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            let data: any = {};
            try {
                data = await res.json();
            } catch {
                throw new Error(`Server returned status ${res.status}. Could not parse job description file.`);
            }
            if (!res.ok) throw new Error(data.error || "Failed to parse job description file");
            const text = String(data.text || "").trim();
            if (!text || text.length < 10) {
                throw new Error("Could not extract enough text from file or image.");
            }
            setJobDescription(text);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "JD upload failed");
            setJdFileName("");
        } finally {
            setParsingJd(false);
        }
    }

    function clearJd() {
        setJobDescription("");
        setJdFileName("");
        localStorage.removeItem("atsMatch_jobDescription");
        localStorage.removeItem("atsMatch_jdFileName");
    }

    function handleBackToLabs() {
        setResumeText("");
        setResumeFileName("");
        setJobDescription("");
        setJdFileName("");
        setCompany("");
        setRole("");
        setResult(null);
        setError("");

        localStorage.removeItem("atsMatch_resumeText");
        localStorage.removeItem("atsMatch_resumeFileName");
        localStorage.removeItem("atsMatch_jobDescription");
        localStorage.removeItem("atsMatch_jdFileName");
    }

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
                <div className="mb-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] sm:text-xs uppercase tracking-widest flex items-center gap-1.5 font-bold ${isLight ? "text-sky-700" : "text-sky-300/80"}`}>
                            <FileSearch className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> ATS match
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
                            <button
                                suppressHydrationWarning
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

                            <Link
                                href="/labs"
                                onClick={handleBackToLabs}
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
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">JD vs resume score</h1>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3 mb-3">
                    <input
                        suppressHydrationWarning
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
                        suppressHydrationWarning
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
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Resume Column */}
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className={`text-xs uppercase tracking-wide font-bold ${isLight ? "text-slate-700" : "text-white/60"}`}>
                                Resume
                            </label>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <label className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                    theme === "eyeprotect"
                                        ? "bg-[#0b5f58]/15 border-[#084842]/30 text-[#0b5f58] hover:bg-[#0b5f58]/25"
                                        : isLight
                                        ? "bg-sky-100 border-sky-300 text-sky-800 hover:bg-sky-200 shadow-sm"
                                        : "bg-sky-500/20 border-sky-400/30 text-sky-200 hover:bg-sky-500/30"
                                }`}>
                                    <input
                                        type="file"
                                        accept=".pdf,.txt,.doc,.docx"
                                        className="hidden"
                                        onChange={(ev) => void onResumeFile(ev.target.files?.[0] || null)}
                                    />
                                    {parsing ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Parsing…</span>
                                        </>
                                    ) : (
                                        <>
                                            <FileUp className="w-3.5 h-3.5 shrink-0" />
                                            <span>Upload resume</span>
                                        </>
                                    )}
                                </label>
                                <button
                                    suppressHydrationWarning
                                    type="button"
                                    onClick={() => void fetchProfileResume()}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                        theme === "eyeprotect"
                                            ? "bg-[#8c8578]/15 border-[#8c8578]/30 text-[#1c1917] hover:bg-[#8c8578]/25"
                                            : isLight
                                            ? "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200 shadow-sm"
                                            : "bg-white/10 border-white/15 text-white hover:bg-white/20"
                                    }`}
                                    title="Fetch saved resume from your account profile"
                                >
                                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span>Fetch profile resume</span>
                                </button>
                                {(resumeText || resumeFileName) && (
                                    <button
                                        suppressHydrationWarning
                                        type="button"
                                        onClick={clearResume}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                            isLight
                                                ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 shadow-sm"
                                                : "bg-rose-500/20 border-rose-400/30 text-rose-200 hover:bg-rose-500/30"
                                        }`}
                                        title="Delete / clear current resume"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                        <span>Delete resume</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {resumeFileName && (
                            <div className="flex items-center justify-between gap-2 px-1">
                                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    Loaded file: {resumeFileName}
                                </p>
                                <button
                                    type="button"
                                    onClick={clearResume}
                                    className="text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                                    title="Delete this loaded file"
                                >
                                    <X className="w-3.5 h-3.5" /> Delete
                                </button>
                            </div>
                        )}

                        <textarea
                            suppressHydrationWarning
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                            placeholder="Paste resume text or upload resume above…"
                            className={`w-full h-[260px] sm:h-[300px] overflow-y-auto rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none transition ${
                                isLight
                                    ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                    : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-sky-500/50"
                            }`}
                        />
                    </div>

                    {/* Job Description Column */}
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className={`text-xs uppercase tracking-wide font-bold ${isLight ? "text-slate-700" : "text-white/60"}`}>
                                Job Description
                            </label>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {/* Upload PDF / Doc */}
                                <label className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                    theme === "eyeprotect"
                                        ? "bg-[#0b5f58]/15 border-[#084842]/30 text-[#0b5f58] hover:bg-[#0b5f58]/25"
                                        : isLight
                                        ? "bg-sky-100 border-sky-300 text-sky-800 hover:bg-sky-200 shadow-sm"
                                        : "bg-sky-500/20 border-sky-400/30 text-sky-200 hover:bg-sky-500/30"
                                }`}>
                                    <input
                                        type="file"
                                        accept=".pdf,.txt,.doc,.docx"
                                        className="hidden"
                                        onChange={(ev) => void onJdFile(ev.target.files?.[0] || null)}
                                    />
                                    {parsingJd ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Parsing…</span>
                                        </>
                                    ) : (
                                        <>
                                            <FileUp className="w-3.5 h-3.5 shrink-0" />
                                            <span>PDF / Doc</span>
                                        </>
                                    )}
                                </label>

                                {/* Upload Image / Screenshot */}
                                <label className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                    theme === "eyeprotect"
                                        ? "bg-[#8c8578]/15 border-[#8c8578]/30 text-[#1c1917] hover:bg-[#8c8578]/25"
                                        : isLight
                                        ? "bg-violet-100 border-violet-300 text-violet-800 hover:bg-violet-200 shadow-sm"
                                        : "bg-violet-500/20 border-violet-400/30 text-violet-200 hover:bg-violet-500/30"
                                }`}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(ev) => void onJdFile(ev.target.files?.[0] || null)}
                                    />
                                    {parsingJd ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>OCR…</span>
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                                            <span>Image / Screenshot</span>
                                        </>
                                    )}
                                </label>

                                {(jobDescription || jdFileName) && (
                                    <button
                                        suppressHydrationWarning
                                        type="button"
                                        onClick={clearJd}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                            isLight
                                                ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 shadow-sm"
                                                : "bg-rose-500/20 border-rose-400/30 text-rose-200 hover:bg-rose-500/30"
                                        }`}
                                        title="Delete / clear current Job Description"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                        <span>Delete JD</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {jdFileName && (
                            <div className="flex items-center justify-between gap-2 px-1">
                                <p className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                                    Loaded JD: {jdFileName}
                                </p>
                                <button
                                    type="button"
                                    onClick={clearJd}
                                    className="text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                                    title="Delete this loaded Job Description file"
                                >
                                    <X className="w-3.5 h-3.5" /> Delete
                                </button>
                            </div>
                        )}

                        <textarea
                            suppressHydrationWarning
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Paste job description text here or upload PDF/Doc/Image screenshot above…"
                            className={`w-full h-[260px] sm:h-[300px] overflow-y-auto rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none transition ${
                                isLight
                                    ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm"
                                    : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-sky-500/50"
                            }`}
                        />
                    </div>
                </div>
                <button
                    suppressHydrationWarning
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
