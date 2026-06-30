"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Loader2, Globe, Cpu, ArrowLeft } from "lucide-react";
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
    const router = useRouter();

    const [hasAccountPortfolio, setHasAccountPortfolio] = useState(false);
    const [hasAccountResume, setHasAccountResume] = useState(false);
    const hasManualFiles = files.length > 0;
    const hasAnyInput = hasManualFiles || hasAccountPortfolio || hasAccountResume || portfolioUrl.trim().length > 0;

    useEffect(() => {
        setIsRealisticMode(getStorageItem("globalInterviewMode") === "realistic");

        const syncFromAccountDetails = () => {
            const portfolio = getStorageItem("userPortfolio") || "";
            const resumeText = getStorageItem("userResumeCvText") || getInterviewResumeText() || "";
            setPortfolioUrl(portfolio);
            setResumeCvName(getStorageItem("userResumeCvName") || "");
            setResumeCvText(resumeText);
            setHasAccountPortfolio(portfolio.trim().length > 0);
            setHasAccountResume(resumeText.trim().length > 0);
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

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
            setFiles(droppedFiles);
            setError("");
        } else {
            setError("Please upload valid files.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 0) {
            setFiles(selectedFiles);
            setError("");
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

            if (hasManualFiles || hasAccountPortfolio) {
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
            }

            if (!extractedText.trim()) {
                throw new Error("No resume content available. Upload a resume/CV or add it in your profile.");
            }

            // Read global mode from cached home screen toggle
            const globalMode = getStorageItem("globalInterviewMode") || "technical";
            setStorageItem("resumeText", extractedText);
            setStorageItem("interviewLevel", level);
            setStorageItem("interviewType", globalMode);
            setStorageItem("aiProvider", provider);
            
            const finalCompany = targetCompanies.length > 0 ? targetCompanies.join(", ") : "Generic Tech Company";
            const finalRoles = preferredRoles.length > 0 ? preferredRoles.join(", ") : "Software Engineer";
            
            setStorageItem("targetCompany", finalCompany);
            setStorageItem("preferredRoles", finalRoles);
            setStorageItem("portfolioScoringEnabled", "false");

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

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 py-12">
            <div className="max-w-xl w-full bg-[#111] p-8 rounded-2xl border border-white/10 shadow-2xl">

                <button
                    onClick={() => router.push(isRealisticMode ? "/" : "/features")}
                    className="group flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Back</span>
                </button>

                <h2 className="text-3xl font-bold mb-2">Upload Resume</h2>
                <p className="text-white/50 mb-8">
                    Upload your resume so the AI can tailor the interview questions to your experience.
                </p>

                {resumeCvName && (
                    <div className="mb-6 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
                        Saved Resume / CV detected from your account: <span className="font-semibold">{resumeCvName}</span>
                    </div>
                )}

                <div className="mb-6">
                    <label className="text-sm font-semibold text-white/80 flex items-center gap-2 mb-2"><Globe className="w-4 h-4 text-white/60"/> Portfolio Website URL</label>
                    <input type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://your-website.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                
                {!hasAnyInput ? (
                    <>
                        <div className="flex items-center gap-4 my-6 opacity-40">
                            <div className="h-px bg-white flex-1"></div>
                            <span className="text-xs uppercase font-bold tracking-widest">OR Add Files</span>
                            <div className="h-px bg-white flex-1"></div>
                        </div>

                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className="border-2 border-dashed border-white/20 rounded-xl p-10 flex flex-col items-center justify-center bg-white/5 cursor-pointer hover:bg-white/10 transition-colors relative"
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
                                    <FileText className="w-12 h-12 text-indigo-400 mb-4" />
                                    <p className="font-medium text-lg">{files.length} item(s) selected</p>
                                    <p className="text-sm text-white/50 mt-1">Ready for parsing</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-center">
                                    <UploadCloud className="w-12 h-12 text-white/40 mb-4" />
                                    <p className="font-medium text-lg mb-1">Click or drag and drop</p>
                                    <p className="text-sm text-white/40">Accepts ZIP, folders, PDF, TXT</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                        {hasAccountPortfolio
                            ? "Portfolio link detected from your account. It will be used first during setup."
                            : "Saved Resume / CV detected from your account. The upload box is not needed unless you want to add more files."}
                    </div>
                )}

                <div className="mt-8 z-50 relative">
                    <RoleSelect
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
                        onChange={(selected: string[]) => setPreferredRoles(selected)}
                    />
                </div>

                <div className="mt-8 z-40 relative">
                    <CompanySelect 
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
                        onChange={(selected: string[]) => setTargetCompanies(selected)}
                    />
                </div>



                {!isRealisticMode && (
                    <>
                        <div className="mt-6">
                            <label className="text-white/80 font-semibold mb-3 block">Select Interview Difficulty</label>
                            <div className="grid grid-cols-3 gap-4">
                                {["basic", "intermediate", "advanced"].map((lvl) => (
                                    <button
                                        key={lvl}
                                        onClick={() => setLevel(lvl)}
                                        className={`py-3 rounded-xl border capitalize font-semibold transition-all ${level === lvl ? "bg-indigo-600 border-indigo-500 text-white shadow-lg" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8">
                            <label className="text-white/80 font-semibold mb-3 flex items-center gap-2"><Cpu className="w-4 h-4"/> Select AI Provider</label>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: "gemini", label: "Google Gemini", desc: "Fast, highly capable." },
                                    { id: "sarvam", label: "Sarvam AI", desc: "Focused on explicit constraints." }
                                ].map((prov) => (
                                    <button
                                        key={prov.id}
                                        onClick={() => setProvider(prov.id)}
                                        className={`p-4 rounded-xl border text-left transition-all ${provider === prov.id ? "bg-indigo-600/20 border-indigo-500 shadow-lg" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}`}
                                    >
                                        <span className={`block font-bold mb-1 ${provider === prov.id ? "text-indigo-300" : ""}`}>{prov.label}</span>
                                        <span className="text-xs opacity-70 leading-relaxed block">{prov.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}


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
