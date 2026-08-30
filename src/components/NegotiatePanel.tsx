"use client";

import React, { useState, useRef, useEffect } from "react";
import { Handshake, Loader2, Send, Sparkles, ChevronDown, ChevronUp, RotateCcw, Copy, Check } from "lucide-react";

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
    defaultCurrentOffer?: string;
    defaultBenefits?: string;
    onUpdateStrategy?: (strategy: { levers: string[]; redLines: string[]; mood: string }) => void;
}

const CURRENCY_OPTIONS = [
    { code: "USD", symbol: "$" },
    { code: "INR", symbol: "₹" },
    { code: "EUR", symbol: "€" },
    { code: "GBP", symbol: "£" },
    { code: "CAD", symbol: "C$" },
    { code: "AUD", symbol: "A$" },
    { code: "SGD", symbol: "S$" },
    { code: "AED", symbol: "AED" },
];

export default function NegotiatePanel({
    className = "",
    defaultCompany = "",
    defaultRole = "",
    defaultCurrentOffer = "",
    defaultBenefits = "",
    onUpdateStrategy,
}: NegotiatePanelProps) {
    const [company, setCompany] = useState(defaultCompany);
    const [role, setRole] = useState(defaultRole);
    const [currentOffer, setCurrentOffer] = useState(defaultCurrentOffer);
    const [targetComp, setTargetComp] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [payPeriod, setPayPeriod] = useState<"annually" | "monthly">("annually");
    const [benefits, setBenefits] = useState(defaultBenefits);
    const [batna, setBatna] = useState("");
    const [mode, setMode] = useState<Mode>("coach");
    const [userMessage, setUserMessage] = useState("");
    const [history, setHistory] = useState<ChatTurn[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showInputs, setShowInputs] = useState(true);
    const [copiedScriptIndex, setCopiedScriptIndex] = useState<number | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-collapse inputs when conversation begins
    useEffect(() => {
        if (history.length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowInputs(false);
        }
    }, [history.length]);

    // Auto-scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history, loading]);

    async function send(messageToSend?: string) {
        const textToUse = messageToSend || userMessage;
        if (!textToUse.trim() && history.length === 0) {
            setError("Add a message or opening ask to start negotiation.");
            return;
        }
        setLoading(true);
        setError("");
        const msg = textToUse.trim() || "Help me open the negotiation effectively.";
        try {
            const res = await fetch("/api/negotiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company,
                    role,
                    currentOffer,
                    currency,
                    payPeriod,
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
            setShowInputs(false);
            const newLevers = Array.isArray(data.levers) ? data.levers : [];
            const newRedLines = Array.isArray(data.redLines) ? data.redLines : [];
            const newMood = data.mood || "";

            setUserMessage("");

            if (onUpdateStrategy) {
                onUpdateStrategy({
                    levers: newLevers,
                    redLines: newRedLines,
                    mood: newMood,
                });
            }
        } catch (e: any) {
            setError(e.message || "Negotiation assist failed");
        } finally {
            setLoading(false);
        }
    }

    const resetSession = () => {
        setHistory([]);
        setShowInputs(true);
        setUserMessage("");
        setError("");
    };

    const copyScript = (script: string, idx: number) => {
        navigator.clipboard.writeText(script);
        setCopiedScriptIndex(idx);
        setTimeout(() => setCopiedScriptIndex(null), 2000);
    };

    const currencySymbol = CURRENCY_OPTIONS.find((c) => c.code === currency)?.symbol || "$";

    return (
        <div className={`rounded-2xl border border-white/10 bg-[#111] p-3 sm:p-5 md:p-6 space-y-3 sm:space-y-4 shadow-2xl flex flex-col w-full max-w-full overflow-x-hidden negotiate-modal-lock ${className}`}>
                {/* Header Controls */}
                <div className="flex items-center justify-between gap-2.5 flex-wrap border-b border-white/10 pb-3 sm:pb-4 w-full min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                            <Handshake className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
                                Offer Negotiation Lab
                            </h3>
                            <p className="text-[10px] sm:text-xs text-white/50 truncate">Strategy, scripts & recruiter simulations</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                        {history.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowInputs(!showInputs)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-[11px] text-white/70 hover:text-white hover:bg-white/10 transition-all"
                            >
                                {showInputs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {showInputs ? "Hide Context" : "Edit Context"}
                            </button>
                        )}

                        {history.length > 0 && (
                            <button
                                type="button"
                                onClick={resetSession}
                                title="Reset Negotiation Session"
                                className="p-1 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        )}

                        {/* Mode Switcher */}
                        <div className="flex rounded-lg overflow-hidden border border-white/10 text-[11px] sm:text-xs bg-black/40 p-0.5 max-w-full">
                            {(["coach", "simulate"] as Mode[]).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setMode(m)}
                                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md capitalize font-medium transition-all cursor-pointer ${
                                        mode === m
                                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                                            : "text-white/60 hover:text-white"
                                    }`}
                                >
                                    {m === "coach" ? "🧙‍♂️ Coach" : "🎭 Recruiter Simulator"}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Offer Context Input Section (Collapsible once conversation begins) */}
                {showInputs ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5 sm:p-4 space-y-3 sm:space-y-4 transition-all animate-fadeIn">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                                Offer & Compensation Details
                            </span>
                            {history.length > 0 && (
                                <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                    Active Chat Connected
                                </span>
                            )}
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                            <Field label="Company" value={company} onChange={setCompany} placeholder="e.g. Google, Microsoft, Startup" />
                            <Field label="Role Title" value={role} onChange={setRole} placeholder="e.g. Senior Software Engineer" />
                            
                            {/* Integrated Compensation Field 1: Current Offer */}
                            <CompField
                                label="Current Offer"
                                value={currentOffer}
                                onChange={setCurrentOffer}
                                placeholder="e.g. 140,000"
                                currency={currency}
                                onCurrencyChange={setCurrency}
                                payPeriod={payPeriod}
                                onPayPeriodChange={setPayPeriod}
                            />

                            {/* Integrated Compensation Field 2: Target Comp */}
                            <CompField
                                label="Target Compensation"
                                value={targetComp}
                                onChange={setTargetComp}
                                placeholder="e.g. 165,000"
                                currency={currency}
                                onCurrencyChange={setCurrency}
                                payPeriod={payPeriod}
                                onPayPeriodChange={setPayPeriod}
                            />

                            <Field label="Benefits & Perks" value={benefits} onChange={setBenefits} placeholder="e.g. 15% bonus, RSUs, Sign-on, Remote" />
                            <Field label="BATNA / Competing Offers" value={batna} onChange={setBatna} placeholder="e.g. $150k rival offer or staying put" />
                        </div>
                    </div>
                ) : (
                    /* Compact Context Pill when hidden during conversation */
                    <div className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-white/80">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-emerald-400">{company || "Offer Negotiation"}</span>
                            {role && <span className="text-white/40">• {role}</span>}
                            {currentOffer && (
                                <span className="bg-white/10 px-2 py-0.5 rounded text-[11px] text-white/90">
                                    Current: {currencySymbol}{currentOffer} {payPeriod === "monthly" ? "/mo" : "/yr"}
                                </span>
                            )}
                            {targetComp && (
                                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded text-[11px]">
                                    Target: {currencySymbol}{targetComp} {payPeriod === "monthly" ? "/mo" : "/yr"}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowInputs(true)}
                            className="text-[11px] text-emerald-400 hover:underline shrink-0 ml-2 font-medium"
                        >
                            Edit Context
                        </button>
                    </div>
                )}

                {/* Conversation Interface - Expanded & Larger */}
                <div className={`space-y-4 overflow-y-auto pr-1 sm:pr-1.5 border border-white/10 bg-black/30 rounded-xl p-2.5 sm:p-4 transition-all ${
                    history.length > 0 ? "min-h-[350px] sm:min-h-[500px] max-h-[75vh] flex-1" : "min-h-[260px] sm:min-h-[280px] max-h-[380px]"
                }`}>
                    {history.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                            <div className="p-3 rounded-full bg-white/5 border border-white/10 text-emerald-400">
                                <Handshake className="w-8 h-8" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-white">Ready to Negotiate Your Package</h4>
                                <p className="text-xs text-white/50 max-w-md mt-1">
                                    Enter your offer metrics above, then send a message below to start coaching or recruiter simulation.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center mt-2">
                                <button
                                    type="button"
                                    onClick={() => void send("How should I open the salary negotiation for this offer?")}
                                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-emerald-300 transition-all"
                                >
                                    💡 &quot;How should I open negotiation?&quot;
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void send("What counter-offer number should I target based on my details?")}
                                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-indigo-300 transition-all"
                                >
                                    🎯 &quot;What counter-offer should I send?&quot;
                                </button>
                            </div>
                        </div>
                    )}

                    {history.map((turn, i) => (
                        <div
                            key={i}
                            className={`rounded-2xl p-3 sm:p-4 text-sm transition-all shadow-lg ${
                                turn.role === "user"
                                    ? "bg-indigo-600/20 border border-indigo-500/30 text-white ml-2 sm:ml-8 md:ml-16"
                                    : "bg-white/[0.04] border border-white/10 text-white/90 mr-2 sm:mr-8 md:mr-16"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                    turn.role === "user"
                                        ? "bg-indigo-500/20 text-indigo-300"
                                        : mode === "simulate"
                                        ? "bg-purple-500/20 text-purple-300"
                                        : "bg-emerald-500/20 text-emerald-300"
                                }`}>
                                    {turn.role === "user" ? "You (Candidate)" : mode === "simulate" ? "Hiring Manager / Recruiter" : "AI Compensation Coach"}
                                </span>
                            </div>

                            <p className="leading-relaxed whitespace-pre-wrap text-sm text-white/90">{turn.content}</p>

                            {/* Coach Insights */}
                            {turn.coachNote && (
                                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 space-y-1">
                                    <span className="font-semibold flex items-center gap-1.5 text-amber-300">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                        Coach Insight
                                    </span>
                                    <p className="leading-relaxed">{turn.coachNote}</p>
                                </div>
                            )}

                            {/* Suggested Script with Copy Action */}
                            {turn.suggestedScript && (
                                <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200/90 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-emerald-300">Recommended Script:</span>
                                        <button
                                            type="button"
                                            onClick={() => copyScript(turn.suggestedScript!, i)}
                                            className="flex items-center gap-1 text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded transition-all"
                                        >
                                            {copiedScriptIndex === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            {copiedScriptIndex === i ? "Copied!" : "Copy Script"}
                                        </button>
                                    </div>
                                    <p className="italic leading-relaxed text-emerald-100/90 font-mono bg-black/30 p-2.5 rounded-lg border border-emerald-500/20">
                                        &quot;{turn.suggestedScript}&quot;
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}

                    {loading && (
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 text-sm animate-pulse mr-12">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                            <span>Analyzing offer data and composing tactical advice...</span>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>

                {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">{error}</p>}

                {/* Chat Input Bar */}
                <div className="flex items-center gap-1.5 sm:gap-2 pt-1 w-full min-w-0">
                    <input
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                void send();
                            }
                        }}
                        placeholder={
                            mode === "coach"
                                ? "Ask your coach (e.g. 'How do I ask for $15k more base salary?')..."
                                : "Type what you would say to the recruiter in simulation..."
                        }
                        className="flex-1 min-w-0 rounded-xl bg-black/50 border border-white/15 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
                    />
                    <button
                        type="button"
                        onClick={() => void send()}
                        disabled={loading}
                        className="shrink-0 min-w-max rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 sm:px-5 py-2.5 sm:py-3 text-white flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
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
            <span className="text-[11px] uppercase tracking-wide text-white/60 font-medium">{label}</span>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/40 transition-all"
            />
        </label>
    );
}

function CompField({
    label,
    value,
    onChange,
    placeholder,
    currency,
    onCurrencyChange,
    payPeriod,
    onPayPeriodChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    currency: string;
    onCurrencyChange: (c: string) => void;
    payPeriod: "annually" | "monthly";
    onPayPeriodChange: (p: "annually" | "monthly") => void;
}) {
    return (
        <label className="block space-y-1 w-full min-w-0">
            <span className="text-[11px] uppercase tracking-wide text-white/60 font-medium">{label}</span>
            <div className="flex items-center rounded-xl bg-black/40 border border-white/10 overflow-hidden focus-within:border-emerald-500/50 transition-all w-full min-w-0">
                {/* Left Side Scrollable Currency Selector */}
                <select
                    value={currency}
                    onChange={(e) => onCurrencyChange(e.target.value)}
                    style={{ colorScheme: "dark", backgroundColor: "#18181b", color: "#ffffff" }}
                    className="bg-[#18181b] text-white text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-2 sm:py-2.5 border-r border-white/10 outline-none cursor-pointer hover:bg-neutral-800 focus:bg-[#18181b] transition-colors shrink-0 [color-scheme:dark]"
                >
                    {CURRENCY_OPTIONS.map((c) => (
                        <option 
                            key={c.code} 
                            value={c.code}
                            style={{ backgroundColor: "#18181b", color: "#ffffff" }}
                            className="bg-[#18181b] text-white py-1.5 px-2"
                        >
                            {c.symbol} {c.code}
                        </option>
                    ))}
                </select>

                {/* Amount Input */}
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent px-2 sm:px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none min-w-0"
                />

                {/* Right Side Frequency Selector (Monthly / Yearly) */}
                <select
                    value={payPeriod}
                    onChange={(e) => onPayPeriodChange(e.target.value as "annually" | "monthly")}
                    style={{ colorScheme: "dark", backgroundColor: "#18181b", color: "#ffffff" }}
                    className="bg-[#18181b] text-white text-[11px] sm:text-xs px-2 sm:px-2.5 py-2 sm:py-2.5 border-l border-white/10 outline-none cursor-pointer hover:bg-neutral-800 focus:bg-[#18181b] transition-colors shrink-0 [color-scheme:dark]"
                >
                    <option value="annually" style={{ backgroundColor: "#18181b", color: "#ffffff" }} className="bg-[#18181b] text-white py-1">/yr</option>
                    <option value="monthly" style={{ backgroundColor: "#18181b", color: "#ffffff" }} className="bg-[#18181b] text-white py-1">/mo</option>
                </select>
            </div>
        </label>
    );
}
