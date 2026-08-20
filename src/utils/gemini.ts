import crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";

const memory = new Map<string, { at: number; value: string }>();

export function getGeminiModel(model = "gemini-flash-latest") {
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

// Real, currently valid Gemini models for text generateContent, ordered by preference.
// The "-latest" aliases auto-track Google's newest release, so upgrading the key/model
// needs no code change.
export const ADVANCED_CANDIDATE_MODELS = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-pro-latest",
  "gemini-2.5-pro",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
];

/**
 * Given a list of models a key supports, keep only text chat models and order them
 * flash-first (faster/cheaper) so the working model is hit on the first try.
 */
export function preferTextModels(models: string[]): string[] {
  const isTextModel = (m: string) =>
    !/(embedding|image|imagen|tts|audio|live|vision|aqa|learnlm|veo|robotics)/i.test(m);
  const score = (m: string) => {
    let s = 0;
    if (m.includes("flash")) s -= 10; // prefer flash
    if (m.includes("latest")) s -= 5; // prefer latest aliases
    if (m.includes("lite")) s += 1;
    if (m.includes("pro")) s += 5;
    if (/1\.5|1\.0/.test(m)) s += 3; // deprioritise old versions
    return s;
  };
  return models.filter(isTextModel).sort((a, b) => score(a) - score(b));
}

const keyModelsCache = new Map<string, { at: number; models: string[] }>();

/**
 * Dynamically queries Google API for models supported and enabled for the provided API key
 */
export async function fetchKeySupportedModels(apiKey?: string): Promise<string[]> {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) return [];

    const hit = keyModelsCache.get(key);
    if (hit && Date.now() - hit.at < 15 * 60 * 1000) return hit.models;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return [];
        const json = await res.json();
        if (!Array.isArray(json?.models)) return [];

        const supported = json.models
            .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
            .map((m: any) => (m.name || "").replace(/^models\//, ""))
            .filter(Boolean);

        keyModelsCache.set(key, { at: Date.now(), models: supported });
        return supported;
    } catch {
        return [];
    }
}

export async function generateWithFallback(
    prompt: string,
    options: { model?: string; generationConfig?: any } = {}
): Promise<string> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured");

    const genAI = new GoogleGenerativeAI(key);
    const primaryModel = options.model || "gemini-flash-latest";
    const detectedKeyModels = await fetchKeySupportedModels(key);
    const modelsToTry = Array.from(new Set([
        primaryModel,
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        ...detectedKeyModels,
        ...ADVANCED_CANDIDATE_MODELS,
    ].filter(m => 
        m !== "gemini-2.0-flash" && 
        m !== "gemini-1.5-flash" && 
        m !== "gemini-1.5-pro" && 
        m !== "gemini-1.5-flash-latest" &&
        m !== "gemini-2.0-flash-lite" &&
        m !== "gemini-2.0-pro-exp-02-05" &&
        m !== "gemini-2.0-flash-thinking-exp-01-21"
    )));

    let lastErr: unknown;
    let rateLimitCount = 0;
    const maxRateLimitRetries = Math.min(5, modelsToTry.length);

    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName, generationConfig: options.generationConfig });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (err: any) {
            lastErr = err;
            const isRateLimit = err?.status === 429 || (err?.message && (err.message.includes("429") || err.message.includes("Quota") || err.message.includes("quota") || err.message.includes("rate") || err.message.includes("limit") || err.message.includes("exceeded")));
            const isNotFound = err?.status === 404 || (err?.message && err.message.includes("404"));

            if (isRateLimit) {
                rateLimitCount++;
                if (rateLimitCount >= maxRateLimitRetries) {
                    console.log("[Gemini API] Rate-limited across models, activating fallback mode.");
                    throw new Error("Gemini API rate limit reached. Utilizing fallback mode.");
                }
                await new Promise(r => setTimeout(r, 200));
                continue;
            }

            if (isNotFound) {
                continue;
            }

            throw err;
        }
    }
    throw lastErr;
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

    const text = await generateWithFallback(prompt);
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
