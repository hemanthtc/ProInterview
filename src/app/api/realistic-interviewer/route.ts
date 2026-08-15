import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { companyBankPromptBlock, resolveCompanyBank } from "@/data/companyBanks";
import {
    buildHrPersonaBlock,
    buildRealisticProfileSection,
    formatGeminiParts,
    sendGeminiMessageWithRetry,
} from "@/utils/interviewHelper";
import { getSarvamKey, sarvamChatCompletion } from "@/utils/sarvam";
import { getVerifiedSession } from "@/utils/auth";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const {
            history = [], resume, github, linkedin, portfolioUrl, portfolioRating, portfolioFeedback, message, attachment,
            company, roles, level, hrIntel, companyClone, provider, voiceLanguage,
        } = await req.json();

        const safeCompany = company || "a modern tech company";
        const safeRoles = roles || "Software Engineer";
        const safeLevel = level || "intermediate";
        const useSarvam = String(provider || "").toLowerCase() === "sarvam";

        const bank = companyClone !== false ? resolveCompanyBank(safeCompany) : null;
        const companyCloneBlock = bank ? `\n\n${companyBankPromptBlock(bank)}\n` : "";
        const hrPersonaBlock = buildHrPersonaBlock(hrIntel);
        const languageBlock = voiceLanguage && voiceLanguage !== "en-US"
            ? `\nCandidate preferred language/locale: ${voiceLanguage}. You may greet bilingually for Indian locales; keep technical terms precise.\n`
            : "";

        let mappedType = "off-campus";
        if (companyClone === false) {
            if (safeLevel === "basic") mappedType = "internship";
            else mappedType = "on-campus";
        } else {
            if (safeLevel === "basic") mappedType = "internship";
            else if (safeLevel === "intermediate") mappedType = "off-campus";
            else mappedType = "experienced";
        }

        const recruitmentModeBlock = `
ACTIVE INTERVIEW TYPE: ${mappedType.toUpperCase()}
- Adopt the following specific focus based on this mapped type:
  * INTERNSHIP: Calibrate questions to candidate's baseline programming skills, learning agility, basic code syntax, and university/college projects.
  * ON-CAMPUS: Focus on Computer Science core theoretical foundations (Object-Oriented Programming (OOP) concepts, Database Management Systems (DBMS Normalization, ACID), Operating Systems (Concurrency, deadlocks, virtual memory), Computer Networks (TCP/UDP, HTTP, DNS), basic Data Structures & Algorithms, and college projects).
  * OFF-CAMPUS: Focus on practical application building, systems integration, code quality, unit/integration testing patterns, API design, and logical scaling.
  * EXPERIENCED: Focus on advanced system designs, scalability, performance bottlenecks, distributed architectural trade-offs, Sprint delivery shifts, mentorship, and extensive previous work history.
`;

        const difficultyInstruction = `INTERVIEW DIFFICULTY LEVEL: ${safeLevel.toUpperCase()}
- You MUST calibrate all your technical questions, coding challenges, behavioral scenarios, and evaluation depth strictly to the ${safeLevel.toUpperCase()} level.`;

        const profileSection = await buildRealisticProfileSection(resume, github, linkedin, portfolioUrl, portfolioRating, portfolioFeedback);

        const systemPrompt = `ROLE: You are an ultra-realistic, highly empathetic, and professional AI Job Interviewer. You must behave exactly like an experienced corporate HR manager or a senior technical lead at ${safeCompany} — calm, confident, welcoming, and observant. The candidate is applying for: ${safeRoles}.

ACTIVE PARAMETERS:
- Target Company: ${safeCompany}
- Target Role: ${safeRoles}
- Difficulty Level: ${safeLevel.toUpperCase()}
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
2. ACTIVE LISTENING. Always acknowledge the user's response naturally before moving forward. Examples: "That's a solid approach," or "Interesting — can you tell me more about the specific technologies you used there?" or "Got it, makes sense."
3. ADAPTABILITY. If the user gives a short or vague answer, ask a gentle follow-up to dig deeper. If they give a great answer, transition smoothly to the next topic. Match the depth of their response.
4. NO ROBOTIC PHRASING. NEVER use phrases like "As an AI..." or "Based on my training..." or "I'm programmed to..." — maintain the complete illusion of being a human interviewer at all times.
5. CONCISE FEEDBACK. When providing feedback on answers, keep it brief (1-2 sentences max) then move on. Do not lecture or over-explain.
6. NEVER ASK REPETITIVE QUESTIONS. Do not dwell on the same topic. After they answer, provide brief acknowledgment and move to a brand new topic or scenario.
7. STICK TO NATURAL CONVERSATIONAL PHRASING. Phrase your questions smoothly like a real human (e.g. "Tell me about your last project" or "How did you design the database structure for that application?").
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
- When you want the candidate to WRITE CODE, begin your response with exactly "[MODE:CODE] ".
- When you want the candidate to DRAW a diagram, circuit, or architecture, begin your response with exactly "[MODE:DRAW] ".
- For all other conversational responses, begin with exactly "[MODE:CHAT] ".
- If you decide to end the interview, prepend "[TERMINATE] " to your final response.
- If the conversation history is NOT empty and the candidate says "I am back," do NOT re-welcome them. Just jump straight into the next question.

${profileSection}`;

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

        if (!GEMINI_API_KEY) {
            throw new Error("Missing GEMINI_API_KEY in environment variables.");
        }
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite", generationConfig: { temperature: 0.7 } });

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "[MODE:CHAT] Understood. I'm ready to begin." }] },
                ...history.map((msg: any) => ({
                    role: msg.role === "assistant" ? "model" : "user",
                    parts: formatGeminiParts(msg.content, msg.attachment)
                }))
            ],
        });

        const nextParts = formatGeminiParts(message || "Hello!", attachment);
        const responseResult = await sendGeminiMessageWithRetry(chat, nextParts, "realistic interview generation");

        if (typeof responseResult !== "string") {
            return responseResult; // NextResponse fallback object
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
