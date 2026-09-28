import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { generateWithFallback } from "@/utils/gemini";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function generateSectionFallback(section: string, topic: string, rawExplanation: string): string {
    const cleaned = rawExplanation
        .replace(/^(basically|so|i think|actually|i worked on|i helped|we did|my job was to|what i did was)\s+/gi, "")
        .trim();
    const cleanSentence = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).replace(/\.+$/, "") : "key responsibilities and technical workflows";

    if (section === "workExperience") {
        return [
            `• Spearheaded ${topic || "project component"}: ${cleanSentence}.`,
            `• Engineered scalable, reliable solutions ensuring optimal performance and adherence to engineering best practices.`,
            `• Collaborated cross-functionally across development cycles to deliver high-impact feature enhancements on schedule.`
        ].join("\n");
    }

    if (section === "projects") {
        return `Architected and developed ${topic || "project"}, implementing ${cleanSentence} using modern design patterns and optimized workflows to achieve robust system performance.`;
    }

    return `Contributed to ${topic || "initiatives"} by delivering essential contributions including ${cleanSentence}.`;
}

export async function POST(req: NextRequest) {
    let section = "";
    let topic = "";
    let explanation = "";

    try {
        // Enforce active session
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        section = body.section || "";
        topic = body.topic || "";
        explanation = body.explanation || "";

        if (!section || !topic || !explanation) {
            return NextResponse.json({ error: "Missing required fields (section, topic, explanation)" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "dummy") {
            return NextResponse.json({ description: generateSectionFallback(section, topic, explanation), isFallback: true });
        }

        let sectionPrompt = "";
        if (section === "workExperience") {
            sectionPrompt = `Generate exactly 2 to 3 highly professional, action-oriented bullet points describing achievements in this role. 
- Each bullet point MUST start with a strong action verb (e.g. "Architected", "Optimized", "Spearheaded", "Engineered").
- Start each bullet point with the character "• " (not "-") and separate them with newlines.
- Highlight metrics, results, and specific technical contributions where possible.`;
        } else if (section === "projects") {
            sectionPrompt = `Generate a highly professional, result-oriented description (1 to 2 sentences) for this project.
- Briefly explain what was built, the core technologies utilized, and the key problem or challenge solved.`;
        } else {
            sectionPrompt = `Generate 1 to 2 professional sentences or bullet points describing the candidate's achievements or contributions for this entry.`;
        }

        const systemPrompt = `You are an expert resume writer and recruiter.
The candidate wants to write a professional description or bullet points for a resume item under the section "${section}".

Heading/Topic context: "${topic}"
Candidate's informal spoken explanation of what they did: "${explanation}"

Please rewrite this spoken explanation into a professionally polished, resume-ready description using the following guidelines:
${sectionPrompt}
- Do NOT invent metrics or fabricate skills not mentioned in the explanation, but clean up grammar, phrasing, and structure.
- Do NOT include placeholders, markdown headers, or surrounding chat conversation.
- Output ONLY the final description content.`;

        try {
            const generatedText = (await generateWithFallback(systemPrompt, {
                timeout: 15000,
                generationConfig: { temperature: 0.6 }
            })).trim();

            if (generatedText) {
                return NextResponse.json({ description: generatedText });
            }
        } catch (aiErr) {
            console.warn("[Resume Section AI] Gemini timed out or hit quota; applying resilient fallback:", aiErr);
        }

        return NextResponse.json({ description: generateSectionFallback(section, topic, explanation), isFallback: true });
    } catch (error: any) {
        console.error("Resume section generation error:", error);
        if (section && topic && explanation) {
            return NextResponse.json({ description: generateSectionFallback(section, topic, explanation), isFallback: true });
        }
        return NextResponse.json({ error: error.message || "Failed to generate resume section" }, { status: 500 });
    }
}
