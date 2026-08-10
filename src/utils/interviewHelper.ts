import { NextResponse } from "next/server";
import { companyBankPromptBlock, resolveCompanyBank } from "@/data/companyBanks";

export interface InterviewPayload {
    history?: any[];
    resume?: string;
    github?: string;
    linkedin?: string;
    portfolioUrl?: string;
    message?: string;
    attachment?: string;
    type?: string;
    company?: string;
    roles?: string;
    level?: string;
    hrIntel?: any;
    companyClone?: boolean;
}

export function buildHrPersonaBlock(hrIntel: any): string {
    if (!hrIntel || typeof hrIntel !== "object") return "";

    const iq = Array.isArray(hrIntel.likelyQuestions)
        ? hrIntel.likelyQuestions
              .slice(0, 6)
              .map((q: any) => `- ${q.question || q}${q.category ? ` (${q.category})` : ""}`)
              .join("\n")
        : "";

    return `
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

export function buildCandidateProfileInfo(resume?: string, github?: string, linkedin?: string, portfolioUrl?: string): string {
    const hasResume = Boolean(resume && resume.trim().length > 0);
    const hasPortfolio = Boolean(github || linkedin || portfolioUrl);

    if (hasResume && hasPortfolio) {
        return `You are conducting a technical interview based on BOTH the candidate's Resume and their Portfolio materials.
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
        return `You are conducting a technical interview based on the candidate's Resume.
Here is the Candidate's Resume Text:
---
${resume}
---`;
    } else if (hasPortfolio) {
        return `You are conducting a technical interview based on the candidate's Portfolio.
Here are the Candidate's Portfolio details:
- GitHub: ${github || "Not provided"}
- LinkedIn: ${linkedin || "Not provided"}
- Portfolio URL: ${portfolioUrl || "Not provided"}`;
    } else {
        return `You are conducting a general technical interview. No resume or portfolio was provided.`;
    }
}

export function buildRealisticProfileSection(resume?: string, github?: string, linkedin?: string, portfolioUrl?: string): string {
    const hasResume = Boolean(resume && resume.trim().length > 0);
    const hasPortfolio = Boolean(github || linkedin || portfolioUrl);

    if (hasResume && hasPortfolio) {
        return `CANDIDATE'S PROFILE DETAILS (RESUME & PORTFOLIO):
You must evaluate and ask questions based on BOTH the candidate's Resume and their Portfolio materials.
--- RESUME ---
${resume}

--- PORTFOLIO LINKS ---
GitHub: ${github || "Not provided"}
LinkedIn: ${linkedin || "Not provided"}
Portfolio URL: ${portfolioUrl || "Not provided"}
`;
    } else if (hasResume) {
        return `CANDIDATE'S RESUME:
${resume}`;
    } else if (hasPortfolio) {
        return `CANDIDATE'S PORTFOLIO:
GitHub: ${github || "Not provided"}
LinkedIn: ${linkedin || "Not provided"}
Portfolio URL: ${portfolioUrl || "Not provided"}
`;
    } else {
        return `No resume or portfolio was provided. Ask standard interview questions.`;
    }
}

export function formatGeminiParts(text: string, inlineAttach?: string): any[] {
    const baseParts: any[] = [{ text }];
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
}

export async function sendGeminiMessageWithRetry(
    chat: any,
    nextParts: any[],
    logContext: string = "interview generation"
): Promise<NextResponse | string> {
    const quotaFallback = () => {
        return NextResponse.json({
            message: "[MODE:CHAT] I’m having trouble reaching the interview engine right now. Please try again shortly."
        });
    };

    let result: any;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            result = await chat.sendMessage(nextParts);
            break;
        } catch (retryErr: any) {
            if (retryErr?.status === 429) {
                if (attempt < 2) {
                    const delay = (attempt + 1) * 5000;
                    console.warn(`Gemini 429 rate limit hit, retrying in ${delay}ms...`);
                    await new Promise((r) => setTimeout(r, delay));
                } else {
                    console.warn(`Gemini quota exhausted for ${logContext}; returning fallback response.`);
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

    return result.response.text();
}
