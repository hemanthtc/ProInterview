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

                    <div className="flex flex-wrap gap-2 pt-1">
                        {active.meetingUrl && (
                            <a
                                href={active.meetingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white"
                            >
                                Open Google Meet / call link
                            </a>
                        )}
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
                            className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-bold text-white cursor-pointer"
                        >
                            Start 15-min mini mock
                        </button>
                        <button
                            type="button"
                            onClick={() => {
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
                                const blob = new Blob([lines], { type: "text/calendar;charset=utf-8" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `prointerview-prep-${active.company.replace(/\s+/g, "-").toLowerCase()}.ics`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 cursor-pointer"
                        >
                            Download calendar (.ics)
                        </button>
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
                            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 cursor-pointer"
                        >
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
