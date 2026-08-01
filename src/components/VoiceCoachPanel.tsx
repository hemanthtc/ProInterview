"use client";

import React from "react";
import type { VoiceCoachSnapshot } from "../utils/voiceCoach";
import { Activity, Gauge, MessageSquareWarning, Type } from "lucide-react";

interface VoiceCoachPanelProps {
    snapshot: VoiceCoachSnapshot | null;
    compact?: boolean;
    className?: string;
}

const moodColor: Record<VoiceCoachSnapshot["moodHint"], string> = {
    calm: "text-sky-400",
    rushed: "text-amber-400",
    hesitant: "text-orange-400",
    strong: "text-emerald-400",
};

export default function VoiceCoachPanel({ snapshot, compact = false, className = "" }: VoiceCoachPanelProps) {
    if (!snapshot) {
        return (
            <div className={`rounded-2xl border border-white/10 bg-[#111] p-4 text-sm text-white/50 ${className}`}>
                Voice coach idle — speak to get live confidence, pace, and filler feedback.
            </div>
        );
    }

    const fillerPct = Math.round((snapshot.fillerRate || 0) * 1000) / 10;

    return (
        <div className={`rounded-2xl border border-white/10 bg-[#111] p-4 space-y-3 ${className}`}>
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    Voice Coach
                </h3>
                <span className={`text-xs font-bold uppercase tracking-wide ${moodColor[snapshot.moodHint]}`}>
                    {snapshot.moodHint}
                </span>
            </div>

            <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"} gap-2`}>
                <Stat
                    icon={<Gauge className="w-3.5 h-3.5" />}
                    label="Confidence"
                    value={`${snapshot.confidence}`}
                    suffix="/100"
                />
                <Stat icon={<Activity className="w-3.5 h-3.5" />} label="Pace" value={`${snapshot.wpm}`} suffix="WPM" />
                <Stat
                    icon={<MessageSquareWarning className="w-3.5 h-3.5" />}
                    label="Fillers"
                    value={`${snapshot.fillers}`}
                    suffix={`${fillerPct}%`}
                />
                <Stat icon={<Type className="w-3.5 h-3.5" />} label="Words" value={`${snapshot.words}`} />
            </div>

            {snapshot.tips?.length > 0 && (
                <ul className="space-y-1.5">
                    {snapshot.tips.map((tip, i) => (
                        <li
                            key={`${i}-${tip.slice(0, 24)}`}
                            className="text-xs text-white/70 leading-relaxed border-l-2 border-indigo-500/50 pl-2"
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
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    suffix?: string;
}) {
    return (
        <div className="rounded-xl bg-white/5 border border-white/5 px-3 py-2">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-white/40 mb-1">
                {icon}
                {label}
            </div>
            <p className="text-lg font-bold text-white leading-none">
                {value}
                {suffix ? <span className="text-[10px] font-medium text-white/35 ml-1">{suffix}</span> : null}
            </p>
        </div>
    );
}
