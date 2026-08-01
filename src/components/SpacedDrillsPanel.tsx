"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getStorageItem, setStorageItem } from "../utils/storage";
import { buildSpacedDrills, drillsDue, type SpacedDrill } from "../utils/spacedDrills";
import { CalendarClock, RefreshCw, Zap } from "lucide-react";

interface SpacedDrillsPanelProps {
    className?: string;
}

function loadDrills(): SpacedDrill[] {
    try {
        const raw = getStorageItem("spacedDrills");
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {
        /* ignore */
    }
    try {
        const sessions = JSON.parse(getStorageItem("interviewSessions") || "[]");
        const built = buildSpacedDrills(sessions);
        setStorageItem("spacedDrills", JSON.stringify(built));
        return built;
    } catch {
        return [];
    }
}

export default function SpacedDrillsPanel({ className = "" }: SpacedDrillsPanelProps) {
    const [drills, setDrills] = useState<SpacedDrill[]>([]);
    const [now, setNow] = useState(() => Date.now());

    const refresh = useCallback(() => {
        const next = loadDrills();
        setDrills(next);
        setNow(Date.now());
    }, []);

    useEffect(() => {
        refresh();
        const onStorage = (e: Event) => {
            const detail = (e as CustomEvent)?.detail;
            if (!detail?.key || detail.key === "spacedDrills" || detail.key === "interviewSessions") {
                refresh();
            }
        };
        window.addEventListener("ai-storage-change", onStorage as EventListener);
        return () => window.removeEventListener("ai-storage-change", onStorage as EventListener);
    }, [refresh]);

    const due = drillsDue(drills, now);
    const upcoming = drills.filter((d) => d.dueAt > now);

    function rebuildFromSessions() {
        try {
            const sessions = JSON.parse(getStorageItem("interviewSessions") || "[]");
            const built = buildSpacedDrills(sessions);
            setStorageItem("spacedDrills", JSON.stringify(built));
            setDrills(built);
            setNow(Date.now());
        } catch {
            setDrills([]);
        }
    }

    function markDone(id: string) {
        const next = drills.filter((d) => d.id !== id);
        setDrills(next);
        setStorageItem("spacedDrills", JSON.stringify(next));
    }

    return (
        <div className={`rounded-2xl border border-white/10 bg-[#111] p-5 space-y-4 ${className}`}>
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Spaced Drills
                </h3>
                <button
                    type="button"
                    onClick={rebuildFromSessions}
                    className="text-xs text-white/50 hover:text-white flex items-center gap-1"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Rebuild
                </button>
            </div>

            {drills.length === 0 ? (
                <p className="text-sm text-white/45">
                    Complete an interview to generate spaced practice drills from your weak spots.
                </p>
            ) : (
                <>
                    <Section title={`Due now (${due.length})`}>
                        {due.length === 0 ? (
                            <p className="text-xs text-white/40">Nothing due — nice. Check upcoming below.</p>
                        ) : (
                            due.map((d) => <DrillCard key={d.id} drill={d} onDone={() => markDone(d.id)} due />)
                        )}
                    </Section>
                    <Section title={`Upcoming (${upcoming.length})`}>
                        {upcoming.slice(0, 5).map((d) => (
                            <DrillCard key={d.id} drill={d} onDone={() => markDone(d.id)} />
                        ))}
                    </Section>
                </>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">{title}</p>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function DrillCard({
    drill,
    onDone,
    due,
}: {
    drill: SpacedDrill;
    onDone: () => void;
    due?: boolean;
}) {
    const dueLabel = new Date(drill.dueAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
    return (
        <div
            className={`rounded-xl border p-3 space-y-2 ${
                due ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-white/5"
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-semibold text-white">{drill.topic}</p>
                    <p className="text-[11px] text-white/45 mt-0.5">{drill.reason}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-white/40 shrink-0">{drill.difficulty}</span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">{drill.prompt}</p>
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] text-white/40 flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    {due ? "Due now" : `Due ${dueLabel}`} · {drill.practiceType}
                </span>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setStorageItem("focusedRetakePrompt", drill.prompt);
                            setStorageItem("interviewLevel", drill.difficulty);
                            window.location.href = "/setup";
                        }}
                        className="text-[11px] font-bold text-teal-300 hover:text-teal-200"
                    >
                        Practice now →
                    </button>
                    <button
                        type="button"
                        onClick={onDone}
                        className="text-[11px] font-medium text-indigo-300 hover:text-indigo-200"
                    >
                        Mark done
                    </button>
                </div>
            </div>
        </div>
    );
}
