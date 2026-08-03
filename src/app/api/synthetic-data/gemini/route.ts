import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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

    if (!prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
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

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        data?.error?.message || `Gemini request failed (${response.status})`;
      return NextResponse.json({ error: message }, { status: response.status });
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
