import { NextRequest, NextResponse } from "next/server";
import { cachedGenerate, getGeminiModel, parseJsonFromModel, promptCacheKey } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";
import { getVerifiedSession } from "@/utils/auth";

/** Splits a `data:<mime>;base64,<data>` URL into its parts; falls back to raw base64 input. */
function parseImageDataUrl(input: string, fallbackMimeType?: string): { data: string; mimeType: string } {
    const match = input.match(/^data:([^;]+);base64,([\s\S]*)$/);
    if (match) return { data: match[2], mimeType: match[1] };
    return { data: input, mimeType: fallbackMimeType || "image/png" };
}

/**
 * Online-only system design evaluation (Gemini).
 * No local/heuristic scoring — requires GEMINI_API_KEY.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "dummy") {
            return NextResponse.json(
                { error: "Online evaluation requires a configured GEMINI_API_KEY." },
                { status: 503 }
            );
        }

        const { prompt, sketchDescription, boardSummary, notes, company, role, level, diagramImageBase64, mimeType } =
            await req.json();
        const rl = rateLimit(`sysdesign:${session.identifier}`, { limit: 20, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json({ error: "prompt is required" }, { status: 400 });
        }

        const board = typeof boardSummary === "string" && boardSummary.trim()
            ? boardSummary
            : sketchDescription || "(none)";

        const designPrompt = `You are a principal architect and system design evaluator reviewing a candidate's design answer.
Company: ${company || "Target Organization"}
Role: ${role || "System Architect / Candidate Target Role"}
Level: ${level || "intermediate"}
Prompt given to candidate: ${prompt}

Candidate whiteboard notes / component list:
${notes || "(none)"}

Candidate interactive whiteboard (drag-drop shapes + freestyle sketch summary):
${board}

Score 0-100 for: requirements, capacity_estimation (or scale/sizing), api_design (or interfaces/protocols), data_model (or state/signal flow), scalability, tradeoffs, communication.
Also list missing pieces and a stronger outline.
Calibrate evaluation to the domain implied by the prompt (e.g., distributed software, embedded/hardware electronics, or operational workflow).
Base scores only on what the candidate wrote/drew — do not invent components they did not mention.

Return JSON only:
{
  "overall": 0-100,
  "scores": {
    "requirements": 0-100,
    "capacity": 0-100,
    "api": 0-100,
    "dataModel": 0-100,
    "scalability": 0-100,
    "tradeoffs": 0-100,
    "communication": 0-100
  },
  "strengths": ["..."],
  "gaps": ["..."],
  "modelAnswerOutline": ["step1", "step2"],
  "followUpQuestions": ["..."]
}`;

        const hasImage = typeof diagramImageBase64 === "string" && diagramImageBase64.trim().length > 0;

        let raw: string;
        if (hasImage) {
            // Multimodal path: image bytes are never hashed into the cache key, so skip
            // the shared prompt cache entirely rather than caching per-screenshot.
            const { data, mimeType: resolvedMimeType } = parseImageDataUrl(diagramImageBase64.trim(), mimeType);
            const visionPrompt = `${designPrompt}\n\nA screenshot of the candidate's whiteboard is attached — read the boxes, arrows, and labels directly from the image in addition to the notes above.`;
            const model = getGeminiModel();
            const result = await model.generateContent([
                { text: visionPrompt },
                { inlineData: { data, mimeType: resolvedMimeType } },
            ]);
            raw = result.response.text();
        } else {
            raw = await cachedGenerate(
                promptCacheKey("sysdesign", company, role, level, prompt, notes, board),
                designPrompt
            );
        }

        const parsed = parseJsonFromModel(raw);
        return NextResponse.json({
            ...((parsed && typeof parsed === "object" ? parsed : {}) as object),
            source: "online",
            usedImage: hasImage,
        });
    } catch (error: unknown) {
        console.error("evaluate-system-design", error);
        const message = error instanceof Error ? error.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
