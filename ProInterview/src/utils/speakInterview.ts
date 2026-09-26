let activeAudio: HTMLAudioElement | null = null;
let isHalted = false;

/**
 * Clean markdown symbols, code delimiters, and prompt tags so browser voice sounds natural.
 */
function cleanInterviewSpeechText(text: string): string {
    return text
        .replace(/\[MODE:(CHAT|CODE|DRAW)\]/gi, "")
        .replace(/\[TERMINATE\]/gi, "")
        .replace(/```[\s\S]*?```/g, " [Code snippet provided] ") // Replace multiline code blocks
        .replace(/`([^`]+)`/g, "$1") // Strip inline backticks
        .replace(/\*\*([^*]+)\*\*/g, "$1") // Strip bold **
        .replace(/\*([^*]+)\*/g, "$1") // Strip italics *
        .replace(/__([^_]+)__/g, "$1") // Strip bold __
        .replace(/_([^_]+)_/g, "$1") // Strip italics _
        .replace(/^#{1,6}\s+/gm, "") // Strip headers #
        .replace(/^[-*+]\s+/gm, "") // Strip list bullets
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links [text](url) to text
        .replace(/\s{2,}/g, " ") // Normalize spaces
        .trim();
}

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
 * Speak interview replies via browser speechSynthesis calibrated to match the target warm voice sample (0 API Credits).
 */
export async function speakInterviewText(
    text: string,
    opts: {
        provider?: string;
        voiceLanguage?: string;
        pitch?: number;
        rate?: number;
        isListening?: () => boolean;
        onStart?: () => void;
        onEnd?: () => void;
    } = {}
): Promise<void> {
    // Ensure any previously playing speech is immediately halted
    stopSpeechInterviewText();
    isHalted = false;

    const clean = cleanInterviewSpeechText(text);
    if (!clean) return;
    if (opts.isListening?.() || isHalted) return;

    const voiceLanguage = opts.voiceLanguage || "en-US";

    if (isHalted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = voiceLanguage;

    const pickVoice = () => {
        if (isHalted) return;
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) return;

        // Preferred voice order matching the warm, natural female conversational tone of Audio Sample 2
        const targetVoiceKeywords = [
            "google us english",
            "microsoft jenny online",
            "microsoft jenny",
            "microsoft aria online",
            "microsoft aria",
            "microsoft zira",
            "samantha",
            "microsoft michelle",
            "microsoft guy",
            "microsoft neerja",
            "natural",
            "neural",
            "premium",
            "enhanced"
        ];

        let selectedVoice: SpeechSynthesisVoice | null = null;

        // 1. Try finding by highest priority target voice names
        for (const kw of targetVoiceKeywords) {
            const found = voices.find(v => v.name.toLowerCase().includes(kw));
            if (found) {
                selectedVoice = found;
                break;
            }
        }

        // 2. Try exact language match with English
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang === "en-US" || v.lang === "en_US") ||
                           voices.find(v => v.lang?.toLowerCase().startsWith("en")) ||
                           voices[0] || null;
        }

        utterance.voice = selectedVoice;

        // Custom Acoustic Calibration matching Sample 2:
        // - Pitch: 0.90 (slight drop from 1.0 to add warm vocal resonance and eliminate metallic treble)
        // - Rate: 0.88 (comfortable 135 WPM conversational interview pace rather than rushed 165 WPM)
        // - Volume: 1.0 (clean full-gain clarity)
        const customPitch = typeof opts.pitch === "number" ? opts.pitch : 0.90;
        const customRate = typeof opts.rate === "number" ? opts.rate : 0.88;

        utterance.pitch = Math.max(0.5, Math.min(1.5, customPitch));
        utterance.rate = Math.max(0.5, Math.min(1.5, customRate));
        utterance.volume = 1.0;

        utterance.onstart = () => opts.onStart?.();
        utterance.onend = () => opts.onEnd?.();
        utterance.onerror = () => opts.onEnd?.();

        if (!isHalted) {
            window.speechSynthesis.speak(utterance);
        }
    };

    if (window.speechSynthesis.getVoices().length > 0) {
        pickVoice();
    } else {
        window.speechSynthesis.onvoiceschanged = pickVoice;
    }
}
