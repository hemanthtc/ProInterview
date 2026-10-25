"use client";

import React, { useState } from "react";
import type { VoiceCoachSnapshot } from "../utils/voiceCoach";
import { Activity, Gauge, MessageSquareWarning, Type, ChevronDown, ChevronUp } from "lucide-react";

interface VoiceCoachPanelProps {
    snapshot: VoiceCoachSnapshot | null;
    compact?: boolean;
    className?: string;
    defaultCollapsed?: boolean;
    theme?: "dark" | "light" | "eyeprotect";
}

const moodBadgeClasses: Record<VoiceCoachSnapshot["moodHint"], { text: string; bg: string; border: string }> = {
    calm: { text: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30" },
    rushed: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    hesitant: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
    strong: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
};

export default function VoiceCoachPanel({
    snapshot,
    compact = false,
    className = "",
    defaultCollapsed,
    theme = "dark",
}: VoiceCoachPanelProps) {
    // Default to collapsed in compact modes to prevent obscuring transcript questions
    const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed ?? (compact ? true : false));

    const isLight = theme === "light";
    const isEye = theme === "eyeprotect";

    // Idle state: render a slim, non-intrusive status pill (height ~32px)
    if (!snapshot) {
        return (
            <div
                className={`rounded-xl border px-3 py-1.5 flex items-center justify-between text-xs transition-all ${
                    isEye
                        ? "border-[#8c8578]/40 bg-[#fffcf5] text-[#57534e]"
                        : isLight
                        ? "border-slate-200 bg-white text-slate-500 shadow-sm"
                        : "border-white/10 bg-[#111] text-white/50"
                } ${className}`}
            >
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-semibold text-[11px]">Voice Coach listening</span>
                </div>
                <span className="text-[10px] opacity-60">Speak to see live metrics</span>
            </div>
        );
    }

    const fillerPct = Math.round((snapshot.fillerRate || 0) * 1000) / 10;
    const moodStyle = moodBadgeClasses[snapshot.moodHint] || moodBadgeClasses.calm;

    // Collapsed HUD bar (~32px height): shows key metrics inline, frees ~180px of vertical space
    if (isCollapsed) {
        return (
            <div
                onClick={() => setIsCollapsed(false)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setIsCollapsed(false)}
                className={`group rounded-xl border px-3 py-1.5 flex items-center justify-between gap-2 transition-all cursor-pointer select-none hover:shadow-md ${
                    isEye
                        ? "border-[#8c8578]/50 bg-[#fffcf5] text-[#1c1917] hover:border-[#8c8578]"
                        : isLight
                        ? "border-slate-200 bg-white text-slate-800 hover:border-indigo-400 shadow-sm"
                        : "border-white/10 bg-[#111] text-white hover:border-indigo-500/40"
                } ${className}`}
                title="Click to expand detailed Voice Coach metrics & tips"
            >
                {/* Left: Brand + Mood */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <Activity className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold tracking-tight">Voice Coach</span>
                    <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${moodStyle.text} ${moodStyle.bg} ${moodStyle.border}`}
                    >
                        {snapshot.moodHint}
                    </span>
                </div>

                {/* Center: Live Stats Preview */}
                <div className="flex items-center gap-2.5 text-[11px] opacity-80 overflow-hidden font-medium">
                    <span className="flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-sky-400" />
                        <span>{snapshot.confidence}</span>
                        <span className="text-[9px] opacity-50">/100</span>
                    </span>
                    <span className="hidden sm:flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        <span>{snapshot.wpm}</span>
                        <span className="text-[9px] opacity-50">wpm</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <MessageSquareWarning className="w-3 h-3 text-amber-400" />
                        <span>{snapshot.fillers}</span>
                        <span className="text-[9px] opacity-50">flr</span>
                    </span>
                </div>

                {/* Right: Expand Toggle */}
                <div className="flex items-center gap-0.5 text-[10px] font-semibold text-indigo-400 group-hover:text-indigo-300 shrink-0">
                    <span className="hidden sm:inline text-[10px]">Details</span>
                    <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" />
                </div>
            </div>
        );
    }

    // Expanded detailed view
    return (
        <div
            className={`rounded-2xl border p-3.5 space-y-2.5 transition-all shadow-lg ${
                isEye
                    ? "border-[#8c8578] bg-[#fffcf5] text-[#1c1917]"
                    : isLight
                    ? "border-slate-200 bg-white text-slate-800 shadow-slate-200/50"
                    : "border-white/10 bg-[#111] text-white shadow-black/40"
            } ${className}`}
        >
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Voice Coach</h3>
                    <span
                        className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${moodStyle.text} ${moodStyle.bg} ${moodStyle.border}`}
                    >
                        {snapshot.moodHint}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => setIsCollapsed(true)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded-md hover:bg-indigo-500/10 transition-colors cursor-pointer"
                    title="Minimize Voice Coach to view question in full"
                >
                    <span>Minimize</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"} gap-1.5`}>
                <Stat
                    icon={<Gauge className="w-3 h-3 text-sky-400" />}
                    label="Confidence"
                    value={`${snapshot.confidence}`}
                    suffix="/100"
                    isLight={isLight}
                    isEye={isEye}
                />
                <Stat
                    icon={<Activity className="w-3 h-3 text-emerald-400" />}
                    label="Pace"
                    value={`${snapshot.wpm}`}
                    suffix="WPM"
                    isLight={isLight}
                    isEye={isEye}
                />
                <Stat
                    icon={<MessageSquareWarning className="w-3 h-3 text-amber-400" />}
                    label="Fillers"
                    value={`${snapshot.fillers}`}
                    suffix={`${fillerPct}%`}
                    isLight={isLight}
                    isEye={isEye}
                />
                <Stat
                    icon={<Type className="w-3 h-3 text-indigo-400" />}
                    label="Words"
                    value={`${snapshot.words}`}
                    isLight={isLight}
                    isEye={isEye}
                />
            </div>

            {snapshot.tips?.length > 0 && (
                <ul className="space-y-1 pt-1 max-h-24 overflow-y-auto pr-1">
                    {snapshot.tips.map((tip, i) => (
                        <li
                            key={`${i}-${tip.slice(0, 24)}`}
                            className={`text-[11px] leading-relaxed border-l-2 border-indigo-500/60 pl-2 ${
                                isEye ? "text-[#57534e]" : isLight ? "text-slate-600" : "text-white/70"
                            }`}
                        >
                            {tip}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function Stat({
    icon,
    label,
    value,
    suffix,
    isLight,
    isEye,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    suffix?: string;
    isLight?: boolean;
    isEye?: boolean;
}) {
    return (
        <div
            className={`rounded-xl border px-2.5 py-1.5 transition-all ${
                isEye
                    ? "bg-[#f5ebd9]/50 border-[#8c8578]/30"
                    : isLight
                    ? "bg-slate-50 border-slate-200"
                    : "bg-white/5 border-white/5"
            }`}
        >
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider opacity-60 mb-0.5">
                {icon}
                {label}
            </div>
            <p className="text-base font-bold leading-none">
                {value}
                {suffix ? <span className="text-[9px] font-medium opacity-50 ml-1">{suffix}</span> : null}
            </p>
        </div>
    );
}
