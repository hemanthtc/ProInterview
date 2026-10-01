import { NextRequest, NextResponse } from "next/server";
import {
  ADVANCED_CANDIDATE_MODELS,
  fetchKeySupportedModels,
  getAllGeminiApiKeys,
  getWorkingGeminiKey,
  preferTextModels,
} from "@/utils/gemini";
import { getVerifiedSession } from "@/utils/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UPSTREAM_TIMEOUT_MS = 30000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const customKey =
      typeof body?.apiKey === "string" &&
      body.apiKey.trim() &&
      body.apiKey !== "__INTEGRATED__"
        ? body.apiKey.replace(/^['"]+|['"]+$/g, "").trim()
        : null;

    const session = await getVerifiedSession(req);
    const isGuest = req.cookies.get("userLoggedIn")?.value === "guest" || req.headers.get("x-guest-access") === "true";
    const isAuthenticated = Boolean(session || isGuest);

    if (!isAuthenticated && !customKey) {
      return NextResponse.json(
        { error: "Unauthorized access: Please sign in." },
        { status: 401 }
      );
    }

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

    // Support both custom keys passed in body and integrated server keys
    const serverKeys = getAllGeminiApiKeys();
    const candidateKeys = Array.from(new Set([
      ...(customKey ? [customKey] : []),
      ...serverKeys,
    ]));

    if (candidateKeys.length === 0) {
      const fallbackKey = getWorkingGeminiKey();
      if (fallbackKey) candidateKeys.push(fallbackKey);
    }

    if (candidateKeys.length === 0) {
      return NextResponse.json(
        { error: "Gemini API key is not configured or provided." },
        { status: 500 }
      );
    }

    let lastErrorMsg = "";

    // Map obsolete or retired model names to current valid models
    let targetModel = requestedModel;
    if (
      !targetModel ||
      targetModel.includes("1.5-flash") ||
      targetModel.includes("2.0-flash") ||
      targetModel.includes("2.5-flash-lite")
    ) {
      targetModel = "gemini-2.5-flash";
    }

    for (const key of candidateKeys) {
      const genAI = new GoogleGenerativeAI(key);
      const detectedKeyModels = await fetchKeySupportedModels(key);
      const validTextModels = preferTextModels(detectedKeyModels);

      const candidateList = Array.from(new Set([
        targetModel,
        ...validTextModels,
        "gemini-2.5-flash",
        "gemini-flash-latest",
        "gemini-3.6-flash",
        "gemini-flash-lite-latest",
      ])).filter((m) =>
        !m.includes("2.0-flash") &&
        !m.includes("1.5-flash") &&
        m !== "gemini-2.5-flash-lite"
      ).slice(0, 4);

      for (const modelName of candidateList) {
        try {
          const generationConfig: any = { temperature };
          if (jsonMode) {
            generationConfig.responseMimeType = "application/json";
          }

          const model = genAI.getGenerativeModel(
            {
              model: modelName,
              generationConfig,
            },
            { timeout: UPSTREAM_TIMEOUT_MS }
          );

          const result = await model.generateContent(prompt);
          const text = result?.response?.text();

          if (text) {
            return NextResponse.json({ text });
          }
        } catch (err: any) {
          lastErrorMsg = err?.message || String(err);
          const is404 = err?.status === 404 || lastErrorMsg.includes("404") || lastErrorMsg.includes("not found");
          const is429 = err?.status === 429 || lastErrorMsg.includes("429") || lastErrorMsg.includes("quota");

          if (is404) {
            console.warn(`[Synthetic Gemini] Model ${modelName} not found for key; trying next model.`);
            continue;
          }

          if (is429) {
            console.warn(`[Synthetic Gemini] Quota hit on model ${modelName}; rotating.`);
            continue;
          }

          console.warn(`[Synthetic Gemini] Model ${modelName} error (${lastErrorMsg}); trying next model...`);
          continue;
        }
      }
    }

    return NextResponse.json(
      { error: lastErrorMsg || "All candidate Gemini models failed to generate content." },
      { status: 502 }
    );
  } catch (error: any) {
    console.error("Synthetic data Gemini proxy failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process Gemini synthetic data request" },
      { status: 500 }
    );
  }
}
