import { NextRequest, NextResponse } from "next/server";

const ADVANCED_CANDIDATE_MODELS = [
  // 1. Core Gemini & Flash Models
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-pro-exp-02-05",
  "gemini-2.0-flash-thinking-exp-01-21",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",

  // 2. Real-Time Audio & Live Conversational Models
  "gemini-omni-flash",
  "gemini-3.5-live-translate-preview",
  "gemini-3.1-flash-live-preview",
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-live",

  // 3. Generative Media & Specialized Task Models
  "gemini-3.1-flash-image",
  "gemini-3-pro-image",
  "gemini-embedding-2-preview",
  "gemini-robotics-er-2-preview",
];

/**
 * Dynamically queries Google API for models supported and enabled for the provided API key
 */
async function fetchKeySupportedModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
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

    return supported;
  } catch {
    return [];
  }
}

async function fetchGeminiContent(
  prompt: string,
  jsonMode: boolean,
  temperature: number,
  model: string,
  apiKey: string
): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: jsonMode ? "application/json" : "text/plain",
      },
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
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
      typeof body?.model === "string" && body.model.trim() && body.model.trim() !== "gemini-2.5-flash"
        ? body.model.trim()
        : ADVANCED_CANDIDATE_MODELS[0];

    if (!prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    // Auto-detect key supported models dynamically from Google API
    const detectedKeyModels = await fetchKeySupportedModels(API_KEY);
    const modelQueue = Array.from(
      new Set([requestedModel, ...detectedKeyModels, ...ADVANCED_CANDIDATE_MODELS])
    );

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
        console.warn(`[Gemini Route] Model '${currentModel}' failed (${lastErrorMsg}). Retrying next model...`);
      } catch (err: any) {
        lastErrorMsg = err?.message || "Fetch network error";
      }
    }

    if (!lastResponse || !lastResponse.ok) {
      const status = lastResponse?.status || 500;
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
