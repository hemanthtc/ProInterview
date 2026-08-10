import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    buildPersonDescription,
    createHappenstanceResearch,
    getHappenstanceResearch,
    isHappenstanceConfigured,
    profileToPromptContext,
    type HappenstanceProfile,
} from "../../../utils/happenstance";

export interface HrInterviewIntel {
    interviewerName: string;
    titleGuess: string;
    mood: string;
    moodLabel: "warm" | "neutral" | "formal" | "intense" | "skeptical" | "encouraging";
    communicationTone: string;
    howToSpeak: string;
    likelyQuestions: { question: string; category: string; why: string }[];
    focusAreas: string[];
    rapportTips: string[];
    watchOuts: string[];
    confidence: number;
    source: "happenstance" | "gemini_fallback";
    disclaimer: string;
}

function isUnspecifiedName(name?: string | null): boolean {
    if (!name) return true;
    const n = name.trim().toLowerCase();
    return !n || n === "not specified" || n === "unknown" || n === "n/a";
}

async function synthesizeInterviewIntel(input: {
    hrName: string;
    company?: string;
    role?: string;
    skills?: string[];
    emailSnippet?: string;
    profile?: HappenstanceProfile | null;
    source: "happenstance" | "gemini_fallback";
}): Promise<HrInterviewIntel> {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        throw new Error("Missing GEMINI_API_KEY environment variable");
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { temperature: 0.35 },
    });

    const profileContext = profileToPromptContext(input.profile);
    const skillsLine = input.skills?.length ? input.skills.join(", ") : "not specified";

    const prompt = `You are an interview-prep coach helping a candidate prepare for a conversation with a specific recruiter/HR/hiring contact.

Person being researched: ${input.hrName}
Company: ${input.company || "Unknown"}
Candidate target role: ${input.role || "Software Engineer"}
Role skills mentioned in the invite: ${skillsLine}
Email invite snippet (may be empty):
"""
${(input.emailSnippet || "").slice(0, 1200)}
"""

Public / network research profile (${input.source === "happenstance" ? "from Happenstance people research" : "limited — estimate carefully"}):
"""
${profileContext}
"""

Infer interview style from career path, public writing, reviews, posts, and professional brand — NOT personal gossip. Be practical and candidate-helpful.

Return ONLY valid JSON:
{
  "interviewerName": "best display name",
  "titleGuess": "likely title e.g. Technical Recruiter",
  "mood": "1-2 sentences on how their energy/mood typically comes across in professional settings",
  "moodLabel": "warm" | "neutral" | "formal" | "intense" | "skeptical" | "encouraging",
  "communicationTone": "how they likely speak in interviews (pace, formality, directness)",
  "howToSpeak": "concrete coaching: tone, pacing, and phrasing the candidate should use with this person",
  "likelyQuestions": [
    { "question": "...", "category": "behavioral|culture|motivation|logistics|role-fit|technical-lite", "why": "why this person may ask it" }
  ],
  "focusAreas": ["what they tend to probe based on background/writing"],
  "rapportTips": ["2-4 short tips to build rapport"],
  "watchOuts": ["1-3 pitfalls to avoid with this interviewer style"],
  "confidence": 0-100,
  "disclaimer": "one short honesty note about uncertainty"
}

Rules:
- Provide 5-8 likelyQuestions tailored to HR/recruiter screens for the role (plus any style cues from the profile).
- If profile data is thin, still give useful generic-but-role-aware guidance and lower confidence.
- Never invent private reviews; phrase inferences as "likely" / "based on public signals".
- Do not include markdown fences.`;

    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            result = await model.generateContent(prompt);
            break;
        } catch (retryErr: any) {
            const isTransient =
                retryErr?.status === 429 ||
                retryErr?.status === 503 ||
                (retryErr?.message &&
                    (retryErr.message.includes("429") ||
                        retryErr.message.includes("503") ||
                        retryErr.message.includes("demand")));
            if (isTransient && attempt < 2) {
                await new Promise((r) => setTimeout(r, (attempt + 1) * 3000));
            } else {
                throw retryErr;
            }
        }
    }

    if (!result) {
        throw new Error("AI rate-limited while synthesizing HR interview intel");
    }

    const textResponse = result.response.text().trim();
    try {
        const cleanJson = textResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        return {
            interviewerName: parsed.interviewerName || input.hrName,
            titleGuess: parsed.titleGuess || "Recruiter / HR",
            mood: parsed.mood || "Professional and measured; limited public signals.",
            moodLabel: parsed.moodLabel || "neutral",
            communicationTone: parsed.communicationTone || "Clear and professional.",
            howToSpeak: parsed.howToSpeak || "Stay concise, warm, and structured (STAR for stories).",
            likelyQuestions: Array.isArray(parsed.likelyQuestions) ? parsed.likelyQuestions.slice(0, 8) : [],
            focusAreas: Array.isArray(parsed.focusAreas) ? parsed.focusAreas : [],
            rapportTips: Array.isArray(parsed.rapportTips) ? parsed.rapportTips : [],
            watchOuts: Array.isArray(parsed.watchOuts) ? parsed.watchOuts : [],
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 40,
            source: input.source,
            disclaimer:
                parsed.disclaimer ||
                "Inferences are probabilistic prep aids, not guaranteed personality reads.",
        };
    } catch {
        return {
            interviewerName: input.hrName,
            titleGuess: "Recruiter / HR",
            mood: "Likely professional and process-oriented for a screening call.",
            moodLabel: "neutral",
            communicationTone: "Straightforward recruiter tone — logistics, motivation, and role fit.",
            howToSpeak: "Answer crisply, mirror their formality, and prepare 2–3 STAR stories.",
            likelyQuestions: [
                {
                    question: `Why are you interested in ${input.company || "this company"} and the ${input.role || "role"}?`,
                    category: "motivation",
                    why: "Standard screen to gauge genuine interest.",
                },
                {
                    question: "Walk me through your background relevant to this role.",
                    category: "behavioral",
                    why: "Recruiter fit check before technical rounds.",
                },
                {
                    question: "What are your notice period / availability and compensation expectations?",
                    category: "logistics",
                    why: "Common HR logistics early in the funnel.",
                },
            ],
            focusAreas: ["Motivation", "Communication clarity", "Role logistics"],
            rapportTips: ["Be concise", "Ask one thoughtful question about the team or next steps"],
            watchOuts: ["Don't ramble", "Don't badmouth prior employers"],
            confidence: 25,
            source: input.source,
            disclaimer: "Structured synthesis failed; showing safe default prep guidance.",
        };
    }
}

/** Start Happenstance research (or Gemini-only fallback). */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const hrName = typeof body.hrName === "string" ? body.hrName.trim() : "";
        const company = typeof body.company === "string" ? body.company.trim() : "";
        const role = typeof body.role === "string" ? body.role.trim() : "";
        const location = typeof body.location === "string" ? body.location.trim() : "";
        const skills = Array.isArray(body.skills) ? body.skills.filter((s: unknown) => typeof s === "string") : [];
        const emailSnippet = typeof body.emailSnippet === "string" ? body.emailSnippet : "";

        if (isUnspecifiedName(hrName)) {
            return NextResponse.json(
                { error: "No HR / sender name found in the email to research." },
                { status: 400 }
            );
        }

        // Without Happenstance, still deliver Gemini-based prep from name + company.
        if (!isHappenstanceConfigured()) {
            const intel = await synthesizeInterviewIntel({
                hrName,
                company,
                role,
                skills,
                emailSnippet,
                profile: null,
                source: "gemini_fallback",
            });
            return NextResponse.json({
                status: "COMPLETED",
                happenstanceConfigured: false,
                researchId: null,
                happenstanceUrl: null,
                profile: null,
                intel,
                message:
                    "Happenstance API key not configured — generated interview style guidance from name/company context only.",
            });
        }

        const description = buildPersonDescription({ hrName, company, role, location });
        const created = await createHappenstanceResearch(description);

        return NextResponse.json({
            status: "RUNNING",
            happenstanceConfigured: true,
            researchId: created.id,
            happenstanceUrl: created.url,
            query: description,
            message: "Happenstance research started. Poll GET /api/research-hr until complete.",
        });
    } catch (error: any) {
        console.error("research-hr POST error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to start HR research" },
            { status: error.status || 500 }
        );
    }
}

/** Poll Happenstance research and synthesize interview intel when ready. */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const researchId = searchParams.get("id");
        const hrName = (searchParams.get("hrName") || "").trim();
        const company = (searchParams.get("company") || "").trim();
        const role = (searchParams.get("role") || "").trim();
        const skillsParam = searchParams.get("skills") || "";
        const skills = skillsParam
            ? skillsParam.split("|").map((s) => s.trim()).filter(Boolean)
            : [];
        const emailSnippet = searchParams.get("emailSnippet") || "";

        if (!researchId) {
            return NextResponse.json({ error: "Missing research id" }, { status: 400 });
        }
        if (!isHappenstanceConfigured()) {
            return NextResponse.json({ error: "Happenstance is not configured" }, { status: 500 });
        }

        const research = await getHappenstanceResearch(researchId);

        if (research.status === "RUNNING") {
            return NextResponse.json({
                status: "RUNNING",
                researchId: research.id,
                happenstanceUrl: `https://happenstance.ai/research/${research.id}`,
                message: "Still researching this person on Happenstance…",
            });
        }

        if (research.status === "FAILED" || research.status === "FAILED_AMBIGUOUS") {
            const intel = await synthesizeInterviewIntel({
                hrName: hrName || research.query,
                company,
                role,
                skills,
                emailSnippet,
                profile: null,
                source: "gemini_fallback",
            });
            return NextResponse.json({
                status: "COMPLETED",
                researchId: research.id,
                happenstanceStatus: research.status,
                happenstanceUrl: `https://happenstance.ai/research/${research.id}`,
                profile: null,
                intel,
                message:
                    research.status === "FAILED_AMBIGUOUS"
                        ? "Happenstance found ambiguous matches — using name/company guidance instead."
                        : "Happenstance research failed — using name/company guidance instead.",
            });
        }

        // COMPLETED
        const resolvedName =
            research.profile?.person_metadata?.full_name || hrName || research.query;
        const intel = await synthesizeInterviewIntel({
            hrName: resolvedName,
            company,
            role,
            skills,
            emailSnippet,
            profile: research.profile,
            source: "happenstance",
        });

        return NextResponse.json({
            status: "COMPLETED",
            researchId: research.id,
            happenstanceStatus: research.status,
            happenstanceUrl: `https://happenstance.ai/research/${research.id}`,
            profile: {
                fullName: research.profile?.person_metadata?.full_name || resolvedName,
                tagline: research.profile?.person_metadata?.tagline || null,
                summary: research.profile?.summary?.text || null,
                profileUrls: research.profile?.person_metadata?.profile_urls || [],
                currentRoles: (research.profile?.employment || [])
                    .filter((e) => !e.end_date)
                    .map((e) => ({
                        title: e.job_title,
                        company: e.company_name,
                    })),
            },
            intel,
            message: "HR research complete.",
        });
    } catch (error: any) {
        console.error("research-hr GET error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch HR research" },
            { status: error.status || 500 }
        );
    }
}
