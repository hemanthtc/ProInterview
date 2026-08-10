"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, History, Loader2, Mic, MicOff, RefreshCw, Sparkles, Target, Volume2, Wifi } from "lucide-react";
import {
    STAR_CATEGORY_LABELS,
    type StarCoachQuestion,
    type StarQuestionCategory,
} from "@/data/starCoachQuestions";
import { loadStarHistory, saveStarHistoryEntry, type StarHistoryEntry } from "@/utils/labProgress";
import LabAuthBanner from "@/components/labs/LabAuthBanner";
import { readApiError } from "@/utils/apiError";
import { speakInterviewText } from "@/utils/speakInterview";

// SpeechRecognition isn't in the default TS DOM lib — mirror the interview room's usage.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

interface CoachResult {
    score?: number;
    starBreakdown?: Record<string, string>;
    missing?: string[];
    improvedStory?: string;
    retakePrompt?: string;
    tips?: string[];
}

/** Short spoken summary of the score + top tips read back to the candidate. */
function buildSpeechSummary(data: CoachResult): string {
    const parts: string[] = [];
    if (typeof data.score === "number") parts.push(`Score: ${data.score} out of 100.`);
    if (data.tips && data.tips.length) parts.push(`Tips: ${data.tips.slice(0, 3).join(". ")}.`);
    return parts.join(" ").trim();
}

function StarCoachInner() {
    const searchParams = useSearchParams();
    const [question, setQuestion] = useState("Tell me about a time you disagreed with a teammate.");
    const [weakSpot, setWeakSpot] = useState("unclear impact metrics");
    const [story, setStory] = useState("");
    const [category, setCategory] = useState<StarQuestionCategory>("mixed");
    const [questionHint, setQuestionHint] = useState("");
    const [questionSource, setQuestionSource] = useState<"custom" | "online" | "seed" | "">("");
    const [result, setResult] = useState<CoachResult | null>(null);
    const [history, setHistory] = useState<StarHistoryEntry[]>([]);
    const [loadingCoach, setLoadingCoach] = useState(false);
    const [loadingQuestion, setLoadingQuestion] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [timerSec, setTimerSec] = useState(90);
    const [timerRunning, setTimerRunning] = useState(false);
    const [company, setCompany] = useState("");
    const [role, setRole] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [micAvailable, setMicAvailable] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const recognitionRef = useRef<SpeechRecognitionInstance>(null);
    const isListeningRef = useRef(isListening);
    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current || isListeningRef.current) return;
        try {
            window.speechSynthesis?.cancel();
            recognitionRef.current.start();
            setIsListening(true);
        } catch {
            /* already started */
        }
    }, []);

    const stopListening = useCallback(() => {
        if (!recognitionRef.current) return;
        try {
            recognitionRef.current.stop();
        } catch {
            /* ignore */
        }
        setIsListening(false);
    }, []);

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
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = localStorage.getItem("voiceLanguage") || "en-IN";

        recognition.onresult = (event: { resultIndex: number; results: { length: number; [i: number]: { [i: number]: { transcript: string } } } }) => {
            let chunk = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                chunk += event.results[i][0].transcript;
            }
            if (chunk.trim()) {
                setStory((prev) => (prev.trim() ? `${prev.trim()} ${chunk.trim()}` : chunk.trim()));
            }
        };
        recognition.onerror = (event: { error?: string }) => {
            if (event.error === "not-allowed") setIsListening(false);
        };
        recognition.onend = () => {
            if (isListeningRef.current) {
                try {
                    recognition.start();
                } catch {
                    setIsListening(false);
                }
            }
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

    useEffect(() => {
        setHistory(loadStarHistory());
        setCompany(localStorage.getItem("targetCompany") || "");
        setRole(localStorage.getItem("preferredRoles") || "");

        const q = searchParams.get("question");
        const w = searchParams.get("weakSpot");
        const s = searchParams.get("story");
        if (q) {
            setQuestion(q);
            setQuestionSource("custom");
            setInfo("Loaded practice prompt from Film Room / Prep dashboard.");
        }
        if (w) setWeakSpot(w);
        if (s) setStory(s);

        try {
            if (!q) {
                const keys = Object.keys(localStorage).filter((k) => k.startsWith("filmRoom_"));
                if (keys.length) {
                    const raw = localStorage.getItem(keys.sort().reverse()[0] || "");
                    if (raw) {
                        const data = JSON.parse(raw);
                        const gap = (data.annotations || []).find(
                            (a: { kind?: string; text?: string; label?: string }) => a.kind === "gap"
                        );
                        if (gap?.text || gap?.label) setWeakSpot(String(gap.text || gap.label).slice(0, 180));
                        if (data.retakePrompts?.[0]) {
                            setQuestion(data.retakePrompts[0]);
                            setQuestionSource("custom");
                        } else if (data.practiceFocus?.[0]) {
                            setQuestion(String(data.practiceFocus[0]));
                            setQuestionSource("custom");
                        }
                    }
                }
            }
        } catch {
            /* ignore */
        }
    }, [searchParams]);

    useEffect(() => {
        if (!timerRunning) return;
        if (timerSec <= 0) {
            setTimerRunning(false);
            setInfo("Time's up — score your story now.");
            stopListening();
            return;
        }
        const id = window.setTimeout(() => setTimerSec((t) => t - 1), 1000);
        return () => window.clearTimeout(id);
    }, [timerRunning, timerSec, stopListening]);

    function applyGeneratedQuestion(q: StarCoachQuestion, source: "online" | "seed") {
        setQuestion(q.question);
        setWeakSpot(q.suggestedWeakSpot);
        setQuestionHint(q.hint || q.focus);
        setQuestionSource(source);
        setResult(null);
        setStory("");
    }

    async function generateQuestion() {
        setLoadingQuestion(true);
        setError("");
        setInfo("");
        try {
            const res = await fetch("/api/star-coach-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    count: 1,
                    category,
                    exclude: [question],
                    company,
                    role,
                }),
            });
            if (!res.ok) {
                if (res.status === 401) {
                    const seedRes = await fetch(
                        `/api/star-coach-questions?count=1${
                            category !== "mixed" ? `&category=${category}` : ""
                        }`
                    );
                    const seedData = await seedRes.json();
                    const q = seedData.questions?.[0];
                    if (q) applyGeneratedQuestion(q, "seed");
                    setInfo("Sign in to generate fresh online questions.");
                    return;
                }
                const { message } = await readApiError(res);
                throw new Error(message);
            }
            const data = await res.json();
            const q = data.questions?.[0];
            if (!q) throw new Error("No question returned");
            applyGeneratedQuestion(q, data.source === "online" ? "online" : "seed");
            if (data.warning) setInfo(data.warning);
            else setInfo("New practice question loaded — draft your STAR answer below.");
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to generate question");
        } finally {
            setLoadingQuestion(false);
        }
    }

    async function run(mode: "coach" | "score" | "retake") {
        if (!question.trim()) {
            setError("Enter a question or generate one first.");
            return;
        }
        setLoadingCoach(true);
        setError("");
        setInfo("");
        try {
            const res = await fetch("/api/star-coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    story,
                    question,
                    weakSpot,
                    mode,
                    company,
                    role,
                }),
            });
            if (!res.ok) {
                const { message } = await readApiError(res);
                throw new Error(message);
            }
            const data = await res.json();
            setResult(data);
            if (mode === "retake" && data.retakePrompt) {
                setQuestion(data.retakePrompt);
                setQuestionSource("custom");
            }
            if (data.improvedStory && mode === "coach") setStory(data.improvedStory);
            if ((mode === "score" || mode === "coach") && (story.trim() || data.improvedStory)) {
                const list = saveStarHistoryEntry({
                    question,
                    story: (mode === "coach" && data.improvedStory) || story,
                    weakSpot,
                    score: typeof data.score === "number" ? data.score : undefined,
                });
                setHistory(list);
                setInfo("Saved to your last 5 STAR stories.");
            }
            if (mode === "score" || mode === "coach") {
                const speechSummary = buildSpeechSummary(data as CoachResult);
                if (speechSummary) {
                    void speakInterviewText(speechSummary, {
                        provider: localStorage.getItem("aiProvider") || "gemini",
                        voiceLanguage: localStorage.getItem("voiceLanguage") || "en-IN",
                        isListening: () => isListeningRef.current,
                        onStart: () => setIsSpeaking(true),
                        onEnd: () => setIsSpeaking(false),
                    });
                }
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed");
        } finally {
            setLoadingCoach(false);
        }
    }

    const busy = loadingCoach || loadingQuestion;

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto max-w-3xl px-4 py-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-violet-300/80">
                            <Target className="h-4 w-4" /> STAR coach
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold">Behavioral drills with retakes</h1>
                        <p className="mt-1 text-sm text-white/45">
                            {[role, company].filter(Boolean).join(" · ") ||
                                "Type your own question or generate one — Situation → Task → Action → Result."}
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
                        <Link href="/prep" className="text-indigo-300 hover:underline">
                            Prep dashboard
                        </Link>
                        <Link href="/labs" className="text-white/60 hover:text-white">
                            ← Labs
                        </Link>
                    </div>
                </div>

                <LabAuthBanner feature="online STAR coaching and question generation" />

                <div className="space-y-4">
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="text-xs font-medium uppercase tracking-wide text-white/50">
                                Behavioral question
                            </label>
                            {questionSource && questionSource !== "custom" && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
                                    <Wifi className="h-3 w-3" />
                                    {questionSource}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as StarQuestionCategory)}
                                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                            >
                                {(Object.entries(STAR_CATEGORY_LABELS) as [StarQuestionCategory, string][]).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    )
                                )}
                            </select>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void generateQuestion()}
                                className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-sm text-violet-100 disabled:opacity-50"
                            >
                                {loadingQuestion ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                Generate question
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setTimerSec(90);
                                    setTimerRunning(true);
                                    if (micAvailable) {
                                        startListening();
                                        setInfo("90-second timer started — mic is listening, speak your STAR answer.");
                                    } else {
                                        setInfo("90-second timer started — speak your STAR answer.");
                                    }
                                }}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70"
                            >
                                <Clock className="h-4 w-4" />
                                {timerRunning ? `${timerSec}s` : "90s timer"}
                            </button>
                        </div>

                        <textarea
                            value={question}
                            onChange={(e) => {
                                setQuestion(e.target.value);
                                setQuestionSource("custom");
                                setQuestionHint("");
                            }}
                            rows={2}
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                            placeholder="Or type your own behavioral question…"
                        />
                        {questionHint && (
                            <p className="text-xs text-violet-200/70">
                                <span className="text-white/40">Focus: </span>
                                {questionHint}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">
                            Weak spot to improve
                        </label>
                        <input
                            value={weakSpot}
                            onChange={(e) => setWeakSpot(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                            placeholder="e.g. unclear impact metrics, too much 'we', rambling"
                        />
                    </div>

                    <div>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                            <label className="text-xs font-medium uppercase tracking-wide text-white/50">
                                Your STAR story
                            </label>
                            <div className="flex items-center gap-2">
                                {isSpeaking && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-violet-300/80">
                                        <Volume2 className="h-3 w-3" /> Speaking…
                                    </span>
                                )}
                                {micAvailable && (
                                    <button
                                        type="button"
                                        onClick={() => (isListening ? stopListening() : startListening())}
                                        title={isListening ? "Stop dictation" : "Dictate your story via microphone"}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                                            isListening
                                                ? "bg-green-500 text-black shadow-lg shadow-green-500/30 animate-pulse"
                                                : "border border-white/10 text-white/60 hover:text-white"
                                        }`}
                                    >
                                        {isListening ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                                        {isListening ? "Listening…" : "Dictate"}
                                    </button>
                                )}
                            </div>
                        </div>
                        <textarea
                            value={story}
                            onChange={(e) => setStory(e.target.value)}
                            className="min-h-[180px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                            placeholder="Situation → Task → Action → Result…"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run("coach")}
                            className="rounded-xl bg-violet-500 px-4 py-2 text-sm disabled:opacity-50"
                        >
                            Rewrite with coach
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run("score")}
                            className="rounded-xl bg-white/10 px-4 py-2 text-sm disabled:opacity-50"
                        >
                            Score story
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run("retake")}
                            className="rounded-xl bg-white/10 px-4 py-2 text-sm disabled:opacity-50"
                        >
                            New retake prompt
                        </button>
                        {loadingCoach && (
                            <Loader2 className="h-4 w-4 animate-spin self-center text-white/50" />
                        )}
                    </div>

                    {info && <p className="text-sm text-violet-200/70">{info}</p>}
                    {error && <p className="text-sm text-rose-300">{error}</p>}

                    {result && (
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                            <div className="flex items-center gap-2 text-violet-300">
                                <Sparkles className="h-4 w-4" /> Score: {result.score ?? "—"}/100
                            </div>
                            {result.starBreakdown && (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {Object.entries(result.starBreakdown).map(([k, v]) => (
                                        <div key={k} className="rounded-lg bg-black/30 p-2">
                                            <div className="text-[10px] uppercase text-white/40">{k}</div>
                                            <div className="text-white/80">{v}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {result.missing && result.missing.length > 0 && (
                                <div>
                                    <h3 className="mb-1 text-xs font-medium uppercase text-amber-300/90">Missing</h3>
                                    <ul className="list-disc pl-5 text-white/70">
                                        {result.missing.map((m, i) => (
                                            <li key={i}>{m}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {result.improvedStory && (
                                <div>
                                    <h3 className="mb-1 text-xs font-medium uppercase text-emerald-300/90">
                                        Improved story
                                    </h3>
                                    <p className="whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-white/80">
                                        {result.improvedStory}
                                    </p>
                                </div>
                            )}
                            {result.tips && result.tips.length > 0 && (
                                <div>
                                    <h3 className="mb-1 text-xs font-medium uppercase text-sky-300/90">Tips</h3>
                                    <ul className="list-disc pl-5 text-white/70">
                                        {result.tips.map((t, i) => (
                                            <li key={i}>{t}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {history.length > 0 && (
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/50">
                                <History className="h-3.5 w-3.5" /> Last {history.length} stories
                            </h3>
                            <ul className="space-y-2">
                                {history.map((h) => (
                                    <li key={h.id}>
                                        <button
                                            type="button"
                                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10"
                                            onClick={() => {
                                                setQuestion(h.question);
                                                setStory(h.story);
                                                setWeakSpot(h.weakSpot);
                                                setQuestionSource("custom");
                                                setResult(null);
                                            }}
                                        >
                                            <div className="flex justify-between gap-2">
                                                <span className="line-clamp-1 font-medium">{h.question}</span>
                                                {h.score != null && (
                                                    <span className="shrink-0 text-violet-300">{h.score}</span>
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function StarCoachPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-white/50">
                    Loading STAR coach…
                </div>
            }
        >
            <StarCoachInner />
        </Suspense>
    );
}
