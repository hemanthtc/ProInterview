import { NextRequest, NextResponse } from "next/server";
import {
  ADVANCED_CANDIDATE_MODELS,
  fetchKeySupportedModels,
  preferTextModels,
} from "@/utils/gemini";
import { getVerifiedSession } from "@/utils/auth";

// Max models to try before giving up. Kept small so a request never spends its
// whole budget looping through failing models (this was the cause of gateway 504s).
const MAX_MODEL_ATTEMPTS = 5;
// Per-call upstream timeout so a single hung request cannot exhaust the gateway budget.
const UPSTREAM_TIMEOUT_MS = 55000;

async function fetchGeminiContent(
  prompt: string,
  jsonMode: boolean,
  temperature: number,
  model: string,
  apiKey: string
): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          responseMimeType: jsonMode ? "application/json" : "text/plain",
        },
      }),
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getVerifiedSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized access: Please sign in." },
        { status: 401 }
      );
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return NextResponse.json(
        { error: "Integrated Gemini API is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt : "";
    const jsonMode = Boolean(body?.jsonMode);
    const temperature =
      typeof body?.temperature === "number" && Number.isFinite(body.temperature)
        ? body.temperature
        : 0.7;

    const requestedModel =
      typeof body?.model === "string" && body.model.trim()
        ? body.model.trim()
        : "";

    if (!prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    // No artificial prompt-length cap: the integrated path must handle full-length
    // document prompts exactly like the direct (custom key) path does. Gemini's own
    // input limit is enforced upstream and surfaced as a normal API error if hit.

    // Auto-detect the models this key actually supports, flash-first. This makes the
    // route adapt automatically to whatever key/model is configured — no code change
    // needed when Google upgrades or renames models.
    const detectedKeyModels = preferTextModels(await fetchKeySupportedModels(API_KEY));

    const queue: string[] = [];
    // Honour an explicitly requested model only if the key actually supports it,
    // otherwise it just wastes an attempt failing.
    if (requestedModel && detectedKeyModels.includes(requestedModel)) {
      queue.push(requestedModel);
    }
    queue.push(...detectedKeyModels, ...ADVANCED_CANDIDATE_MODELS);

    const modelQueue = Array.from(new Set(queue)).slice(0, MAX_MODEL_ATTEMPTS);

    let lastResponse: Response | null = null;
    let data: any = null;
    let lastErrorMsg = "";

    for (const currentModel of modelQueue) {
      try {
        const resp = await fetchGeminiContent(prompt, jsonMode, temperature, currentModel, API_KEY);
        lastResponse = resp;
        data = await resp.json().catch(() => ({}));
        if (resp.ok) {
          break;
        }
        lastErrorMsg = data?.error?.message || `HTTP ${resp.status}`;

        // Abort retries only on genuine key/quota problems — not on a 404/400 caused
        // by a single bad model name, which should fall through to the next model.
        const msg = lastErrorMsg.toLowerCase();
        const isFatalKeyError =
          resp.status === 403 ||
          resp.status === 429 ||
          msg.includes("api key") ||
          msg.includes("api_key") ||
          msg.includes("permission") ||
          msg.includes("quota") ||
          msg.includes("rate limit");

        if (isFatalKeyError) {
          console.error(`[Gemini Route] Critical key/quota error: ${lastErrorMsg}. Aborting retries.`);
          break;
        }

        console.warn(`[Gemini Route] Model '${currentModel}' failed (${lastErrorMsg}). Retrying next model...`);
      } catch (err: any) {
        lastErrorMsg =
          err?.name === "AbortError"
            ? "Upstream Gemini request timed out."
            : err?.message || "Fetch network error";
        console.warn(`[Gemini Route] Model '${currentModel}' errored (${lastErrorMsg}). Retrying next model...`);
      }
    }

    if (!lastResponse || !lastResponse.ok) {
      const status = lastResponse?.status || 502;
      const message =
        data?.error?.message || lastErrorMsg || `Gemini request failed (${status})`;
      return NextResponse.json({ error: message }, { status });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json(
        { error: "Empty response received from Gemini API" },
        { status: 502 }
      );
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Synthetic data Gemini proxy failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to call integrated Gemini API" },
      { status: 500 }
    );
  }
}
