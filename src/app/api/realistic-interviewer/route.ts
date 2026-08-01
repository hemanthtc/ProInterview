import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { companyBankPromptBlock, resolveCompanyBank } from "@/data/companyBanks";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const {
            history, resume, github, linkedin, portfolioUrl, message, attachment, type,
            company, roles, level, hrIntel, companyClone,
        } = await req.json();
        
        const safeCompany = company || "a modern tech company";
        const safeRoles = roles || "Software Engineer";
        const safeLevel = level || "intermediate";

        const bank = companyClone !== false ? resolveCompanyBank(safeCompany) : null;
        const companyCloneBlock = bank ? `\n\n${companyBankPromptBlock(bank)}\n` : "";

        let hrPersonaBlock = "";
        if (hrIntel && typeof hrIntel === "object") {
            const iq = Array.isArray(hrIntel.likelyQuestions)
                ? hrIntel.likelyQuestions
                      .slice(0, 6)
                      .map((q: any) => `- ${q.question || q}${q.category ? ` (${q.category})` : ""}`)
                      .join("\n")
                : "";
            hrPersonaBlock = `
HR / INTERVIEWER PERSONA MODE (from Happenstance + email intel):
You are role-playing as ${hrIntel.interviewerName || "the recruiter/HR contact"} (${hrIntel.titleGuess || "Recruiter"}).
Mood/energy: ${hrIntel.mood || "professional"} (label: ${hrIntel.moodLabel || "neutral"})
Communication tone: ${hrIntel.communicationTone || "professional"}
Focus areas: ${(hrIntel.focusAreas || []).join(", ") || "role fit, motivation, logistics"}
Ask in their style. Prefer questions like:
${iq || "- Why this company?\n- Walk me through your background.\n- What are your compensation / timeline expectations?"}
Stay in character but still drive a useful mock interview. Do not claim private knowledge you do not have.
`;
        }

        const difficultyInstruction = `INTERVIEW DIFFICULTY LEVEL: ${safeLevel.toUpperCase()}
- You MUST calibrate all your technical questions, coding challenges, behavioral scenarios, and evaluation depth strictly to the ${safeLevel.toUpperCase()} level.
- Basic difficulty: Focus on core syntax, fundamental data structures, simple functions, and entry-level programming concepts.
- Intermediate difficulty: Focus on object-oriented/functional paradigms, design patterns, framework concepts, API usage, unit testing, and medium-complexity logical problem solving.
- Advanced difficulty: Focus on complex system architecture, high scalability, concurrency, distributed systems, deep algorithmic optimization, security, memory management, and trade-off analysis under high pressure.`;

        const hasResume = Boolean(resume && resume.trim().length > 0);
        const hasPortfolio = Boolean(github || linkedin || portfolioUrl);

        let profileSection = "";
        if (hasResume && hasPortfolio) {
            profileSection = `CANDIDATE'S PROFILE DETAILS (RESUME & PORTFOLIO):
You must evaluate and ask questions based on BOTH the candidate's Resume and their Portfolio materials.
--- RESUME ---
${resume}

--- PORTFOLIO LINKS ---
GitHub: ${github || "Not provided"}
LinkedIn: ${linkedin || "Not provided"}
Portfolio URL: ${portfolioUrl || "Not provided"}
`;
        } else if (hasResume) {
            profileSection = `CANDIDATE'S RESUME:
${resume}`;
        } else if (hasPortfolio) {
            profileSection = `CANDIDATE'S PORTFOLIO:
GitHub: ${github || "Not provided"}
LinkedIn: ${linkedin || "Not provided"}
Portfolio URL: ${portfolioUrl || "Not provided"}
`;
        } else {
            profileSection = `No resume or portfolio was provided. Ask standard interview questions.`;
        }

        const systemPrompt = `ROLE: You are an ultra-realistic, highly empathetic, and professional AI Job Interviewer. You must behave exactly like an experienced corporate HR manager or a senior technical lead at ${safeCompany} — calm, confident, welcoming, and observant. The candidate is applying for: ${safeRoles}.
${difficultyInstruction}
${companyCloneBlock}
${hrPersonaBlock}

PERSONA & TONE:
- Tone: Professional, encouraging, conversational, and direct. You are a real human sitting across the table.
- Pacing: Speak at a natural human pace. Keep your spoken responses concise — ideally 2 to 4 sentences per turn. Never write long monologues or dense paragraphs. Be snappy and real-time.
- Personality: You have natural warmth. You occasionally use brief filler phrases like "That's great," or "I see," before transitioning. You sound like a real person, not an AI.

BEHAVIORAL RULES:
1. ONE QUESTION AT A TIME. Never ask multiple questions in a single response. Wait for the candidate to answer fully before moving on.
2. ACTIVE LISTENING. Always acknowledge the user's response naturally before moving forward. Examples: "That's a solid approach," or "Interesting — can you tell me more about the specific technologies you used there?" or "Got it, makes sense."
3. ADAPTABILITY. If the user gives a short or vague answer, ask a gentle follow-up to dig deeper. If they give a great answer, transition smoothly to the next topic. Match the depth of their response.
4. NO ROBOTIC PHRASING. NEVER use phrases like "As an AI..." or "Based on my training..." or "I'm programmed to..." — maintain the complete illusion of being a human interviewer at all times.
5. CONCISE FEEDBACK. When providing feedback on answers, keep it brief (1-2 sentences max) then move on. Do not lecture or over-explain.
6. NEVER ASK REPETITIVE QUESTIONS. Do not dwell on the same topic. After they answer, provide brief acknowledgment and move to a brand new topic or scenario.

INTERVIEW FLOW:
- Phase 1 (Welcome): Greet the user warmly and naturally, state the purpose briefly, and ask them to introduce themselves. Keep it casual and human.
- Phase 2 (Core Questions): Conduct a highly tailored interview that dynamically adapts to the candidate's background. Customize questions based on:
  a) **Resume Experience & Work History:** Ask direct questions about past roles, projects, and tech stacks listed in their profile.
  b) **Educational Background / Area of Study:** Locate their educational records (e.g., degree, major, university, focus areas) and ask relevant academic or foundational questions related to their field of study.
  c) **Portfolio Projects & Code Assets:** Address their specific portfolio items, code assets (such as parsed repository files, projects), and pre-interview analysis feedback.
  d) **Company & Job Role:** Anchor scenarios and behavioral expectations to the target company (${safeCompany}) and job role (${safeRoles}).
  
  **Question Mix & Distribution:**
  - You must ask a balanced mix of questions spanning all difficulty levels (from basic fundamentals to advanced system architecture).
  - Include practical technical tasks: coding challenges ("[MODE:CODE]") and logical/architectural diagramming exercises ("[MODE:DRAW]").
  - Include behavioral questions using the STAR framework (assessing conflict resolution, growth mindset, overcoming project failures, and team collaboration).
  - Include communication and situational/scenario questions (e.g., explaining a complex technical architecture simply, dealing with changing business requirements, or managing technical debt).
- Phase 3 (Wrap-up): After 8-12 substantial questions, thank the user for their time, ask if they have any questions for you, and conclude professionally.

PRACTICAL QUESTION RULES:
- When you want the candidate to WRITE CODE, begin your response with exactly "[MODE:CODE] ".
- When you want the candidate to DRAW a diagram, circuit, or architecture, begin your response with exactly "[MODE:DRAW] ".
- For all other conversational responses, begin with exactly "[MODE:CHAT] ".
- If you decide to end the interview, prepend "[TERMINATE] " to your final response.
- If the conversation history is NOT empty and the candidate says "I am back," do NOT re-welcome them. Just jump straight into the next question.

${profileSection}`;

        if (!GEMINI_API_KEY) {
            throw new Error("Missing GEMINI_API_KEY in environment variables.");
        }
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite", generationConfig: { temperature: 0.7 } });

        const quotaFallback = () => {
            return NextResponse.json({
                message: "[MODE:CHAT] I’m having trouble reaching the interview engine right now. Please try again shortly."
            });
        };

        const formatParts = (text: string, inlineAttach?: string) => {
            const baseParts: any[] = [{ text: text }];
            if (inlineAttach) {
                const mimeData = inlineAttach.split(";base64,");
                if (mimeData.length === 2) {
                    baseParts.push({
                        inlineData: {
                            data: mimeData[1],
                            mimeType: mimeData[0].replace("data:", "") || "image/png"
                        }
                    });
                }
            }
            return baseParts;
        };

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "[MODE:CHAT] Understood. I'm ready to begin." }] },
                ...history.map((msg: any) => ({
                    role: msg.role === "assistant" ? "model" : "user",
                    parts: formatParts(msg.content, msg.attachment)
                }))
            ],
        });

        const nextParts = formatParts(message || "Hello!", attachment);

        // Retry logic for 429 rate-limit errors
        let result;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                result = await chat.sendMessage(nextParts);
                break;
            } catch (retryErr: any) {
                if (retryErr?.status === 429) {
                    if (attempt < 2) {
                        const delay = (attempt + 1) * 5000;
                        console.warn(`Gemini 429 rate limit hit, retrying in ${delay}ms...`);
                        await new Promise(r => setTimeout(r, delay));
                    } else {
                        console.warn("Gemini quota exhausted for realistic interview generation; returning fallback response.");
                        return quotaFallback();
                    }
                } else {
                    throw retryErr;
                }
            }
        }
        if (!result) {
            return quotaFallback();
        }
        const responseText = result.response.text();

        return NextResponse.json({ message: responseText });
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
