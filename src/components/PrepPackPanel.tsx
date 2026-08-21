"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getStorageItem, setStorageItem, removeStorageItem } from "../utils/storage";
import type { PrepPack } from "../utils/prepPack";
import { Bell, CheckSquare, ClipboardList, Square, Trash2, Play, Compass, DollarSign, Calendar, Mail } from "lucide-react";
import { syncSessionsToCloud } from "../utils/cloudSync";

interface PrepPackPanelProps {
    className?: string;
    onCreateRoadmap?: (company: string, role: string, skills: string[]) => void;
    onOpenNegotiation?: (company: string, role: string) => void;
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

async function savePacks(packs: PrepPack[]) {
    setStorageItem("prepPacks", JSON.stringify(packs));
    try {
        await syncSessionsToCloud({ prepPacks: packs, clearAllPrepPacks: packs.length === 0 });
    } catch (e) {
        console.error("Failed to sync prep packs to cloud:", e);
    }
}

export default function PrepPackPanel({
    className = "",
    onCreateRoadmap,
    onOpenNegotiation,
}: PrepPackPanelProps) {
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
        Promise.resolve().then(() => refresh());
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

    function dismissAllReminders(packId: string) {
        const next = packs.map((p) => {
            if (p.id !== packId) return p;
            return {
                ...p,
                reminders: p.reminders.map((r) => ({ ...r, fired: true })),
            };
        });
        setPacks(next);
        savePacks(next);
    }

    async function deletePack(packId: string) {
        if (!confirm("Are you sure you want to delete this prep pack? All checklist items and reminders will be cleared.")) return;
        const next = packs.filter((p) => p.id !== packId);
        setPacks(next);
        await savePacks(next);
        if (next.length > 0) {
            setActiveId(next[0].id);
        } else {
            setActiveId(null);
        }
    }

    async function resetPrepPack(packId: string) {
        if (!confirm("Are you sure you want to clear all data for this prep pack? All checklist items and reminders will be permanently deleted.")) return;
        const next = packs.filter((p) => p.id !== packId);
        setPacks(next);
        await savePacks(next);
        if (next.length > 0) {
            setActiveId(next[0].id);
        } else {
            setActiveId(null);
        }
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
        <div className={`rounded-2xl border border-white/10 bg-[#111] p-3 sm:p-4 space-y-3 overflow-hidden ${className}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate">Prep Packs</span>
                </h3>
                {active && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => deletePack(active.id)}
                            className="p-1 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer flex items-center justify-center shrink-0"
                            title="Delete Prep Pack"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {packs.length > 1 && (
                <div className="w-full">
                    <select
                        value={active?.id || ""}
                        onChange={(e) => setActiveId(e.target.value)}
                        className="w-full max-w-full rounded-lg bg-black/50 border border-white/10 text-xs text-white px-2.5 py-1.5 outline-none focus:border-sky-500/50 truncate cursor-pointer"
                    >
                        {packs.map((p) => (
                            <option key={p.id} value={p.id} className="bg-[#181818] text-white">
                                {p.company} · {p.role}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {active && (
                <>
                    <div>
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <p className="text-xs sm:text-sm font-semibold text-white truncate min-w-0 flex-1">
                                {active.company} — {active.role}
                            </p>
                            <button
                                type="button"
                                onClick={() => resetPrepPack(active.id)}
                                className="text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                title="Reset reminders and checklist"
                            >
                                Clear All Data
                            </button>
                        </div>
                        <p className="text-[11px] text-white/45 mt-0.5 truncate">
                            {active.interviewDate && active.interviewDate !== "Not specified"
                                ? `Interview: ${active.interviewDate}`
                                : "Interview date TBD"}
                            {active.platform ? ` · ${active.platform}` : ""}
                            {` · Checklist ${doneCount}/${totalCount}`}
                        </p>
                    </div>

                    {(dueReminders.length > 0 || upcomingReminders.length > 0) && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold flex items-center gap-1">
                                    <Bell className="w-3 h-3" /> Reminders
                                </p>
                                <button
                                    type="button"
                                    onClick={() => dismissAllReminders(active.id)}
                                    className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                            {[...dueReminders, ...upcomingReminders.slice(0, 3)].map((r) => {
                                const isDue = r.at <= now;
                                return (
                                    <div
                                        key={r.id}
                                        className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
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

                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">Checklist</p>
                        {active.checklist.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => toggleChecklist(active.id, item.id)}
                                className="w-full flex items-start gap-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/[0.08] px-2.5 py-1.5 text-left text-xs text-white/90 transition-all"
                            >
                                {item.done ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                ) : (
                                    <Square className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                                )}
                                <span className={item.done ? "line-through text-white/40" : ""}>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {active.meetingUrl && (
                            <a
                                href={active.meetingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-[11px] font-bold text-white transition-all shrink-0 text-center"
                            >
                                Open Google Meet / call link
                            </a>
                        )}
                        <div className="w-full flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                            <button
                                type="button"
                                onClick={() => {
                                    setStorageItem("targetCompany", active.company);
                                    setStorageItem("preferredRoles", active.role);
                                    setStorageItem("interviewLevel", getStorageItem("interviewLevel") || "intermediate");
                                    setStorageItem(
                                        "focusedRetakePrompt",
                                        `Run a focused 15-minute mini mock for ${active.role} at ${active.company}. Ask 4 tight questions covering motivation, one STAR story, one technical depth check, and logistics.`
                                    );
                                    if (active.hrName) {
                                        /* keep any existing activeHrIntel */
                                    }
                                    window.location.href = "/setup";
                                }}
                                className="flex-1 min-w-[130px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-white/90 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                            >
                                <Play className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                Start 15-min mini mock
                            </button>
                            {onCreateRoadmap && (
                                <button
                                    type="button"
                                    onClick={() => onCreateRoadmap(active.company, active.role, active.skills)}
                                    className="flex-1 min-w-[130px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-white/90 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                                >
                                    <Compass className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    Create Roadmap
                                </button>
                            )}
                        </div>

                        <div className="w-full flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                            {onOpenNegotiation && (
                                <button
                                    type="button"
                                    onClick={() => onOpenNegotiation(active.company, active.role)}
                                    className="flex-1 min-w-[130px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-white/90 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                                >
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    Open Negotiator
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={async () => {
                                    const meet = active.meetingUrl || "";
                                    const lines = [
                                        "BEGIN:VCALENDAR",
                                        "VERSION:2.0",
                                        "PRODID:-//ProInterview//PrepPack//EN",
                                        ...active.reminders
                                            .filter((r) => !r.fired)
                                            .map((r) => {
                                                const dt = new Date(r.at);
                                                const stamp = dt
                                                    .toISOString()
                                                    .replace(/[-:]/g, "")
                                                    .replace(/\.\d{3}Z$/, "Z");
                                                return [
                                                    "BEGIN:VEVENT",
                                                    `UID:${active.id}-${r.id}@prointerview`,
                                                    `DTSTAMP:${stamp}`,
                                                    `DTSTART:${stamp}`,
                                                    `SUMMARY:ProInterview prep — ${r.label} (${active.company})`,
                                                    `DESCRIPTION:Prep for ${active.role} at ${active.company}${meet ? `\\nJoin: ${meet}` : ""}`,
                                                    ...(meet ? [`URL:${meet}`, `LOCATION:${meet}`] : []),
                                                    "END:VEVENT",
                                                ].join("\r\n");
                                            }),
                                        "END:VCALENDAR",
                                    ].join("\r\n");
                                    const filename = `prointerview-prep-${active.company.replace(/\s+/g, "-").toLowerCase()}.ics`;
                                    const blob = new Blob([lines], { type: "text/calendar;charset=utf-8" });

                                    const isMobileOrPwa = typeof window !== "undefined" && (
                                        /android|iphone|ipad|ipod/i.test(navigator.userAgent) ||
                                        window.matchMedia("(display-mode: standalone)").matches
                                    );

                                    if (isMobileOrPwa && typeof navigator !== "undefined") {
                                        try {
                                            const icsFile = new File([lines], filename, { type: "text/calendar" });
                                            if (navigator.canShare && navigator.canShare({ files: [icsFile] })) {
                                                await navigator.share({
                                                    title: `ProInterview Prep — ${active.company}`,
                                                    text: `Add prep reminders for ${active.role} at ${active.company} to your calendar`,
                                                    files: [icsFile],
                                                });
                                                return;
                                            }
                                        } catch (e: any) {
                                            if (e.name === "AbortError") return;
                                        }

                                        // Fallback via Data URI download to launch Android System Calendar chooser
                                        try {
                                            const dataUri = "data:text/calendar;charset=utf-8," + encodeURIComponent(lines);
                                            const link = document.createElement("a");
                                            link.href = dataUri;
                                            link.download = filename;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            return;
                                        } catch (e) {
                                            console.error("Calendar chooser fallback failed", e);
                                        }
                                    }

                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = filename;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}
                                className="flex-1 min-w-[130px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-white/90 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                            >
                                <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                Add to calendar (.ics)
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={async () => {
                                const email = localStorage.getItem("userIdentifier") || "";
                                if (!email || !email.includes("@")) {
                                    alert("Sign in with email to send reminder notifications.");
                                    return;
                                }
                                const reminder = active.reminders.find((r) => !r.fired) || active.reminders[0];
                                if (!reminder) return;
                                await fetch("/api/notify-prep", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        email,
                                        channel: "email",
                                        pack: active,
                                        reminder,
                                    }),
                                });
                                alert("Reminder notification requested.");
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-white/90 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                        >
                            <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            Email / WhatsApp reminder
                        </button>
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
