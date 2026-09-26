"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, History, Loader2, Mic, MicOff, RefreshCw, Sparkles, Target, Volume2, Wifi, Moon, Sun, Eye } from "lucide-react";
import {
    STAR_CATEGORY_LABELS,
    type StarCoachQuestion,
    type StarQuestionCategory,
} from "@/data/starCoachQuestions";
import { loadStarHistory, saveStarHistoryEntry, type StarHistoryEntry } from "@/utils/labProgress";
import LabAuthBanner from "@/components/labs/LabAuthBanner";
import { readApiError } from "@/utils/apiError";
import { speakInterviewText, stopSpeechInterviewText } from "@/utils/speakInterview";

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

    const [theme, setTheme] = useState<"dark" | "light" | "eyeprotect">("dark");

    useEffect(() => {
        const savedTheme = localStorage.getItem("prointerview_theme") as "dark" | "light" | "eyeprotect" | null;
        if (savedTheme && ["dark", "light", "eyeprotect"].includes(savedTheme)) {
            Promise.resolve().then(() => setTheme(savedTheme));
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

    const questionRef = useRef<HTMLTextAreaElement>(null);
    const storyRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (questionRef.current) {
            questionRef.current.style.height = "auto";
            questionRef.current.style.height = `${Math.max(52, questionRef.current.scrollHeight)}px`;
        }
    }, [question]);

    useEffect(() => {
        if (storyRef.current) {
            storyRef.current.style.height = "auto";
            storyRef.current.style.height = `${Math.max(180, storyRef.current.scrollHeight)}px`;
        }
    }, [story]);

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

        Promise.resolve().then(() => setMicAvailable(true));
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
            stopSpeechInterviewText();
            try {
                recognition.stop();
            } catch {
                /* ignore */
            }
        };
    }, []);

    useEffect(() => {
        Promise.resolve().then(() => {
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
        });
    }, [searchParams]);

    useEffect(() => {
        if (!timerRunning) return;
        if (timerSec <= 0) {
            Promise.resolve().then(() => {
                setTimerRunning(false);
                setInfo("Time's up — score your story now.");
            });
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
        <div className={`min-h-screen transition-colors duration-300 ${
            theme === "light"
                ? "bg-slate-100 text-slate-900"
                : theme === "eyeprotect"
                ? "bg-[#f3ede3] text-[#1c1917]"
                : "bg-slate-950 text-white"
        }`}>
            <div className="max-w-3xl mx-auto px-4 py-8">
                <div className="mb-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] sm:text-xs uppercase tracking-widest flex items-center gap-1.5 font-bold ${isLight ? "text-violet-700" : "text-violet-300/80"}`}>
                            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> STAR coach
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
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

                            <Link
                                href="/labs"
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
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">Behavioral drills with retakes</h1>
                            <p className={`text-xs sm:text-sm mt-1 ${isLight ? "text-slate-600 font-medium" : "text-white/45"}`}>
                                {[role, company].filter(Boolean).join(" · ") ||
                                    "Type your own question or generate one — Situation → Task → Action → Result."}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/" className="text-xs font-bold text-indigo-400 hover:underline">
                                Home dashboard →
                            </Link>
                        </div>
                    </div>
                </div>

                <LabAuthBanner feature="online STAR coaching and question generation" />

                <div className="space-y-4">
                    <div className={`space-y-3 rounded-2xl border p-4 transition-colors ${
                        theme === "light"
                            ? "bg-white border-slate-200 shadow-sm"
                            : theme === "eyeprotect"
                            ? "bg-[#fffcf5] border-[#8c8578] shadow-sm"
                            : "bg-white/5 border-white/10"
                    }`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className={`text-xs font-semibold uppercase tracking-wide ${
                                isLight ? (theme === "eyeprotect" ? "text-[#57534e]" : "text-slate-600") : "text-white/60"
                            }`}>
                                Behavioral question
                            </label>
                            {questionSource && questionSource !== "custom" && (
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                    isLight ? "border-slate-300 bg-slate-100 text-slate-700" : "border-white/10 text-white/45"
                                }`}>
                                    <Wifi className="h-3 w-3" />
                                    {questionSource}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as StarQuestionCategory)}
                                className={`rounded-xl border px-3 py-2 text-sm focus:outline-none transition ${
                                    theme === "light"
                                        ? "bg-white border-slate-300 text-slate-900 focus:border-indigo-600 shadow-sm"
                                        : theme === "eyeprotect"
                                        ? "bg-[#f5efe6] border-[#8c8578] text-[#1c1917] focus:border-teal-700"
                                        : "bg-black/40 border-white/10 text-white focus:border-violet-400/50"
                                }`}
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
                                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition cursor-pointer disabled:opacity-50 ${
                                    theme === "light"
                                        ? "border-violet-300 bg-violet-100 text-violet-800 hover:bg-violet-200 shadow-sm"
                                        : theme === "eyeprotect"
                                        ? "border-[#0b5f58]/40 bg-[#0b5f58]/15 text-[#0b5f58] hover:bg-[#0b5f58]/25 font-bold"
                                        : "border-violet-400/30 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25"
                                }`}
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
                                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition cursor-pointer ${
                                    theme === "light"
                                        ? "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 shadow-sm"
                                        : theme === "eyeprotect"
                                        ? "border-[#8c8578] bg-[#e8dcc8]/60 text-[#1c1917] hover:bg-[#e8dcc8]"
                                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                                }`}
                            >
                                <Clock className="h-4 w-4" />
                                {timerRunning ? `${timerSec}s` : "90s timer"}
                            </button>
                        </div>

                        <textarea
                            ref={questionRef}
                            value={question}
                            onChange={(e) => {
                                setQuestion(e.target.value);
                                setQuestionSource("custom");
                                setQuestionHint("");
                            }}
                            rows={2}
                            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition overflow-hidden ${
                                theme === "light"
                                    ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 shadow-sm"
                                    : theme === "eyeprotect"
                                    ? "bg-[#fffcf5] border-[#8c8578] text-[#1c1917] placeholder:text-[#78716c] focus:border-teal-700"
                                    : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-violet-400/50"
                            }`}
                            placeholder="Or type your own behavioral question…"
                        />
                        {questionHint && (
                            <p className={`text-xs font-medium ${isLight ? (theme === "eyeprotect" ? "text-teal-800" : "text-indigo-700") : "text-violet-200/70"}`}>
                                <span className={isLight ? (theme === "eyeprotect" ? "text-[#78716c]" : "text-slate-500") : "text-white/40"}>Focus: </span>
                                {questionHint}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className={`mb-1.5 block text-xs font-semibold uppercase tracking-wide ${
                            isLight ? (theme === "eyeprotect" ? "text-[#57534e]" : "text-slate-600") : "text-white/60"
                        }`}>
                            Weak spot to improve
                        </label>
                        <input
                            value={weakSpot}
                            onChange={(e) => setWeakSpot(e.target.value)}
                            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition ${
                                theme === "light"
                                    ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 shadow-sm"
                                    : theme === "eyeprotect"
                                    ? "bg-[#fffcf5] border-[#8c8578] text-[#1c1917] placeholder:text-[#78716c] focus:border-teal-700"
                                    : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-violet-400/50"
                            }`}
                            placeholder="e.g. unclear impact metrics, too much 'we', rambling"
                        />
                    </div>

                    <div>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                            <label className={`text-xs font-semibold uppercase tracking-wide ${
                                isLight ? (theme === "eyeprotect" ? "text-[#57534e]" : "text-slate-600") : "text-white/60"
                            }`}>
                                Your STAR story
                            </label>
                            <div className="flex items-center gap-2">
                                {isSpeaking && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-violet-600 font-bold">
                                        <Volume2 className="h-3 w-3" /> Speaking…
                                    </span>
                                )}
                                {micAvailable && (
                                    <button
                                        type="button"
                                        onClick={() => (isListening ? stopListening() : startListening())}
                                        title={isListening ? "Stop dictation" : "Dictate your story via microphone"}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors font-semibold cursor-pointer ${
                                            isListening
                                                ? "bg-emerald-500 text-slate-950 shadow-md animate-pulse font-bold"
                                                : isLight
                                                ? "border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"
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
                            ref={storyRef}
                            value={story}
                            onChange={(e) => setStory(e.target.value)}
                            className={`min-h-[180px] w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition overflow-hidden ${
                                theme === "light"
                                    ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 shadow-sm"
                                    : theme === "eyeprotect"
                                    ? "bg-[#fffcf5] border-[#8c8578] text-[#1c1917] placeholder:text-[#78716c] focus:border-teal-700"
                                    : "bg-black/40 border-white/10 text-white placeholder:text-white/40 focus:border-violet-400/50"
                            }`}
                            placeholder="Situation → Task → Action → Result…"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run("coach")}
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer ${
                                theme === "eyeprotect"
                                    ? "bg-[#0b5f58] hover:bg-[#084842] text-white disabled:opacity-50"
                                    : "bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
                            }`}
                        >
                            Rewrite with coach
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run("score")}
                            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                                isLight
                                    ? "bg-white text-slate-800 border-slate-300 hover:bg-slate-50 shadow-sm"
                                    : "bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                            }`}
                        >
                            Score story
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run("retake")}
                            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                                isLight
                                    ? "bg-white text-slate-800 border-slate-300 hover:bg-slate-50 shadow-sm"
                                    : "bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                            }`}
                        >
                            New retake prompt
                        </button>
                        {loadingCoach && (
                            <Loader2 className="h-4 w-4 animate-spin self-center text-violet-500" />
                        )}
                    </div>

                    {info && <p className="text-sm text-violet-400 font-medium">{info}</p>}
                    {error && <p className="text-sm text-rose-500 font-semibold">{error}</p>}

                    {result && (
                        <div className={`space-y-3 rounded-2xl border p-4 text-sm ${
                            theme === "light"
                                ? "bg-white border-slate-200 shadow-sm text-slate-900"
                                : theme === "eyeprotect"
                                ? "bg-[#fffcf5] border-[#8c8578] text-[#1c1917]"
                                : "bg-white/5 border-white/10 text-white"
                        }`}>
                            <div className="flex items-center gap-2 font-bold text-violet-400">
                                <Sparkles className="h-4 w-4" /> Score: {result.score ?? "—"}/100
                            </div>
                            {result.starBreakdown && (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {Object.entries(result.starBreakdown).map(([k, v]) => (
                                        <div key={k} className={`rounded-lg p-2.5 border ${
                                            isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/5"
                                        }`}>
                                            <div className={`text-[10px] uppercase font-bold ${isLight ? "text-slate-500" : "text-white/40"}`}>{k}</div>
                                            <div className={isLight ? "text-slate-800 font-medium" : "text-white/80"}>{String(v)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {result.missing && result.missing.length > 0 && (
                                <div>
                                    <h3 className="mb-1 text-xs font-semibold uppercase text-amber-500">Missing</h3>
                                    <ul className={`list-disc pl-5 ${isLight ? "text-slate-700" : "text-white/70"}`}>
                                        {result.missing.map((m, i) => (
                                            <li key={i}>{m}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {result.improvedStory && (
                                <div>
                                    <h3 className="mb-1 text-xs font-semibold uppercase text-emerald-500">
                                        Improved story
                                    </h3>
                                    <p className={`whitespace-pre-wrap rounded-lg p-3 ${
                                        isLight ? "bg-slate-100 text-slate-800" : "bg-black/30 text-white/80"
                                    }`}>
                                        {result.improvedStory}
                                    </p>
                                </div>
                            )}
                            {result.tips && result.tips.length > 0 && (
                                <div>
                                    <h3 className="mb-1 text-xs font-semibold uppercase text-sky-500">Tips</h3>
                                    <ul className={`list-disc pl-5 ${isLight ? "text-slate-700" : "text-white/70"}`}>
                                        {result.tips.map((t, i) => (
                                            <li key={i}>{t}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {history.length > 0 && (
                        <div className={`rounded-2xl border p-4 ${
                            theme === "light"
                                ? "bg-white border-slate-200 text-slate-900 shadow-sm"
                                : theme === "eyeprotect"
                                ? "bg-[#fffcf5] border-[#8c8578] text-[#1c1917]"
                                : "bg-black/20 border-white/10 text-white"
                        }`}>
                            <h3 className={`mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${
                                isLight ? "text-slate-600" : "text-white/50"
                            }`}>
                                <History className="h-3.5 w-3.5" /> Last {history.length} stories
                            </h3>
                            <ul className="space-y-2">
                                {history.map((h) => (
                                    <li key={h.id}>
                                        <button
                                            type="button"
                                            className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition font-medium cursor-pointer ${
                                                theme === "light"
                                                    ? "bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100"
                                                    : theme === "eyeprotect"
                                                    ? "bg-[#f5efe6] border-[#8c8578] text-[#1c1917] hover:bg-[#e8dcc8]"
                                                    : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                                            }`}
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
                                                    <span className={`shrink-0 font-bold ${isLight ? "text-violet-700" : "text-violet-300"}`}>{h.score}</span>
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
