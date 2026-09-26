"use client";

import Link from "next/link";
import {
    Activity,
    CheckSquare,
    ChevronDown,
    ChevronUp,
    Clock,
    Download,
    Film,
    Share2,
    Square,
    Trash2,
} from "lucide-react";
import type { ProfileInterviewSession } from "../../types/profile";

interface SessionHistoryPanelProps {
    sessions: ProfileInterviewSession[];
    selectedIds: Set<number>;
    expandedIds: Set<number>;
    onToggleSelect: (idx: number) => void;
    onToggleSelectAll: () => void;
    onToggleExpand: (idx: number) => void;
    onDeleteSelected: () => void;
    onDownloadTranscript: (text: string, date: number) => void;
    onShareScorecard: (session: ProfileInterviewSession) => void;
}

/** Formats a numeric timestamp into a clean, human-readable date string. */
function formatDate(ts: number): string {
    if (!ts || isNaN(ts)) return "N/A";
    try {
        const d = new Date(ts);
        const dateStr = d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        const timeStr = d.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
        return `${dateStr} • ${timeStr}`;
    } catch {
        return new Date(ts).toLocaleString();
    }
}

/** Interview session history list — select/expand/delete/download/share for each past attempt. */
export default function SessionHistoryPanel({
    sessions,
    selectedIds,
    expandedIds,
    onToggleSelect,
    onToggleSelectAll,
    onToggleExpand,
    onDeleteSelected,
    onDownloadTranscript,
    onShareScorecard,
}: SessionHistoryPanelProps) {
    const totalInterviews = sessions.length;

    return (
        <div className="bg-[#0e1017]/90 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
            {/* Top Section Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
                            Interview History & Performance Records
                        </h2>
                        <p className="text-xs text-white/50">Track, review, and analyze your past interview attempts</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-300">
                        {totalInterviews} {totalInterviews === 1 ? "Session" : "Sessions"} Saved
                    </span>
                </div>
            </div>

            {/* Subheader Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">Interview Sessions</h3>
                    <span className="text-xs text-white/40 font-normal">({totalInterviews} within 1 year)</span>
                </div>

                {sessions.length > 0 && (
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={onToggleSelectAll}
                            className="text-xs text-white/60 hover:text-white transition-colors font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
                        >
                            {selectedIds.size === sessions.length ? (
                                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                            ) : (
                                <Square className="w-3.5 h-3.5 text-white/40" />
                            )}
                            {selectedIds.size === sessions.length ? "Deselect All" : "Select All"}
                        </button>
                        {selectedIds.size > 0 && (
                            <button
                                onClick={onDeleteSelected}
                                className="flex items-center gap-1.5 text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 px-3 py-1.5 rounded-xl transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Delete {selectedIds.size} selected
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Session Cards List */}
            <div className="space-y-3">
                {sessions.length === 0 ? (
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-10 text-center text-white/40">
                        <Clock className="w-10 h-10 mx-auto mb-3 opacity-20 text-indigo-400" />
                        <p className="font-bold text-base mb-1 text-white/80">No interview sessions found</p>
                        <p className="text-xs">Complete an interview session to review scorecards and transcripts here.</p>
                    </div>
                ) : (
                    sessions.map((session, idx) => {
                        const isSelected = selectedIds.has(idx);
                        const isExpanded = expandedIds.has(idx);

                        const scoreVal = session.finalScore;
                        const scoreColor =
                            scoreVal === undefined
                                ? "text-white/40"
                                : scoreVal >= 70
                                ? "text-emerald-400"
                                : scoreVal >= 50
                                ? "text-amber-400"
                                : "text-rose-400";

                        const scoreBg =
                            scoreVal === undefined
                                ? "bg-white/5 border-white/10"
                                : scoreVal >= 70
                                ? "bg-emerald-500/10 border-emerald-500/20"
                                : scoreVal >= 50
                                ? "bg-amber-500/10 border-amber-500/20"
                                : "bg-rose-500/10 border-rose-500/20";

                        return (
                            <div
                                key={idx}
                                className={`group bg-white/[0.03] hover:bg-white/[0.05] border rounded-xl overflow-hidden transition-all duration-200 ${
                                    isSelected
                                        ? "border-indigo-500/60 bg-indigo-500/[0.05] shadow-[0_0_20px_rgba(79,70,229,0.15)]"
                                        : "border-white/10 hover:border-white/20"
                                }`}
                            >
                                {/* Card Body */}
                                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    {/* Left: Checkbox + Title + Meta + Summary */}
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <button
                                            onClick={() => onToggleSelect(idx)}
                                            className="mt-1 p-0.5 hover:bg-white/10 rounded transition-colors shrink-0 text-white/40 hover:text-white"
                                            title={isSelected ? "Deselect" : "Select"}
                                        >
                                            {isSelected ? (
                                                <CheckSquare className="w-5 h-5 text-indigo-400" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </button>

                                        <div className="min-w-0 flex-1 space-y-1.5">
                                            {/* Title line */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors">
                                                    Interview #{totalInterviews - idx}
                                                </span>

                                                {session.role && (
                                                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold">
                                                        {session.role}
                                                    </span>
                                                )}
                                                {session.company && (
                                                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold">
                                                        {session.company}
                                                    </span>
                                                )}

                                                <span className="text-xs text-white/40 font-mono bg-white/5 px-2 py-0.5 rounded-md border border-white/5 whitespace-nowrap">
                                                    {formatDate(session.timestamp)}
                                                </span>
                                            </div>

                                            {/* Summary text */}
                                            <p className="text-xs sm:text-sm text-white/50 line-clamp-1 max-w-2xl leading-relaxed">
                                                {session.summary?.trim() || "No detailed session summary available."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Scores & Actions */}
                                    <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/5">
                                        {/* Sub-ratings (visible on medium+ screens) */}
                                        <div className="hidden sm:flex items-center gap-4 text-center pr-2 border-r border-white/10">
                                            {session.technicalRating !== undefined && (
                                                <div>
                                                    <p className="text-[10px] text-white/40 uppercase font-semibold">Tech</p>
                                                    <p className="font-bold text-xs text-white">{session.technicalRating}<span className="text-white/30 text-[10px]">/100</span></p>
                                                </div>
                                            )}
                                            {session.behavioralRating !== undefined && (
                                                <div>
                                                    <p className="text-[10px] text-white/40 uppercase font-semibold">Behav</p>
                                                    <p className="font-bold text-xs text-white">{session.behavioralRating}<span className="text-white/30 text-[10px]">/100</span></p>
                                                </div>
                                            )}
                                            {session.communicationRating !== undefined && (
                                                <div>
                                                    <p className="text-[10px] text-white/40 uppercase font-semibold">Comm</p>
                                                    <p className="font-bold text-xs text-white">{session.communicationRating}<span className="text-white/30 text-[10px]">/100</span></p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Final Score Pill */}
                                        <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${scoreBg}`}>
                                            <span className="text-[10px] uppercase font-bold text-white/40">Final</span>
                                            <span className={`font-black text-sm ${scoreColor}`}>
                                                {scoreVal !== undefined ? `${scoreVal}/100` : "N/A"}
                                            </span>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-1.5">
                                            <Link
                                                href={`/film-room?t=${session.timestamp}`}
                                                className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-violet-500/20 hover:border-violet-400/50 hover:text-violet-300 transition-all text-white/60"
                                                title="Film Room (Video Review)"
                                            >
                                                <Film className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => onShareScorecard(session)}
                                                className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-400/50 hover:text-emerald-300 transition-all text-white/60"
                                                title="Share Scorecard"
                                            >
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onDownloadTranscript(session.transcript || "", session.timestamp)}
                                                className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-indigo-500/20 hover:border-indigo-400/50 hover:text-indigo-300 transition-all text-white/60"
                                                title="Download Transcript"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onToggleExpand(idx)}
                                                className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all text-white/60 hover:text-white"
                                                title={isExpanded ? "Collapse Details" : "Expand Details"}
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content Panel */}
                                {isExpanded && (
                                    <div className="border-t border-white/10 p-5 bg-black/40 space-y-4">
                                        {/* Score Grid Breakdown */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                                            {[
                                                { label: "Final Score", value: session.finalScore, color: scoreColor },
                                                { label: "Technical", value: session.technicalRating ?? session.interviewRating },
                                                { label: "Behavioral", value: session.behavioralRating },
                                                { label: "Communication", value: session.communicationRating },
                                                { label: "Portfolio", value: session.portfolioRating === "Skipped" ? "Skipped" : session.portfolioRating },
                                                { label: "Overall Rating", value: session.interviewRating },
                                            ]
                                                .filter((item) => item.value !== undefined)
                                                .map((item, i) => (
                                                    <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                                                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">
                                                            {item.label}
                                                        </p>
                                                        <p className={`font-extrabold text-base ${item.color || "text-white"}`}>
                                                            {typeof item.value === "number" ? `${item.value}/100` : item.value ?? "N/A"}
                                                        </p>
                                                    </div>
                                                ))}
                                        </div>

                                        {/* Detailed Summary */}
                                        {session.summary && (
                                            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                                                <p className="text-xs text-indigo-300 uppercase tracking-wider font-extrabold mb-2">
                                                    Session Summary & Performance Analysis
                                                </p>
                                                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-sans">
                                                    {session.summary}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
