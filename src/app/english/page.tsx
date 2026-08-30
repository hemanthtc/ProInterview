"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, Languages, Mic, MicOff, Sparkles, Volume2 } from "lucide-react";
import { FLUENCY_PROMPTS, SHADOW_SENTENCES, type FluencyWord } from "@/data/englishFluency";
import {
    dailyWords,
    fluencyTabLabel,
    emptyFluencyProgress,
    loadFluencyProgress,
    polishEnglishOffline,
    quizOptions,
    saveFluencyProgress,
    tokenOverlapScore,
    type FluencyProgress,
    type FluencyTab,
} from "@/utils/englishFluency";
import { analyzeUtterance } from "@/utils/voiceCoach";
import { speakInterviewText, stopSpeechInterviewText } from "@/utils/speakInterview";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

const TABS: FluencyTab[] = ["words", "speak", "fluency", "polish"];

export default function EnglishFluencyPage() {
    const [tab, setTab] = useState<FluencyTab>("words");
    const [progress, setProgress] = useState<FluencyProgress>(emptyFluencyProgress);
    const [words, setWords] = useState<FluencyWord[]>([]);
    const [ready, setReady] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [quizDone, setQuizDone] = useState(false);

    const [shadowIdx, setShadowIdx] = useState(0);
    const [spoken, setSpoken] = useState("");
    const [listening, setListening] = useState(false);
    const recRef = useRef<SpeechRecognitionInstance>(null);

    const [promptIdx, setPromptIdx] = useState(0);
    const [fluencyText, setFluencyText] = useState("");
    const [secLeft, setSecLeft] = useState(60);
    const [running, setRunning] = useState(false);
    const startedAt = useRef(0);

    const [draft, setDraft] = useState("");
    const [polished, setPolished] = useState("");
    const [tips, setTips] = useState<string[]>([]);
    const [applied, setApplied] = useState<string[]>([]);
    const [polishSource, setPolishSource] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setWords(dailyWords(3));
        setProgress(loadFluencyProgress());
        setReady(true);
        return () => {
            stopSpeechInterviewText();
            stopMic();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function persist(next: FluencyProgress) {
        setProgress(next);
        saveFluencyProgress(next);
    }

    const stopMic = useCallback(() => {
        try {
            recRef.current?.stop();
        } catch {
            /* ignore */
        }
        recRef.current = null;
        setListening(false);
    }, []);

    const startMic = useCallback((onText: (t: string) => void) => {
        const Ctor =
            typeof window !== "undefined"
                ? (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
                      .SpeechRecognition ||
                  (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition
                : undefined;
        if (!Ctor) {
            onText("");
            return;
        }
        stopMic();
        const rec = new Ctor();
        rec.lang = "en-IN";
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (ev: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }> }) => {
            let chunk = "";
            for (let i = ev.resultIndex; i < ev.results.length; i++) {
                chunk += ev.results[i][0].transcript + " ";
            }
            onText(chunk.trim());
        };
        rec.onend = () => setListening(false);
        rec.start();
        recRef.current = rec;
        setListening(true);
    }, [stopMic]);

    useEffect(() => {
        if (!running) return;
        if (secLeft <= 0) {
            setRunning(false);
            stopMic();
            const snap = analyzeUtterance({
                text: fluencyText,
                durationMs: Math.max(1000, Date.now() - startedAt.current),
            });
            persist({
                ...progress,
                lastSpeakScore: snap.confidence,
                xp: progress.xp + Math.round(snap.confidence / 10),
            });
            return;
        }
        const id = window.setTimeout(() => setSecLeft((s) => s - 1), 1000);
        return () => window.clearTimeout(id);
    }, [running, secLeft, fluencyText, progress, stopMic]);

    const quizScore = useMemo(() => {
        return words.filter((w) => answers[w.id] === w.meaning).length;
    }, [answers, words]);

    function submitQuiz() {
        setQuizDone(true);
        const learned = words.filter((w) => answers[w.id] === w.meaning).map((w) => w.id);
        persist({
            ...progress,
            quizCorrect: progress.quizCorrect + quizScore,
            quizTotal: progress.quizTotal + words.length,
            learnedIds: Array.from(new Set([...progress.learnedIds, ...learned])),
            xp: progress.xp + quizScore * 10,
        });
    }

    async function polishNow() {
        setBusy(true);
        setPolished("");
        setTips([]);
        setApplied([]);
        const local = polishEnglishOffline(draft);
        try {
            const res = await fetch("/api/english-coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: draft }),
            });
            const data = (await res.json()) as {
                polished?: string;
                tips?: string[];
                applied?: string[];
                provider?: string;
                error?: string;
            };
            if (!res.ok) {
                setPolished(local.polished);
                setTips(data.error ? [data.error, ...local.tips] : local.tips);
                setApplied(local.applied);
                setPolishSource("offline");
            } else {
                setPolished(data.polished || local.polished);
                setTips(data.tips || local.tips);
                setApplied(data.applied || local.applied);
                setPolishSource(data.provider || "offline");
            }
        } catch {
            setPolished(local.polished);
            setTips(local.tips);
            setApplied(local.applied);
            setPolishSource("offline");
        } finally {
            setBusy(false);
            persist({ ...progress, xp: progress.xp + 5 });
        }
    }

    const shadow = SHADOW_SENTENCES[shadowIdx % SHADOW_SENTENCES.length];
    const overlap = tokenOverlapScore(spoken, shadow);
    const prompt = FLUENCY_PROMPTS[promptIdx % FLUENCY_PROMPTS.length];
    const fluencySnap = fluencyText.trim()
        ? analyzeUtterance({
              text: fluencyText,
              durationMs: running ? Math.max(1000, Date.now() - startedAt.current) : 60_000 - secLeft * 1000,
          })
        : null;

    return (
        <div className="min-h-screen bg-[#0b141a] text-white px-4 py-10">
            <div className="max-w-3xl mx-auto">
                <p className="text-xs uppercase tracking-widest text-sky-400 font-bold flex items-center gap-1.5">
                    <Languages className="h-3.5 w-3.5" /> English fluency
                </p>
                <h1 className="mt-2 text-3xl font-bold">Speak interview English with confidence</h1>
                <p className="mt-3 text-sm text-white/55">
                    Learn new words, shadow a sentence, talk for one minute, then upgrade campus English into professional English.
                    Works offline — accent is not the score, clarity is.
                </p>
                <p className="mt-2 text-xs text-white/40">
                    XP {progress.xp} · words learned {progress.learnedIds.length} · last fluency {progress.lastSpeakScore || "—"}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                    {TABS.map((id) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setTab(id)}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold border ${
                                tab === id
                                    ? "border-sky-400 bg-sky-500/20 text-sky-200"
                                    : "border-white/15 text-white/55 hover:text-white"
                            }`}
                        >
                            {fluencyTabLabel(id)}
                        </button>
                    ))}
                </div>

                {tab === "words" ? (
                    <section className="mt-8 space-y-4">
                        {!ready ? <p className="text-sm text-white/40">Loading today’s words…</p> : null}
                        <p className="text-sm text-white/60 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" /> Today&apos;s three interview words. Pick the meaning, then say the example
                            aloud.
                        </p>
                        {words.map((w) => (
                            <WordCard
                                key={w.id}
                                word={w}
                                selected={answers[w.id]}
                                locked={quizDone}
                                onPick={(meaning) => setAnswers((prev) => ({ ...prev, [w.id]: meaning }))}
                            />
                        ))}
                        {ready && !quizDone ? (
                            <button
                                type="button"
                                onClick={submitQuiz}
                                disabled={words.some((w) => !answers[w.id])}
                                className="rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 px-4 py-2 text-sm font-bold text-slate-950"
                            >
                                Check answers
                            </button>
                        ) : null}
                        {quizDone ? (
                            <p className="text-emerald-300 text-sm font-bold flex items-center gap-2">
                                <Check className="h-4 w-4" /> {quizScore}/{words.length} correct — come back tomorrow for a new set.
                            </p>
                        ) : null}
                    </section>
                ) : null}

                {tab === "speak" ? (
                    <section className="mt-8 space-y-4">
                        <p className="text-sm text-white/60">Listen, then repeat. We score word overlap, not accent.</p>
                        <blockquote className="rounded-2xl border border-white/10 bg-white/5 p-4 text-lg leading-relaxed">
                            {shadow}
                        </blockquote>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => void speakInterviewText(shadow)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-sm"
                            >
                                <Volume2 className="h-4 w-4" /> Hear it
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (listening) stopMic();
                                    else {
                                        setSpoken("");
                                        startMic(setSpoken);
                                    }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/90 text-slate-950 px-3 py-2 text-sm font-bold"
                            >
                                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                {listening ? "Stop" : "Speak"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShadowIdx((i) => i + 1);
                                    setSpoken("");
                                }}
                                className="rounded-xl border border-white/15 px-3 py-2 text-sm"
                            >
                                Next sentence
                            </button>
                        </div>
                        {spoken ? (
                            <p className="text-sm text-white/70">
                                You said: <span className="text-white">{spoken}</span>
                                <br />
                                Match score: <span className="text-emerald-300 font-bold">{overlap}%</span>
                            </p>
                        ) : (
                            <p className="text-xs text-white/40">Chrome or Edge needed for the mic. You can also type below.</p>
                        )}
                        <textarea
                            value={spoken}
                            onChange={(e) => setSpoken(e.target.value)}
                            rows={3}
                            placeholder="Or type what you said…"
                            className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                        />
                    </section>
                ) : null}

                {tab === "fluency" ? (
                    <section className="mt-8 space-y-4">
                        <h2 className="text-xl font-bold">{prompt.title}</h2>
                        <p className="text-sm text-white/60">{prompt.prompt}</p>
                        <p className="font-mono text-3xl text-sky-300">{running ? `${secLeft}s` : "60s"}</p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setFluencyText("");
                                    setSecLeft(60);
                                    startedAt.current = Date.now();
                                    setRunning(true);
                                    startMic(setFluencyText);
                                }}
                                className="rounded-xl bg-sky-500 text-slate-950 px-4 py-2 text-sm font-bold"
                            >
                                Start minute
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRunning(false);
                                    stopMic();
                                }}
                                className="rounded-xl border border-white/15 px-4 py-2 text-sm"
                            >
                                Stop
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPromptIdx((i) => i + 1);
                                    setFluencyText("");
                                    setRunning(false);
                                    setSecLeft(60);
                                }}
                                className="rounded-xl border border-white/15 px-4 py-2 text-sm"
                            >
                                New prompt
                            </button>
                        </div>
                        <textarea
                            value={fluencyText}
                            onChange={(e) => setFluencyText(e.target.value)}
                            rows={5}
                            placeholder="Your words appear here…"
                            className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                        />
                        {fluencySnap ? (
                            <ul className="text-sm text-white/65 space-y-1">
                                <li>Pace: {fluencySnap.wpm} words/min · fillers: {fluencySnap.fillers}</li>
                                <li>Confidence: {fluencySnap.confidence}/100 ({fluencySnap.moodHint})</li>
                                {fluencySnap.tips.map((t) => (
                                    <li key={t}>• {t}</li>
                                ))}
                            </ul>
                        ) : null}
                    </section>
                ) : null}

                {tab === "polish" ? (
                    <section className="mt-8 space-y-4">
                        <p className="text-sm text-white/60">
                            Paste campus English (“I am having two years experience…”) and get a cleaner interview version.
                        </p>
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            rows={5}
                            placeholder="I am having internship in college. I want to tell that I did the needful…"
                            className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                        />
                        <button
                            type="button"
                            disabled={busy || draft.trim().length < 8}
                            onClick={() => void polishNow()}
                            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-40 px-4 py-2 text-sm font-bold text-slate-950"
                        >
                            <Sparkles className="h-4 w-4" />
                            {busy ? "Polishing…" : "Upgrade my English"}
                        </button>
                        {polished ? (
                            <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 space-y-2 text-sm">
                                <p className="text-xs uppercase tracking-wide text-violet-300">
                                    Polished {polishSource === "gemini" ? "(AI)" : "(offline coach)"}
                                </p>
                                <p className="text-white leading-relaxed">{polished}</p>
                                {applied.length ? (
                                    <p className="text-white/50 text-xs">Changes: {applied.join(" · ")}</p>
                                ) : null}
                                <ul className="text-white/65">
                                    {tips.map((t) => (
                                        <li key={t}>• {t}</li>
                                    ))}
                                </ul>
                                <button
                                    type="button"
                                    onClick={() => void speakInterviewText(polished)}
                                    className="inline-flex items-center gap-1 text-violet-200 text-xs font-bold"
                                >
                                    <Volume2 className="h-3.5 w-3.5" /> Hear polished answer
                                </button>
                            </div>
                        ) : null}
                    </section>
                ) : null}

                <div className="mt-10 flex flex-wrap gap-4 text-sm">
                    <Link href="/interview" className="text-sky-400 hover:underline font-bold">
                        Practice in a mock interview →
                    </Link>
                    <Link href="/labs" className="text-white/45 hover:text-white">
                        All labs
                    </Link>
                    <Link href="/star-coach" className="text-white/45 hover:text-white">
                        STAR stories
                    </Link>
                </div>
            </div>
        </div>
    );
}

function WordCard({
    word,
    selected,
    locked,
    onPick,
}: {
    word: FluencyWord;
    selected?: string;
    locked: boolean;
    onPick: (meaning: string) => void;
}) {
    const options = useMemo(() => quizOptions(word), [word]);
    return (
        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-xl font-bold">{word.word}</h3>
                <span className="text-xs text-sky-300">{word.hindi}</span>
            </div>
            <p className="mt-2 text-sm text-white/55 italic">&ldquo;{word.example}&rdquo;</p>
            <button
                type="button"
                onClick={() => void speakInterviewText(`${word.word}. ${word.example}`)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-sky-300 font-bold"
            >
                <Volume2 className="h-3.5 w-3.5" /> Hear word
            </button>
            <div className="mt-3 grid gap-2">
                {options.map((opt) => {
                    const correct = opt === word.meaning;
                    const show = locked && selected;
                    let cls = "border-white/15 text-white/70";
                    if (show && correct) cls = "border-emerald-400/50 bg-emerald-500/15 text-emerald-200";
                    else if (show && selected === opt && !correct) cls = "border-rose-400/40 bg-rose-500/10 text-rose-200";
                    else if (selected === opt) cls = "border-sky-400/50 bg-sky-500/15 text-sky-100";
                    return (
                        <button
                            key={opt}
                            type="button"
                            disabled={locked}
                            onClick={() => onPick(opt)}
                            className={`text-left rounded-xl border px-3 py-2 text-sm ${cls}`}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>
        </article>
    );
}
