import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateWithFallback } from "@/utils/gemini";
import JSZip from "jszip";
import { isSafeUrl } from "@/utils/ssrf";
import { getVerifiedSession } from "@/utils/auth";
import { fetchGithubPublicRepos } from "@/utils/interviewHelper";

async function extractTextFromFile(file: File): Promise<string> {
    const name = file.name.toLowerCase();

    if (name.endsWith(".pdf") || file.type === "application/pdf") {
        try {
            // @ts-expect-error pdf-parse does not have default type definitions
            const pdfParseModule = await import("pdf-parse");
            const pdfParse = pdfParseModule.default ?? pdfParseModule;
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const data = await pdfParse(buffer);
            const textContent = data.text || "";
            return `--- [File: ${file.name}] ---\n${textContent}\n`;
        } catch(e) {
            console.error("PDF extraction failed for " + file.name + ":", e);
            return "";
        }
    }

    if (name.endsWith(".zip") || file.type.includes("zip")) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);
            let extracted = "";
            for (const relativePath in zip.files) {
                const zipEntry = zip.files[relativePath];
                if (zipEntry.dir || relativePath.includes("node_modules") || relativePath.includes(".git") || relativePath.match(/\.(png|jpg|jpeg|gif|ico|pdf|zip|tar|gz|mp4|mp3|exe|dll)$/i)) continue;

                const content = await zipEntry.async("string");
                extracted += `--- [File in ZIP: ${relativePath}] ---\n${content.substring(0, 3000)}\n`;
            }
            return extracted;
        } catch (e) { return ""; }
    }

    // Fallback parsing for text/code/generic files
    if (file.size > 2000000) return ""; // skip >2mb raw files
    try {
        const text = await file.text();
        return `--- [File: ${file.name}] ---\n${text.substring(0, 3000)}\n`;
    } catch (e) { return ""; }
}

async function fetchUrlText(url: string) {
    if (!url) return "";
    try {
        if (!url.startsWith("http")) url = "https://" + url;

        // Verify URL is safe from SSRF before fetching
        const safe = await isSafeUrl(url);
        if (!safe) {
            return `\n--- [Failed to fetch website: ${url} (Unsafe/Local URL blocked)] ---\n`;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        const html = await res.text();
        const cleanText = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ').trim();
        return `\n--- [Website: ${url}] ---\n${cleanText.substring(0, 3000)}\n`;
    } catch (e) { return `\n--- [Failed to fetch website: ${url}] ---\n`; }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getVerifiedSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized access: Please sign in." }, { status: 401 });
        }

        const formData = await req.formData();
        const github = formData.get("github") as string;
        const linkedin = formData.get("linkedin") as string;
        const portfolioUrl = formData.get("portfolioUrl") as string;
        const targetCompanies = formData.get("targetCompanies") as string;
        const preferredRoles = formData.get("preferredRoles") as string;
        const isRealisticMode = formData.get("isRealisticMode") === "true";
        const projectFiles = formData.getAll("projectFiles") as File[];

        const resumeText = formData.get("resumeText") as string;
        const hasResume = Boolean(resumeText && resumeText.trim().length > 0);
        const hasPortfolio = Boolean(github || linkedin || portfolioUrl || projectFiles.length > 0);

        if (!hasResume && !hasPortfolio) {
            return NextResponse.json({
                needsInput: true,
                feedback: "No resume or portfolio data was found in your account details. Add a GitHub, LinkedIn, portfolio URL, or project files to run profile analysis."
            }, { status: 400 });
        }

        const extractedFiles = await Promise.all(projectFiles.map(file => extractTextFromFile(file)));
        let projectText = extractedFiles.join("");

        if (portfolioUrl) {
            projectText += await fetchUrlText(portfolioUrl);
        }

        if (github) {
            projectText += await fetchGithubPublicRepos(github);
        }

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
        }

        const buildFallbackResponse = (reason: string) => {
            const hasSignal = Boolean(hasResume || github || linkedin || portfolioUrl);
            const rating = hasSignal ? 75 : 55;
            const feedback = hasResume
                ? `Profile analysis is temporarily limited because the AI quota was exhausted. Based on your resume, you have enough signal to start the interview flow now. ${reason}`
                : hasSignal
                    ? `Portfolio analysis is temporarily limited because the AI quota was exhausted. Based on your portfolio links, you have enough signal to start the interview flow now. ${reason}`
                    : `Analysis is temporarily limited because the AI quota was exhausted. Please upload a resume or portfolio link for a stronger automated evaluation. ${reason}`;

            return NextResponse.json({ rating, feedback, fallback: true });
        };

        const evaluationCriteria = isRealisticMode 
            ? `You must rigorously evaluate this candidate against the technical capability required for the roles: [${preferredRoles || "Software Engineer"}] AND strictly align your quality expectations with the hiring bar of these companies: [${targetCompanies || "Generic Tech Company"}].`
            : `You must strictly evaluate this candidate against the technical capabilities and requirements explicitly expected for these technical roles: [${preferredRoles || "Software Engineer"}].`;

        const systemPrompt = `You are a strict, highly deterministic technical Recruiter/interviewer evaluating a candidate's credentials.
You have been provided with the following candidate details:

${hasResume ? `[RESUME / CV CONTENT]\n${resumeText}\n---` : "[RESUME / CV CONTENT]\nNot provided\n---"}

[PORTFOLIO CHANNELS]
- GitHub URL: ${github || "Not provided"}
- LinkedIn URL: ${linkedin || "Not provided"}
- Portfolio Website URL: ${portfolioUrl || "Not provided"}

[EXTRACTED PROJECT FILES & WEBSITE CONTENT]
${projectText ? projectText.substring(0, 8000) : "No extra project files or web content fetched."}
---

Your task is to comprehensively analyze all available data sources above.
Specifically:
1. If only one source is provided (e.g., only resume, or only portfolio link, or only files), evaluate that source.
2. If multiple sources are provided (e.g., resume + GitHub profile repo details + portfolio text), evaluate and cross-reference all of them to get an overall picture of the candidate's skills, coding style, professional experience, and capabilities.
3. Compare the candidate's overall profile against:
   - Target Roles: [${preferredRoles || "Software Engineer"}]
   - Target Companies: [${targetCompanies || "Generic Tech Company"}]
4. Check if they are applying for senior/complex roles or top-tier companies in realistic mode, and adjust the scoring bar accordingly.

Strict Scoring Rubric:
- Base score starts at 50 if any valid professional source is provided.
- Increment points (up to 100) based on target company alignment, high-quality project architecture, CS theory depth, or solid engineering experience.
- Since you do not have live internet access to scan external websites dynamically, you MUST NOT penalize the candidate if their LinkedIn or Portfolio URL contents are not fully retrieved. The presence of the professional link itself is a positive signal.
- Only drop the score below 50 if the provided inputs are explicitly junk, blank, or highly unprofessional.

Return a JSON object with:
1. "rating": A numerical rating STRICTLY between 0 and 100.
2. "feedback": A brief Markdown-formatted feedback text summarizing:
   - Key Strengths: What makes the candidate strong.
   - Recommended Areas & Study Topics: Specific topics, patterns, system designs, or resources they should study to meet the hiring bar at [${targetCompanies || "their target company"}].
   Use standard markdown headers (e.g., ### Key Strengths, ### Study Recommendations). Limit the response to 150 words.

Respond ONLY with a valid JSON block containing the fields "rating" and "feedback". Do not write any markdown code blocks or explanatory text outside of the JSON.`;

        let ratingText = "";
        try {
            ratingText = (await generateWithFallback(systemPrompt, {
                generationConfig: { temperature: 0.0 },
                timeout: 35000,
            })).trim();
        } catch (genErr: any) {
            console.warn("generateWithFallback portfolio analysis error:", genErr?.message || genErr);
            return buildFallbackResponse("Please retry later once the quota resets.");
        }

        if (!ratingText) {
            return buildFallbackResponse("Please retry later once the quota resets.");
        }

        let rating = 0;
        let feedback = "No detailed feedback generated.";
        try {
            const cleanJson = ratingText.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleanJson);
            rating = typeof parsed.rating === "number" ? parsed.rating : parseInt(parsed.rating || "0", 10);
            feedback = parsed.feedback || feedback;
        } catch (e) {
            const matchRating = ratingText.match(/"rating"\s*:\s*(\d+)/);
            if (matchRating) {
                rating = parseInt(matchRating[1], 10);
            } else {
                const simpleMatch = ratingText.match(/-?\d+/);
                rating = parseInt(simpleMatch?.[0] || "0", 10);
            }
        }

        rating = Math.max(0, Math.min(100, isNaN(rating) ? 50 : rating));
        return NextResponse.json({ rating, feedback });
    } catch (error: any) {
        console.error("Portfolio Evaluation Error:", error);
        if (error?.status === 429 || String(error?.message || "").includes("quota")) {
            return NextResponse.json({
                rating: 55,
                feedback: "Portfolio analysis is temporarily unavailable because the Gemini quota is exhausted. The interview can continue without this step.",
                fallback: true,
            });
        }
        return NextResponse.json({ error: error.message || "Failed to evaluate portfolio" }, { status: 500 });
    }
}
