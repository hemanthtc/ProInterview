"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Mic, MicOff, Send, Users, Volume2, VolumeX, Moon, Sun, Eye } from "lucide-react";
import LabAuthBanner from "@/components/labs/LabAuthBanner";
import { speakInterviewText } from "@/utils/speakInterview";

// SpeechRecognition isn't in the default TS DOM lib — mirror the interview room's usage.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const [muted, setMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [micAvailable, setMicAvailable] = useState(false);

    const recognitionRef = useRef<SpeechRecognitionInstance>(null);
    const mutedRef = useRef(muted);
    const isListeningRef = useRef(isListening);
    useEffect(() => {
        mutedRef.current = muted;
    }, [muted]);
    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");

    useEffect(() => {
        const savedTheme = localStorage.getItem("prointerview_theme") as "dark" | "light" | "eyeprotect" | null;
        if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
            setTheme(savedTheme);
        }
    }, []);

    const isLight = theme === "light" || theme === "eyeprotect";

    const cycleTheme = () => {
        const next = theme === "dark" ? "light" : theme === "light" ? "eyeprotect" : "dark";
        setTheme(next);
        localStorage.setItem("prointerview_theme", next);
        document.documentElement.classList.remove("theme-dark", "theme-light", "theme-eyeprotect");
        document.documentElement.classList.add(`theme-${next}`);
    };

    useEffect(() => {
        fetch("/api/panel-interviewer")
            .then((r) => r.json())
            .then((d) => setPanelists(d.panelists || []))
            .catch(() => {});
        void send("", true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function send(text: string, opening = false) {
        if (loading || done) return;
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
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Panel request failed");
            setMessages((m) => [
                ...m,
                {
                    role: "assistant",
                    content: data.reply,
                    panelist: data.speakerName,
                    speakerRole: data.speakerRole,
                },
            ]);
            if (!mutedRef.current && typeof data.reply === "string" && data.reply.trim()) {
                void speakInterviewText(data.reply, {
                    provider: localStorage.getItem("aiProvider") || "gemini",
                    voiceLanguage: localStorage.getItem("voiceLanguage") || "en-IN",
                    isListening: () => isListeningRef.current,
                    onStart: () => setIsSpeaking(true),
                    onEnd: () => setIsSpeaking(false),
                });
            }
            if (data.passTo) setActiveId(data.passTo);
            if (data.terminate) {
                setDone(true);
                if (data.summary) setSummary(data.summary);
                else {
                    // Lightweight client summary when API omits one
                    setSummary({
                        overall: Math.min(92, 55 + Math.floor(history.length * 3)),
                        strengths: ["Showed up for a multi-interviewer loop", "Responded under panel pressure"],
                        gaps: ["Add metrics to behavioral answers", "Clarify trade-offs when challenged"],
                        nextDrills: ["Practice a STAR story", "Run a system design prompt"],
                    });
                }
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed");
        } finally {
            setLoading(false);
        }
    }

    const stopListening = useCallback(() => {
        if (!recognitionRef.current) return;
        try {
            recognitionRef.current.stop();
        } catch {
            /* ignore */
        }
        setIsListening(false);
    }, []);

    // Speech recognition's onresult closure is created once on mount, so route
    // auto-send through a ref to always call the latest `send` (fresh state/deps).
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

        setMicAvailable(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new (SpeechRecognitionCtor as any)();
        // Single-utterance mode with interim results: fill the input live, then
        // auto-send once the browser reports a final transcript for this utterance.
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = localStorage.getItem("voiceLanguage") || "en-IN";

        recognition.onresult = (event: {
            results: { length: number; [i: number]: { isFinal: boolean; [i: number]: { transcript: string } } };
        }) => {
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
            try {
                recognition.stop();
            } catch {
                /* ignore */
            }
        };
    }, []);

    function toggleListening() {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            return;
        }
        try {
            recognitionRef.current.start();
            setIsListening(true);
        } catch {
            /* already started */
        }
    }

    return (
        <div className={`min-h-screen transition-colors duration-300 ${
            theme === "light"
                ? "bg-slate-100 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-slate-950 text-white"
        }`}>
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <p className={`text-xs uppercase tracking-widest flex items-center gap-2 ${isLight ? "text-indigo-600 font-bold" : "text-indigo-300/80"}`}>
                            <Users className="w-4 h-4" /> Panel interview
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold">Multi-interviewer round</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={cycleTheme}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
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
                        <Link href="/prep" className="text-xs font-bold text-indigo-400 hover:underline">
                            Prep dashboard
                        </Link>
                        <Link
                            href="/labs"
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition shadow-sm ${
                                theme === "eyeprotect"
                                    ? "bg-[#0b5f58] text-[#fffcf5] border-[#084842] hover:bg-[#084842]"
                                    : isLight
                                    ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                    : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                            }`}
                        >
                            ← Back to Labs
                        </Link>
                    </div>
                </div>

                <div className="mb-4 flex items-center justify-end gap-2">
                    {isSpeaking && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-indigo-300/80">
                            <Volume2 className="w-3.5 h-3.5" /> Speaking…
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => setMuted(!muted)}
                        title={muted ? "Unmute panelist voices" : "Mute panelist voices"}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
                            muted ? "border-white/10 text-white/50" : "border-indigo-400/30 bg-indigo-500/15 text-indigo-100"
                        }`}
                    >
                        {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        {muted ? "Muted" : "Voice on"}
                    </button>
                </div>

                <LabAuthBanner feature="panel interviews" />

                <div className="mb-6 flex flex-wrap gap-2">
                    {panelists.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => setActiveId(p.id)}
                            className={`rounded-full px-3 py-1.5 text-xs border transition ${
                                activeId === p.id
                                    ? (theme === "eyeprotect"
                                        ? "bg-[#0b5f58] border-[#0b5f58] text-white font-bold"
                                        : isLight
                                        ? "bg-indigo-600 border-indigo-600 text-white font-bold"
                                        : "bg-indigo-500/30 border-indigo-400 text-white font-bold")
                                    : (isLight
                                        ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                        : "border-white/10 text-white/50 hover:text-white")
                            }`}
                        >
                            {p.name} · {p.role}
                        </button>
                    ))}
                </div>

                <div className={`rounded-2xl border min-h-[420px] p-4 space-y-3 ${
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
                        <div className="space-y-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm">
                            <p className="text-emerald-200 font-semibold">Panel concluded.</p>
                            {summary && (
                                <>
                                    <div className="text-2xl font-semibold text-emerald-300">
                                        {summary.overall ?? "—"}
                                        <span className="text-sm text-white/40">/100 estimated</span>
                                    </div>
                                    {summary.strengths && (
                                        <ul className="list-disc pl-5 text-white/70">
                                            {summary.strengths.map((s) => <li key={s}>{s}</li>)}
                                        </ul>
                                    )}
                                    {summary.gaps && (
                                        <div>
                                            <p className="mb-1 text-xs uppercase text-amber-200/80">Gaps</p>
                                            <ul className="list-disc pl-5 text-white/70">
                                                {summary.gaps.map((s) => <li key={s}>{s}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Link href="/star-coach" className="text-violet-300 underline font-bold">STAR coach →</Link>
                                        <Link href="/film-room" className="text-rose-300 underline font-bold">Film room →</Link>
                                        <Link href="/system-design" className="text-cyan-300 underline font-bold">System design →</Link>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <form
                    className="mt-4 flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send(input);
                    }}
                >
                    <input
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
                            disabled={loading || done}
                            title={isListening ? "Stop microphone" : "Answer by voice"}
                            className={`rounded-xl border p-2.5 transition ${
                                isListening
                                    ? "border-rose-500/50 bg-rose-500/20 text-rose-300 animate-pulse"
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
