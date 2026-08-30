import { NextResponse } from "next/server";

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

export async function fetchGithubPublicRepos(githubUrl?: string): Promise<string> {
    if (!githubUrl) return "";
    try {
        let url = githubUrl.trim();
        if (!url.startsWith("http")) url = "https://" + url;
        const parsedUrl = new URL(url);
        if (!parsedUrl.hostname.includes("github.com")) return "";
        
        const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
        if (pathParts.length < 1) return "";
        const username = pathParts[0];

        // Ensure username is not a reserved path
        if (["features", "setup", "login", "labs", "coaches", "jobs", "pricing", "organizations", "terms", "privacy", "blog", "about", "contact", "support"].includes(username.toLowerCase())) {
            return "";
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=6`, {
            headers: {
                "User-Agent": "ProInterview-AI-Agent"
            },
            signal: controller.signal
        });
        clearTimeout(timeout);
        
        if (!res.ok) return "";
        const repos = await res.json();
        if (!Array.isArray(repos) || repos.length === 0) return "";
        
        let reposText = `\nPublic GitHub Repositories for candidate (${username}):\n`;
        for (const repo of repos) {
            reposText += `- Repo Name: ${repo.name}\n`;
            if (repo.description) reposText += `  Description: ${repo.description}\n`;
            reposText += `  Primary Language: ${repo.language || "Not specified"}\n`;
            reposText += `  Stars: ${repo.stargazers_count} | Fork count: ${repo.forks_count}\n`;
            reposText += `  URL: ${repo.html_url}\n\n`;
        }
        return reposText;
    } catch {
        return "";
    }
}

export async function buildCandidateProfileInfo(
    resume?: string,
    github?: string,
    linkedin?: string,
    portfolioUrl?: string,
    portfolioRating?: string,
    portfolioFeedback?: string
): Promise<string> {
    const hasResume = Boolean(resume && resume.trim().length > 0);
    const hasPortfolio = Boolean(github || linkedin || portfolioUrl);
    const githubReposText = github ? await fetchGithubPublicRepos(github) : "";

    let portfolioAnalysisBlock = "";
    if (portfolioRating || portfolioFeedback) {
        portfolioAnalysisBlock = `\n--- PRE-INTERVIEW PORTFOLIO EVALUATION REPORT ---
Pre-Interview Analysis Score: ${portfolioRating || "N/A"}/100
Evaluation Strengths & Study Recommendations:
${portfolioFeedback || "No detailed report generated."}
-------------------------------------------------
You MUST strictly base your technical questions, weaknesses probing, and behavioral scenarios on the specific strengths, weaknesses, and study recommendations highlighted in this Pre-Interview Report.
`;
    }

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
${githubReposText ? `\nScanned GitHub Public Repositories Metadata:\n${githubReposText}` : ""}
${portfolioAnalysisBlock}
You MUST evaluate, discuss, and ask highly relevant questions about the experiences, projects, tech stacks, and the specific portfolio strengths/weaknesses listed in the resume, portfolio, and evaluation report throughout the interview.`;
    } else if (hasResume) {
        return `You are conducting a technical interview based on the candidate's Resume.
Here is the Candidate's Resume Text:
---
${resume}
---
${portfolioAnalysisBlock}`;
    } else if (hasPortfolio) {
        return `You are conducting a technical interview based on the candidate's Portfolio.
Here are the Candidate's Portfolio details:
- GitHub: ${github || "Not provided"}
- LinkedIn: ${linkedin || "Not provided"}
- Portfolio URL: ${portfolioUrl || "Not provided"}
${githubReposText ? `\nScanned GitHub Public Repositories Metadata:\n${githubReposText}` : ""}
${portfolioAnalysisBlock}`;
    } else {
        return `You are conducting a general technical interview. No resume or portfolio was provided. ${portfolioAnalysisBlock}`;
    }
}

export async function buildRealisticProfileSection(
    resume?: string,
    github?: string,
    linkedin?: string,
    portfolioUrl?: string,
    portfolioRating?: string,
    portfolioFeedback?: string
): Promise<string> {
    const hasResume = Boolean(resume && resume.trim().length > 0);
    const hasPortfolio = Boolean(github || linkedin || portfolioUrl);
    const githubReposText = github ? await fetchGithubPublicRepos(github) : "";

    let portfolioAnalysisBlock = "";
    if (portfolioRating || portfolioFeedback) {
        portfolioAnalysisBlock = `\n--- PRE-INTERVIEW PORTFOLIO EVALUATION REPORT ---
Pre-Interview Analysis Score: ${portfolioRating || "N/A"}/100
Evaluation Strengths & Study Recommendations:
${portfolioFeedback || "No detailed report generated."}
-------------------------------------------------
You MUST strictly base your technical questions, weaknesses probing, and behavioral scenarios on the specific strengths, weaknesses, and study recommendations highlighted in this Pre-Interview Report.
`;
    }

    if (hasResume && hasPortfolio) {
        return `CANDIDATE'S PROFILE DETAILS (RESUME & PORTFOLIO):
You must evaluate and ask questions based on BOTH the candidate's Resume and their Portfolio materials.
--- RESUME ---
${resume}

--- PORTFOLIO LINKS ---
GitHub: ${github || "Not provided"}
LinkedIn: ${linkedin || "Not provided"}
Portfolio URL: ${portfolioUrl || "Not provided"}
${githubReposText ? `\nScanned GitHub Public Repositories Metadata:\n${githubReposText}` : ""}
${portfolioAnalysisBlock}
`;
    } else if (hasResume) {
        return `CANDIDATE'S RESUME:
${resume}
${portfolioAnalysisBlock}`;
    } else if (hasPortfolio) {
        return `CANDIDATE'S PORTFOLIO:
GitHub: ${github || "Not provided"}
LinkedIn: ${linkedin || "Not provided"}
Portfolio URL: ${portfolioUrl || "Not provided"}
${githubReposText ? `\nScanned GitHub Public Repositories Metadata:\n${githubReposText}` : ""}
${portfolioAnalysisBlock}
`;
    } else {
        return `No resume or portfolio was provided. Ask standard interview questions. ${portfolioAnalysisBlock}`;
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
