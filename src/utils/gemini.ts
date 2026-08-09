import crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";

const memory = new Map<string, { at: number; value: string }>();

export function getGeminiModel(model = "gemini-2.5-flash") {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured");
    return new GoogleGenerativeAI(key).getGenerativeModel({ model });
}

/** Stable hash for cache keys so truncated prefixes cannot collide. */
export function promptCacheKey(namespace: string, ...parts: unknown[]): string {
    const hash = crypto.createHash("sha256");
    hash.update(namespace);
    for (const part of parts) {
        hash.update("\0");
        hash.update(typeof part === "string" ? part : JSON.stringify(part ?? null));
    }
    return `${namespace}:${hash.digest("hex").slice(0, 32)}`;
}

/**
 * TTL cache for identical Gemini prompts.
 * Prefer omitting cacheKey and letting the full prompt be hashed.
 */
export async function cachedGenerate(
    cacheKeyOrPrompt: string,
    promptMaybe?: string,
    ttlMs = 10 * 60 * 1000
): Promise<string> {
    const prompt = promptMaybe ?? cacheKeyOrPrompt;
    const cacheKey = promptMaybe !== undefined ? cacheKeyOrPrompt : promptCacheKey("gemini", prompt);

    const hit = memory.get(cacheKey);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;

    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    memory.set(cacheKey, { at: Date.now(), value: text });

    // Bound memory growth
    if (memory.size > 500) {
        const oldest = memory.keys().next().value;
        if (oldest) memory.delete(oldest);
    }
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
