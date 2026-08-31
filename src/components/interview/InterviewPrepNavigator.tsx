"use client";

import { Briefcase, Building2 } from "lucide-react";
import type { CampusPathId, InterviewPrepLogic } from "@/types/interviewPrep";

interface InterviewPrepNavigatorProps {
    logic: InterviewPrepLogic;
    selectedPath: CampusPathId | null;
    onSelectPath: (path: CampusPathId) => void;
    isLight: boolean;
}

export default function InterviewPrepNavigator({
    logic,
    selectedPath,
    onSelectPath,
    isLight,
}: InterviewPrepNavigatorProps) {
    if (selectedPath) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="list">
            {(Object.entries(logic.paths) as [CampusPathId, (typeof logic.paths)[CampusPathId]][]).map(
                ([key, data]) => {
                    const isCampus = key === "onCampus";
                    const iconBg = isCampus
                        ? "bg-pink-500/10 border-pink-500/20 text-pink-400"
                        : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";

                    return (
                        <button
                            type="button"
                            key={key}
                            role="listitem"
                            onClick={() => onSelectPath(key)}
                            className={`text-left border rounded-2xl p-6 space-y-4 cursor-pointer transition-all duration-300 group ${
                                isLight
                                    ? "bg-white border-slate-200 hover:bg-slate-50/80"
                                    : "bg-[#0d0d12]/50 hover:bg-[#12121a]/70 border-white/5"
                            } ${
                                isCampus
                                    ? isLight
                                        ? "hover:border-pink-500 hover:shadow-[0_0_30px_rgba(236,72,153,0.06)]"
                                        : "border-pink-500/10 hover:border-pink-500/35 hover:shadow-[0_0_30px_rgba(236,72,153,0.06)]"
                                    : isLight
                                      ? "hover:border-indigo-500 hover:shadow-[0_0_30px_rgba(79,70,229,0.06)]"
                                      : "border-indigo-500/10 hover:border-indigo-500/35 hover:shadow-[0_0_30px_rgba(79,70,229,0.06)]"
                            }`}
                        >
                            <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${iconBg}`}
                            >
                                {isCampus ? (
                                    <Briefcase className="w-6 h-6" aria-hidden />
                                ) : (
                                    <Building2 className="w-6 h-6" aria-hidden />
                                )}
                            </div>
                            <div className="space-y-1.5 text-left">
                                <h4
                                    className={`text-base font-extrabold transition-colors ${
                                        isLight
                                            ? isCampus
                                                ? "text-slate-900 group-hover:text-pink-650"
                                                : "text-slate-900 group-hover:text-indigo-650"
                                            : isCampus
                                              ? "text-white group-hover:text-pink-400"
                                              : "text-white group-hover:text-indigo-400"
                                    }`}
                                >
                                    {data.label} Path
                                </h4>
                                <p
                                    className={`text-[11px] font-bold ${isLight ? "text-slate-500" : "text-white/40"} uppercase tracking-wider`}
                                >
                                    {data.difficulty} {"\u2022"} {data.duration}
                                </p>
                                <p
                                    className={`text-xs ${isLight ? "text-slate-700" : "text-white/55"} leading-relaxed font-semibold`}
                                >
                                    {data.evaluation.whatTheyJudge}
                                </p>
                            </div>
                        </button>
                    );
                }
            )}
        </div>
    );
}
