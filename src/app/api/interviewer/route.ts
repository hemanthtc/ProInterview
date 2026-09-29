import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/utils/gemini";
import { companyBankPromptBlock, resolveCompanyBank } from "@/data/companyBanks";
import { domainPackPromptBlock, resolveDomainPack } from "@/data/domainPacks";
import {
    buildHrPersonaBlock,
    buildCandidateProfileInfo,
    formatGeminiParts,
} from "@/utils/interviewHelper";
import { getSarvamKey, sarvamChatCompletion } from "@/utils/sarvam";
import { getVerifiedSession } from "@/utils/auth";
import connectDB from "@/utils/db";
import User from "@/models/User";
import { checkAndIncrementUsage } from "@/utils/usageMeter";
import { ANTI_LEAK_SUFFIX } from "@/utils/promptGuard";
import { enforceRateLimit, jsonError } from "@/utils/http";
import { redactPii } from "@/utils/pii";
import { isSoftwareOrCodingRole } from "@/utils/domainClassifier";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const {
            history = [], resume, github, linkedin, portfolioUrl, portfolioRating, portfolioFeedback, message, attachment, provider,
            company, roles, level, hrIntel, companyClone, domainPackId, voiceLanguage, campusPath,
        } = await req.json();

        // Logged-in users are metered by account; guests (public practice mode) are metered by IP.
        const session = await getVerifiedSession();
        const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const identifier = session?.identifier || `anon:${forwarded}`;
        const rlKey = session?.identifier || forwarded;
        const blocked = enforceRateLimit(`interviewer:${rlKey}`, { limit: 40, windowMs: 15 * 60 * 1000 }, "interviews");
        if (blocked) return blocked;
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

        const safeCompany = company || "the hiring organization";
        const safeRoles = roles || "Candidate Target Role";
        const safeLevel = level || "intermediate";
        const useSarvam = String(provider || "").toLowerCase() === "sarvam";
        const isCodingRole = isSoftwareOrCodingRole(safeRoles);

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
- Adopt the following specific focus based on this mapped type and target role (${safeRoles}):
  * INTERNSHIP: Calibrate questions to candidate's baseline skills, learning agility, academic foundations, and university/college projects.
  * ON-CAMPUS: Focus on foundational core theoretical clarity and academic concepts relevant to their field of study and college projects (CS/data concepts for tech, circuit/mechanical/civil principles for core engineering, market/analytical/financial reasoning for business).
  * OFF-CAMPUS: Focus on practical application building, systems integration, domain execution quality, and professional problem-solving aligned to the target company.
  * EXPERIENCED: Focus on advanced system designs, domain scalability, architectural trade-offs, cross-functional mentorship, and previous work track record.
- Ground all questions in the candidate's education background, skills and projects from their resume, tailored to the target role and company.
`;

        const difficultyInstruction = `INTERVIEW DIFFICULTY LEVEL: ${safeLevel.toUpperCase()}
- You MUST calibrate all your questions, domain scenarios, and evaluation depth strictly to the ${safeLevel.toUpperCase()} level.`;

        const candidateProfileInfo = await buildCandidateProfileInfo(
            typeof resume === "string" ? redactPii(resume) : resume,
            github,
            linkedin,
            portfolioUrl,
            portfolioRating,
            portfolioFeedback
        );

        const codingRule = isCodingRole
            ? `3. WHEN YOU ASK FOR COMPOSING OR EDITING CODE, BEGIN YOUR RESPONSE WITH EXACTLY "[MODE:CODE] ". Frame the coding challenge realistically like a live senior technical interviewer: provide a concrete practical scenario or bug/feature context, state clear expected requirements/edge cases (e.g. reference mutation, boundary values, or performance trade-offs), and optionally provide a clean starter snippet or function signature inside a markdown code block (\`\`\`language ... \`\`\`) at the end of your message so the candidate can directly edit it in their code editor.`
            : `3. The candidate's target role (${safeRoles}) is NOT a software coding role. You MUST NOT ask them to write software programming code or enter [MODE:CODE]. Instead, ask applied domain scenario questions, case analyses, design trade-offs, numerical/financial estimations, or behavioral drills using [MODE:CHAT] or [MODE:DRAW].`;

        const systemPrompt = `You are a professional online interviewer dynamically evaluating a candidate applying for: ${safeRoles} at ${safeCompany}.

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
1. STICK TO NATURAL CONVERSATIONAL PHRASING. Phrase your questions smoothly like a real human.
2. STRICTLY NO MARKDOWN SYMBOLS: You MUST NOT output any markdown elements in your spoken text. This means:
   - NO ASTERISKS at all (do NOT use ** or * for bolding, italics, or list bullets).
   - NO HASHES (do NOT use # for headers).
   - NO BACKTICKS in conversational parts (do NOT write code blocks in plain speech).
   - All conversational responses must be plain, clean, unformatted sentences.
${codingRule}
4. WHEN YOU ASK FOR SYSTEM ARCHITECTURE, WORKFLOW DIAGRAMS, DATABASE SCHEMA, SCHEMATICS, OR TOPOLOGY, BEGIN YOUR RESPONSE WITH EXACTLY "[MODE:DRAW] ". Clearly state the architectural goals and key components and ask the candidate to visually diagram them on the interactive whiteboard.
5. OTHERWISE, BEGIN YOUR RESPONSE WITH EXACTLY "[MODE:CHAT] ".
6. If you decide to terminate the interview, prepend "[TERMINATE] ".
7. DO NOT say "Welcome" or "Hello" unless the conversation history is completely empty.

${companyCloneBlock}
${domainBlock}
${languageBlock}
${hrPersonaBlock}
${candidateProfileInfo}

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
            // fall through to Gemini if Sarvam chat fails
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
            console.warn("Interviewer Gemini error, using fallback message:", genErr?.message || genErr);
            return NextResponse.json({
                message: "[MODE:CHAT] I’m having trouble reaching the interview engine right now. Please try again shortly."
            });
        }

        return NextResponse.json({ message: responseResult, provider: useSarvam ? "gemini_fallback" : "gemini" });
    } catch (error: any) {
        console.error("AI Provider Error:", error);
        if (error?.status === 429 || String(error?.message || "").includes("quota")) {
            return NextResponse.json({
                message: "[MODE:CHAT] I’m having trouble reaching the interview engine right now. Please try again shortly."
            });
        }
        return jsonError(error, 500, "Failed to generate AI response");
    }
}
