"use client";

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
    const clean = text
        .replace(/\[MODE:(CHAT|CODE|DRAW)\]/gi, "")
        .replace(/\[TERMINATE\]/gi, "")
        .trim();
    if (!clean) return;
    if (opts.isListening?.()) return;

    const provider = opts.provider || "gemini";
    const voiceLanguage = opts.voiceLanguage || "en-IN";

    if (provider === "sarvam") {
        try {
            const res = await fetch("/api/sarvam/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: clean, voiceLanguage }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.audioBase64) {
                    const mime = data.mimeType || "audio/wav";
                    const src = `data:${mime};base64,${data.audioBase64}`;
                    const audio = new Audio(src);
                    opts.onStart?.();
                    await new Promise<void>((resolve) => {
                        audio.onended = () => {
                            opts.onEnd?.();
                            resolve();
                        };
                        audio.onerror = () => {
                            opts.onEnd?.();
                            resolve();
                        };
                        void audio.play().catch(() => {
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

    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = voiceLanguage;

    const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const exact = voices.find((v) => v.lang === voiceLanguage);
        const prefix = voices.find((v) => v.lang?.startsWith(voiceLanguage.slice(0, 2)));
        const googleEn = voices.find((v) => v.lang?.startsWith("en") && v.name.includes("Google"));
        utterance.voice = exact || prefix || googleEn || voices[0] || null;
        utterance.rate = 1.05;
        utterance.onstart = () => opts.onStart?.();
        utterance.onend = () => opts.onEnd?.();
        window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) pickVoice();
    else window.speechSynthesis.onvoiceschanged = pickVoice;
}
