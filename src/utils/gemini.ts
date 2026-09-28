import crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";

const memory = new Map<string, { at: number; value: string }>();

/**
 * Universal Gemini API Key extractor:
 * Automatically sanitizes and extracts all valid API keys (both AI Studio 'AIzaSy...'
 * and Google Cloud / Vertex Express 'AQ.Ab...' or comma-separated lists).
 */
export function getAllGeminiApiKeys(): string[] {
    const rawSources = [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEYS,
        process.env.GEMINI_API_KEY_BACKUP,
        process.env.GEMINI_BACKUP_KEY,
        process.env.GOOGLE_AI_KEY,
        process.env.GOOGLE_API_KEY,
    ].filter(Boolean).join(",");

    return Array.from(
        new Set(
            rawSources
                .split(/[\s,;]+/)
                .map((k) => k.replace(/^['"]+|['"]+$/g, "").trim())
                .filter((k) => k.length >= 20 && k !== "dummy")
        )
    );
}

/**
 * Returns the best active Gemini API key, prioritizing non-exhausted keys.
 */
export function getWorkingGeminiKey(): string {
    const keys = getAllGeminiApiKeys();
    if (keys.length === 0) {
        return process.env.GEMINI_API_KEY || "";
    }
    const now = Date.now();
    for (const key of keys) {
        const exhaustedAt = quotaExhaustedKeys.get(key);
        if (!exhaustedAt || now - exhaustedAt >= 60 * 1000) {
            return key;
        }
    }
    return keys[0];
}

export function getGeminiModel(model = "gemini-2.5-flash") {
    const key = getWorkingGeminiKey();
    if (!key || key === "dummy") throw new Error("GEMINI_API_KEY is not configured");
    return new GoogleGenerativeAI(key).getGenerativeModel({ model });
}

/**
 * Executes a Gemini model request with an explicit timeout to prevent hanging request threads.
 */
export async function generateContentWithTimeout<T = any>(
    modelCall: Promise<T>,
    timeoutMs = 30000,
    errorMessage = "AI gateway request timed out"
): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });
    try {
        return await Promise.race([modelCall, timeoutPromise]);
    } finally {
        clearTimeout(timer!);
    }
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
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-flash-lite-latest",
  "gemini-pro-latest",
  "gemini-2.5-pro",
];

/**
 * Given a list of models a key supports, keep only text/multimodal models and order them
 * flash-first (faster/cheaper) so the working model is hit on the first try.
 */
export function preferTextModels(models: string[]): string[] {
  const isTextModel = (m: string) =>
    !/(embedding|imagen|tts|audio|live|aqa|learnlm|veo|robotics)/i.test(m) &&
    !/(1\.5|2\.0)/i.test(m);
  const score = (m: string) => {
    let s = 0;
    if (m === "gemini-2.5-flash") s -= 30;
    if (m === "gemini-flash-latest") s -= 25;
    if (m === "gemini-2.5-flash-lite") s -= 20;
    if (m === "gemini-3.5-flash") s -= 15;
    if (m.includes("flash")) s -= 10;
    if (m.includes("latest")) s -= 5;
    if (m.includes("lite")) s += 1;
    if (m.includes("pro")) s += 5;
    return s;
  };
  return models.filter(isTextModel).sort((a, b) => score(a) - score(b));
}

const keyModelsCache = new Map<string, { at: number; models: string[] }>();
const quotaExhaustedKeys = new Map<string, number>();
const quotaExhaustedModels = new Map<string, number>();

/**
 * Dynamically queries Google API for models supported and enabled for the provided API key
 */
export async function fetchKeySupportedModels(apiKey?: string): Promise<string[]> {
    const key = apiKey || getWorkingGeminiKey();
    if (!key) return [];

    const hit = keyModelsCache.get(key);
    if (hit && Date.now() - hit.at < 15 * 60 * 1000) return hit.models;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(3000),
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
    prompt: string | Array<any> | { contents: any[] },
    options: { model?: string; generationConfig?: any; timeout?: number } = {}
): Promise<string> {
    const keys = getAllGeminiApiKeys();
    if (keys.length === 0) throw new Error("GEMINI_API_KEY is not configured");

    const primaryModel = options.model || "gemini-2.5-flash";
    // Total execution budget across all candidate models (capped to 20s to ensure safety under AWS Amplify/Serverless 29s limit)
    const overallTimeout = Math.min(options.timeout ?? 18000, 22000);
    const deadline = Date.now() + overallTimeout;
    const now = Date.now();

    // Iterate through all configured API keys (multi-key failover)
    for (const key of keys) {
        if (Date.now() >= deadline - 2000) {
            break;
        }

        const keyExhaustedAt = quotaExhaustedKeys.get(key);
        if (keyExhaustedAt && now - keyExhaustedAt < 15 * 1000 && keys.length > 1) {
            continue; // Skip exhausted key if alternatives exist
        }

        const genAI = new GoogleGenerativeAI(key);
        const detectedKeyModels = await fetchKeySupportedModels(key);
        const validTextModels = preferTextModels(detectedKeyModels);

        // Include all reliable flash and pro models without artificial exclusions
        const candidateList = Array.from(new Set([
            primaryModel,
            "gemini-2.5-flash",
            "gemini-flash-latest",
            "gemini-2.5-flash-lite",
            "gemini-3.5-flash",
            ...validTextModels,
            ...ADVANCED_CANDIDATE_MODELS,
        ])).filter(m => 
            !/(1\.5|2\.0)/i.test(m) &&
            m !== "gemini-2.0-pro-exp-02-05" &&
            m !== "gemini-2.0-flash-thinking-exp-01-21"
        );

        const activeModels = candidateList.filter((m) => {
            const exhaustedAt = quotaExhaustedModels.get(`${key}:${m}`);
            return !exhaustedAt || now - exhaustedAt >= 15 * 1000;
        });

        // Try up to 3 active candidate models within the available deadline
        const modelsToTry = Array.from(new Set(activeModels.length > 0 ? activeModels : candidateList)).slice(0, 3);

        // Automatically detect multi-turn conversation arrays ([{ role, parts }]) and wrap in { contents }
        // so the GoogleGenerativeAI SDK does not erroneously serialize { role, parts } as nested Part objects
        const requestPayload: any =
            (typeof prompt === "object" && prompt !== null && "contents" in prompt)
                ? prompt
                : (Array.isArray(prompt) && prompt.length > 0 && typeof prompt[0] === "object" && prompt[0] !== null && "role" in prompt[0])
                    ? { contents: prompt }
                    : prompt;

        for (const modelName of modelsToTry) {
            const remainingTime = deadline - Date.now();
            if (remainingTime < 2500) {
                console.warn(`[Gemini API] Insufficient time remaining (${remainingTime}ms) before serverless deadline; terminating model loop.`);
                break;
            }
            const thisModelTimeout = Math.min(options.timeout ? Math.min(options.timeout, 10000) : 9000, remainingTime);

            try {
                const model = genAI.getGenerativeModel(
                    { model: modelName, generationConfig: options.generationConfig },
                    { timeout: thisModelTimeout }
                );
                const result = await model.generateContent(requestPayload);
                return result.response.text();
            } catch (err: any) {
                const is404 = err?.status === 404 || (err?.message && (err.message.includes("404") || err.message.includes("not found") || err.message.includes("no longer available")));
                const is429OrQuota =
                    err?.status === 429 ||
                    (err?.message &&
                        (err.message.includes("429") ||
                            err.message.includes("quota") ||
                            err.message.includes("Quota") ||
                            err.message.includes("exceeded") ||
                            err.message.includes("RESOURCE_EXHAUSTED")));
                const is503OrOverloaded =
                    err?.status === 503 ||
                    (err?.message &&
                        (err.message.includes("503") ||
                            err.message.includes("high demand") ||
                            err.message.includes("Service Unavailable") ||
                            err.message.includes("overloaded")));

                if (is404) {
                    // Permanently record unsupported model for this key
                    quotaExhaustedModels.set(`${key}:${modelName}`, Date.now() + 24 * 60 * 60 * 1000);
                    console.warn(`[Gemini API] Model ${modelName} not available for key (...${key.slice(-6)}); trying next model.`);
                    continue;
                }

                if (is429OrQuota || is503OrOverloaded) {
                    quotaExhaustedModels.set(`${key}:${modelName}`, Date.now());
                    console.warn(`[Gemini API] Quota/503 hit on key (...${key.slice(-6)}) model ${modelName}. Rotating to next model.`);
                    continue;
                }

                console.warn(`[Gemini API] Transient error on key (...${key.slice(-6)}) model ${modelName}:`, err?.message || err);
                continue;
            }
        }
        quotaExhaustedKeys.set(key, Date.now());
    }

    throw new Error("All configured Gemini API keys and models are currently rate-limited, unavailable, or exceeded deadline.");
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
