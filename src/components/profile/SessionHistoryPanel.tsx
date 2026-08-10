"use client";

import Link from "next/link";
import {
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
        <>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-3">
                    <Clock className="w-5 h-5 text-indigo-400" />
                    Interview Sessions
                    <span className="text-sm font-normal text-white/40">({totalInterviews} within 1 year)</span>
                </h2>
                {sessions.length > 0 && (
                    <div className="flex items-center gap-3">
                        <button onClick={onToggleSelectAll} className="text-xs text-white/50 hover:text-white transition-colors font-semibold flex items-center gap-1.5">
                            {selectedIds.size === sessions.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            {selectedIds.size === sessions.length ? "Deselect All" : "Select All"}
                        </button>
                        {selectedIds.size > 0 && (
                            <button onClick={onDeleteSelected} className="flex items-center gap-1.5 text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors">
                                <Trash2 className="w-3.5 h-3.5" /> Delete {selectedIds.size} selected
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {sessions.length === 0 ? (
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-12 text-center text-white/40">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-bold text-lg mb-1">No sessions found</p>
                        <p className="text-sm">Complete an interview to see your history here.</p>
                    </div>
                ) : (
                    sessions.map((session, idx) => {
                        const isSelected = selectedIds.has(idx);
                        const isExpanded = expandedIds.has(idx);
                        const scoreColor =
                            (session.finalScore ?? 0) >= 70
                                ? "text-green-400"
                                : (session.finalScore ?? 0) >= 50
                                    ? "text-yellow-400"
                                    : "text-red-400";

                        return (
                            <div key={idx} className={`bg-[#111] border rounded-2xl overflow-hidden transition-all duration-200 ${isSelected ? "border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.15)]" : "border-white/10 hover:border-white/20"}`}>
                                {/* Row Header */}
                                <div className="p-5 flex items-center gap-4">
                                    {/* Checkbox */}
                                    <button onClick={() => onToggleSelect(idx)} className="shrink-0">
                                        {isSelected
                                            ? <CheckSquare className="w-5 h-5 text-indigo-400" />
                                            : <Square className="w-5 h-5 text-white/30 hover:text-white/60 transition-colors" />}
                                    </button>

                                    {/* Session Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-0.5">
                                            <span className="font-bold">Interview #{totalInterviews - idx}</span>
                                            <span className="text-xs text-white/40 font-mono">{new Date(session.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-white/50 truncate max-w-xl">
                                            {session.summary?.slice(0, 100) || "No summary available"}
                                            {(session.summary?.length || 0) > 100 ? "…" : ""}
                                        </p>
                                    </div>

                                    {/* Scores row */}
                                    <div className="hidden md:flex items-center gap-5 shrink-0">
                                        {session.technicalRating !== undefined && (
                                            <div className="text-center">
                                                <p className="text-xs text-white/40 mb-0.5">Tech</p>
                                                <p className="font-bold text-sm">{session.technicalRating}<span className="text-white/30">/100</span></p>
                                            </div>
                                        )}
                                        {session.behavioralRating !== undefined && (
                                            <div className="text-center">
                                                <p className="text-xs text-white/40 mb-0.5">Behav</p>
                                                <p className="font-bold text-sm">{session.behavioralRating}<span className="text-white/30">/100</span></p>
                                            </div>
                                        )}
                                        {session.communicationRating !== undefined && (
                                            <div className="text-center">
                                                <p className="text-xs text-white/40 mb-0.5">Comm</p>
                                                <p className="font-bold text-sm">{session.communicationRating}<span className="text-white/30">/100</span></p>
                                            </div>
                                        )}
                                        <div className="text-center">
                                            <p className="text-xs text-white/40 mb-0.5">Final</p>
                                            <p className={`font-black text-xl ${scoreColor}`}>{session.finalScore ?? "N/A"}<span className="text-sm text-white/30">/100</span></p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Link
                                            href={`/film-room?t=${session.timestamp}`}
                                            className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-violet-500 hover:border-violet-400 transition-all text-white/50 hover:text-white"
                                            title="Film Room"
                                        >
                                            <Film className="w-4 h-4" />
                                        </Link>
                                        <button
                                            onClick={() => onShareScorecard(session)}
                                            className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500 hover:border-emerald-400 transition-all text-white/50 hover:text-white"
                                            title="Share Scorecard"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDownloadTranscript(session.transcript || "", session.timestamp)} className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-indigo-500 hover:border-indigo-400 transition-all text-white/50 hover:text-white" title="Download Transcript">
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onToggleExpand(idx)} className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/50 hover:text-white" title="Expand">
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="border-t border-white/10 p-5 bg-black/20 space-y-4">
                                        {/* Score Breakdown */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {[
                                                { label: "Final Score", value: session.finalScore, color: scoreColor },
                                                { label: "Technical", value: session.technicalRating ?? session.interviewRating },
                                                { label: "Behavioral", value: session.behavioralRating },
                                                { label: "Communication", value: session.communicationRating },
                                                { label: "Portfolio", value: session.portfolioRating === "Skipped" ? "Skipped" : session.portfolioRating },
                                                { label: "Combined Interview", value: session.interviewRating },
                                            ].filter((item) => item.value !== undefined).map((item, i) => (
                                                <div key={i} className="bg-white/5 rounded-xl p-3">
                                                    <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">{item.label}</p>
                                                    <p className={`font-bold text-lg ${item.color || "text-white"}`}>
                                                        {typeof item.value === "number" ? `${item.value}/100` : item.value ?? "N/A"}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Full Summary */}
                                        {session.summary && (
                                            <div className="bg-white/5 rounded-xl p-4">
                                                <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-2">Session Summary & Feedback</p>
                                                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{session.summary}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );
}
