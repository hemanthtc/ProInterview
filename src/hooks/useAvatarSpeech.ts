"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { avatarAudioService } from "@/services/avatarAudioService";
import { type AvatarState } from "@/components/Avatar/RealisticHumanRenderer";

export interface UseAvatarSpeechOptions {
    ttsEndpoint?: string;
    defaultSpeed?: number;
    onStart?: () => void;
    onEnd?: () => void;
}

export interface UseAvatarSpeechReturn {
    state: AvatarState;
    currentViseme: string;
    visemeIntensity: number;
    audioEnergy: number;
    isSpeaking: boolean;
    speak: (text: string, speed?: number) => Promise<void>;
    stop: () => void;
    setState: (state: AvatarState) => void;
}

function splitIntoSentences(text: string): string[] {
    const rawChunks = text.match(/[^.!?\n]+(?:[.!?\n]+|$)/g) || [text];
    const sentences: string[] = [];
    for (const chunk of rawChunks) {
        const trimmed = chunk.trim();
        if (!trimmed) continue;
        if (sentences.length > 0 && trimmed.length < 18 && sentences[sentences.length - 1].length < 120) {
            sentences[sentences.length - 1] += " " + trimmed;
        } else {
            sentences.push(trimmed);
        }
    }
    return sentences.length > 0 ? sentences : [text];
}

export function useAvatarSpeech(options: UseAvatarSpeechOptions = {}): UseAvatarSpeechReturn {
    const {
        ttsEndpoint = "/api/tts/synthesize",
        defaultSpeed = 1.0,
        onStart,
        onEnd,
    } = options;

    const [state, setState] = useState<AvatarState>("idle");
    const [currentViseme, setCurrentViseme] = useState<string>("sil");
    const [visemeIntensity, setVisemeIntensity] = useState<number>(0);
    const [audioEnergy, setAudioEnergy] = useState<number>(0);

    const isSpeaking = state === "speaking";
    const abortControllerRef = useRef<AbortController | null>(null);

    // Background pre-warm probe on mount so neural model is hot in memory
    useEffect(() => {
        if (typeof window !== "undefined") {
            fetch(ttsEndpoint, { method: "GET" }).catch(() => {});
        }
    }, [ttsEndpoint]);

    const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const cleanupFallback = useCallback(() => {
        if (fallbackTimerRef.current) {
            clearInterval(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
        }
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            try {
                window.speechSynthesis.cancel();
            } catch {}
        }
    }, []);

    const speakBrowserFallback = useCallback(
        async (cleanText: string, speed: number) => {
            if (typeof window === "undefined" || !("speechSynthesis" in window)) {
                setState("idle");
                onEnd?.();
                return;
            }

            cleanupFallback();
            setState("speaking");
            onStart?.();

            const utterance = new SpeechSynthesisUtterance(cleanText);

            // Voice selection: prioritize warm conversational voices
            const voices = window.speechSynthesis.getVoices();
            if (voices && voices.length > 0) {
                const targetVoiceKeywords = [
                    "google us english",
                    "microsoft jenny online",
                    "microsoft jenny",
                    "microsoft aria online",
                    "microsoft aria",
                    "microsoft zira",
                    "samantha",
                    "microsoft guy",
                    "natural",
                    "neural",
                    "en-us",
                ];
                let selectedVoice: SpeechSynthesisVoice | null = null;
                for (const kw of targetVoiceKeywords) {
                    const found = voices.find((v) => v.name.toLowerCase().includes(kw));
                    if (found) {
                        selectedVoice = found;
                        break;
                    }
                }
                if (!selectedVoice) {
                    selectedVoice =
                        voices.find((v) => v.lang === "en-US" || v.lang === "en_US") ||
                        voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ||
                        voices[0] ||
                        null;
                }
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
            }

            utterance.pitch = 0.95;
            utterance.rate = Math.max(0.75, Math.min(1.35, speed * 0.90));
            utterance.volume = 1.0;

            // Generate synthetic viseme cadence matched to words
            const words = cleanText.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
            let wordIndex = 0;
            let subWordStep = 0;
            const visemeCycle = ["aa", "ee", "oo", "oh", "fv", "mbp", "ch"];

            fallbackTimerRef.current = setInterval(() => {
                if (wordIndex >= words.length) {
                    wordIndex = 0;
                }
                const currentWord = words[wordIndex] || "sil";
                const char = currentWord[subWordStep] || "";
                subWordStep++;
                if (subWordStep >= currentWord.length) {
                    subWordStep = 0;
                    wordIndex++;
                }

                let targetViseme = "aa";
                let intensity = 0.6;
                let energy = 0.55;

                if ("aeiou".includes(char)) {
                    targetViseme = char === "a" ? "aa" : (char === "e" || char === "i" ? "ee" : "oo");
                    intensity = 0.72;
                    energy = 0.68;
                } else if ("fv".includes(char)) {
                    targetViseme = "fv";
                    intensity = 0.55;
                    energy = 0.45;
                } else if ("mbp".includes(char)) {
                    targetViseme = "mbp";
                    intensity = 0.58;
                    energy = 0.50;
                } else if ("sztcdj".includes(char)) {
                    targetViseme = "ch";
                    intensity = 0.50;
                    energy = 0.42;
                } else {
                    targetViseme = visemeCycle[(wordIndex + subWordStep) % visemeCycle.length];
                    intensity = 0.48;
                    energy = 0.40;
                }

                setCurrentViseme(targetViseme);
                setVisemeIntensity(intensity);
                setAudioEnergy(energy);
            }, 75);

            utterance.onboundary = () => {
                setAudioEnergy(0.65);
            };

            const finishPlayback = () => {
                cleanupFallback();
                setState("idle");
                setCurrentViseme("sil");
                setVisemeIntensity(0);
                setAudioEnergy(0);
                onEnd?.();
            };

            utterance.onend = finishPlayback;
            utterance.onerror = finishPlayback;

            window.speechSynthesis.speak(utterance);
        },
        [cleanupFallback, onStart, onEnd]
    );

    const stop = useCallback(() => {
        cleanupFallback();
        if (abortControllerRef.current) {
            try {
                abortControllerRef.current.abort();
            } catch {}
            abortControllerRef.current = null;
        }
        avatarAudioService.stopPlayback();
        setState("idle");
        setCurrentViseme("sil");
        setVisemeIntensity(0);
        setAudioEnergy(0);
        onEnd?.();
    }, [cleanupFallback, onEnd]);

    const speak = useCallback(
        async (text: string, speed?: number) => {
            const cleanText = text
                .replace(/\[MODE:(?:CHAT|CODE|DRAW)\]/gi, "")
                .replace(/\[TERMINATE\]/gi, "")
                .trim();

            if (!cleanText) return;

            avatarAudioService.unlockAudioContext();
            stop();
            setState("thinking");

            const abortController = new AbortController();
            abortControllerRef.current = abortController;

            const sentences = splitIntoSentences(cleanText);
            const actualSpeed = speed || defaultSpeed;

            const fetchSentenceAudio = async (sentence: string) => {
                try {
                    const res = await fetch(ttsEndpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: sentence, speed: actualSpeed }),
                        signal: abortController.signal,
                    });
                    if (!res.ok) {
                        return { audio_base64: null };
                    }
                    return await res.json();
                } catch (fetchErr: unknown) {
                    if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
                        return { audio_base64: null };
                    }
                    return { audio_base64: null };
                }
            };

            try {
                if (sentences.length === 1) {
                    const data = await fetchSentenceAudio(sentences[0]);
                    if (abortController.signal.aborted) return;
                    if (!data || !data.audio_base64) {
                        // Local daemon offline / AWS Amplify serverless mode -> activate high-clarity browser voice
                        console.info("[AvatarSpeech] Piper daemon offline on Amplify. Falling back to browser speech synthesis.");
                        await speakBrowserFallback(cleanText, actualSpeed);
                        return;
                    }
                    setState("speaking");
                    onStart?.();
                    await new Promise<void>((resolve) => {
                        avatarAudioService.playSpeechWithVisemes(
                            data.audio_base64,
                            data.visemes || [],
                            (v, i) => { setCurrentViseme(v); setVisemeIntensity(i); },
                            () => { resolve(); },
                            (e) => { setAudioEnergy(e); }
                        );
                    });
                    setState("idle");
                    setCurrentViseme("sil");
                    setVisemeIntensity(0);
                    setAudioEnergy(0);
                    onEnd?.();
                    return;
                }

                // Pipelined multi-sentence streaming
                let nextPromise = fetchSentenceAudio(sentences[0]);
                let isFirst = true;

                for (let i = 0; i < sentences.length; i++) {
                    if (abortController.signal.aborted) return;

                    const currentData = await nextPromise;
                    if (abortController.signal.aborted) return;

                    // Prefetch next sentence while current sentence is playing
                    if (i + 1 < sentences.length) {
                        nextPromise = fetchSentenceAudio(sentences[i + 1]);
                    }

                    if (!currentData || !currentData.audio_base64) {
                        if (isFirst) {
                            // If primary sentence has no neural audio, fallback for entire utterance
                            console.info("[AvatarSpeech] Piper daemon offline on Amplify. Falling back to browser speech synthesis.");
                            await speakBrowserFallback(cleanText, actualSpeed);
                            return;
                        }
                        continue;
                    }

                    if (isFirst) {
                        setState("speaking");
                        onStart?.();
                        isFirst = false;
                    }

                    await new Promise<void>((resolve) => {
                        avatarAudioService.playSpeechWithVisemes(
                            currentData.audio_base64,
                            currentData.visemes || [],
                            (v, intens) => { setCurrentViseme(v); setVisemeIntensity(intens); },
                            () => { resolve(); },
                            (energy) => { setAudioEnergy(energy); }
                        );
                    });
                }

                if (!abortController.signal.aborted) {
                    setState("idle");
                    setCurrentViseme("sil");
                    setVisemeIntensity(0);
                    setAudioEnergy(0);
                    onEnd?.();
                }
            } catch (err: unknown) {
                if (err instanceof Error && err.name === "AbortError") return;
                console.warn("[AvatarSpeech] Error in neural synthesis, activating fallback:", err);
                await speakBrowserFallback(cleanText, actualSpeed);
            }
        },
        [ttsEndpoint, defaultSpeed, stop, onStart, onEnd, speakBrowserFallback]
    );

    return {
        state,
        currentViseme,
        visemeIntensity,
        audioEnergy,
        isSpeaking,
        speak,
        stop,
        setState,
    };
}
