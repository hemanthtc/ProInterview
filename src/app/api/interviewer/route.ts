import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { companyBankPromptBlock, resolveCompanyBank } from "@/data/companyBanks";
import { domainPackPromptBlock, resolveDomainPack } from "@/data/domainPacks";
import {
    buildHrPersonaBlock,
    buildCandidateProfileInfo,
    formatGeminiParts,
    sendGeminiMessageWithRetry,
} from "@/utils/interviewHelper";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const {
            history = [], resume, github, linkedin, portfolioUrl, message, attachment, type, provider,
            company, roles, level, hrIntel, companyClone, domainPackId, voiceLanguage,
        } = await req.json();

        const safeCompany = company || "a modern tech company";
        const safeRoles = roles || "Software Engineer";
        const safeLevel = level || "intermediate";

        const bank = companyClone !== false ? resolveCompanyBank(safeCompany) : null;
        const companyCloneBlock = bank ? `\n\n${companyBankPromptBlock(bank)}\n` : "";
        const domain = resolveDomainPack(domainPackId);
        const domainBlock = domain ? `\n\n${domainPackPromptBlock(domain)}\n` : "";
        const languageBlock = voiceLanguage && voiceLanguage !== "en-US"
            ? `\nCandidate preferred language/locale: ${voiceLanguage}. Prefer clear phrasing; if locale is hi-IN or other Indian languages, you may greet bilingually but keep technical terms precise.\n`
            : "";
        const hrPersonaBlock = buildHrPersonaBlock(hrIntel);

        const difficultyInstruction = `INTERVIEW DIFFICULTY LEVEL: ${safeLevel.toUpperCase()}
- You MUST calibrate all your technical questions, coding challenges, behavioral scenarios, and evaluation depth strictly to the ${safeLevel.toUpperCase()} level.
- Basic difficulty: Focus on core syntax, fundamental data structures, simple functions, and entry-level programming concepts.
- Intermediate difficulty: Focus on object-oriented/functional paradigms, design patterns, framework concepts, API usage, unit testing, and medium-complexity logical problem solving.
- Advanced difficulty: Focus on complex system architecture, high scalability, concurrency, distributed systems, deep algorithmic optimization, security, memory management, and trade-off analysis under high pressure.`;

        const typeInstruction = "Ask one highly relevant technical question at a time focusing strictly on coding, architecture, logic, and technical depth. Heavily favor practical tasks like writing code or drawing circuits.";
        const candidateProfileInfo = buildCandidateProfileInfo(resume, github, linkedin, portfolioUrl);

        const systemPrompt = `You are a professional online technical interviewer dynamically evaluating a candidate applying for: ${safeRoles} at ${safeCompany}.
Your tone, technical expectations, and questions must strictly align with the documented technical hiring standards and engineering culture of the target companies: ${safeCompany}.
${difficultyInstruction}
Be conversational. ${typeInstruction}
${companyCloneBlock}
${domainBlock}
${languageBlock}
${hrPersonaBlock}

CRITICAL RULES FOR ASKING QUESTIONS:
0. ASK ONLY ONE QUESTION AT A TIME. After you ask a single question, STOP and wait for the candidate's answer. NEVER ask multiple questions in the same response.
1. NEVER ASK REPETITIVE QUESTIONS. Do not dwell on the same topic for too long. If they answer correctly or incorrectly, provide brief feedback and immediately move on to a brand new topic or practical task. Do not exaggerate or overly compliment.
2. ASK PRACTICAL QUESTIONS. You MUST ask the user to write real code, design algorithms, or draw circuits/diagrams instead of just random theory BS.
3. WHEN YOU ASK FOR COMPOSING CODE, BEGIN YOUR RESPONSE WITH EXACTLY "[MODE:CODE] ".
4. WHEN YOU ASK FOR DRAWING A CIRCUIT OR DIAGRAM, BEGIN YOUR RESPONSE WITH EXACTLY "[MODE:DRAW] ".
5. OTHERWISE, BEGIN YOUR RESPONSE WITH EXACTLY "[MODE:CHAT] ".
6. If you decide to terminate the interview (because you have asked enough questions, or the candidate is behaving terribly), prepend "[TERMINATE] ".
7. DO NOT say "Welcome" or "Hello" unless the conversation history is completely empty. If the candidate says "I am back" or resumes the chat, DO NOT welcome them again, just jump straight into the next question.

${candidateProfileInfo}`;

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
        const responseResult = await sendGeminiMessageWithRetry(chat, nextParts, "standard interview generation");

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
