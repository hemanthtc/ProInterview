"use client";

import React, { useState, useEffect, useCallback } from "react";
import { deferEffectWork } from "@/utils/deferEffect";
import {
    Loader2,
    Send,
    Trash2,
    Star,
    X,
    MessageSquare,
    CheckCircle2,
    GraduationCap,
    Lightbulb,
    Search,
    Paperclip,
    ShieldCheck,
    RefreshCw
} from "lucide-react";

interface FeedbackItem {
    _id: string;
    userIdentifier: string;
    userName: string;
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
        repliedBy: string;
        adminName: string;
    };
    createdAt: string;
}

interface FeedbackStats {
    total: number;
    pending: number;
    resolved: number;
    avgRating: number;
}

const FIELDS_OF_STUDY_OPTIONS = [
    "All Fields",
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

const CATEGORY_OPTIONS = [
    "All Categories",
    "Bug Report",
    "Domain Content & Question Bank",
    "Platform UI/UX",
    "AI Interview Quality",
    "Feature Request",
    "Curriculum & Study Materials",
    "General Feedback"
];

const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending Review" },
    { value: "under_review", label: "Under Review" },
    { value: "replied", label: "Replied" },
    { value: "resolved", label: "Resolved" }
];

export default function FeedbackAdminPanel() {
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [stats, setStats] = useState<FeedbackStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [fieldFilter, setFieldFilter] = useState("All Fields");
    const [categoryFilter, setCategoryFilter] = useState("All Categories");
    const [statusFilter, setStatusFilter] = useState("all");
    const [ratingFilter, setRatingFilter] = useState("all");

    // Reply Dialog State
    const [replyingFeedback, setReplyingFeedback] = useState<FeedbackItem | null>(null);
    const [replyText, setReplyText] = useState("");
    const [newStatus, setNewStatus] = useState<"pending" | "under_review" | "replied" | "resolved">("replied");
    const [sendingReply, setSendingReply] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Deleting state
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadFeedbacks = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (fieldFilter !== "All Fields") params.set("fieldOfStudy", fieldFilter);
            if (categoryFilter !== "All Categories") params.set("category", categoryFilter);
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (ratingFilter !== "all") params.set("rating", ratingFilter);
            if (search.trim()) params.set("search", search.trim());

            const res = await fetch(`/api/feedback?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setFeedbacks(data.feedbacks || []);
                if (data.stats) {
                    setStats(data.stats);
                }
            }
        } catch (err) {
            console.error("Failed to load feedbacks:", err);
        } finally {
            setLoading(false);
        }
    }, [fieldFilter, categoryFilter, statusFilter, ratingFilter, search]);

    useEffect(() => deferEffectWork(() => {
        void loadFeedbacks();
    }), [loadFeedbacks]);

    const handleOpenReplyModal = (item: FeedbackItem) => {
        setReplyingFeedback(item);
        setReplyText(item.adminReply?.replyText || "");
        setNewStatus(item.status === "pending" ? "replied" : item.status);
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyingFeedback || !replyText.trim()) return;

        setSendingReply(true);
        try {
            const res = await fetch(`/api/feedback/${replyingFeedback._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    replyText: replyText.trim(),
                    status: newStatus,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to submit response");

            setToastMessage("Reply sent and feedback status updated.");
            setTimeout(() => setToastMessage(null), 3000);

            // Update in local state
            setFeedbacks(prev =>
                prev.map(f => (f._id === replyingFeedback._id ? data.feedback : f))
            );
            setReplyingFeedback(null);
            setReplyText("");
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to submit response.");
        } finally {
            setSendingReply(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this feedback ticket permanently?")) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
            if (res.ok) {
                setFeedbacks(prev => prev.filter(f => f._id !== id));
                setToastMessage("Feedback ticket deleted.");
                setTimeout(() => setToastMessage(null), 3000);
            }
        } catch {
            alert("Failed to delete feedback.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6 text-left animate-in fade-in duration-300">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-white tracking-tight">
                            User Feedback & Field of Study Suggestions
                        </h2>
                        <p className="text-xs text-white/50">
                            Review problem statements, domain suggestions, candidate ratings, and publish official responses.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={loadFeedbacks}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all cursor-pointer self-start sm:self-auto"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
                    Refresh Feedbacks
                </button>
            </div>

            {/* Notification Banner */}
            {toastMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-xs font-bold animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* KPI Metric Cards */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                        <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">Total Submissions</span>
                        <span className="text-2xl font-black text-white">{stats.total}</span>
                    </div>
                    <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                        <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">Average Satisfaction</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-2xl font-black text-amber-400">{stats.avgRating}</span>
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                        <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">Pending Review</span>
                        <span className="text-2xl font-black text-rose-400">{stats.pending}</span>
                    </div>
                    <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                        <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">Replied / Resolved</span>
                        <span className="text-2xl font-black text-emerald-400">{stats.resolved}</span>
                    </div>
                </div>
            )}

            {/* Filter & Search Bar */}
            <div className="p-4 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by topic, user email, keywords..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
                    >
                        {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>

                    {/* Rating Filter */}
                    <select
                        value={ratingFilter}
                        onChange={(e) => setRatingFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
                    >
                        <option value="all">All Ratings</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
                    {/* Field of Study Filter */}
                    <div>
                        <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">Filter by Field of Study</span>
                        <select
                            value={fieldFilter}
                            onChange={(e) => setFieldFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
                        >
                            {FIELDS_OF_STUDY_OPTIONS.map((f) => (
                                <option key={f} value={f}>
                                    {f}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Category Filter */}
                    <div>
                        <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">Filter by Category</span>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
                        >
                            {CATEGORY_OPTIONS.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Feedback List */}
            {loading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-white/50">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    <p className="text-xs font-medium">Loading feedback submissions...</p>
                </div>
            ) : feedbacks.length === 0 ? (
                <div className="p-12 rounded-2xl border border-white/10 bg-white/5 text-center space-y-2">
                    <MessageSquare className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <p className="text-sm font-bold text-white/70">No feedback submissions match your filters.</p>
                    <p className="text-xs text-white/40">Try adjusting the search query or field of study filter.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {feedbacks.map((item) => {
                        const statusBadge =
                            item.status === "resolved"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : item.status === "replied"
                                ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                                : item.status === "under_review"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-rose-500/10 text-rose-300 border-rose-500/30";

                        return (
                            <div
                                key={item._id}
                                className="p-5 rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 via-black/40 to-black/40 shadow-xl space-y-3.5 backdrop-blur-md"
                            >
                                {/* Header / Meta Line */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/5">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
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
                                        <div className="text-[11px] text-white/50 flex items-center gap-2">
                                            <span className="font-semibold text-white/80">{item.userName}</span>
                                            <span>&bull;</span>
                                            <span>{item.userIdentifier}</span>
                                            <span>&bull;</span>
                                            <span>{new Date(item.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${statusBadge}`}>
                                            {item.status.replace("_", " ")}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenReplyModal(item)}
                                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Send className="w-3 h-3" />
                                            {item.adminReply?.replyText ? "Edit Reply" : "Reply"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(item._id)}
                                            disabled={deletingId === item._id}
                                            className="p-1.5 rounded-xl text-white/40 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 transition-colors cursor-pointer"
                                            title="Delete Feedback Ticket"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Problem Statement & Description */}
                                <div>
                                    <h4 className="font-black text-sm text-white">{item.problemStatement}</h4>
                                    <p className="text-xs mt-1 text-white/70 leading-relaxed whitespace-pre-line">
                                        {item.problemDescription}
                                    </p>
                                </div>

                                {/* Domain Suggestions */}
                                {item.domainSuggestions && (
                                    <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                                        <span className="font-black text-[10px] uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                            <Lightbulb className="w-3.5 h-3.5" />
                                            Candidate Suggestions & Changes for {item.fieldOfStudy}:
                                        </span>
                                        <p className="leading-relaxed opacity-90">{item.domainSuggestions}</p>
                                    </div>
                                )}

                                {/* Attachment */}
                                {item.attachmentUrl && (
                                    <div>
                                        <a
                                            href={item.attachmentUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold underline"
                                        >
                                            <Paperclip className="w-3.5 h-3.5" />
                                            View Attached Screenshot / Document
                                        </a>
                                    </div>
                                )}

                                {/* Current Admin Response (if present) */}
                                {item.adminReply?.replyText && (
                                    <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 text-xs space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                                <span className="font-black text-xs text-indigo-300 uppercase tracking-wider">
                                                    Official Admin Response
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-white/40">
                                                {new Date(item.adminReply.repliedAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-xs leading-relaxed font-medium">
                                            {item.adminReply.replyText}
                                        </p>
                                        <div className="text-[10px] text-white/50 font-bold pt-1">
                                            &mdash; {item.adminReply.adminName} ({item.adminReply.repliedBy})
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Admin Reply Modal */}
            {replyingFeedback && (
                <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-slate-950 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-base font-extrabold text-white">
                                    Official Admin Response
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReplyingFeedback(null)}
                                className="text-white/40 hover:text-white p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
                            <div className="font-bold text-white/90">
                                Candidate: {replyingFeedback.userName} ({replyingFeedback.userIdentifier})
                            </div>
                            <div className="text-white/60 font-medium line-clamp-1">
                                Topic: {replyingFeedback.problemStatement}
                            </div>
                        </div>

                        <form onSubmit={handleSendReply} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                                    Response Message *
                                </label>
                                <textarea
                                    required
                                    rows={5}
                                    placeholder="Type your official response, resolution details, or update to the candidate..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    className="w-full p-3.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500 resize-y"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                                    Ticket Status
                                </label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value as "pending" | "under_review" | "replied" | "resolved")}
                                    className="w-full p-3 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="under_review">Under Review</option>
                                    <option value="replied">Replied</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setReplyingFeedback(null)}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/70"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingReply || !replyText.trim()}
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer"
                                >
                                    {sendingReply ? (
                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                                    ) : (
                                        <><Send className="w-3.5 h-3.5" /> Publish Response</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
