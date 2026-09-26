/** Sarvam AI client helpers (Indic TTS + chat). */

export function getSarvamKey(): string | null {
    const key = process.env.SARVAM_API_KEY;
    if (!key || key.includes("your_") || key === "dummy") return null;
    return key;
}

/** Map browser locale (en-IN, hi-IN, ta-IN…) to Sarvam target_language_code. */
export function toSarvamLanguageCode(voiceLanguage?: string): string {
    const lang = (voiceLanguage || "hi-IN").trim();
    const supported = new Set([
        "hi-IN",
        "bn-IN",
        "kn-IN",
        "ml-IN",
        "mr-IN",
        "od-IN",
        "pa-IN",
        "ta-IN",
        "te-IN",
        "gu-IN",
        "en-IN",
    ]);
    if (supported.has(lang)) return lang;
    if (lang.startsWith("hi")) return "hi-IN";
    if (lang.startsWith("ta")) return "ta-IN";
    if (lang.startsWith("te")) return "te-IN";
    if (lang.startsWith("kn")) return "kn-IN";
    if (lang.startsWith("ml")) return "ml-IN";
    if (lang.startsWith("bn")) return "bn-IN";
    if (lang.startsWith("mr")) return "mr-IN";
    if (lang.startsWith("gu")) return "gu-IN";
    if (lang.startsWith("pa")) return "pa-IN";
    return "en-IN";
}

export async function sarvamTextToSpeech(
    text: string,
    voiceLanguage?: string
): Promise<{ audioBase64: string; mimeType: string } | null> {
    const key = getSarvamKey();
    if (!key) return null;
    const clean = text.replace(/\[MODE:(CHAT|CODE|DRAW)\]/gi, "").replace(/\[TERMINATE\]/gi, "").trim();
    if (!clean) return null;

    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-subscription-key": key,
        },
        body: JSON.stringify({
            text: clean.slice(0, 2400),
            target_language_code: toSarvamLanguageCode(voiceLanguage),
            model: "bulbul:v2",
            speaker: "meera",
        }),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn("Sarvam TTS failed", res.status, errText.slice(0, 200));
        return null;
    }

    const data = await res.json();
    const audio = Array.isArray(data.audios) ? data.audios[0] : data.audio;
    if (!audio || typeof audio !== "string") return null;
    return { audioBase64: audio, mimeType: "audio/wav" };
}

export async function sarvamChatCompletion(
    systemPrompt: string,
    history: { role: "user" | "assistant"; content: string }[],
    message: string
): Promise<string | null> {
    const key = getSarvamKey();
    if (!key) return null;

    const messages: { role: string; content: string }[] = [
        { role: "system", content: systemPrompt.slice(0, 12000) },
        ...history.slice(-16).map((h) => ({
            role: h.role === "assistant" ? "assistant" : "user",
            content: String(h.content || "").slice(0, 4000),
        })),
        { role: "user", content: (message || "Hello!").slice(0, 4000) },
    ];

    const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-subscription-key": key,
        },
        body: JSON.stringify({
            model: "sarvam-m",
            messages,
            temperature: 0.7,
            max_tokens: 800,
        }),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn("Sarvam chat failed", res.status, errText.slice(0, 200));
        return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : null;
}
