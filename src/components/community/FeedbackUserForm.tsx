"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Star,
    Send,
    Loader2,
    CheckCircle2,
    Clock,
    MessageSquare,
    AlertCircle,
    FileText,
    Sparkles,
    Trash2,
    Paperclip,
    X,
    ChevronRight,
    HelpCircle,
    GraduationCap,
    Lightbulb,
    ShieldCheck,
    Layers
} from "lucide-react";
import { processImageForUpload } from "@/utils/imageProcess";

interface FeedbackItem {
    _id: string;
    fieldOfStudy: string;
    category: string;
    problemStatement: string;
    problemDescription: string;
    domainSuggestions?: string;
    rating: number;
    attachmentUrl?: string;
    status: "pending" | "under_review" | "replied" | "resolved";
    adminReply?: {
        replyText: string;
        repliedAt: string;
        adminName: string;
    };
    createdAt: string;
}

const FIELDS_OF_STUDY = [
    "Computer Science & Engineering (CSE)",
    "Artificial Intelligence & Machine Learning (AIML)",
    "Data Science & Big Data Analytics",
    "Electronics & Communication Engineering (ECE)",
    "Electrical & Electronics Engineering (EEE)",
    "Mechanical Engineering",
    "Civil & Structural Engineering",
    "Information Technology & Cloud Computing",
    "MBA / Business Administration & Strategy",
    "Finance & Fintech",
    "Product Management & UX Design",
    "Biotechnology & Healthcare Tech",
    "Other / Interdisciplinary Field"
];

const CATEGORIES = [
    "Bug Report",
    "Domain Content & Question Bank",
    "Platform UI/UX",
    "AI Interview Quality",
    "Feature Request",
    "Curriculum & Study Materials",
    "General Feedback"
];

export default function FeedbackUserForm({ theme = "dark" }: { theme?: "dark" | "light" | "eyeprotect" }) {
    const isLight = theme === "light" || theme === "eyeprotect";

    const [tab, setTab] = useState<"form" | "history">("form");
    const [fieldOfStudy, setFieldOfStudy] = useState(FIELDS_OF_STUDY[0]);
    const [customField, setCustomField] = useState("");
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [problemStatement, setProblemStatement] = useState("");
    const [problemDescription, setProblemDescription] = useState("");
    const [domainSuggestions, setDomainSuggestions] = useState("");
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState<number | null>(null);

    const [attachmentUrl, setAttachmentUrl] = useState<string>("");
    const [uploading, setUploading] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [history, setHistory] = useState<FeedbackItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch("/api/feedback");
            if (res.ok) {
                const data = await res.json();
                setHistory(data.feedbacks || []);
            }
        } catch {
            /* ignore */
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const processed = await processImageForUpload(file);
            const reader = new FileReader();
            reader.onload = () => {
                setAttachmentUrl(reader.result as string);
                setUploading(false);
            };
            reader.onerror = () => {
                setErrorMessage("Failed to read image file.");
                setUploading(false);
            };
            reader.readAsDataURL(processed);
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to process attachment");
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage(null);
        setErrorMessage(null);

        const effectiveField = fieldOfStudy.includes("Other") && customField.trim()
            ? customField.trim()
            : fieldOfStudy;

        if (!effectiveField) {
            setErrorMessage("Please select or specify your field of study.");
            return;
        }
        if (!problemStatement.trim()) {
            setErrorMessage("Please enter a problem statement or topic title.");
            return;
        }
        if (!problemDescription.trim()) {
            setErrorMessage("Please provide a detailed description of the problem or feedback.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fieldOfStudy: effectiveField,
                    category,
                    problemStatement: problemStatement.trim(),
                    problemDescription: problemDescription.trim(),
                    domainSuggestions: domainSuggestions.trim(),
                    rating,
                    attachmentUrl,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to submit feedback.");
            }

            setSuccessMessage("Your feedback & domain suggestions have been submitted to the admin team!");
            setProblemStatement("");
            setProblemDescription("");
            setDomainSuggestions("");
            setAttachmentUrl("");
            setRating(5);
            loadHistory();
            setTimeout(() => {
                setTab("history");
            }, 1200);
        } catch (err: any) {
            setErrorMessage(err.message || "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this feedback ticket?")) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
            if (res.ok) {
                setHistory(prev => prev.filter(f => f._id !== id));
            }
        } catch {
            /* ignore */
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden text-left">
            {/* Header / Subnav Bar */}
            <div className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isLight ? "bg-white border-slate-200" : "bg-[#0b0c16] border-white/10"
            }`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className={`font-black text-base sm:text-lg tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                            Feedback & Field of Study Suggestions
                        </h2>
                        <p className={`text-xs ${isLight ? "text-slate-500" : "text-white/50"}`}>
                            Help our admin and engineering team improve domain question banks, interview quality, and features.
                        </p>
                    </div>
                </div>

                {/* Tab Pill Selector */}
                <div className={`flex items-center p-1 rounded-xl border self-start sm:self-auto ${
                    isLight ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/10"
                }`}>
                    <button
                        type="button"
                        onClick={() => setTab("form")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            tab === "form"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                                : isLight ? "text-slate-600 hover:text-slate-900" : "text-white/60 hover:text-white"
                        }`}
                    >
                        Submit Feedback
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setTab("history");
                            loadHistory();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            tab === "history"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                                : isLight ? "text-slate-600 hover:text-slate-900" : "text-white/60 hover:text-white"
                        }`}
                    >
                        <span>My Submissions</span>
                        {history.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-extrabold">
                                {history.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                <div className="max-w-3xl mx-auto">
                    {tab === "form" ? (
                        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">
                            {/* Alert banners */}
                            {successMessage && (
                                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 text-xs font-bold animate-in zoom-in-95">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                                    <span>{successMessage}</span>
                                </div>
                            )}
                            {errorMessage && (
                                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3 text-xs font-bold animate-in zoom-in-95">
                                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* Section 1: Field of Study & Category */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                                        isLight ? "text-slate-700" : "text-white/80"
                                    }`}>
                                        <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                                        Your Field of Study / Branch *
                                    </label>
                                    <select
                                        value={fieldOfStudy}
                                        onChange={(e) => setFieldOfStudy(e.target.value)}
                                        className={`w-full p-3 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                                            isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-black/40 border-white/10 text-white"
                                        }`}
                                    >
                                        {FIELDS_OF_STUDY.map((f) => (
                                            <option key={f} value={f} className={isLight ? "text-slate-900" : "bg-slate-900 text-white"}>
                                                {f}
                                            </option>
                                        ))}
                                    </select>

                                    {fieldOfStudy.includes("Other") && (
                                        <input
                                            type="text"
                                            placeholder="Enter your specific field / discipline..."
                                            value={customField}
                                            onChange={(e) => setCustomField(e.target.value)}
                                            className={`w-full mt-2 p-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                                                isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-black/40 border-white/10 text-white"
                                            }`}
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                                        isLight ? "text-slate-700" : "text-white/80"
                                    }`}>
                                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                                        Feedback Category *
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className={`w-full p-3 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                                            isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-black/40 border-white/10 text-white"
                                        }`}
                                    >
                                        {CATEGORIES.map((c) => (
                                            <option key={c} value={c} className={isLight ? "text-slate-900" : "bg-slate-900 text-white"}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Section 2: Problem Statement */}
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                                    isLight ? "text-slate-700" : "text-white/80"
                                }`}>
                                    <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                                    Problem Statement / Subject *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Need more dynamic programming questions or found a bug in compiler execution..."
                                    value={problemStatement}
                                    onChange={(e) => setProblemStatement(e.target.value)}
                                    className={`w-full p-3 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                                        isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-black/40 border-white/10 text-white"
                                    }`}
                                />
                            </div>

                            {/* Section 3: Problem Description */}
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                                    isLight ? "text-slate-700" : "text-white/80"
                                }`}>
                                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                                    Problem Description *
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Describe the issue, bug, or your experience in detail so our admins can investigate..."
                                    value={problemDescription}
                                    onChange={(e) => setProblemDescription(e.target.value)}
                                    className={`w-full p-3 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-y ${
                                        isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-black/40 border-white/10 text-white"
                                    }`}
                                />
                            </div>

                            {/* Section 4: Domain Suggestions & Required Changes */}
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                                    isLight ? "text-slate-700" : "text-white/80"
                                }`}>
                                    <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                                    Suggestions or Changes Required for your Field of Study
                                    <span className="text-[10px] lowercase text-white/40 font-normal">(optional)</span>
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="What topics, specific company questions, or tools should we add for your branch or curriculum?"
                                    value={domainSuggestions}
                                    onChange={(e) => setDomainSuggestions(e.target.value)}
                                    className={`w-full p-3 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-y ${
                                        isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-black/40 border-white/10 text-white"
                                    }`}
                                />
                            </div>

                            {/* Section 5: Star Rating & Attachment */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                <div className={`p-4 rounded-2xl border ${
                                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                                }`}>
                                    <span className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                                        isLight ? "text-slate-700" : "text-white/80"
                                    }`}>
                                        Overall Platform Experience Rating
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(null)}
                                                onClick={() => setRating(star)}
                                                className="p-1 transition-transform hover:scale-125 cursor-pointer focus:outline-none"
                                            >
                                                <Star
                                                    className={`w-6 h-6 transition-colors ${
                                                        star <= (hoverRating ?? rating)
                                                            ? "fill-amber-400 text-amber-400 drop-shadow-md"
                                                            : "text-white/20"
                                                    }`}
                                                />
                                            </button>
                                        ))}
                                        <span className={`text-xs font-black ml-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                                            {rating} / 5 Stars
                                        </span>
                                    </div>
                                </div>

                                <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
                                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                                }`}>
                                    <span className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                                        isLight ? "text-slate-700" : "text-white/80"
                                    }`}>
                                        Attachment / Screenshot
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            className={`py-2 px-4 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                                isLight
                                                    ? "bg-white border-slate-300 hover:bg-slate-100 text-slate-800"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                                            }`}
                                        >
                                            {uploading ? (
                                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
                                            ) : (
                                                <><Paperclip className="w-3.5 h-3.5 text-indigo-400" /> Choose Screenshot</>
                                            )}
                                        </button>

                                        {attachmentUrl && (
                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={attachmentUrl}
                                                    alt="Preview"
                                                    className="w-8 h-8 rounded-lg object-cover border border-indigo-400/40"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setAttachmentUrl("")}
                                                    className="text-white/40 hover:text-rose-400"
                                                    title="Remove attachment"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/25 cursor-pointer"
                            >
                                {submitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting to Admin Team...</>
                                ) : (
                                    <><Send className="w-4 h-4" /> Submit Feedback & Suggestions</>
                                )}
                            </button>
                        </form>
                    ) : (
                        /* History View */
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                <h3 className={`font-black text-sm uppercase tracking-wider ${isLight ? "text-slate-800" : "text-white/80"}`}>
                                    My Submitted Feedback Tickets
                                </h3>
                                <span className={`text-xs font-bold ${isLight ? "text-slate-500" : "text-white/40"}`}>
                                    {history.length} Total Submissions
                                </span>
                            </div>

                            {loadingHistory ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-2 text-white/50">
                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                                    <p className="text-xs font-medium">Loading your feedback history...</p>
                                </div>
                            ) : history.length === 0 ? (
                                <div className={`p-8 rounded-2xl border text-center space-y-3 ${
                                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                                }`}>
                                    <MessageSquare className="w-8 h-8 text-white/20 mx-auto" />
                                    <p className={`text-sm font-bold ${isLight ? "text-slate-700" : "text-white/60"}`}>
                                        You haven't submitted any feedback yet.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setTab("form")}
                                        className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 cursor-pointer"
                                    >
                                        Submit Your First Feedback
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {history.map((item) => {
                                        const statusColor =
                                            item.status === "resolved"
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                : item.status === "replied"
                                                ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                                                : item.status === "under_review"
                                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                                : "bg-purple-500/10 text-purple-300 border-purple-500/30";

                                        return (
                                            <div
                                                key={item._id}
                                                className={`p-5 rounded-2xl border shadow-lg transition-all space-y-3 ${
                                                    isLight ? "bg-white border-slate-200" : "bg-gradient-to-b from-white/5 to-black/30 border-white/10"
                                                }`}
                                            >
                                                {/* Header Row */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                                            {item.fieldOfStudy}
                                                        </span>
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/5 text-white/60 border border-white/10">
                                                            {item.category}
                                                        </span>
                                                        <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                                                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                            <span>{item.rating}/5</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${statusColor}`}>
                                                            {item.status.replace("_", " ")}
                                                        </span>
                                                        <span className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/40"}`}>
                                                            {new Date(item.createdAt).toLocaleDateString()}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(item._id)}
                                                            disabled={deletingId === item._id}
                                                            className="p-1 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                                            title="Delete my feedback"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Problem Statement & Description */}
                                                <div>
                                                    <h4 className={`font-black text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                                                        {item.problemStatement}
                                                    </h4>
                                                    <p className={`text-xs mt-1 leading-relaxed ${isLight ? "text-slate-600" : "text-white/70"}`}>
                                                        {item.problemDescription}
                                                    </p>
                                                </div>

                                                {/* Domain Suggestions */}
                                                {item.domainSuggestions && (
                                                    <div className={`p-3 rounded-xl border text-xs ${
                                                        isLight ? "bg-amber-50/60 border-amber-200 text-amber-900" : "bg-amber-950/20 border-amber-500/20 text-amber-200"
                                                    }`}>
                                                        <span className="font-extrabold block mb-0.5 text-[10px] uppercase tracking-wider text-amber-400">
                                                            Suggested Curriculum / Domain Changes:
                                                        </span>
                                                        <p className="leading-relaxed opacity-90">{item.domainSuggestions}</p>
                                                    </div>
                                                )}

                                                {/* Attachment */}
                                                {item.attachmentUrl && (
                                                    <div className="pt-1">
                                                        <a
                                                            href={item.attachmentUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold underline"
                                                        >
                                                            <Paperclip className="w-3.5 h-3.5" />
                                                            View Attached Screenshot
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Admin Official Response */}
                                                {item.adminReply?.replyText ? (
                                                    <div className={`mt-3 p-4 rounded-xl border space-y-1.5 ${
                                                        isLight ? "bg-indigo-50 border-indigo-200 text-slate-800" : "bg-indigo-950/30 border-indigo-500/30 text-indigo-200"
                                                    }`}>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                                                <span className="font-black text-xs text-indigo-400 uppercase tracking-wider">
                                                                    Official Admin Response
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-white/40">
                                                                {new Date(item.adminReply.repliedAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs leading-relaxed font-medium">
                                                            {item.adminReply.replyText}
                                                        </p>
                                                        <div className="text-[10px] text-white/50 font-bold">
                                                            &mdash; {item.adminReply.adminName || "Platform Engineering"}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-[11px] text-white/40 pt-1">
                                                        <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                                        <span>Status: Awaiting admin review & response</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
