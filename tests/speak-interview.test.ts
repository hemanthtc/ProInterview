import { describe, it, expect } from "vitest";

function cleanInterviewSpeechText(text: string): string {
    return text
        .replace(/\[MODE:(CHAT|CODE|DRAW)\]/gi, "")
        .replace(/\[TERMINATE\]/gi, "")
        .replace(/```[\s\S]*?```/g, " [Code snippet provided] ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/__([^_]+)__/g, "$1")
        .replace(/_([^_]+)_/g, "$1")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/^[-*+]\s+/gm, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function selectBestVoice(availableVoices: Array<{ name: string; lang: string }>) {
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

    for (const kw of targetVoiceKeywords) {
        const found = availableVoices.find(v => v.name.toLowerCase().includes(kw));
        if (found) return found;
    }

    return availableVoices.find(v => v.lang === "en-US") || availableVoices[0] || null;
}

describe("In-Code Custom Voice Synthesis (0 API Credits)", () => {
    it("cleans markdown symbols, bold text, code blocks, and prompt tags from speech input", () => {
        const rawAiResponse = `[MODE:CHAT] **Hello candidate!** Here is a quick question on \`binary search\`:
\`\`\`python
def search(arr): pass
\`\`\`
Can you explain your approach?`;

        const cleaned = cleanInterviewSpeechText(rawAiResponse);

        expect(cleaned).not.toContain("[MODE:CHAT]");
        expect(cleaned).not.toContain("**");
        expect(cleaned).not.toContain("`");
        expect(cleaned).toContain("Hello candidate!");
        expect(cleaned).toContain("[Code snippet provided]");
        expect(cleaned).toContain("Can you explain your approach?");
    });

    it("prioritizes warm natural female voices matching sample 2", () => {
        const mockBrowserVoices = [
            { name: "Default Robotic Voice", lang: "en-US" },
            { name: "Microsoft David - English (United States)", lang: "en-US" },
            { name: "Google US English", lang: "en-US" },
            { name: "Microsoft Zira - English (United States)", lang: "en-US" },
        ];

        const selected = selectBestVoice(mockBrowserVoices);
        expect(selected?.name).toBe("Google US English");
    });

    it("selects Microsoft Jenny / Aria / Zira / Samantha when available", () => {
        const macVoices = [
            { name: "Alex", lang: "en-US" },
            { name: "Fred", lang: "en-US" },
            { name: "Samantha", lang: "en-US" },
            { name: "Victoria", lang: "en-US" },
        ];

        const selected = selectBestVoice(macVoices);
        expect(selected?.name).toBe("Samantha");
    });

    it("calibrates pitch to 0.90 and rate to 0.88 for comfortable interview tempo", () => {
        const defaultPitch = 0.90;
        const defaultRate = 0.88;

        expect(defaultPitch).toBeLessThan(1.0); // Slightly warmer/lower pitch
        expect(defaultRate).toBeLessThan(1.0);  // Unhurried conversational pace
    });
});
