"use client";

import { Volume2 } from "lucide-react";

export default function DefaultInterviewerAvatar({ speaking, compact = false }: { speaking: boolean; compact?: boolean }) {
    const size = compact ? "w-20 h-20" : "w-28 h-28";
    const core = compact ? "w-12 h-12" : "w-16 h-16";
    const icon = compact ? "w-6 h-6" : "w-8 h-8";
    return (
        <div className="relative flex flex-col items-center justify-center">
            <div className={`relative ${size} flex items-center justify-center`}>
                <div
                    className={`absolute inset-0 rounded-full border border-indigo-500/30 ${speaking ? "animate-pulse scale-110" : "opacity-40"}`}
                />
                <div
                    className={`${core} rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.4)] ${speaking ? "scale-110" : ""} transition-transform`}
                >
                    <Volume2 className={`${icon} text-white`} />
                </div>
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-widest text-indigo-300/80 font-bold">SVG interviewer</p>
            <p className="text-[10px] text-white/35">Works without D-ID</p>
        </div>
    );
}
