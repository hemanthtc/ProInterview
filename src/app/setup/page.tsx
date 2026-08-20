"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { UploadCloud, FileText, Loader2, Globe, Cpu, ArrowLeft, Sparkles } from "lucide-react";
import CompanySelect from "../../components/CompanySelect";
import RoleSelect from "../../components/RoleSelect";
import { getStorageItem, setStorageItem, removeStorageItem, getInterviewResumeText } from "../../utils/storage";

export default function SetupPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [portfolioUrl, setPortfolioUrl] = useState("");
    const [resumeCvName, setResumeCvName] = useState("");
    const [resumeCvText, setResumeCvText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [level, setLevel] = useState("intermediate");
    const [provider, setProvider] = useState("gemini");
    const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
    const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
    const [isRealisticMode, setIsRealisticMode] = useState(false);
    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");
    const isLight = theme === "light" || theme === "eyeprotect";
    const [isAuthChecked, setIsAuthChecked] = useState(false);
    const [companyCloneMode, setCompanyCloneMode] = useState(true);
    const [hrPersonaPreview, setHrPersonaPreview] = useState<{ name?: string; title?: string } | null>(null);
    const [voiceLanguage, setVoiceLanguage] = useState("en-IN");
    const [campusPath, setCampusPath] = useState("onCampus");
    const router = useRouter();

    const [hasAccountPortfolio, setHasAccountPortfolio] = useState(false);
    const [hasAccountResume, setHasAccountResume] = useState(false);
    const hasManualFiles = files.length > 0;
    const hasAnyInput = hasManualFiles || hasAccountPortfolio || hasAccountResume || portfolioUrl.trim().length > 0;

    const extractAndSyncLinks = (text: string) => {
        if (!text || !text.trim()) return;

        // GitHub URL regex (only if userGithub is currently empty)
        const currentGithub = getStorageItem("userGithub") || "";
        if (!currentGithub.trim()) {
            const githubRegex = /https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_.-]+/i;
            const githubMatch = text.match(githubRegex);
            if (githubMatch) {
                const detected = githubMatch[0].trim();
                setStorageItem("userGithub", detected);
            }
        }

        // LinkedIn URL regex (only if userLinkedin is currently empty)
        const currentLinkedin = getStorageItem("userLinkedin") || "";
        if (!currentLinkedin.trim()) {
            const linkedinRegex = /https?:\/\/(?:www\.)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[a-zA-Z0-9_.-]+/i;
            const linkedinMatch = text.match(linkedinRegex);
            if (linkedinMatch) {
                const detected = linkedinMatch[0].trim();
                setStorageItem("userLinkedin", detected);
            }
        }

        // Portfolio URL regex (only if portfolioUrl state is currently empty)
        if (!portfolioUrl.trim()) {
            const urlRegex = /https?:\/\/[^\s$.?#].[^\s]*/gi;
            const matches = text.match(urlRegex);
            if (matches) {
                const portfolioMatch = matches.find(url => {
                    const u = url.toLowerCase();
                    return !u.includes("github.com") && !u.includes("linkedin.com") && !u.match(/\.(png|jpg|jpeg|gif|pdf|zip|txt)$/i);
                });
                if (portfolioMatch) {
                    const detected = portfolioMatch.trim();
                    setPortfolioUrl(detected);
                    setStorageItem("userPortfolio", detected);
                }
            }
        }
    };

    useEffect(() => {
        const isLoggedIn = getStorageItem("userLoggedIn") === "true";
        if (!isLoggedIn) {
            router.push("/login");
            return;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsAuthChecked(true);

        setIsRealisticMode(getStorageItem("globalInterviewMode") === "realistic");
        
        const savedTheme = localStorage.getItem("globalTheme") as any || "dark";
        setTheme(savedTheme);
        document.documentElement.className = savedTheme === "eyeprotect" ? "theme-light theme-eyeprotect" : `theme-${savedTheme}`;
        document.documentElement.style.colorScheme = savedTheme === "eyeprotect" ? "light" : savedTheme;

        try {
            const rawHr = getStorageItem("activeHrIntel");
            if (rawHr) {
                const intel = JSON.parse(rawHr);
                setHrPersonaPreview({
                    name: intel.interviewerName || intel.name,
                    title: intel.titleGuess || intel.title,
                });
            }
        } catch { /* ignore */ }

        setTargetCompanies([]);
        setPreferredRoles([]);
        setCompanyCloneMode(getStorageItem("companyCloneMode") !== "false");
        setCampusPath(getStorageItem("campusPath") || "onCampus");

        const fetchUserProfile = async () => {
            try {
                const res = await fetch("/api/auth/profile");
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.user) {
                        const u = data.user;
                        const hasAccountRes = Boolean(u.resumeCvText && u.resumeCvText.trim() && u.resumeCvName && u.resumeCvName.trim());

                        setStorageItem("userPortfolio", u.portfolioUrl || "");
                        setStorageItem("userResumeCvName", u.resumeCvName || "");
                        setStorageItem("userResumeCvText", u.resumeCvText || "");
                        setStorageItem("userGithub", u.github || "");
                        setStorageItem("userLinkedin", u.linkedin || "");
                        
                        setPortfolioUrl(u.portfolioUrl || "");
                        setResumeCvName(u.resumeCvName || "");
                        setResumeCvText(u.resumeCvText || "");
                        setHasAccountPortfolio(Boolean(u.portfolioUrl && u.portfolioUrl.trim()));
                        setHasAccountResume(hasAccountRes);

                        if (u.resumeCvText) {
                            extractAndSyncLinks(u.resumeCvText);
                        }

                        if (!hasAccountRes) {
                            removeStorageItem("resumeText");
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch fresh user profile:", err);
            }
        };

        fetchUserProfile();

        const syncFromAccountDetails = () => {
            const portfolio = getStorageItem("userPortfolio") || "";
            const accountResumeText = getStorageItem("userResumeCvText") || "";
            const accountResumeName = getStorageItem("userResumeCvName") || "";
            
            const hasActualAccountResume = accountResumeText.trim().length > 0 && accountResumeName.trim().length > 0;

            setPortfolioUrl(portfolio);
            setResumeCvName(hasActualAccountResume ? accountResumeName : "");
            setResumeCvText(hasActualAccountResume ? accountResumeText : "");
            setHasAccountPortfolio(portfolio.trim().length > 0);
            setHasAccountResume(hasActualAccountResume);

            if (!hasActualAccountResume) {
                removeStorageItem("resumeText");
            }
        };

        syncFromAccountDetails();

        const handleStorageSync = (event: Event) => {
            const detail = (event as CustomEvent<{ key?: string }>).detail;
            const keysToSync = new Set([
                "userPortfolio",
                "userResumeCvName",
                "userResumeCvText",
                "savedResumesDatabase",
                "activeResumeId",
                "userGithub",
                "userLinkedin",
                "userPhone",
                "userAdditionalEmail",
                "userEducation",
                "userEducationData",
            ]);

            if (detail?.key && keysToSync.has(detail.key)) {
                syncFromAccountDetails();
            }
        };

        window.addEventListener("ai-storage-change", handleStorageSync as EventListener);
        return () => window.removeEventListener("ai-storage-change", handleStorageSync as EventListener);
    }, []);

    const parseManualFiles = async (selectedFiles: File[]) => {
        setLoading(true);
        setError("");
        try {
            const formData = new FormData();
            selectedFiles.forEach((f) => formData.append("file", f));
            
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to parse files.");
            
            const parsedText = data.text || "";
            setResumeCvText(parsedText);
            setStorageItem("resumeText", parsedText);
            extractAndSyncLinks(parsedText);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
            setFiles(droppedFiles);
            setError("");
            parseManualFiles(droppedFiles);
        } else {
            setError("Please upload valid files.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 0) {
            setFiles(selectedFiles);
            setError("");
            parseManualFiles(selectedFiles);
        }
    };

    const handleCancel = () => {
        // Clear setup progress and pre-analysis results
        removeStorageItem("portfolioRating");
        removeStorageItem("portfolioAnalysisResult");
        removeStorageItem("targetCompany");
        removeStorageItem("preferredRoles");
        removeStorageItem("resumeText");
        router.push("/");
    };

    const handleStart = async () => {
        if (!hasAnyInput) {
            setError("Please upload a resume, use the saved Resume/CV, or provide a portfolio URL.");
            return;
        }
        setLoading(true);

        try {
            let extractedText = resumeCvText;

            if (!extractedText.trim()) {
                extractedText = getInterviewResumeText() || "";
            }

            if (!extractedText.trim() && files.length > 0) {
                const formData = new FormData();
                files.forEach((f) => formData.append("file", f));
                if (portfolioUrl.trim()) formData.append("portfolioUrl", portfolioUrl.trim());

                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to parse resume");
                }

                extractedText = data.text || "";
                setResumeCvText(extractedText);
            }

            const github = getStorageItem("userGithub") || "";
            const linkedin = getStorageItem("userLinkedin") || "";
            const portfolio = portfolioUrl.trim() || getStorageItem("userPortfolio") || "";
            const hasPortfolio = Boolean(github || linkedin || portfolio || hasManualFiles);

            if (!extractedText.trim() && !hasPortfolio) {
                throw new Error("No resume or portfolio details found. Please provide at least one source (upload a resume/CV or add a portfolio link) to run the interview.");
            }

            // Read global mode from cached home screen toggle
            const globalMode = getStorageItem("globalInterviewMode") || "technical";
            setStorageItem("resumeText", extractedText);
            setStorageItem("interviewLevel", level);
            setStorageItem("interviewType", globalMode);
            setStorageItem("aiProvider", provider);
            setStorageItem("voiceLanguage", voiceLanguage);
            if (portfolioUrl.trim()) {
                setStorageItem("userPortfolio", portfolioUrl.trim());
            }
            
            const finalCompany = targetCompanies.length > 0 ? targetCompanies.join(", ") : "Generic Tech Company";
            const finalRoles = preferredRoles.length > 0 ? preferredRoles.join(", ") : "Software Engineer";
            
            setStorageItem("targetCompany", finalCompany);
            setStorageItem("preferredRoles", finalRoles);
            setStorageItem("portfolioScoringEnabled", "false");
            setStorageItem("companyCloneMode", companyCloneMode ? "true" : "false");
            setStorageItem("campusPath", campusPath);

            removeStorageItem("resumeFromPaused"); // ensure fresh start
            
            if (globalMode === "realistic") {
                router.push("/realistic-interview");
            } else {
                router.push("/interview");
            }

        } catch (err: unknown) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthChecked) return null;

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 py-8 sm:py-12 transition-colors duration-300 ${
            theme === "light"
                ? "bg-slate-100 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-slate-950 text-white"
        }`}>
            <div className={`max-w-xl w-full p-5 sm:p-8 rounded-2xl border shadow-2xl transition-colors ${
                theme === "light"
                    ? "bg-white border-slate-200 shadow-slate-200/50 text-slate-900"
                    : theme === "eyeprotect"
                    ? "bg-[#fffcf5] border-[#8c8578] text-[#1c1917]"
                    : "bg-[#111] border-white/10 text-white"
            }`}>

                <div className="flex items-center justify-between gap-4 mb-6">
                    <button
                        onClick={() => router.push(isRealisticMode ? "/" : "/features")}
                        className={`group flex items-center gap-2 font-medium text-sm transition-colors ${
                            isLight ? "text-slate-600 hover:text-slate-900" : "text-white/50 hover:text-white"
                        }`}
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Back</span>
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


                <h2 className="text-3xl font-bold mb-2">Upload Resume</h2>
                <p className={`mb-8 text-sm ${isLight ? (theme === "eyeprotect" ? "text-[#57534e]" : "text-slate-600") : "text-white/50"}`}>
                    Upload your resume so the AI can tailor the interview questions to your experience.
                </p>

                {!hasAccountResume && (
                    <div className={`mb-6 rounded-xl border px-4 py-3 text-sm transition-all ${
                        theme === "light"
                            ? "bg-amber-50 border-amber-200 text-amber-800"
                            : theme === "eyeprotect"
                            ? "bg-[#fffbeb] border-[#f59e0b]/30 text-[#b45309]"
                            : "bg-amber-500/10 border-amber-500/25 text-amber-200"
                    }`}>
                        <p className={`font-semibold ${theme === "light" ? "text-amber-950" : theme === "eyeprotect" ? "text-[#78350f]" : "text-amber-100"}`}>
                            Resume is not present, please upload
                        </p>
                        <p className={`text-xs mt-1 ${theme === "light" ? "text-amber-800/80" : theme === "eyeprotect" ? "text-[#b45309]/80" : "text-amber-200/70"}`}>
                            Account resume is not detected. Please upload your resume file to configure the session.
                        </p>
                    </div>
                )}

                {hrPersonaPreview?.name && (
                    <div className="mb-6 rounded-xl border border-teal-500/25 bg-teal-500/10 px-4 py-3 text-sm text-teal-100">
                        <p className="font-semibold text-teal-200">
                            Mocking as {hrPersonaPreview.name}
                            {hrPersonaPreview.title ? ` · ${hrPersonaPreview.title}` : ""}
                        </p>
                        <p className="text-xs text-teal-200/70 mt-1">
                            Happenstance interviewer intel is loaded for this session.
                        </p>
                    </div>
                )}

                <div className={`mb-6 flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
                    theme === "light"
                        ? "bg-slate-50 border-slate-200 text-slate-900"
                        : theme === "eyeprotect"
                        ? "bg-[#f5efe6] border-[#8c8578] text-[#1c1917]"
                        : "bg-white/5 border-white/10 text-white"
                }`}>
                    <div>
                        <p className="text-sm font-semibold">Company clone mode</p>
                        <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-white/45"}`}>Match interview style to the target company bank.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCompanyCloneMode((v) => !v)}
                        className={`relative h-8 w-14 rounded-full transition-colors cursor-pointer ${
                            companyCloneMode
                                ? (theme === "eyeprotect" ? "bg-[#0b5f58]" : "bg-indigo-600")
                                : (isLight ? "bg-slate-300" : "bg-white/15")
                        }`}
                        aria-pressed={companyCloneMode}
                    >
                        <span
                            className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white transition-transform ${companyCloneMode ? "translate-x-6" : "translate-x-0"}`}
                        />
                    </button>
                    <span className={`text-xs font-bold uppercase tracking-wide w-10 text-right ${isLight ? "text-slate-600" : "text-white/60"}`}>
                        {companyCloneMode ? "On" : "Off"}
                    </span>
                </div>

                {resumeCvName && (
                    <div 
                        className="mb-6 rounded-xl border px-4 py-3 text-sm transition-colors font-medium"
                        style={{
                            backgroundColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.1)' : theme === 'eyeprotect' ? '#f5efe6' : '#e0e7ff',
                            borderColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.2)' : theme === 'eyeprotect' ? '#8c8578' : '#c7d2fe',
                            color: theme === 'dark' ? '#c7d2fe' : theme === 'eyeprotect' ? '#1c1917' : '#312e81'
                        }}
                    >
                        Saved Resume / CV detected from your account: <span className="font-semibold">{resumeCvName}</span>
                    </div>
                )}

                <div className="mb-6">
                    <label className={`text-sm font-semibold flex items-center gap-2 mb-2 ${isLight ? "text-slate-800" : "text-white/80"}`}>
                        <Globe className={`w-4 h-4 ${isLight ? "text-slate-500" : "text-white/60"}`}/> Portfolio Website URL
                    </label>
                    <input
                        type="url"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        placeholder="https://your-website.com"
                        className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none transition-colors ${
                            theme === "light"
                                ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 shadow-sm"
                                : theme === "eyeprotect"
                                ? "bg-[#f5efe6] border-[#8c8578] text-[#1c1917] placeholder:text-[#78716c] focus:border-teal-700"
                                : "bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-indigo-500"
                        }`}
                    />
                </div>
                
                {hasAccountResume || hasManualFiles ? (
                    <div 
                        className="mb-6 rounded-xl border px-4 py-3 text-sm transition-colors font-medium"
                        style={{
                            backgroundColor: theme === 'dark' 
                                ? (hasManualFiles ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)')
                                : theme === 'eyeprotect' ? '#f5efe6'
                                : (hasManualFiles ? '#e0e7ff' : '#d1fae5'),
                            borderColor: theme === 'dark'
                                ? (hasManualFiles ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)')
                                : theme === 'eyeprotect' ? '#8c8578'
                                : (hasManualFiles ? '#c7d2fe' : '#a7f3d0'),
                            color: theme === 'dark'
                                ? (hasManualFiles ? '#c7d2fe' : '#a7f3d0')
                                : theme === 'eyeprotect' ? '#1c1917'
                                : (hasManualFiles ? '#312e81' : '#064e3b')
                        }}
                    >
                        {hasManualFiles ? (
                            "New resume file(s) selected. They will be parsed and used for this session."
                        ) : (
                            <>Saved Resume / CV detected from your account: <span className="font-semibold">{resumeCvName}</span>. The upload box is not needed unless you want to add more files.</>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-4 my-6 opacity-40">
                            <div className={`h-px flex-1 ${isLight ? "bg-slate-300" : "bg-white"}`}></div>
                            <span className={`text-xs uppercase font-bold tracking-widest ${isLight ? "text-slate-700" : "text-white"}`}>OR Add Files</span>
                            <div className={`h-px flex-1 ${isLight ? "bg-slate-300" : "bg-white"}`}></div>
                        </div>

                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors relative ${
                                theme === "light"
                                    ? "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-indigo-600"
                                    : theme === "eyeprotect"
                                    ? "border-[#8c8578] bg-[#f5efe6] hover:bg-[#e8dcc8] hover:border-teal-700"
                                    : "border-white/20 bg-white/5 hover:bg-white/10"
                            }`}
                        >
                            <input
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                title="Select files, folders, or ZIPs"
                            />
                            {files.length > 0 ? (
                                <div className="flex flex-col items-center text-center">
                                    <FileText className="w-12 h-12 text-indigo-500 mb-4" />
                                    <p className="font-medium text-lg">{files.length} item(s) selected</p>
                                    <p className={`text-sm mt-1 ${isLight ? "text-slate-500" : "text-white/50"}`}>Ready for parsing</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-center">
                                    <UploadCloud className={`w-12 h-12 mb-4 ${isLight ? "text-slate-400" : "text-white/40"}`} />
                                    <p className="font-medium text-lg mb-1">Click or drag and drop</p>
                                    <p className={`text-sm ${isLight ? "text-slate-500" : "text-white/40"}`}>Accepts ZIP, folders, PDF, TXT</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                <div className="mt-8 z-50 relative">
                    <RoleSelect
                        theme={theme}
                        options={[
                            { value: 'Frontend Developer', label: 'Frontend Developer' },
                            { value: 'Backend Developer', label: 'Backend Developer' },
                            { value: 'Full Stack Engineer', label: 'Full Stack Engineer' },
                            { value: 'Data Scientist', label: 'Data Scientist' },
                            { value: 'DevOps Engineer', label: 'DevOps Engineer' },
                            { value: 'UI/UX Designer', label: 'UI/UX Designer' },
                            { value: 'Product Manager', label: 'Product Manager' }
                        ]}
                        maxLimit={3}
                        placeholder="Search or specify up to 3 target roles..."
                        defaultValue={preferredRoles.map((r) => ({ value: r, label: r }))}
                        onChange={(selected: string[]) => setPreferredRoles(selected)}
                    />
                </div>

                <div className="mt-8 z-40 relative">
                    <CompanySelect 
                        theme={theme}
                        options={[
                            { value: 'Google', label: 'Google' },
                            { value: 'Amazon', label: 'Amazon' },
                            { value: 'Microsoft', label: 'Microsoft' },
                            { value: 'Meta', label: 'Meta' },
                            { value: 'Apple', label: 'Apple' },
                            { value: 'TCS', label: 'TCS' },
                            { value: 'Stripe', label: 'Stripe' },
                            { value: 'Uber', label: 'Uber' }
                        ]}
                        maxLimit={3}
                        placeholder="Search or select up to 3 target companies..."
                        defaultValue={targetCompanies.map((c) => ({ value: c, label: c }))}
                        onChange={(selected: string[]) => setTargetCompanies(selected)}
                    />
                </div>



                {!isRealisticMode && (
                    <>
                        <div className="mt-6">
                            <label className={`font-semibold mb-3 block text-sm ${isLight ? "text-slate-800" : "text-white/80"}`}>Select Interview Difficulty</label>
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                {["basic", "intermediate", "advanced"].map((lvl) => (
                                    <button
                                        key={lvl}
                                        type="button"
                                        onClick={() => setLevel(lvl)}
                                        className={`py-3 px-1 rounded-xl border capitalize font-semibold transition-all text-xs sm:text-base truncate cursor-pointer ${
                                            level === lvl
                                                ? (theme === "eyeprotect"
                                                    ? "bg-[#0b5f58] border-[#084842] text-white shadow-lg font-bold"
                                                    : "bg-indigo-600 border-indigo-500 text-white shadow-lg font-bold")
                                                : (theme === "light"
                                                    ? "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                                                    : theme === "eyeprotect"
                                                    ? "bg-[#f5efe6] border-[#8c8578] text-[#1c1917] hover:bg-[#e8dcc8]"
                                                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white")
                                        }`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6">
                            <label className={`font-semibold mb-3 block text-sm ${isLight ? "text-slate-800" : "text-white/80"}`}>Select Campus Path</label>
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                {[
                                    { id: "onCampus", label: "On-Campus" },
                                    { id: "offCampus", label: "Off-Campus" },
                                    { id: "rural", label: "Rural" },
                                ].map((cp) => (
                                    <button
                                        key={cp.id}
                                        type="button"
                                        data-testid={`campus-path-${cp.id}`}
                                        onClick={() => setCampusPath(cp.id)}
                                        className={`py-3 px-1 rounded-xl border font-semibold transition-all text-xs sm:text-base truncate cursor-pointer ${
                                            campusPath === cp.id
                                                ? (theme === "eyeprotect"
                                                    ? "bg-[#0b5f58] border-[#084842] text-white shadow-lg font-bold"
                                                    : "bg-indigo-600 border-indigo-500 text-white shadow-lg font-bold")
                                                : (theme === "light"
                                                    ? "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                                                    : theme === "eyeprotect"
                                                    ? "bg-[#f5efe6] border-[#8c8578] text-[#1c1917] hover:bg-[#e8dcc8]"
                                                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white")
                                        }`}
                                    >
                                        {cp.label}
                                    </button>
                                ))}
                            </div>
                            <p className={`text-xs mt-2 ${isLight ? "text-slate-500" : "text-white/45"}`}>
                                Decides the question style: on-campus (CS fundamentals), off-campus (practical/company-style), or rural (fundamentals-first, encouraging).
                            </p>
                        </div>

                        <div className="mt-8">
                            <label className={`font-semibold mb-3 flex items-center gap-2 text-sm ${isLight ? "text-slate-800" : "text-white/80"}`}>
                                <Cpu className={`w-4 h-4 ${isLight ? "text-indigo-600" : "text-indigo-400"}`}/> Select AI Provider
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {[
                                    { id: "gemini", label: "Google Gemini", desc: "Fast, highly capable." },
                                    { id: "sarvam", label: "Sarvam AI", desc: "Indic TTS + chat (needs SARVAM_API_KEY). Falls back to Gemini if needed." }
                                ].map((prov) => (
                                    <button
                                        key={prov.id}
                                        type="button"
                                        onClick={() => setProvider(prov.id)}
                                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                                            provider === prov.id
                                                ? (theme === "eyeprotect"
                                                    ? "bg-[#0b5f58]/20 border-[#0b5f58] shadow-lg"
                                                    : isLight
                                                    ? "bg-indigo-50 border-indigo-600 shadow-lg"
                                                    : "bg-indigo-600/20 border-indigo-500 shadow-lg")
                                                : (theme === "light"
                                                    ? "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 shadow-sm"
                                                    : theme === "eyeprotect"
                                                    ? "bg-[#f5efe6] border-[#8c8578] text-[#1c1917] hover:bg-[#e8dcc8]"
                                                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white")
                                        }`}
                                    >
                                        <span className={`block font-bold mb-1 ${
                                            provider === prov.id
                                                ? (theme === "eyeprotect" ? "text-[#0b5f58]" : isLight ? "text-indigo-700" : "text-indigo-300")
                                                : (isLight ? "text-slate-900" : "text-white")
                                        }`}>{prov.label}</span>
                                        <span className={`text-xs leading-relaxed block ${isLight ? "text-slate-600" : "opacity-70"}`}>{prov.desc}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-4">
                                <label className={`text-sm font-medium mb-2 block ${isLight ? "text-slate-700 font-semibold" : "text-white/70"}`}>
                                    Interview language / voice locale
                                </label>
                                <select
                                    value={voiceLanguage}
                                    onChange={(e) => setVoiceLanguage(e.target.value)}
                                    className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none transition cursor-pointer font-medium ${
                                        theme === "light"
                                            ? "bg-white border-slate-300 text-slate-900 focus:border-indigo-600 shadow-sm"
                                            : theme === "eyeprotect"
                                            ? "bg-[#fffcf5] border-[#8c8578] text-[#1c1917] focus:border-teal-700"
                                            : "bg-slate-900 border-white/20 text-white focus:border-indigo-500"
                                    }`}
                                >
                                    <option value="en-IN" className={theme === "light" ? "bg-white text-slate-900" : theme === "eyeprotect" ? "bg-[#fffcf5] text-[#1c1917]" : "bg-slate-900 text-white"}>English (India)</option>
                                    <option value="en-US" className={theme === "light" ? "bg-white text-slate-900" : theme === "eyeprotect" ? "bg-[#fffcf5] text-[#1c1917]" : "bg-slate-900 text-white"}>English (US)</option>
                                    <option value="hi-IN" className={theme === "light" ? "bg-white text-slate-900" : theme === "eyeprotect" ? "bg-[#fffcf5] text-[#1c1917]" : "bg-slate-900 text-white"}>Hindi (हिन्दी)</option>
                                    <option value="ta-IN" className={theme === "light" ? "bg-white text-slate-900" : theme === "eyeprotect" ? "bg-[#fffcf5] text-[#1c1917]" : "bg-slate-900 text-white"}>Tamil</option>
                                    <option value="te-IN" className={theme === "light" ? "bg-white text-slate-900" : theme === "eyeprotect" ? "bg-[#fffcf5] text-[#1c1917]" : "bg-slate-900 text-white"}>Telugu</option>
                                    <option value="kn-IN" className={theme === "light" ? "bg-white text-slate-900" : theme === "eyeprotect" ? "bg-[#fffcf5] text-[#1c1917]" : "bg-slate-900 text-white"}>Kannada</option>
                                    <option value="mr-IN" className={theme === "light" ? "bg-white text-slate-900" : theme === "eyeprotect" ? "bg-[#fffcf5] text-[#1c1917]" : "bg-slate-900 text-white"}>Marathi</option>
                                    <option value="bn-IN" className={theme === "light" ? "bg-white text-slate-900" : theme === "eyeprotect" ? "bg-[#fffcf5] text-[#1c1917]" : "bg-slate-900 text-white"}>Bengali</option>
                                </select>
                                <p className={`text-[11px] mt-1 ${isLight ? "text-slate-600" : "text-white/40"}`}>
                                    With Sarvam selected, interview replies use Sarvam TTS when configured; mic recognition uses this locale. Chat falls back to Gemini if Sarvam is unavailable.
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {/* Pre-Interview Scanning Information Box */}
                <div className={`mt-6 p-4 rounded-xl border space-y-2.5 text-xs leading-relaxed ${
                    theme === "light"
                        ? "bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
                        : theme === "eyeprotect"
                        ? "bg-[#f5efe6] border-[#8c8578] text-[#1c1917]"
                        : "bg-white/5 border-white/10 text-white/80"
                }`}>
                    <h3 className="font-bold flex items-center gap-1.5 text-indigo-400">
                        <Sparkles className="w-3.5 h-3.5" /> Pre-Interview Analysis Info
                    </h3>
                    <p>
                        Before starting, the AI will scan and align your custom interview parameters:
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>
                            <span className="font-semibold text-indigo-300">Resume & Portfolio Scan</span>: Analyzes your uploaded Resume/CV and Portfolio URL for key metrics.
                        </li>
                        <li>
                            <span className="font-semibold text-indigo-300">Role & Company Fit</span>: Focuses questions on preferred roles (<span className="italic">{preferredRoles.length > 0 ? preferredRoles.join(", ") : "Not selected yet"}</span>) and target companies (<span className="italic">{targetCompanies.length > 0 ? targetCompanies.join(", ") : "Not selected yet"}</span>).
                        </li>
                        <li>
                            <span className="font-semibold text-indigo-300">Company Clone Mode</span>: {companyCloneMode ? "Enabled — simulates target company's exact interview styling & quality expectations." : "Disabled — standard mock technical interview."}
                        </li>
                        <li>
                            <span className="font-semibold text-indigo-300">Locale & Language</span>: Runs speech recognition & voice synthesis matching <span className="font-bold">{voiceLanguage}</span>.
                        </li>
                    </ul>
                </div>

                {error && <p className="text-red-400 mt-4 text-sm font-semibold">{error}</p>}

                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <button
                        onClick={handleStart}
                        disabled={!hasAnyInput || loading || preferredRoles.length === 0 || targetCompanies.length === 0}
                        className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold flex items-center justify-center transition-all"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Preparing Interview...
                            </>
                        ) : (
                            "Start Interview"
                        )}
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={loading}
                        className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
