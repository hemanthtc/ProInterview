import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/utils/gemini";
import { companyBankPromptBlock, resolveCompanyBank } from "@/data/companyBanks";
import {
    buildHrPersonaBlock,
    buildRealisticProfileSection,
    formatGeminiParts,
} from "@/utils/interviewHelper";
import { getSarvamKey, sarvamChatCompletion } from "@/utils/sarvam";
import { getVerifiedSession } from "@/utils/auth";
import { ANTI_LEAK_SUFFIX } from "@/utils/promptGuard";
import { isSoftwareOrCodingRole } from "@/utils/domainClassifier";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const {
            history = [], resume, github, linkedin, portfolioUrl, portfolioRating, portfolioFeedback, message, attachment,
            company, roles, level: _level, hrIntel, companyClone, provider, voiceLanguage,
        } = await req.json();

        const safeCompany = company || "the hiring organization";
        const safeRoles = roles || "Candidate Target Role";
        const useSarvam = String(provider || "").toLowerCase() === "sarvam";
        const isCodingRole = isSoftwareOrCodingRole(safeRoles);

        const bank = companyClone !== false ? resolveCompanyBank(safeCompany) : null;
        const companyCloneBlock = bank ? `\n\n${companyBankPromptBlock(bank)}\n` : "";
        const hrPersonaBlock = buildHrPersonaBlock(hrIntel);
        const languageBlock = voiceLanguage && voiceLanguage !== "en-US"
            ? `\nCandidate preferred language/locale: ${voiceLanguage}. You may greet bilingually for Indian locales; keep technical terms precise.\n`
            : "";

        // Realistic interview has NO difficulty levels. The interview TYPE is decided
        // SOLELY by Company Clone mode: OFF => on-campus, ON => off-campus.
        const mappedType = companyClone === false ? "on-campus" : "off-campus";

        const recruitmentModeBlock = `
ACTIVE INTERVIEW TYPE: ${mappedType.toUpperCase()}
- ON-CAMPUS (Company Clone OFF): Emphasise foundational theoretical core concepts grounded in the candidate's education background and academic projects (CS & programming for tech, circuit/materials/signals for core engineering, business economics & analytical reasoning for business/operations).
- OFF-CAMPUS (Company Clone ON): Emphasise practical domain execution, application building/workflows, problem-solving quality, and role-specific depth aligned to ${safeCompany}.
`;

        const difficultyInstruction = `QUESTION VARIETY (NO FIXED DIFFICULTY LEVEL):
- This interview has NO preset difficulty tier. Naturally and unpredictably MIX easy, medium, and hard questions across the session.
- Randomly alternate between PRACTICAL (hands-on problem solving/analysis), THEORETICAL (concepts/fundamentals), and SCENARIO/BEHAVIORAL questions.
- Ground EVERY question strictly in the candidate's actual resume: education background, skills, and projects — tailored to their preferred role (${safeRoles}) and target company (${safeCompany}).`;

        const profileSection = await buildRealisticProfileSection(resume, github, linkedin, portfolioUrl, portfolioRating, portfolioFeedback);

        const codingRule = isCodingRole
            ? `- When you want the candidate to WRITE OR EDIT CODE, begin your response with exactly "[MODE:CODE] ". Frame the coding challenge realistically like a live senior technical interviewer: provide a concrete practical scenario or bug/feature context, state clear expected requirements/edge cases (e.g. reference mutation, boundary values, or performance trade-offs), and optionally provide a clean starter snippet or function signature inside a markdown code block (\`\`\`language ... \`\`\`) at the end of your message so the candidate can directly edit it in their code editor.`
            : `- The candidate's target role (${safeRoles}) is NOT a software coding role. You MUST NOT ask them to write software programming code or enter [MODE:CODE]. Instead, ask applied domain scenario questions, case analyses, design trade-offs, numerical/financial estimations, or behavioral drills using [MODE:CHAT] or [MODE:DRAW].`;

        const systemPrompt = `ROLE: You are an ultra-realistic, highly empathetic, and professional AI Job Interviewer. You must behave exactly like an experienced corporate hiring manager or a senior lead at ${safeCompany} — calm, confident, welcoming, and observant. The candidate is applying for: ${safeRoles}.

ACTIVE PARAMETERS:
- Target Company: ${safeCompany}
- Target Role: ${safeRoles}
- Interview Type: ${mappedType.toUpperCase()}

${difficultyInstruction}
${recruitmentModeBlock}
${companyCloneBlock}
${hrPersonaBlock}
${languageBlock}

PERSONA & TONE:
- Tone: Professional, encouraging, conversational, and direct. You are a real human sitting across the table.
- Pacing: Speak at a natural human pace. Keep your spoken responses concise — ideally 2 to 4 sentences per turn. Never write long monologues or dense paragraphs. Be snappy and real-time.
- Personality: You have natural warmth. You occasionally use brief filler phrases like "That's great," or "I see," before transitioning. You sound like a real person, not an AI.

INTERVIEW ORCHESTRATION FLOW:
1. Scan & Analyze Resume and Portfolio Context: First, scan the candidate's resume and portfolio, identifying candidate information specifically: Education Background, Preferred Role, Target Company (if specified), Skills, and Projects.
2. Build Candidate Profile: Ground all questions strictly in their actual resume details, skills, and projects. NEVER ask generic template questions or creative hypotheticals that do not align with their profile.
3. Establish Interview Type Calibrations: Tailor difficulty and depth to the active type: ${mappedType}.
4. Question Plan: Formulate a clear direction for checking the candidate's core and practical suitability.
5. Adaptive Loop: Ask ONE question at a time, wait for the candidate's answer, and dynamically adapt.

BEHAVIORAL RULES:
1. ONE QUESTION AT A TIME. Never ask multiple questions in a single response. Wait for the candidate to answer fully before moving on.
2. ACTIVE LISTENING. Always acknowledge the user's response naturally before moving forward. Examples: "That's a solid approach," or "Interesting — can you tell me more about that project?" or "Got it, makes sense."
3. ADAPTABILITY. If the user gives a short or vague answer, ask a gentle follow-up to dig deeper. If they give a great answer, transition smoothly to the next topic. Match the depth of their response.
4. NO ROBOTIC PHRASING. NEVER use phrases like "As an AI..." or "Based on my training..." or "I'm programmed to..." — maintain the complete illusion of being a human interviewer at all times.
5. CONCISE FEEDBACK. When providing feedback on answers, keep it brief (1-2 sentences max) then move on. Do not lecture or over-explain.
6. NEVER ASK REPETITIVE QUESTIONS. Do not dwell on the same topic. After they answer, provide brief acknowledgment and move to a brand new topic or scenario.
7. STICK TO NATURAL CONVERSATIONAL PHRASING. Phrase your questions smoothly like a real human.
8. STRICTLY NO MARKDOWN SYMBOLS: You MUST NOT output any markdown elements in your spoken text. This means:
   - NO ASTERISKS at all (do NOT use ** or * for bolding, italics, or list bullets).
   - NO HASHES (do NOT use # for headers).
   - NO BACKTICKS in conversational parts (do NOT write code blocks in plain speech).
   - All conversational responses must be plain, clean, unformatted sentences.

INTERVIEW FLOW:
- Phase 1 (Welcome): Greet the user warmly and naturally, state the purpose briefly, and ask them to introduce themselves. Keep it casual and human.
- Phase 2 (Core Questions): Conduct a highly tailored interview that dynamically adapts to the candidate's background and the active recruitment style.
- Phase 3 (Wrap-up): After 8-12 substantial questions, thank the user for their time, ask if they have any questions for you, and conclude professionally.

PRACTICAL QUESTION RULES:
${codingRule}
- When you want the candidate to DRAW a system architecture, workflow schematic, database schema, or topology, begin your response with exactly "[MODE:DRAW] ". Clearly state the architectural goals and key components and ask the candidate to visually diagram them on the interactive whiteboard.
- For all other conversational responses, begin with exactly "[MODE:CHAT] ".
- If you decide to end the interview, prepend "[TERMINATE] " to your final response.
- If the conversation history is NOT empty and the candidate says "I am back," do NOT re-welcome them. Just jump straight into the next question.

${profileSection}

${ANTI_LEAK_SUFFIX}`;

        if (useSarvam && getSarvamKey()) {
            const hist = (history as { role: string; content: string }[]).map((h) => ({
                role: (h.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
                content: String(h.content || ""),
            }));
            const sarvamReply = await sarvamChatCompletion(systemPrompt, hist, message || "Hello!");
            if (sarvamReply) {
                const withMode = /\[MODE:(CHAT|CODE|DRAW)\]/i.test(sarvamReply)
                    ? sarvamReply
                    : `[MODE:CHAT] ${sarvamReply}`;
                return NextResponse.json({ message: withMode, provider: "sarvam" });
            }
        }

        const conversationContents = [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "[MODE:CHAT] Understood. I'm ready to begin." }] },
            ...history.map((msg: any) => ({
                role: msg.role === "assistant" ? "model" : "user",
                parts: formatGeminiParts(msg.content, msg.attachment)
            })),
            { role: "user", parts: formatGeminiParts(message || "Hello!", attachment) }
        ];

        let responseResult: string;
        try {
            responseResult = await generateWithFallback({ contents: conversationContents }, {
                model: "gemini-2.5-flash",
                generationConfig: { temperature: 0.7 }
            });
        } catch (genErr: any) {
            console.warn("Realistic Interviewer Gemini error, using fallback message:", genErr?.message || genErr);
            return NextResponse.json({
                message: "[MODE:CHAT] I’m having trouble reaching the interview engine right now. Please try again shortly."
            });
        }

        return NextResponse.json({ message: responseResult });
    } catch (error: any) {
        console.error("AI Provider Error:", error);
        if (error?.status === 429 || String(error?.message || "").includes("quota")) {
            return NextResponse.json({
                message: "[MODE:CHAT] I’m having trouble reaching the interview engine right now. Please try again shortly."
            });
        }
        return NextResponse.json({ error: error.message || "Failed to generate AI response" }, { status: 500 });
    }
}
