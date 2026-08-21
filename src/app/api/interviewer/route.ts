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
import { getSarvamKey, sarvamChatCompletion } from "@/utils/sarvam";
import { getVerifiedSession } from "@/utils/auth";
import connectDB from "@/utils/db";
import User from "@/models/User";
import { checkAndIncrementUsage } from "@/utils/usageMeter";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const {
            history = [], resume, github, linkedin, portfolioUrl, portfolioRating, portfolioFeedback, message, attachment, provider,
            company, roles, level, hrIntel, companyClone, domainPackId, voiceLanguage, campusPath,
        } = await req.json();

        // Logged-in users are metered by account; guests (public practice mode) are metered by IP.
        const session = await getVerifiedSession();
        const identifier = session?.identifier || `anon:${req.headers.get("x-forwarded-for") || "unknown"}`;
        let userPlan = "Free Tier";
        if (session) {
            try {
                await connectDB();
                const user = await User.findOne({ identifier: session.identifier }).select("subscriptionPlan").lean();
                userPlan = (user as { subscriptionPlan?: string } | null)?.subscriptionPlan || "Free Tier";
            } catch (planErr) {
                console.warn("interviewer: plan lookup skipped", planErr);
            }
        }
        const usage = await checkAndIncrementUsage(identifier, "gemini", userPlan);
        if (!usage.allowed) {
            return NextResponse.json(
                { error: `Monthly AI interview usage limit reached (${usage.limit}/month). Upgrade to Pro or sign in for more.` },
                {
                    status: 429,
                    headers: usage.retryAfterSec ? { "Retry-After": String(usage.retryAfterSec) } : undefined,
                }
            );
        }

        const safeCompany = company || "a modern tech company";
        const safeRoles = roles || "Software Engineer";
        const safeLevel = level || "intermediate";
        const useSarvam = String(provider || "").toLowerCase() === "sarvam";

        const bank = companyClone !== false ? resolveCompanyBank(safeCompany) : null;
        const companyCloneBlock = bank ? `\n\n${companyBankPromptBlock(bank)}\n` : "";
        const domain = resolveDomainPack(domainPackId);
        const domainBlock = domain ? `\n\n${domainPackPromptBlock(domain)}\n` : "";
        const languageBlock = voiceLanguage && voiceLanguage !== "en-US"
            ? `\nCandidate preferred language/locale: ${voiceLanguage}. Prefer clear phrasing; if locale is hi-IN or other Indian languages, you may greet bilingually but keep technical terms precise. When speaking Hindi/regional languages, keep code identifiers in English.\n`
            : "";
        const hrPersonaBlock = buildHrPersonaBlock(hrIntel);



        // Practice interview KEEPS difficulty levels. The campus PATH is chosen by the
        // user in the UI (on-campus / off-campus). If provided, it takes priority;
        // otherwise we fall back to the legacy clone+level heuristic.
        const campusMap: Record<string, string> = { onCampus: "on-campus", offCampus: "off-campus" };
        let mappedType: string;
        if (campusPath && campusMap[campusPath]) {
            mappedType = campusMap[campusPath];
        } else if (companyClone === false) {
            mappedType = safeLevel === "basic" ? "internship" : "on-campus";
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
- Ground all questions in the candidate's education background, skills and projects from their resume, tailored to the target role and company.
`;

        const difficultyInstruction = `INTERVIEW DIFFICULTY LEVEL: ${safeLevel.toUpperCase()}
- You MUST calibrate all your technical questions, coding challenges, behavioral scenarios, and evaluation depth strictly to the ${safeLevel.toUpperCase()} level.`;

        const candidateProfileInfo = await buildCandidateProfileInfo(resume, github, linkedin, portfolioUrl, portfolioRating, portfolioFeedback);

        const systemPrompt = `You are a professional online technical interviewer dynamically evaluating a candidate applying for: ${safeRoles} at ${safeCompany}.

ACTIVE PARAMETERS:
- Target Role: ${safeRoles}
- Target Company: ${safeCompany}
- Difficulty Level: ${safeLevel.toUpperCase()}
- Interview Type: ${mappedType.toUpperCase()}

${difficultyInstruction}
${recruitmentModeBlock}

INTERVIEW ORCHESTRATION FLOW:
1. Scan & Analyze Resume and Portfolio Context: First, scan the candidate's resume and portfolio, identifying candidate information specifically: Education Background, Preferred Role, Target Company (if specified), Skills, and Projects.
2. Build Candidate Profile: Ground all questions strictly in their actual resume details, skills, and projects. NEVER ask generic template questions or creative hypotheticals that do not align with their profile.
3. Establish Interview Type Calibrations: Tailor difficulty and depth to the active type: ${mappedType}.
4. Question Plan: Formulate a clear direction for checking the candidate's core and practical suitability.
5. Adaptive Loop: Ask ONE question at a time, wait for the candidate's answer, and dynamically adapt.

CRITICAL RULES FOR RESPONSES:
0. ASK ONLY ONE QUESTION AT A TIME. After you ask a single question, STOP and wait for the candidate's answer. NEVER ask multiple questions in the same response.
1. STICK TO NATURAL CONVERSATIONAL PHRASING. Phrase your questions smoothly like a real human (e.g. "Tell me about your last project" or "How did you design the database structure for that application?").
2. STRICTLY NO MARKDOWN SYMBOLS: You MUST NOT output any markdown elements in your spoken text. This means:
   - NO ASTERISKS at all (do NOT use ** or * for bolding, italics, or list bullets).
   - NO HASHES (do NOT use # for headers).
   - NO BACKTICKS in conversational parts (do NOT write code blocks in plain speech).
   - All conversational responses must be plain, clean, unformatted sentences.
3. WHEN YOU ASK FOR COMPOSING CODE, BEGIN YOUR RESPONSE WITH EXACTLY "[MODE:CODE] ".
4. WHEN YOU ASK FOR DRAWING A CIRCUIT OR DIAGRAM, BEGIN YOUR RESPONSE WITH EXACTLY "[MODE:DRAW] ".
5. OTHERWISE, BEGIN YOUR RESPONSE WITH EXACTLY "[MODE:CHAT] ".
6. If you decide to terminate the interview, prepend "[TERMINATE] ".
7. DO NOT say "Welcome" or "Hello" unless the conversation history is completely empty.

${companyCloneBlock}
${domainBlock}
${languageBlock}
${hrPersonaBlock}
${candidateProfileInfo}`;

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
            // fall through to Gemini if Sarvam chat fails
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
        const responseResult = await sendGeminiMessageWithRetry(chat, nextParts, "standard interview generation");

        if (typeof responseResult !== "string") {
            return responseResult; // NextResponse fallback object
        }

        return NextResponse.json({ message: responseResult, provider: useSarvam ? "gemini_fallback" : "gemini" });
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
