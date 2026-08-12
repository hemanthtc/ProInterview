"use client";

import { useState } from "react";
import { Award, ChevronDown, ChevronUp, Clock, TrendingUp, Video } from "lucide-react";
import { getStorageItem } from "../../utils/storage";

interface ProgressPanelProps {
    isLight: boolean;
}

/** "My Progress" dashboard — interview attempt history + mock aptitude assessment history, read from localStorage. */
export default function ProgressPanel({ isLight }: ProgressPanelProps) {
    const [progressTab, setProgressTab] = useState<"interview" | "aptitude">("interview");
    const [expandedProgressMockId, setExpandedProgressMockId] = useState<string | null>(null);
    const [expandedProgressInterviewId, setExpandedProgressInterviewId] = useState<string | null>(null);

    const interviewData = JSON.parse(getStorageItem("interviewSessions") || "[]");
    const mockData = JSON.parse(getStorageItem("mockAptitudeSessions") || "[]");

    return (
        <div className="space-y-6 text-left animate-in fade-in duration-300 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-sky-400" />
                    <h3 className="text-lg font-bold text-white">My Progress & Learning</h3>
                </div>

                {/* Navigation Toggle */}
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 shrink-0 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => {
                            setProgressTab("interview");
                            setExpandedProgressInterviewId(null);
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${progressTab === "interview"
                            ? "bg-sky-500 text-white shadow-md shadow-sky-500/10"
                            : "text-white/60 hover:text-white"
                            }`}
                    >
                        Interview Attempts
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setProgressTab("aptitude");
                            setExpandedProgressMockId(null);
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${progressTab === "aptitude"
                            ? "bg-sky-500 text-white shadow-md shadow-sky-500/10"
                            : "text-white/60 hover:text-white"
                            }`}
                    >
                        Mock Assessments
                    </button>
                </div>
            </div>

            {progressTab === "interview" ? (
                <div className="space-y-4">
                    {interviewData.length === 0 ? (
                        <div className="border border-dashed border-white/10 rounded-2xl p-8 text-center space-y-3">
                            <Video className="w-8 h-8 text-white/20 mx-auto animate-pulse" />
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-white">No Interview History</h4>
                                <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                                    Your completed mock interview sessions, dynamic ratings, and correct answer breakdowns will be logged here.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3.5">
                            {interviewData.map((sess: any, index: number) => {
                                const isExpanded = expandedProgressInterviewId === sess.id || expandedProgressInterviewId === `idx_${index}`;
                                const sessId = sess.id || `idx_${index}`;
                                // eslint-disable-next-line react-hooks/purity
                                const dateString = new Date(sess.timestamp || Date.now()).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                });

                                return (
                                    <div key={sessId} className={`border rounded-xl transition-all duration-200 overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#16161f] border-white/5"
                                        }`}>
                                        <div
                                            onClick={() => setExpandedProgressInterviewId(isExpanded ? null : sessId)}
                                            className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.01]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                                                    {interviewData.length - index}
                                                </div>
                                                <div>
                                                    <h4 className={`text-xs font-black capitalize tracking-tight ${isLight ? "text-slate-800" : "text-white"}`}>
                                                        Interview Session Attempt
                                                    </h4>
                                                    <span className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                                                        <Clock className="w-3 h-3" /> {dateString}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-4 text-left">
                                                    <div>
                                                        <span className="text-[9px] uppercase font-bold text-white/30 block">Technical</span>
                                                        <span className={`text-xs font-black ${isLight ? "text-slate-700" : "text-white"}`}>{sess.technicalRating || 0}/100</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] uppercase font-bold text-white/30 block">Behavioral</span>
                                                        <span className={`text-xs font-black ${isLight ? "text-slate-700" : "text-white"}`}>{sess.behavioralRating || 0}/100</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] uppercase font-bold text-white/30 block">Overall</span>
                                                        <span className="text-xs font-black text-sky-400">{sess.finalScore || sess.interviewRating || 0}/100</span>
                                                    </div>
                                                </div>
                                                {isExpanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className={`p-5 border-t space-y-4 font-sans text-xs ${isLight ? "bg-slate-50/20 border-slate-100" : "bg-[#111] border-white/5"
                                                }`}>
                                                {sess.summary && (
                                                    <div className="space-y-1.5">
                                                        <span className="text-[9px] uppercase font-bold text-sky-400 block tracking-wider">Evaluation Summary</span>
                                                        <div className={`leading-relaxed whitespace-pre-line font-medium ${isLight ? "text-slate-700" : "text-white/80"}`}>
                                                            {sess.summary}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <span className="text-[9px] uppercase font-bold text-sky-400 block tracking-wider">Annotated Transcript & Corrections</span>
                                                    <div className={`rounded-xl p-4 font-mono text-[10px] max-h-[350px] overflow-y-auto leading-relaxed border ${isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/30 border-white/5 text-indigo-200"
                                                        }`}>
                                                        {sess.transcript ? (
                                                            <div className="whitespace-pre-wrap">{sess.transcript}</div>
                                                        ) : (
                                                            <span className="text-white/30 italic">No transcript recorded for this session.</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {mockData.length === 0 ? (
                        <div className="border border-dashed border-white/10 rounded-2xl p-8 text-center space-y-3">
                            <Award className="w-8 h-8 text-white/20 mx-auto animate-pulse" />
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-white">No Mock Assessment History</h4>
                                <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                                    Your dynamically generated Mock Aptitude test results, MCQ analytics, and coding evaluations will be logged here.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3.5">
                            {mockData.map((sess: any, index: number) => {
                                const isExpanded = expandedProgressMockId === sess.id;
                                // eslint-disable-next-line react-hooks/purity
                                const dateString = new Date(sess.timestamp || Date.now()).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                });

                                return (
                                    <div key={sess.id} className={`border rounded-xl transition-all duration-200 overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#16161f] border-white/5"
                                        }`}>
                                        <div
                                            onClick={() => setExpandedProgressMockId(isExpanded ? null : sess.id)}
                                            className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.01]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs">
                                                    {mockData.length - index}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <h4 className={`text-xs font-black capitalize tracking-tight ${isLight ? "text-slate-800" : "text-white"}`}>
                                                            Mock Aptitude Assessment
                                                        </h4>
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${sess.path === "onCampus"
                                                            ? "bg-pink-500/10 border border-pink-500/20 text-pink-400"
                                                            : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                                                            }`}>
                                                            {sess.path === "onCampus" ? "On-Campus" : "Off-Campus"}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                                                        <Clock className="w-3 h-3" /> {dateString}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-4 text-left">
                                                    <div>
                                                        <span className="text-[9px] uppercase font-bold text-white/30 block">MCQs Correct</span>
                                                        <span className={`text-xs font-black ${isLight ? "text-slate-700" : "text-white"}`}>
                                                            {sess.mcqDetails?.correct || 0} / {sess.mcqDetails?.total || 0}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] uppercase font-bold text-white/30 block">MCQs Score</span>
                                                        <span className={`text-xs font-black ${isLight ? "text-slate-700" : "text-white"}`}>{sess.mcqScore || 0}/50</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] uppercase font-bold text-white/30 block">Coding Score</span>
                                                        <span className={`text-xs font-black ${isLight ? "text-slate-700" : "text-white"}`}>{sess.codingScore || 0}/50</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] uppercase font-bold text-white/30 block">Overall Score</span>
                                                        <span className="text-xs font-black text-sky-400">{sess.score || 0}/100</span>
                                                    </div>
                                                </div>
                                                {isExpanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className={`p-5 border-t space-y-4 font-sans text-xs ${isLight ? "bg-slate-50/20 border-slate-100" : "bg-[#111] border-white/5"
                                                }`}>
                                                <div className="space-y-3">
                                                    <span className="text-[9px] uppercase font-bold text-pink-400 block tracking-wider">AI Coding Grader Feedback</span>
                                                    {sess.codingGradings && Object.keys(sess.codingGradings).length > 0 ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {Object.entries(sess.codingGradings).map(([qId, grading]: [string, any]) => (
                                                                <div key={qId} className={`p-4 rounded-xl border space-y-2.5 ${isLight ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/5"
                                                                    }`}>
                                                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                                        <span className={`text-xs font-bold ${isLight ? "text-slate-800" : "text-white"}`}>Coding Question ID: {qId}</span>
                                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${grading.score >= 7
                                                                            ? "bg-green-500/10 border border-green-500/20 text-green-400"
                                                                            : "bg-red-500/10 border border-red-500/20 text-red-400"
                                                                            }`}>
                                                                            Score: {grading.score}/10
                                                                        </span>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="flex justify-between text-[10px]">
                                                                            <span className="text-white/40 font-bold">Status:</span>
                                                                            <span className="text-sky-400 font-extrabold uppercase">{grading.status}</span>
                                                                        </div>
                                                                        <div className="flex justify-between text-[10px]">
                                                                            <span className="text-white/40 font-bold">Time Complexity:</span>
                                                                            <span className={`font-mono font-bold ${isLight ? "text-slate-700" : "text-white"}`}>{grading.timeComplexity || "N/A"}</span>
                                                                        </div>
                                                                        <div className="flex justify-between text-[10px]">
                                                                            <span className="text-white/40 font-bold">Space Complexity:</span>
                                                                            <span className={`font-mono font-bold ${isLight ? "text-slate-700" : "text-white"}`}>{grading.spaceComplexity || "N/A"}</span>
                                                                        </div>
                                                                    </div>
                                                                    {grading.recommendations && (
                                                                        <div className="space-y-1 border-t border-white/5 pt-2">
                                                                            <span className="text-[9px] uppercase font-bold text-white/30 block">AI Suggestions</span>
                                                                            <p className={`text-[10px] leading-relaxed font-semibold italic ${isLight ? "text-slate-650" : "text-white/60"}`}>
                                                                                &quot;{grading.recommendations}&quot;
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-white/30 italic">No coding evaluations recorded for this session.</span>
                                                    )}
                                                </div>
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
    );
}
