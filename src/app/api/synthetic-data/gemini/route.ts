import { NextRequest, NextResponse } from "next/server";
import { ADVANCED_CANDIDATE_MODELS, fetchKeySupportedModels } from "@/utils/gemini";
import { getVerifiedSession } from "@/utils/auth";

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
      typeof body?.model === "string" && body.model.trim() && body.model.trim() !== "gemini-2.5-flash"
        ? body.model.trim()
        : ADVANCED_CANDIDATE_MODELS[0];

    if (!prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    if (prompt.length > 50000) {
      return NextResponse.json(
        { error: "Prompt exceeds maximum allowed length (50,000 characters)." },
        { status: 400 }
      );
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
