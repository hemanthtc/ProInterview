import { GoogleGenerativeAI } from "@google/generative-ai";

const memory = new Map<string, { at: number; value: string }>();

export function getGeminiModel(model = "gemini-2.5-flash") {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured");
    return new GoogleGenerativeAI(key).getGenerativeModel({ model });
}

/** Simple TTL cache for identical Gemini prompts (reduces cost/latency). */
export async function cachedGenerate(
    cacheKey: string,
    prompt: string,
    ttlMs = 10 * 60 * 1000
): Promise<string> {
    const hit = memory.get(cacheKey);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;

    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    memory.set(cacheKey, { at: Date.now(), value: text });
    return text;
}

export function parseJsonFromModel(text: string): unknown {
    const cleaned = text.replace(/```json\n?|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
        return JSON.parse(cleaned.slice(start, end + 1));
    }
    const aStart = cleaned.indexOf("[");
    const aEnd = cleaned.lastIndexOf("]");
    if (aStart >= 0 && aEnd > aStart) {
        return JSON.parse(cleaned.slice(aStart, aEnd + 1));
    }
    throw new Error("Model did not return JSON");
}
