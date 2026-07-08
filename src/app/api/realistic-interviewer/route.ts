import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const { history, resume, message, attachment, type, provider, company, roles, level } = await req.json();
        
        const safeCompany = company || "a modern tech company";
        const safeRoles = roles || "Software Engineer";
        const safeLevel = level || "intermediate";

        const difficultyInstruction = `INTERVIEW DIFFICULTY LEVEL: ${safeLevel.toUpperCase()}
- You MUST calibrate all your technical questions, coding challenges, behavioral scenarios, and evaluation depth strictly to the ${safeLevel.toUpperCase()} level.
- Basic difficulty: Focus on core syntax, fundamental data structures, simple functions, and entry-level programming concepts.
- Intermediate difficulty: Focus on object-oriented/functional paradigms, design patterns, framework concepts, API usage, unit testing, and medium-complexity logical problem solving.
- Advanced difficulty: Focus on complex system architecture, high scalability, concurrency, distributed systems, deep algorithmic optimization, security, memory management, and trade-off analysis under high pressure.`;

        const systemPrompt = `ROLE: You are an ultra-realistic, highly empathetic, and professional AI Job Interviewer. You must behave exactly like an experienced corporate HR manager or a senior technical lead at ${safeCompany} — calm, confident, welcoming, and observant. The candidate is applying for: ${safeRoles}.
${difficultyInstruction}

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

CANDIDATE'S RESUME:
${resume}`;

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
                    message: "[MODE:CHAT] I’m having trouble reaching the interview engine right now. Please try again shortly, or switch to the Sarvam provider if it is available."
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
        }
    } catch (error: any) {
        console.error("AI Provider Error:", error);
        if (error?.status === 429 || String(error?.message || "").includes("quota")) {
            return NextResponse.json({
                message: "[MODE:CHAT] I’m having trouble reaching the interview engine right now. Please try again shortly, or switch to the Sarvam provider if it is available."
            });
        }
        return NextResponse.json({ error: error.message || "Failed to generate AI response" }, { status: 500 });
    }
}
