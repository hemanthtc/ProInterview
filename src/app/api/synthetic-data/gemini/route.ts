import { NextRequest, NextResponse } from "next/server";
import {
  fetchKeySupportedModels,
  getAllGeminiApiKeys,
  getWorkingGeminiKey,
  preferTextModels,
} from "@/utils/gemini";
import { getVerifiedSession } from "@/utils/auth";
import { isGroundingTopic } from "@/utils/topicClassifier";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UPSTREAM_TIMEOUT_MS = 30000;
const TOTAL_DEADLINE_MS = 54000;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const deadline = startTime + TOTAL_DEADLINE_MS;

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

    // Map obsolete or retired model names to current active models
    let targetModel = requestedModel;
    if (
      !targetModel ||
      targetModel.includes("1.5-flash") ||
      targetModel.includes("2.0-flash") ||
      targetModel.includes("2.5-flash-lite") ||
      targetModel === "gemini-2.5-flash"
    ) {
      targetModel = "gemini-3-flash-preview";
    }

    // Grounding: Enabled for factual domains AND tech versions/releases/deprecations
    const enableGrounding = isGroundingTopic(prompt);

    for (const key of candidateKeys) {
      if (Date.now() >= deadline - 3000) break;

      const genAI = new GoogleGenerativeAI(key);
      const detectedKeyModels = await fetchKeySupportedModels(key);
      const validTextModels = preferTextModels(detectedKeyModels);

      const candidateList = Array.from(new Set([
        targetModel,
        ...validTextModels,
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite-preview",
        "gemini-2.5-flash",
        "gemini-flash-latest",
      ])).filter((m) =>
        !m.includes("2.0-flash") &&
        !m.includes("1.5-flash") &&
        m !== "gemini-2.5-flash-lite"
      ).slice(0, 5);

      for (let attempt = 0; attempt < 2; attempt++) {
        if (Date.now() >= deadline - 2500) break;

        for (const modelName of candidateList) {
          if (Date.now() >= deadline - 2000) break;

          try {
            // maxOutputTokens 8192 ensures long sections (1,500-2,500+ words) are never clipped
            const generationConfig: any = {
              temperature,
              maxOutputTokens: 8192,
            };

            // Note: tools and responseMimeType: 'application/json' cannot be combined per Gemini API specification.
            // If grounding is enabled, omit responseMimeType; the client's cleanAndParseJSON handles JSON extraction.
            if (jsonMode && !enableGrounding) {
              generationConfig.responseMimeType = "application/json";
            }

            const modelParams: any = {
              model: modelName,
              generationConfig,
            };

            if (enableGrounding) {
              modelParams.tools = [{ googleSearch: {} }];
            }

            let result: any;
            let ungroundedFallback = false;
            try {
              const model = genAI.getGenerativeModel(modelParams, { timeout: UPSTREAM_TIMEOUT_MS });
              result = await model.generateContent(prompt);
            } catch (toolErr: any) {
              const status = toolErr?.status ?? toolErr?.statusCode;
              const errStr = String(toolErr?.message || "");

              // Never retry without tools on 429, 5xx or network errors (rethrow those)
              const is429 = status === 429 || errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED");
              const is5xx = (typeof status === "number" && status >= 500 && status < 600) || status === 503 || status === 500 || status === 502 || status === 504;
              const isNetwork =
                toolErr?.name === "AbortError" ||
                toolErr?.name === "FetchError" ||
                toolErr?.code === "ECONNRESET" ||
                toolErr?.code === "ETIMEDOUT" ||
                toolErr?.code === "ENOTFOUND" ||
                errStr.includes("fetch failed") ||
                errStr.includes("network");

              if (is429 || is5xx || isNetwork) {
                throw toolErr;
              }

              // Retry without tools ONLY when status === 400 or the error is INVALID_ARGUMENT
              const is400OrInvalidArgument =
                status === 400 ||
                toolErr?.errorDetails?.status === "INVALID_ARGUMENT" ||
                errStr.includes("INVALID_ARGUMENT");

              if (modelParams.tools && is400OrInvalidArgument) {
                console.warn(`[Synthetic Gemini Grounding] Search tool rejected with HTTP 400 / INVALID_ARGUMENT on ${modelName} (${toolErr?.message || toolErr}). Retrying fallback generation without tools.`);
                delete modelParams.tools;
                ungroundedFallback = true;
                const fallbackModel = genAI.getGenerativeModel(modelParams, { timeout: UPSTREAM_TIMEOUT_MS });
                result = await fallbackModel.generateContent(prompt);
              } else {
                throw toolErr;
              }
            }

            // Always log groundingMetadata.webSearchQueries on every call
            const firstCandidate = result?.response?.candidates?.[0];
            const webSearchQueries =
              firstCandidate?.groundingMetadata?.webSearchQueries ||
              result?.response?.groundingMetadata?.webSearchQueries ||
              [];
            console.log(`[Synthetic Gemini Grounding] webSearchQueries for model ${modelName}:`, webSearchQueries);

            const text = result?.response?.text();

            if (text) {
              // Directive 3: Detect and log stray %%% placeholders without guessing characters
              if (text.includes("%%%")) {
                console.warn('[Synthetic Gemini Guard] Detected placeholder "%%%" in model output; flagged and preserved.');
              }
              const isGrounded = enableGrounding && !ungroundedFallback;
              return NextResponse.json(
                { text, grounded: isGrounded },
                {
                  headers: {
                    "X-Grounded": isGrounded ? "true" : "false",
                  },
                }
              );
            }
          } catch (err: any) {
            lastErrorMsg = err?.message || String(err);
            const is404 = err?.status === 404 || lastErrorMsg.includes("404") || lastErrorMsg.includes("not found");
            const is429 = err?.status === 429 || lastErrorMsg.includes("429") || lastErrorMsg.includes("quota");
            const is503 = err?.status === 503 || lastErrorMsg.includes("503") || lastErrorMsg.includes("demand");

            if (is404) {
              console.warn(`[Synthetic Gemini] Model ${modelName} not found for key; trying next model.`);
              continue;
            }

            if (is429) {
              console.warn(`[Synthetic Gemini] Quota hit on model ${modelName}; rotating.`);
              continue;
            }

            if (is503) {
              console.warn(`[Synthetic Gemini] Model ${modelName} high demand (503); rotating.`);
              continue;
            }

            console.warn(`[Synthetic Gemini] Model ${modelName} error (${lastErrorMsg}); trying next model...`);
            continue;
          }
        }
        if (attempt === 0 && (lastErrorMsg.includes("503") || lastErrorMsg.includes("demand"))) {
          await new Promise((r) => setTimeout(r, 1200));
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
