"use client";

import React, { useState } from "react";
import { Handshake, Loader2, Send, Sparkles } from "lucide-react";

type Mode = "simulate" | "coach";

interface ChatTurn {
    role: "user" | "assistant";
    content: string;
    coachNote?: string;
    suggestedScript?: string;
}

interface NegotiatePanelProps {
    className?: string;
    defaultCompany?: string;
    defaultRole?: string;
}

export default function NegotiatePanel({
    className = "",
    defaultCompany = "",
    defaultRole = "",
}: NegotiatePanelProps) {
    const [company, setCompany] = useState(defaultCompany);
    const [role, setRole] = useState(defaultRole);
    const [currentOffer, setCurrentOffer] = useState("");
    const [benefits, setBenefits] = useState("");
    const [targetComp, setTargetComp] = useState("");
    const [batna, setBatna] = useState("");
    const [mode, setMode] = useState<Mode>("coach");
    const [userMessage, setUserMessage] = useState("");
    const [history, setHistory] = useState<ChatTurn[]>([]);
    const [levers, setLevers] = useState<string[]>([]);
    const [redLines, setRedLines] = useState<string[]>([]);
    const [mood, setMood] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function send() {
        if (!userMessage.trim() && history.length === 0) {
            setError("Add a message or opening ask to start.");
            return;
        }
        setLoading(true);
        setError("");
        const msg = userMessage.trim() || "Help me open the negotiation.";
        try {
            const res = await fetch("/api/negotiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company,
                    role,
                    currentOffer,
                    benefits,
                    targetComp,
                    batna,
                    history: history.map((h) => ({ role: h.role, content: h.content })),
                    userMessage: msg,
                    mode,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Request failed");

            const next: ChatTurn[] = [
                ...history,
                { role: "user", content: msg },
                {
                    role: "assistant",
                    content: data.reply,
                    coachNote: data.coachNote,
                    suggestedScript: data.suggestedScript,
                },
            ];
            setHistory(next);
            setLevers(Array.isArray(data.levers) ? data.levers : []);
            setRedLines(Array.isArray(data.redLines) ? data.redLines : []);
            setMood(data.mood || "");
            setUserMessage("");
        } catch (e: any) {
            setError(e.message || "Negotiation assist failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={`rounded-2xl border border-white/10 bg-[#111] p-5 space-y-4 ${className}`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-emerald-400" />
                    Offer Negotiation Lab
                </h3>
                <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
                    {(["coach", "simulate"] as Mode[]).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMode(m)}
                            className={`px-3 py-1.5 capitalize ${
                                mode === m ? "bg-emerald-600 text-white" : "bg-white/5 text-white/60 hover:text-white"
                            }`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Company" value={company} onChange={setCompany} placeholder="Acme Corp" />
                <Field label="Role" value={role} onChange={setRole} placeholder="Software Engineer" />
                <Field label="Current offer" value={currentOffer} onChange={setCurrentOffer} placeholder="$140k base + equity" />
                <Field label="Target comp" value={targetComp} onChange={setTargetComp} placeholder="$155k or equivalent" />
                <Field label="Benefits" value={benefits} onChange={setBenefits} placeholder="Signing, RSUs, remote…" />
                <Field label="BATNA" value={batna} onChange={setBatna} placeholder="Other offer / stay put" />
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {history.length === 0 && (
                    <p className="text-sm text-white/40">
                        Fill in the offer context, then chat in {mode === "coach" ? "coach" : "recruiter simulation"} mode.
                    </p>
                )}
                {history.map((turn, i) => (
                    <div
                        key={i}
                        className={`rounded-xl px-3 py-2 text-sm ${
                            turn.role === "user"
                                ? "bg-indigo-500/15 border border-indigo-500/20 text-white/90 ml-6"
                                : "bg-white/5 border border-white/10 text-white/80 mr-6"
                        }`}
                    >
                        <p className="text-[10px] uppercase tracking-wide text-white/40 mb-1">
                            {turn.role === "user" ? "You" : mode === "simulate" ? "Recruiter" : "Coach"}
                        </p>
                        <p className="leading-relaxed whitespace-pre-wrap">{turn.content}</p>
                        {turn.coachNote && (
                            <p className="mt-2 text-xs text-amber-200/80 flex gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                {turn.coachNote}
                            </p>
                        )}
                        {turn.suggestedScript && (
                            <p className="mt-1.5 text-xs text-emerald-300/80 italic">Script: {turn.suggestedScript}</p>
                        )}
                    </div>
                ))}
            </div>

            {(levers.length > 0 || redLines.length > 0) && (
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    {levers.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <p className="font-semibold text-white/70 mb-1.5">Levers {mood ? `· ${mood}` : ""}</p>
                            <ul className="space-y-1 text-white/55 list-disc list-inside">
                                {levers.map((l) => (
                                    <li key={l}>{l}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {redLines.length > 0 && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                            <p className="font-semibold text-red-300/80 mb-1.5">Red lines</p>
                            <ul className="space-y-1 text-white/55 list-disc list-inside">
                                {redLines.map((r) => (
                                    <li key={r}>{r}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2">
                <input
                    value={userMessage}
                    onChange={(e) => setUserMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void send();
                        }
                    }}
                    placeholder={mode === "coach" ? "Ask for coaching…" : "What you would say to the recruiter…"}
                    className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/40"
                />
                <button
                    type="button"
                    onClick={() => void send()}
                    disabled={loading}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 text-white flex items-center gap-2 text-sm font-medium"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send
                </button>
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <label className="block space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-white/40">{label}</span>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/40"
            />
        </label>
    );
}
