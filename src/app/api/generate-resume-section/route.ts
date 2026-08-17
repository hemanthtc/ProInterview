import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/utils/auth";
import { generateWithFallback } from "@/utils/gemini";

export async function POST(req: NextRequest) {
    try {
        // Enforce active session
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const { section, topic, explanation } = await req.json() as {
            section?: string;
            topic?: string;
            explanation?: string;
        };

        if (!section || !topic || !explanation) {
            return NextResponse.json({ error: "Missing required fields (section, topic, explanation)" }, { status: 400 });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY in environment" }, { status: 500 });
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

        const generatedText = (await generateWithFallback(systemPrompt, { generationConfig: { temperature: 0.6 } })).trim();

        return NextResponse.json({ description: generatedText });
    } catch (error: any) {
        console.error("Resume section generation error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate resume section" }, { status: 500 });
    }
}
