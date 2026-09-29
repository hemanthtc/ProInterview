import { NextRequest, NextResponse } from "next/server";
import { cachedGenerate, parseJsonFromModel, promptCacheKey } from "@/utils/gemini";
import { rateLimit } from "@/utils/rateLimit";
import { getVerifiedSession } from "@/utils/auth";
import { ANTI_LEAK_SUFFIX } from "@/utils/promptGuard";
import { getDomainForRole } from "@/utils/domainClassifier";

const PANELISTS = [
    { id: "tech_lead", name: "Alex Chen", role: "Domain / Technical Lead", style: "Deep domain architecture, execution quality, edge cases, methodology, and technical fundamentals" },
    { id: "em", name: "Jordan Lee", role: "Hiring Manager", style: "STAR behavioral stories, team alignment, stakeholder communication, conflict resolution" },
    { id: "bar_raiser", name: "Sam Okonkwo", role: "Bar Raiser", style: "High-rigor standards, 10x scalability, risk mitigation, trade-off regrets, resilience" },
];

const DYNAMIC_PANELIST_QUESTIONS: Record<string, Record<number, (comp: string, role: string) => string>> = {
    tech_lead: {
        0: (comp, role) => {
            const domain = getDomainForRole(role);
            if (domain === "business_management") {
                return `Welcome! As Functional Lead at ${comp}, I'd like to dive into your domain expertise for the ${role} position. Could you walk me through the end-to-end execution of a complex project, strategy, or model you delivered recently, detailing key deliverables and metrics?`;
            }
            if (domain === "core_engineering") {
                return `Welcome! As Lead Engineer at ${comp}, I'd like to dive into your technical depth for the ${role} position. Could you walk me through the design architecture of a complex hardware, circuit, or mechanical system you engineered recently, detailing key parameters and constraints?`;
            }
            return `Welcome! As Tech Lead at ${comp}, I'd like to dive into your technical depth for the ${role} position. Could you walk me through the system architecture of a complex feature or service you built recently, detailing data flow and key component interactions?`;
        },
        1: (_comp, role) => {
            const domain = getDomainForRole(role);
            if (domain === "business_management") {
                return `Thanks. In that project, how did you handle risk mitigation, metric deviations, and cross-department constraints under tight deadlines?`;
            }
            if (domain === "core_engineering") {
                return `Thanks. In that design, how did you handle thermal/power margins, tolerance constraints, and signal/structural integrity under extreme operational conditions?`;
            }
            return `Thanks. In that architecture, how did you handle data consistency, database indexing/caching strategies, and error boundaries under heavy concurrent user traffic?`;
        },
        2: (_comp, role) => {
            const domain = getDomainForRole(role);
            if (domain === "business_management") {
                return `Before I pass control to Jordan, tell me about your approach to quality assurance, validation against business requirements, and avoiding operational drift.`;
            }
            if (domain === "core_engineering") {
                return `Before I pass control to Jordan, tell me about your strategy for design verification, prototype testing against standards, and preventing defects prior to release.`;
            }
            return `Before I pass control to Jordan, tell me about your strategy for code reviews, testing (unit, integration, and contract tests), and avoiding technical debt in production releases.`;
        }
    },
    em: {
        3: (_comp, _role) => `Thanks Alex. Moving to project execution—tell me about a situation at work where priorities shifted or requirements changed unexpectedly. How did you communicate with stakeholders and balance speed versus quality?`,
        4: (_comp, _role) => `Describe a scenario where colleagues or team members had conflicting opinions on an important strategic or technical decision. How did you facilitate consensus and keep delivery on track?`,
        5: (_comp, _role) => `How do you approach onboarding new team members, mentoring colleagues, and keeping high team morale without causing burnout?`
    },
    bar_raiser: {
        6: (_comp, role) => {
            const domain = getDomainForRole(role);
            if (domain === "business_management") {
                return `Great context. As Bar Raiser, I focus on long-term sustainability and operational resilience. If your product or business unit experienced a sudden 10x surge in volume or a major market disruption overnight, where would the current process fail first, and how would you redesign it?`;
            }
            if (domain === "core_engineering") {
                return `Great context. As Bar Raiser, I focus on long-term reliability and engineering resilience. If your core system was subjected to 10x unexpected operating stress or environmental extremes, what component would fail first, and how would you harden the design?`;
            }
            return `Great context. As Bar Raiser, I focus on long-term scalability and engineering resilience. If your core service experienced a 10x sudden spike in traffic overnight, where would the current architecture fail first, and how would you redesign it?`;
        },
        7: (_comp, _role) => `Looking back at your professional career, what is one major design, strategic, or architectural trade-off decision you regret making, and what did you learn about resilience and long-term risk from it?`
    }
};

export async function GET() {
    return NextResponse.json({ panelists: PANELISTS });
}

export async function POST(req: NextRequest) {
    let body: any = {};
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        body = await req.json().catch(() => ({}));
        const {
            history = [],
            message = "",
            resume = "",
            company = "a tech company",
            role = "Software Engineer",
            activePanelistId,
            level = "intermediate",
            companyClone,
        } = body;

        const rl = rateLimit(`panel:${session.identifier}`, { limit: 40, windowMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Rate limited. Retry in ${rl.retryAfterSec}s.` },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
            );
        }

        const assistantTurns = (history as { role: string }[]).filter((h) => h.role === "assistant").length;
        const totalQuestionLimit = 8;
        const isConcludingRound = assistantTurns >= totalQuestionLimit && message.trim().length > 0;

        let panelist = PANELISTS.find((p) => p.id === activePanelistId);
        if (!panelist) {
            if (assistantTurns < 3) panelist = PANELISTS[0]; // Tech Lead
            else if (assistantTurns < 6) panelist = PANELISTS[1]; // EM
            else panelist = PANELISTS[2]; // Bar Raiser
        }

        const nextPanelist = PANELISTS[(PANELISTS.findIndex((p) => p.id === panelist.id) + 1) % PANELISTS.length];

        const isSkip = Boolean(
            message &&
            /^\s*(i don'?t know|skip|don'?t know|no idea|pass|next question)\s*$/i.test(message.trim())
        );

        const userAnswers = (history as { role: string; content: string }[]).filter(
            (h) => h.role === "user" && h.content && !/i don'?t know|skip/i.test(h.content)
        );
        if (message && !isSkip && !history.some((h: any) => h.content === message)) {
            userAnswers.push({ role: "user", content: message });
        }

        // EVALUATION & CONCLUDING ROUND
        if (isConcludingRound) {
            if (userAnswers.length === 0) {
                return NextResponse.json({
                    speakerId: panelist.id,
                    speakerName: panelist.name,
                    speakerRole: panelist.role,
                    reply: "Thank you for completing the panel round. Since no candidate responses were provided, no score can be awarded.",
                    passTo: null,
                    terminate: true,
                    summary: {
                        overall: 0,
                        strengths: ["Attended panel loop session"],
                        gaps: ["No answers submitted for evaluation", "Skipped all interviewer prompts"],
                        nextDrills: ["Practice STAR stories", "Review technical fundamentals"],
                    },
                    panelists: PANELISTS,
                });
            }

            const fullTranscript = (history as { role: string; content: string; panelist?: string }[])
                .map((h) => `${h.panelist || h.role}: ${h.content}`)
                .join("\n");

            const evalPrompt = `You are evaluating a candidate's panel interview for ${role} at ${company}.
Full Interview Transcript:
${fullTranscript}

Candidate Resume Context:
${(resume || "").slice(0, 3000) || "Not provided"}

Evaluate the candidate rigorously based strictly on their actual answers.
Return JSON:
{
  "overall": <number 0-100 based strictly on answer depth and technical/behavioral quality>,
  "strengths": ["<specific strength from their actual answers>", "<another specific strength>"],
  "gaps": ["<specific gap or missing detail from their answers>", "<another actionable gap>"],
  "nextDrills": ["STAR Coach", "System Design Lab", "Film Room"]
}`;

            let finalSummary;
            try {
                const evalRaw = await cachedGenerate(
                    promptCacheKey("panel_eval", session.identifier, String(userAnswers.length), fullTranscript.slice(-500)),
                    evalPrompt,
                    5 * 60 * 1000
                );
                finalSummary = parseJsonFromModel(evalRaw) as any;
            } catch {
                const completionRatio = userAnswers.length / totalQuestionLimit;
                const score = Math.min(95, Math.max(40, Math.floor(completionRatio * 70 + userAnswers.length * 3.5)));
                finalSummary = {
                    overall: score,
                    strengths: [
                        "Responded to technical and behavioral panel questions",
                        "Demonstrated clear technical communication during discussion"
                    ],
                    gaps: [
                        "Quantify business metrics & impact in behavioral responses",
                        "Elaborate on production incident mitigation strategies"
                    ],
                    nextDrills: ["STAR Coach", "Film Room", "System Design Lab"],
                };
            }

            return NextResponse.json({
                speakerId: panelist.id,
                speakerName: panelist.name,
                speakerRole: panelist.role,
                reply: "Thank you for completing the panel interview round! Here is your final evaluation scorecard based on your responses.",
                passTo: null,
                terminate: true,
                summary: finalSummary,
                panelists: PANELISTS,
            });
        }

        // DYNAMIC QUESTION GENERATION (AI Persona-driven)
        const transcript = (history as { role: string; content: string; panelist?: string }[])
            .slice(-10)
            .map((h) => `${h.panelist || h.role}: ${h.content}`)
            .join("\n");

        let mappedType = "off-campus";
        if (companyClone === false) {
            if (level === "basic") mappedType = "internship";
            else mappedType = "on-campus";
        } else {
            if (level === "basic") mappedType = "internship";
            else if (level === "intermediate") mappedType = "off-campus";
            else mappedType = "experienced";
        }

        const recruitmentModeBlock = `
ACTIVE INTERVIEW TYPE: ${mappedType.toUpperCase()}
- Panelist style based on this type:
  * INTERNSHIP: Calibrate questions to candidate's baseline programming skills, learning agility, basic code syntax, and university/college projects.
  * ON-CAMPUS: Focus on Computer Science core theoretical foundations (Object-Oriented Programming (OOP) concepts, Database Management Systems (DBMS Normalization, ACID), Operating Systems (Concurrency, deadlocks, virtual memory), Computer Networks (TCP/UDP, HTTP, DNS), basic Data Structures & Algorithms, and college projects).
  * OFF-CAMPUS: Focus on practical application building, systems integration, code quality, unit/integration testing patterns, API design, and logical scaling.
  * EXPERIENCED: Focus on advanced system designs, scalability, performance bottlenecks, distributed architectural trade-offs, Sprint delivery shifts, mentorship, and extensive previous work history.
`;

        const prompt = `You are running a real-time PANEL interview at ${company} for ${role} (${level}).
Current interviewer: ${panelist.name} (${panelist.role}).
Personality & Style: ${panelist.style}.
Other panelists: ${PANELISTS.filter((p) => p.id !== panelist.id).map((p) => `${p.name} (${p.role})`).join(", ")}.

Question number: ${assistantTurns + 1} of ${totalQuestionLimit}.
${recruitmentModeBlock}

INTERVIEW ORCHESTRATION FLOW:
1. Scan & Analyze Resume and Portfolio Context: First, scan the candidate's resume and portfolio, identifying candidate information specifically: Education Background, Preferred Role, Target Company (if specified), Skills, and Projects.
2. Build Candidate Profile: Ground all questions strictly in their actual resume details, skills, and projects. NEVER ask generic template questions or creative hypotheticals that do not align with their profile.
3. Establish Interview Type Calibrations: Tailor difficulty and depth to the active type: ${mappedType}.
4. Question Plan: Formulate a clear direction for checking the candidate's core and practical suitability.
5. Adaptive Loop: Ask ONE question at a time, wait for the candidate's answer, and dynamically adapt.

Candidate Resume:
${(resume || "").slice(0, 3000) || "Not provided"}

Recent Transcript:
${transcript || "(Opening of interview)"}

Candidate just said:
${message || "(opening greeting — introduce yourself as " + panelist.name + " and ask your first personalized question based on their resume/role)"}

${isSkip ? "NOTE: Candidate skipped or stated 'I don't know'. Acknowledge politely as " + panelist.name + " without answering for them, and transition smoothly to your next unique question or hand over to " + nextPanelist.name + "." : ""}

Instructions:
- Fully adopt the persona and questioning style of ${panelist.name} (${panelist.role}).
- Align your question style to the active recruitment pattern: ${mappedType}.
- Ask ONE dynamic, high-quality question tailored to the candidate's resume, target role (${role}), and recent answer. Do NOT use generic template questions. Do NOT repeat previous questions.
- Do NOT answer your own question. Do NOT simulate candidate responses.
- STICK TO NATURAL CONVERSATIONAL PHRASING. Phrase your questions smoothly like a real human.
- STRICTLY NO MARKDOWN SYMBOLS: You MUST NOT output any markdown elements in your spoken text. This means no asterisks at all (no bolding, italics, or list bullets), no hashes, and no backticks. Make it sound like a real person talking.
- Keep reply under 90 words.

Return JSON:
{
  "speakerId": "${panelist.id}",
  "speakerName": "${panelist.name}",
  "speakerRole": "${panelist.role}",
  "reply": "<your dynamic persona-driven question>",
  "passTo": "${nextPanelist.id}",
  "terminate": false
}

${ANTI_LEAK_SUFFIX}`;

        const raw = await cachedGenerate(
            promptCacheKey("panel_gen", panelist.id, company, role, level, String(assistantTurns), transcript.slice(-300), message),
            prompt,
            1 * 60 * 1000
        );
        let parsed: Record<string, unknown>;
        try {
            parsed = parseJsonFromModel(raw) as Record<string, unknown>;
        } catch {
            parsed = {
                speakerId: panelist.id,
                speakerName: panelist.name,
                speakerRole: panelist.role,
                reply: raw.replace(/\[PASS_TO:[^\]]+\]/g, "").replace("[TERMINATE]", "").replace(/```json|```/g, "").trim(),
                passTo: nextPanelist.id,
                terminate: false,
            };
        }

        if (typeof parsed.reply === "string") {
            parsed.reply = parsed.reply
                .replace(/\[PASS_TO:[^\]]+\]/gi, "")
                .replace(/\[TERMINATE\]/gi, "")
                .replace(/```json[\s\S]*?```/gi, "")
                .trim();
        }

        return NextResponse.json({
            ...parsed,
            terminate: false,
            panelists: PANELISTS,
        });
    } catch {
        console.log("[Panel Interview] Utilizing dynamic turn-indexed persona fallback.");

        const history = (body.history || []) as { role: string; content: string }[];
        const assistantTurns = history.filter((h) => h.role === "assistant").length;
        const totalQuestionLimit = 8;
        const isConcludingRound = assistantTurns >= totalQuestionLimit && (body.message || "").trim().length > 0;

        const panelistIndex = Math.min(Math.floor(assistantTurns / 3), PANELISTS.length - 1);
        const panelist = PANELISTS[panelistIndex] || PANELISTS[0];
        const nextPanelist = PANELISTS[(panelistIndex + 1) % PANELISTS.length];

        const userAnswers = history.filter(
            (h) => h.role === "user" && h.content && !/i don'?t know|skip/i.test(h.content)
        );

        if (isConcludingRound) {
            const score = userAnswers.length === 0 ? 0 : Math.min(92, Math.max(45, Math.floor((userAnswers.length / 8) * 85)));

            return NextResponse.json({
                speakerId: panelist.id,
                speakerName: panelist.name,
                speakerRole: panelist.role,
                reply: "Thank you for completing the panel interview round! Here is your final evaluation scorecard.",
                passTo: null,
                terminate: true,
                summary: {
                    overall: score,
                    strengths: userAnswers.length === 0 ? ["Attended panel loop session"] : ["Demonstrated solid technical explanation", "Maintained composure under questioning"],
                    gaps: userAnswers.length === 0 ? ["No answers submitted for evaluation"] : ["Provide concrete metrics for system results", "Clarify architecture trade-offs"],
                    nextDrills: ["STAR Coach", "System Design Lab"],
                },
                panelists: PANELISTS,
            });
        }

        // Turn-indexed dynamic question selection (Turn 0 through Turn 7)
        const role = body.role || "Candidate Target Role";
        const company = body.company || "Target Organization";

        const turnPool = DYNAMIC_PANELIST_QUESTIONS[panelist.id] || DYNAMIC_PANELIST_QUESTIONS.tech_lead;
        const fn = turnPool[assistantTurns] || turnPool[0];
        const fallbackReply = fn(company, role);

        return NextResponse.json({
            speakerId: panelist.id,
            speakerName: panelist.name,
            speakerRole: panelist.role,
            reply: fallbackReply,
            passTo: nextPanelist.id,
            terminate: false,
            summary: null,
            panelists: PANELISTS,
        });
    }
}
