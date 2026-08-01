"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getStorageItem, setStorageItem } from "../utils/storage";
import type { PrepPack } from "../utils/prepPack";
import { Bell, CheckSquare, ClipboardList, Square } from "lucide-react";

interface PrepPackPanelProps {
    className?: string;
}

function loadPacks(): PrepPack[] {
    try {
        const raw = getStorageItem("prepPacks");
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function savePacks(packs: PrepPack[]) {
    setStorageItem("prepPacks", JSON.stringify(packs));
}

export default function PrepPackPanel({ className = "" }: PrepPackPanelProps) {
    const [packs, setPacks] = useState<PrepPack[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());

    const refresh = useCallback(() => {
        const next = loadPacks();
        setPacks(next);
        setActiveId((prev) => {
            if (prev && next.some((p) => p.id === prev)) return prev;
            return next[0]?.id ?? null;
        });
        setNow(Date.now());
    }, []);

    useEffect(() => {
        refresh();
        const onStorage = (e: Event) => {
            const detail = (e as CustomEvent)?.detail;
            if (!detail?.key || detail.key === "prepPacks") refresh();
        };
        window.addEventListener("ai-storage-change", onStorage as EventListener);
        const tick = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => {
            window.removeEventListener("ai-storage-change", onStorage as EventListener);
            window.clearInterval(tick);
        };
    }, [refresh]);

    const active = packs.find((p) => p.id === activeId) || packs[0] || null;

    function toggleChecklist(packId: string, itemId: string) {
        const next = packs.map((p) => {
            if (p.id !== packId) return p;
            return {
                ...p,
                checklist: p.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)),
            };
        });
        setPacks(next);
        savePacks(next);
    }

    function dismissReminder(packId: string, reminderId: string) {
        const next = packs.map((p) => {
            if (p.id !== packId) return p;
            return {
                ...p,
                reminders: p.reminders.map((r) => (r.id === reminderId ? { ...r, fired: true } : r)),
            };
        });
        setPacks(next);
        savePacks(next);
    }

    if (packs.length === 0) {
        return (
            <div className={`rounded-2xl border border-white/10 bg-[#111] p-5 ${className}`}>
                <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
                    <ClipboardList className="w-4 h-4 text-sky-400" />
                    Prep Packs
                </h3>
                <p className="text-sm text-white/45">
                    Analyze a job invite email to auto-build a prep checklist and reminders for that interview.
                </p>
            </div>
        );
    }

    const dueReminders =
        active?.reminders.filter((r) => !r.fired && r.at <= now).sort((a, b) => a.at - b.at) || [];
    const upcomingReminders =
        active?.reminders.filter((r) => !r.fired && r.at > now).sort((a, b) => a.at - b.at) || [];
    const doneCount = active?.checklist.filter((c) => c.done).length || 0;
    const totalCount = active?.checklist.length || 0;

    return (
        <div className={`rounded-2xl border border-white/10 bg-[#111] p-5 space-y-4 ${className}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-sky-400" />
                    Prep Packs
                </h3>
                {packs.length > 1 && (
                    <select
                        value={active?.id || ""}
                        onChange={(e) => setActiveId(e.target.value)}
                        className="rounded-lg bg-black/40 border border-white/10 text-xs text-white px-2 py-1.5"
                    >
                        {packs.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.company} · {p.role}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {active && (
                <>
                    <div>
                        <p className="text-sm font-semibold text-white">
                            {active.company} — {active.role}
                        </p>
                        <p className="text-xs text-white/45 mt-0.5">
                            {active.interviewDate && active.interviewDate !== "Not specified"
                                ? `Interview: ${active.interviewDate}`
                                : "Interview date TBD"}
                            {active.platform ? ` · ${active.platform}` : ""}
                            {` · Checklist ${doneCount}/${totalCount}`}
                        </p>
                    </div>

                    {(dueReminders.length > 0 || upcomingReminders.length > 0) && (
                        <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold flex items-center gap-1">
                                <Bell className="w-3 h-3" /> Reminders
                            </p>
                            {[...dueReminders, ...upcomingReminders.slice(0, 3)].map((r) => {
                                const isDue = r.at <= now;
                                return (
                                    <div
                                        key={r.id}
                                        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                                            isDue
                                                ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                                                : "border-white/10 bg-white/5 text-white/65"
                                        }`}
                                    >
                                        <span>
                                            {r.label}
                                            <span className="text-white/35 ml-1.5">
                                                {new Date(r.at).toLocaleString(undefined, {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </span>
                                        {isDue && (
                                            <button
                                                type="button"
                                                onClick={() => dismissReminder(active.id, r.id)}
                                                className="text-[11px] text-amber-200/80 hover:text-white shrink-0"
                                            >
                                                Dismiss
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">Checklist</p>
                        {active.checklist.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => toggleChecklist(active.id, item.id)}
                                className="w-full flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.07] px-3 py-2 text-left text-sm text-white/80"
                            >
                                {item.done ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                ) : (
                                    <Square className="w-4 h-4 text-white/35 shrink-0 mt-0.5" />
                                )}
                                <span className={item.done ? "line-through text-white/40" : ""}>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {active.hrIntelSummary && (
                        <p className="text-xs text-white/50 leading-relaxed border-t border-white/5 pt-3">
                            {active.hrIntelSummary.slice(0, 400)}
                            {active.hrIntelSummary.length > 400 ? "…" : ""}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
