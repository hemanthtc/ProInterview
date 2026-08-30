let activeAudio: HTMLAudioElement | null = null;
let isHalted = false;

/**
 * Stop and cancel all active interview speech synthesis and audio playback immediately.
 */
export function stopSpeechInterviewText(): void {
    isHalted = true;
    if (typeof window !== "undefined") {
        if ("speechSynthesis" in window) {
            try {
                window.speechSynthesis.cancel();
            } catch {
                /* ignore */
            }
        }
        if (activeAudio) {
            try {
                activeAudio.pause();
                activeAudio.currentTime = 0;
                activeAudio.src = "";
            } catch {
                /* ignore */
            }
            activeAudio = null;
        }
    }
}

/**
 * Speak interview replies via Sarvam TTS (when provider=sarvam) or browser speechSynthesis.
 */
export async function speakInterviewText(
    text: string,
    opts: {
        provider?: string;
        voiceLanguage?: string;
        isListening?: () => boolean;
        onStart?: () => void;
        onEnd?: () => void;
    } = {}
): Promise<void> {
    // Ensure any previously playing speech is immediately halted
    stopSpeechInterviewText();
    isHalted = false;

    const clean = text
        .replace(/\[MODE:(CHAT|CODE|DRAW)\]/gi, "")
        .replace(/\[TERMINATE\]/gi, "")
        .trim();
    if (!clean) return;
    if (opts.isListening?.() || isHalted) return;

    const provider = opts.provider || "gemini";
    const voiceLanguage = opts.voiceLanguage || "en-IN";

    if (provider === "sarvam") {
        try {
            const res = await fetch("/api/sarvam/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: clean, voiceLanguage }),
            });
            if (isHalted) return;
            if (res.ok) {
                const data = await res.json();
                if (data.audioBase64 && !isHalted) {
                    const mime = data.mimeType || "audio/wav";
                    const src = `data:${mime};base64,${data.audioBase64}`;
                    const audio = new Audio(src);
                    activeAudio = audio;
                    opts.onStart?.();
                    await new Promise<void>((resolve) => {
                        audio.onended = () => {
                            activeAudio = null;
                            opts.onEnd?.();
                            resolve();
                        };
                        audio.onerror = () => {
                            activeAudio = null;
                            opts.onEnd?.();
                            resolve();
                        };
                        void audio.play().catch(() => {
                            activeAudio = null;
                            opts.onEnd?.();
                            resolve();
                        });
                    });
                    return;
                }
            }
        } catch {
            /* fall through to browser TTS */
        }
    }

    if (isHalted || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = voiceLanguage;

    const pickVoice = () => {
        if (isHalted) return;
        const voices = window.speechSynthesis.getVoices();
        const base = (voiceLanguage || "en").slice(0, 2).toLowerCase();
        // Prefer high-quality neural / natural voices so the interviewer sounds human.
        const isNatural = (v: SpeechSynthesisVoice) =>
            /natural|neural|premium|enhanced|google|online|siri|aria|jenny|libby|sonia|samantha|neerja|prabhat/i.test(v.name);
        const langVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith(base));
        const naturalExact = langVoices.find(isNatural);
        const plainExact = voices.find((v) => v.lang === voiceLanguage);
        const naturalEn = voices.filter((v) => v.lang?.toLowerCase().startsWith("en")).find(isNatural);
        utterance.voice = naturalExact || plainExact || langVoices[0] || naturalEn || voices[0] || null;
        // Natural human cadence: a touch slower than default with neutral pitch.
        utterance.rate = 0.96;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.onstart = () => opts.onStart?.();
        utterance.onend = () => opts.onEnd?.();
        if (!isHalted) {
            window.speechSynthesis.speak(utterance);
        }
    };

    if (window.speechSynthesis.getVoices().length > 0) pickVoice();
    else window.speechSynthesis.onvoiceschanged = pickVoice;
}
