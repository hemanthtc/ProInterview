"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Mic, MicOff, Send, Users, Volume2, VolumeX } from "lucide-react";
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function toggleListening() {
        if (!recognitionRef.current) return;
        if (isListening) {
            stopListening();
            return;
        }
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
        try {
            recognitionRef.current.start();
            setIsListening(true);
        } catch {
            /* already started */
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto max-w-4xl px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-indigo-300/80">
                            <Users className="h-4 w-4" /> Panel interview
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold">Multi-interviewer round</h1>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-sm">
                        <Link href="/prep" className="text-indigo-300 hover:underline">
                            Prep dashboard
                        </Link>
                        <Link href="/labs" className="text-white/60 hover:text-white">
                            ← Labs
                        </Link>
                    </div>
                </div>

                <div className="mb-4 flex items-center justify-end gap-2">
                    {isSpeaking && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-indigo-300/80">
                            <Volume2 className="h-3.5 w-3.5" /> Speaking…
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setMuted((m) => !m);
                            if (!muted) {
                                window.speechSynthesis?.cancel();
                                setIsSpeaking(false);
                            }
                        }}
                        title={muted ? "Unmute panelist voices" : "Mute panelist voices"}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
                            muted
                                ? "border-white/10 text-white/50"
                                : "border-indigo-400/30 bg-indigo-500/15 text-indigo-100"
                        }`}
                    >
                        {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
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
                            className={`rounded-full border px-3 py-1.5 text-xs ${
                                activeId === p.id
                                    ? "border-indigo-400 bg-indigo-500/30 text-white"
                                    : "border-white/10 text-white/50"
                            }`}
                        >
                            {p.name} · {p.role}
                        </button>
                    ))}
                </div>

                <div className="min-h-[420px] space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`rounded-xl px-3 py-2 text-sm ${
                                m.role === "user" ? "ml-8 bg-indigo-500/20" : "mr-8 bg-black/30"
                            }`}
                        >
                            {m.panelist && (
                                <div className="mb-1 text-[10px] uppercase tracking-wide text-indigo-300">
                                    {m.panelist} · {m.speakerRole}
                                </div>
                            )}
                            {m.content}
                        </div>
                    ))}
                    {loading && (
                        <div className="flex items-center gap-2 text-sm text-white/50">
                            <Loader2 className="h-4 w-4 animate-spin" /> Panel thinking…
                        </div>
                    )}
                    {error && <p className="text-sm text-rose-300">{error}</p>}
                    {done && (
                        <div className="space-y-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm">
                            <p className="text-emerald-200">Panel concluded.</p>
                            {summary && (
                                <>
                                    <div className="text-2xl font-semibold text-emerald-300">
                                        {summary.overall ?? "—"}
                                        <span className="text-sm text-white/40">/100 estimated</span>
                                    </div>
                                    {summary.strengths && (
                                        <ul className="list-disc pl-5 text-white/70">
                                            {summary.strengths.map((s) => (
                                                <li key={s}>{s}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {summary.gaps && (
                                        <div>
                                            <p className="mb-1 text-xs uppercase text-amber-200/80">Gaps</p>
                                            <ul className="list-disc pl-5 text-white/70">
                                                {summary.gaps.map((s) => (
                                                    <li key={s}>{s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Link href="/star-coach" className="text-violet-300 underline">
                                            STAR coach →
                                        </Link>
                                        <Link href="/film-room" className="text-rose-300 underline">
                                            Film room →
                                        </Link>
                                        <Link href="/system-design" className="text-cyan-300 underline">
                                            System design →
                                        </Link>
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
                        className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
                        disabled={loading || done}
                    />
                    {micAvailable && (
                        <button
                            type="button"
                            onClick={toggleListening}
                            disabled={loading || done}
                            title={isListening ? "Stop microphone" : "Answer by voice"}
                            className={`shrink-0 rounded-xl px-3 py-2.5 transition-colors disabled:opacity-40 ${
                                isListening
                                    ? "bg-green-500 text-black shadow-lg shadow-green-500/30 animate-pulse"
                                    : "border border-white/10 text-white/70 hover:text-white"
                            }`}
                        >
                            {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading || done || !input.trim()}
                        className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium disabled:opacity-40"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
