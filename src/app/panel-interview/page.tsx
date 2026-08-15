"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    Loader2,
    Mic,
    MicOff,
    Send,
    Users,
    Volume2,
    VolumeX,
    Moon,
    Sun,
    Eye,
    CheckCircle2,
    HelpCircle,
    XCircle,
    Award,
} from "lucide-react";
import LabAuthBanner from "@/components/labs/LabAuthBanner";
import { speakInterviewText, stopSpeechInterviewText } from "@/utils/speakInterview";

type SpeechRecognitionInstance = any;

interface Panelist {
    id: string;
    name: string;
    role: string;
}

interface Msg {
    role: "user" | "assistant";
    content: string;
    panelist?: string;
    speakerRole?: string;
}

interface PanelSummary {
    overall?: number;
    strengths?: string[];
    gaps?: string[];
    nextDrills?: string[];
}

export default function PanelInterviewPage() {
    const [panelists, setPanelists] = useState<Panelist[]>([]);
    const [activeId, setActiveId] = useState("tech_lead");
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const [summary, setSummary] = useState<PanelSummary | null>(null);
    const [pastSummary, setPastSummary] = useState<PanelSummary | null>(null);
    const [muted, setMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [micAvailable, setMicAvailable] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const recognitionRef = useRef<SpeechRecognitionInstance>(null);
    const mutedRef = useRef(muted);
    const isListeningRef = useRef(isListening);
    const isSpeakingRef = useRef(isSpeaking);

    useEffect(() => {
        mutedRef.current = muted;
    }, [muted]);
    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);
    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
    }, [isSpeaking]);

    // Auto-scroll chat container smoothly when messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");

    useEffect(() => {
        const savedTheme = localStorage.getItem("prointerview_theme") as "dark" | "light" | "eyeprotect" | null;
        Promise.resolve().then(() => {
            if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
                setTheme(savedTheme);
            }
            try {
                const storedPast = localStorage.getItem("prointerview_panel_past_scorecard");
                if (storedPast) setPastSummary(JSON.parse(storedPast));
            } catch {
                /* ignore */
            }
        });
    }, []);

    const isLight = theme === "light" || theme === "eyeprotect";

    const cycleTheme = () => {
        const next = theme === "dark" ? "light" : theme === "light" ? "eyeprotect" : "dark";
        setTheme(next);
        localStorage.setItem("prointerview_theme", next);
        document.documentElement.classList.remove("theme-dark", "theme-light", "theme-eyeprotect");
        document.documentElement.classList.add(`theme-${next}`);
    };

    const stopListening = useCallback(() => {
        if (!recognitionRef.current) return;
        try {
            recognitionRef.current.stop();
        } catch {
            /* ignore */
        }
        setIsListening(false);
    }, []);

    const teardownAudioAndMic = useCallback(() => {
        stopSpeechInterviewText();
        stopListening();
    }, [stopListening]);

    const closeInterview = useCallback(() => {
        teardownAudioAndMic();
        setMessages([]);
        setInput("");
        setDone(false);
        setSummary(null);
        setError("");
    }, [teardownAudioAndMic]);

    const hasStartedRef = useRef(false);
    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        fetch("/api/panel-interviewer")
            .then((r) => r.json())
            .then((d) => setPanelists(d.panelists || []))
            .catch(() => {});
        void send("", true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function send(text: string, opening = false) {
        if (loading || done) return;

        // Immediately pause speech recognition to isolate mic from AI speech playback
        stopListening();
        stopSpeechInterviewText();

        setLoading(true);
        setError("");
        const history = messages;
        if (!opening && text.trim()) {
            setMessages((m) => [...m, { role: "user", content: text.trim() }]);
            setInput("");
        }
        try {
            const resume = typeof window !== "undefined" ? localStorage.getItem("userResumeCvText") || "" : "";
            const res = await fetch("/api/panel-interviewer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    history,
                    message: opening ? "" : text,
                    resume,
                    company: localStorage.getItem("targetCompany") || "a tech company",
                    role: localStorage.getItem("preferredRoles") || "Software Engineer",
                    activePanelistId: activeId,
                    sessionId: localStorage.getItem("userIdentifier") || "anon",
                    companyClone: localStorage.getItem("companyCloneMode") !== "false",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Panel request failed");

            const cleanReply = (typeof data.reply === "string" ? data.reply : "")
                .replace(/\[PASS_TO:[^\]]+\]/gi, "")
                .replace(/\[TERMINATE\]/gi, "")
                .replace(/```json[\s\S]*?```/gi, "")
                .trim();

            if (data.speakerId) setActiveId(data.speakerId);
            else if (data.passTo) setActiveId(data.passTo);

            setMessages((m) => [
                ...m,
                {
                    role: "assistant",
                    content: cleanReply,
                    panelist: data.speakerName,
                    speakerRole: data.speakerRole,
                },
            ]);
            if (!mutedRef.current && cleanReply) {
                void speakInterviewText(cleanReply, {
                    provider: localStorage.getItem("aiProvider") || "gemini",
                    voiceLanguage: localStorage.getItem("voiceLanguage") || "en-IN",
                    isListening: () => isListeningRef.current,
                    onStart: () => {
                        setIsSpeaking(true);
                        stopListening();
                    },
                    onEnd: () => setIsSpeaking(false),
                });
            }
            if (data.terminate) {
                setDone(true);
                const userTurns = history.filter(
                    (h) => h.role === "user" && h.content && !/i don'?t know|skip/i.test(h.content)
                );
                const finalSummary = data.summary || {
                    overall: userTurns.length === 0 ? 0 : Math.min(90, Math.max(40, userTurns.length * 12)),
                    strengths: userTurns.length === 0 ? ["Attended panel loop session"] : ["Showed up for a multi-interviewer loop", "Responded under panel pressure"],
                    gaps: userTurns.length === 0 ? ["No answers submitted for evaluation"] : ["Add metrics to behavioral answers", "Clarify trade-offs when challenged"],
                    nextDrills: ["Practice a STAR story", "Run a system design prompt"],
                };
                setSummary(finalSummary);
                try {
                    localStorage.setItem("prointerview_panel_past_scorecard", JSON.stringify(finalSummary));
                    setPastSummary(finalSummary);
                } catch {
                    /* ignore */
                }
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed");
        } finally {
            setLoading(false);
        }
    }

    const sendRef = useRef(send);
    useEffect(() => {
        sendRef.current = send;
    });

    useEffect(() => {
        if (typeof window === "undefined") return;
        const SpeechRecognitionCtor =
            (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
                .SpeechRecognition ||
            (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
                .webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) return;

        Promise.resolve().then(() => setMicAvailable(true));
        const recognition = new (SpeechRecognitionCtor as any)();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = localStorage.getItem("voiceLanguage") || "en-IN";

        recognition.onresult = (event: {
            results: { length: number; [i: number]: { isFinal: boolean; [i: number]: { transcript: string } } };
        }) => {
            // Discard speech recognition output if AI speaker is active (prevents feedback auto-answers)
            if (isSpeakingRef.current) return;

            let transcript = "";
            let isFinal = false;
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
                if (event.results[i].isFinal) isFinal = true;
            }
            setInput(transcript);
            if (isFinal && transcript.trim()) {
                setIsListening(false);
                void sendRef.current(transcript.trim());
            }
        };
        recognition.onerror = (event: { error?: string }) => {
            if (event.error === "not-allowed") setIsListening(false);
        };
        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        return () => {
            stopSpeechInterviewText();
            try {
                recognition.stop();
            } catch {
                /* ignore */
            }
        };
    }, []);

    useEffect(() => {
        return () => {
            teardownAudioAndMic();
        };
    }, [teardownAudioAndMic]);

    function toggleListening() {
        if (!recognitionRef.current || isSpeaking) return;
        if (isListening) {
            stopListening();
            return;
        }
        try {
            recognitionRef.current.start();
            setIsListening(true);
        } catch {
            /* already started */
        }
    }

    const handleIKnowAnswer = () => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleIDontKnowAnswer = () => {
        if (loading || done) return;
        void send("I don't know this question, please move to the next question.");
    };

    return (
        <div className={`min-h-screen transition-colors duration-300 ${
            theme === "light"
                ? "bg-slate-100 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-slate-950 text-white"
        }`}>
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header Container */}
                <div className="mb-6 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] sm:text-xs uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap ${isLight ? "text-indigo-600 font-bold" : "text-indigo-300/80"}`}>
                            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Panel interview
                        </p>
                        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
                            <button
                                onClick={cycleTheme}
                                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                                    isLight
                                        ? "bg-white text-slate-800 border-slate-300 hover:bg-slate-50 shadow-sm"
                                        : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                                }`}
                                title={`Current Theme: ${theme}. Click to switch.`}
                            >
                                {theme === "dark" && <><Moon className="w-3.5 h-3.5 text-indigo-400" /> <span className="hidden sm:inline">Dark</span></>}
                                {theme === "light" && <><Sun className="w-3.5 h-3.5 text-amber-500" /> <span className="hidden sm:inline">Light</span></>}
                                {theme === "eyeprotect" && <><Eye className="w-3.5 h-3.5 text-teal-600" /> <span className="hidden sm:inline">Eye Comfort</span></>}
                            </button>
                            <button
                                type="button"
                                onClick={closeInterview}
                                className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-600 border border-rose-500/20 bg-rose-500/10 px-2.5 sm:px-3 py-1.5 rounded-full transition cursor-pointer"
                            >
                                <XCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Close Interview</span><span className="sm:hidden">Close</span>
                            </button>
                            <Link
                                href="/labs"
                                onClick={teardownAudioAndMic}
                                className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold border transition shadow-sm whitespace-nowrap ${
                                    theme === "eyeprotect"
                                        ? "bg-[#0b5f58] text-[#fffcf5] border-[#084842] hover:bg-[#084842]"
                                        : isLight
                                        ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                        : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                                }`}
                            >
                                <span className="hidden sm:inline">← Back to Labs</span>
                                <span className="sm:hidden">← Labs</span>
                            </Link>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">Multi-interviewer round</h1>
                        <button
                            type="button"
                            onClick={() => setMuted(!muted)}
                            title={muted ? "Unmute panelist voices" : "Mute panelist voices"}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer transition ${
                                isLight
                                    ? (muted ? "border-slate-300 bg-slate-200/80 text-slate-700" : "border-indigo-300 bg-indigo-100 text-indigo-800 shadow-sm")
                                    : (muted ? "border-white/10 text-white/50 bg-white/5" : "border-indigo-400/30 bg-indigo-500/20 text-indigo-200")
                            }`}
                        >
                            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-400" />}
                            {muted ? "Muted" : "Voice on"}
                            {isSpeaking && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
                            )}
                        </button>
                    </div>
                </div>

                {pastSummary && !done && (
                    <div className={`mb-4 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs ${
                        theme === "light"
                            ? "bg-indigo-50/80 border-indigo-200 text-indigo-900"
                            : theme === "eyeprotect"
                            ? "bg-[#f5efe6] border-[#8c8578] text-[#1c1917]"
                            : "bg-indigo-500/10 border-indigo-500/30 text-indigo-200"
                    }`}>
                        <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span>
                                <b>Last Panel Score: {pastSummary.overall ?? "—"}/100</b>
                                {pastSummary.strengths?.[0] ? ` · ${pastSummary.strengths[0]}` : ""}
                            </span>
                        </div>
                    </div>
                )}

                <LabAuthBanner feature="panel interviews" />

                {/* 3D Overlapping Card Stack — Agents Hide Behind Each Other Like a Scrollable Deck */}
                {(() => {
                    if (!panelists.length) return null;
                    const activeIndex = panelists.findIndex((p) => p.id === activeId);
                    const activeIdx = activeIndex >= 0 ? activeIndex : 0;
                    const ordered = [
                        panelists[activeIdx],
                        panelists[(activeIdx + 1) % panelists.length],
                        panelists[(activeIdx + 2) % panelists.length],
                    ].filter(Boolean);

                    const cycleNextAgent = () => {
                        const nextIdx = (activeIdx + 1) % panelists.length;
                        if (panelists[nextIdx]) setActiveId(panelists[nextIdx].id);
                    };

                    const cyclePrevAgent = () => {
                        const prevIdx = (activeIdx - 1 + panelists.length) % panelists.length;
                        if (panelists[prevIdx]) setActiveId(panelists[prevIdx].id);
                    };

                    return (
                        <div className="mb-4 flex items-center justify-center gap-1 sm:gap-2 py-1 select-none">
                            <button
                                type="button"
                                onClick={cyclePrevAgent}
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border transition cursor-pointer flex items-center justify-center text-xs font-bold shrink-0 ${
                                    isLight ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm" : "bg-slate-900 border-white/10 text-white/70 hover:text-white"
                                }`}
                                title="Previous agent card"
                            >
                                ‹
                            </button>

                            <div className="relative flex items-center justify-center min-h-[42px] px-1 overflow-visible">
                                <div className="flex items-center justify-center">
                                    {ordered.map((p, index) => {
                                        const isFront = index === 0;
                                        const zIndex = isFront ? 30 : index === 1 ? 20 : 10;
                                        const scale = isFront ? "scale-100" : index === 1 ? "scale-95" : "scale-90";
                                        const opacity = isFront ? "opacity-100" : index === 1 ? "opacity-75 hover:opacity-100" : "opacity-45 hover:opacity-90";
                                        const offsetMargin = index === 0 ? "" : "-ml-6 sm:-ml-10";
                                        const offsetTranslate = index === 0 ? "translate-x-0" : index === 1 ? "translate-x-1 sm:translate-x-2" : "translate-x-2 sm:translate-x-4";

                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => setActiveId(p.id)}
                                                style={{ zIndex }}
                                                className={`relative transition-all duration-300 transform ${scale} ${opacity} ${offsetMargin} ${offsetTranslate} rounded-xl text-xs cursor-pointer shrink-0 border backdrop-blur-md shadow-lg ${
                                                    isFront
                                                        ? (theme === "eyeprotect"
                                                            ? "bg-[#0b5f58] border-[#084842] text-white shadow-teal-950/30 ring-1 ring-[#0b5f58]/40 px-3 sm:px-4 py-1.5 font-bold"
                                                            : isLight
                                                            ? "bg-indigo-600 border-indigo-700 text-white shadow-indigo-500/25 ring-1 ring-indigo-400/40 px-3 sm:px-4 py-1.5 font-bold"
                                                            : "bg-indigo-600/95 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] ring-1 ring-indigo-500/50 px-3 sm:px-4 py-1.5 font-bold")
                                                        : (theme === "eyeprotect"
                                                            ? "bg-[#fffcf5] border-[#8c8578] text-[#1c1917] px-2.5 sm:px-3 py-1 font-medium"
                                                            : isLight
                                                            ? "bg-white border-slate-300 text-slate-700 shadow-sm px-2.5 sm:px-3 py-1 font-medium"
                                                            : "bg-slate-900/90 border-white/20 text-white/70 px-2.5 sm:px-3 py-1 font-medium")
                                                }`}
                                            >
                                                <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                    {isFront ? (
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                                        </span>
                                                    ) : (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400/60" />
                                                    )}
                                                    <span className={isFront ? "font-bold text-xs" : "font-medium text-[11px]"}>
                                                        {p.name}
                                                    </span>
                                                    <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded ${
                                                        isFront ? "bg-black/25 opacity-90 font-semibold" : "opacity-60 hidden sm:inline"
                                                    }`}>
                                                        {p.role}
                                                    </span>
                                                    {isFront && isSpeaking && (
                                                        <span className="text-[9px] text-emerald-300 font-bold animate-pulse hidden sm:inline">
                                                            Asking…
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={cycleNextAgent}
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border transition cursor-pointer flex items-center justify-center text-xs font-bold shrink-0 ${
                                    isLight ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm" : "bg-slate-900 border-white/10 text-white/70 hover:text-white"
                                }`}
                                title="Next agent card"
                            >
                                ›
                            </button>
                        </div>
                    );
                })()}

                {/* Fixed-Height Scrollable Chat Container */}
                <div className={`rounded-2xl border h-[460px] max-h-[60vh] overflow-y-auto scroll-smooth p-4 space-y-3 pr-2 ${
                    theme === "light"
                        ? "bg-white border-slate-200 shadow-sm"
                        : theme === "eyeprotect"
                        ? "bg-[#fffcf5] border-[#8c8578]"
                        : "bg-white/5 border-white/10"
                }`}>
                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`rounded-xl px-3.5 py-2.5 text-sm ${
                                m.role === "user"
                                    ? (theme === "eyeprotect"
                                        ? "bg-[#0b5f58] text-[#fffcf5] ml-8"
                                        : isLight
                                        ? "bg-indigo-600 text-white ml-8"
                                        : "bg-indigo-500/20 text-white ml-8")
                                    : (theme === "light"
                                        ? "bg-slate-100 text-slate-900 border border-slate-200 mr-8"
                                        : theme === "eyeprotect"
                                        ? "bg-[#e8dcc8]/60 text-[#1c1917] border border-[#8c8578]/40 mr-8"
                                        : "bg-black/30 text-white border border-white/10 mr-8")
                            }`}
                        >
                            {m.panelist && (
                                <div className={`text-[10px] uppercase tracking-wide mb-1 font-bold ${
                                    m.role === "user"
                                        ? "text-white/90"
                                        : isLight
                                        ? "text-indigo-700"
                                        : "text-indigo-300"
                                }`}>
                                    {m.panelist} · {m.speakerRole}
                                </div>
                            )}
                            {m.content}
                        </div>
                    ))}
                    {loading && (
                        <div className={`flex items-center gap-2 text-sm ${isLight ? "text-slate-500" : "text-white/50"}`}>
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Panel thinking…
                        </div>
                    )}
                    {error && <p className="text-rose-500 text-sm font-semibold">{error}</p>}
                    {done && (
                        <div className={`space-y-3 rounded-xl border p-4 text-sm ${
                            theme === "light"
                                ? "border-emerald-300 bg-emerald-50 text-slate-900 shadow-sm"
                                : theme === "eyeprotect"
                                ? "border-emerald-700/50 bg-[#e8f5e9] text-[#1c1917]"
                                : "border-emerald-400/30 bg-emerald-500/10 text-white"
                        }`}>
                            <p className="text-emerald-700 dark:text-emerald-200 font-semibold">Panel concluded.</p>
                            {summary && (
                                <>
                                    <div className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
                                        {summary.overall ?? "—"}
                                        <span className={`text-sm ${isLight ? "text-slate-500" : "text-white/40"}`}>/100 estimated</span>
                                    </div>
                                    {summary.strengths && (
                                        <ul className={`list-disc pl-5 ${isLight ? "text-slate-700" : "text-white/70"}`}>
                                            {summary.strengths.map((s) => <li key={s}>{s}</li>)}
                                        </ul>
                                    )}
                                    {summary.gaps && (
                                        <div>
                                            <p className="mb-1 text-xs uppercase font-bold text-amber-700 dark:text-amber-200/80">Gaps</p>
                                            <ul className={`list-disc pl-5 ${isLight ? "text-slate-700" : "text-white/70"}`}>
                                                {summary.gaps.map((s) => <li key={s}>{s}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Link href="/star-coach" className="text-violet-700 dark:text-violet-300 underline font-bold">STAR coach →</Link>
                                        <Link href="/film-room" className="text-rose-700 dark:text-rose-300 underline font-bold">Film room →</Link>
                                        <Link href="/system-design" className="text-cyan-700 dark:text-cyan-300 underline font-bold">System design →</Link>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Fixed Control Bar Below Chat Container */}
                {!done && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleIKnowAnswer}
                                disabled={loading}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer disabled:opacity-50 ${
                                    isLight
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 shadow-sm"
                                        : "bg-emerald-500/15 border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/25"
                                }`}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" /> I know answer
                            </button>
                            <button
                                type="button"
                                onClick={handleIDontKnowAnswer}
                                disabled={loading}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer disabled:opacity-50 ${
                                    isLight
                                        ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 shadow-sm"
                                        : "bg-amber-500/15 border-amber-400/30 text-amber-200 hover:bg-amber-500/25"
                                }`}
                            >
                                <HelpCircle className="w-3.5 h-3.5" /> I don&apos;t know (Skip)
                            </button>
                        </div>
                    </div>
                )}

                <form
                    className="mt-3 flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send(input);
                    }}
                >
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isListening ? "Listening…" : "Answer the active panelist…"}
                        className={`flex-1 rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none transition ${
                            isLight
                                ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 shadow-sm"
                                : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-indigo-500/50"
                        }`}
                        disabled={loading || done}
                    />
                    {micAvailable && (
                        <button
                            type="button"
                            onClick={toggleListening}
                            disabled={loading || done || isSpeaking}
                            title={isListening ? "Stop microphone" : "Answer by voice"}
                            className={`rounded-xl border p-2.5 transition cursor-pointer disabled:opacity-40 ${
                                isListening
                                    ? "border-rose-500/50 bg-rose-500/20 text-rose-600 dark:text-rose-300 animate-pulse font-bold"
                                    : isLight
                                    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-sm"
                                    : "border-white/10 bg-white/5 text-white/70 hover:text-white"
                            }`}
                        >
                            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading || done || !input.trim()}
                        className={`rounded-xl px-4 py-2.5 text-sm font-bold transition flex items-center justify-center cursor-pointer ${
                            theme === "eyeprotect"
                                ? "bg-[#0b5f58] hover:bg-[#084842] text-white disabled:opacity-50"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                        }`}
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
