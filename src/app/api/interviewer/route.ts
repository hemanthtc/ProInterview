import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { companyBankPromptBlock, resolveCompanyBank } from "@/data/companyBanks";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const {
            history, resume, github, linkedin, portfolioUrl, message, attachment, type, provider,
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

        const typeInstruction = "Ask one highly relevant technical question at a time focusing strictly on coding, architecture, logic, and technical depth. Heavily favor practical tasks like writing code or drawing circuits.";

        const hasResume = Boolean(resume && resume.trim().length > 0);
        const hasPortfolio = Boolean(github || linkedin || portfolioUrl);

        let candidateProfileInfo = "";
        if (hasResume && hasPortfolio) {
            candidateProfileInfo = `You are conducting a technical interview based on BOTH the candidate's Resume and their Portfolio materials.
Here is the Candidate's Resume Text:
---
${resume}
---

Here are the Candidate's Portfolio details:
- GitHub: ${github || "Not provided"}
- LinkedIn: ${linkedin || "Not provided"}
- Portfolio URL: ${portfolioUrl || "Not provided"}

You MUST evaluate, discuss, and ask highly relevant questions about the experiences, projects, and tech stacks listed in BOTH their resume and their portfolio links throughout the interview. Make sure to reference details from both sources.`;
        } else if (hasResume) {
            candidateProfileInfo = `You are conducting a technical interview based on the candidate's Resume.
Here is the Candidate's Resume Text:
---
${resume}
---`;
        } else if (hasPortfolio) {
            candidateProfileInfo = `You are conducting a technical interview based on the candidate's Portfolio.
Here are the Candidate's Portfolio details:
- GitHub: ${github || "Not provided"}
- LinkedIn: ${linkedin || "Not provided"}
- Portfolio URL: ${portfolioUrl || "Not provided"}`;
        } else {
            candidateProfileInfo = `You are conducting a general technical interview. No resume or portfolio was provided.`;
        }

        const systemPrompt = `You are a professional online technical interviewer dynamically evaluating a candidate applying for: ${safeRoles} at ${safeCompany}.
Your tone, technical expectations, and questions must strictly align with the documented technical hiring standards and engineering culture of the target companies: ${safeCompany}.
${difficultyInstruction}
Be conversational. ${typeInstruction}
${companyCloneBlock}
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

        if (provider === "sarvam") {
            if (!SARVAM_API_KEY) {
                throw new Error("Missing SARVAM_API_KEY in environment variables.");
            }
            // Sarvam text generation API placeholder compatible interface
            // Note: Currently assumes a standard OpenAI compatible chat completion endpoint.
            const sarvamUrl = "https://api.sarvam.ai/v1/chat/completions";
            const sarvamHistory = history.map((msg: any) => ({
                role: msg.role,
                content: msg.content
            }));
            
            // Note: Standard Sarvam might not support base64 images yet, 
            // so we send just text or a note about the attachment.
            let sarvamMessage = message || "Hello!";
            if (attachment) {
                sarvamMessage += "\n(I have attached a diagram/image to this reply)";
            }

            const payload = {
                model: "sarvam-105b", // Flagship model for complex reasoning
                messages: [
                    { role: "system", content: systemPrompt },
                    ...sarvamHistory,
                    { role: "user", content: sarvamMessage }
                ],
                temperature: 0.7,
                max_tokens: 3000
            };

            const response = await fetch(sarvamUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${SARVAM_API_KEY}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Sarvam API error: ${response.status} ${errText}`);
            }

            const data = await response.json();
            const messageObj = data.choices?.[0]?.message;
            let responseText = messageObj?.content;
            if (!responseText) {
                responseText = `[MODE:CHAT] Please continue.`;
            }
            if (!responseText) {
                responseText = `[MODE:CHAT] Sarvam API issue: ${JSON.stringify(data)}`;
            }

            return NextResponse.json({ message: responseText });
        } else {
            // Default: Gemini
            if (!GEMINI_API_KEY) {
                throw new Error("Missing GEMINI_API_KEY in environment variables.");
            }
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite", generationConfig: { temperature: 0.7 } });

            const quotaFallback = () => {
                return NextResponse.json({
                    message: "[MODE:CHAT] I’m having trouble reaching the interview engine right now. Please try again in a little while, or switch to the Sarvam provider if it is available."
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
                            console.warn("Gemini quota exhausted for interview generation; returning fallback response.");
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
        }
    } catch (error: any) {
        console.error("AI Provider Error:", error);
        if (error?.status === 429 || String(error?.message || "").includes("quota")) {
            return NextResponse.json({
                message: "[MODE:CHAT] I’m having trouble reaching the interview engine right now. Please try again in a little while, or switch to the Sarvam provider if it is available."
            });
        }
        return NextResponse.json({ error: error.message || "Failed to generate AI response" }, { status: 500 });
    }
}
