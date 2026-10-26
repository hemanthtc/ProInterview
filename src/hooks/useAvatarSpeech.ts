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

    const stop = useCallback(() => {
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
    }, [onEnd]);

    const speak = useCallback(
        async (text: string, speed?: number) => {
            const cleanText = text
                .replace(/\[MODE:(?:CHAT|CODE|DRAW)\]/gi, "")
                .replace(/\[TERMINATE\]/gi, "")
                .trim();

            if (!cleanText) return;

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
                        console.warn(`[AvatarSpeech] TTS endpoint responded with HTTP ${res.status}`);
                        return { audio_base64: null };
                    }
                    return await res.json();
                } catch (fetchErr: unknown) {
                    if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
                        return { audio_base64: null };
                    }
                    console.warn("[AvatarSpeech] Sentence audio fetch skipped or timed out:", fetchErr);
                    return { audio_base64: null };
                }
            };

            try {
                if (sentences.length === 1) {
                    const data = await fetchSentenceAudio(sentences[0]);
                    if (abortController.signal.aborted) return;
                    if (!data || !data.audio_base64) {
                        setState("idle");
                        onEnd?.();
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

                // Pipelined multi-sentence streaming:
                // Fetch first sentence immediately for instant sub-250ms speech start
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

                    if (!currentData.audio_base64) {
                        console.warn("[AvatarSpeech] Sentence neural audio missing, skipping chunk.");
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
                console.error("[AvatarSpeech] Neural speech synthesis encountered an error:", err);
                setState("idle");
                setCurrentViseme("sil");
                setVisemeIntensity(0);
                setAudioEnergy(0);
                onEnd?.();
            }
        },
        [ttsEndpoint, defaultSpeed, stop, onStart, onEnd]
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
