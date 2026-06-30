import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import JSZip from "jszip";

async function extractTextFromFile(file: File): Promise<string> {
    const name = file.name.toLowerCase();

    if (name.endsWith(".pdf") || file.type === "application/pdf") {
        try {
            const pdfParse = require("pdf-parse").PDFParse ?? require("pdf-parse");
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
        const formData = await req.formData();
        const github = formData.get("github") as string;
        const linkedin = formData.get("linkedin") as string;
        const portfolioUrl = formData.get("portfolioUrl") as string;
        const targetCompanies = formData.get("targetCompanies") as string;
        const preferredRoles = formData.get("preferredRoles") as string;
        const isRealisticMode = formData.get("isRealisticMode") === "true";
        const projectFiles = formData.getAll("projectFiles") as File[];

        const hasPortfolioSource = Boolean(github || linkedin || portfolioUrl || projectFiles.length > 0);
        if (!hasPortfolioSource) {
            return NextResponse.json({
                needsInput: true,
                feedback: "No portfolio data was found in your account details. Add a GitHub, LinkedIn, portfolio URL, or project files to run portfolio analysis."
            }, { status: 400 });
        }

        const extractedFiles = await Promise.all(projectFiles.map(file => extractTextFromFile(file)));
        let projectText = extractedFiles.join("");

        if (portfolioUrl) {
            projectText += await fetchUrlText(portfolioUrl);
        }

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
        }
        const genAI = new GoogleGenerativeAI(API_KEY);

        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite", generationConfig: { temperature: 0.0 } });

        const buildFallbackResponse = (reason: string) => {
            const hasProfessionalLinks = Boolean(github || linkedin || portfolioUrl);
            const rating = hasProfessionalLinks ? 70 : 55;
            const feedback = hasProfessionalLinks
                ? `Portfolio analysis is temporarily limited because the AI quota was exhausted. Based on the provided links and materials, you have enough signal to start the interview flow now. ${reason}`
                : `Portfolio analysis is temporarily limited because the AI quota was exhausted. Add a GitHub, LinkedIn, or portfolio link for a stronger automated evaluation. ${reason}`;

            return NextResponse.json({ rating, feedback, fallback: true });
        };

        const evaluationCriteria = isRealisticMode 
            ? `You must rigorously evaluate this portfolio against the technical capability required for the roles: [${preferredRoles || "Software Engineer"}] AND strictly align your quality expectations with the hiring bar of these companies: [${targetCompanies || "Generic Tech Company"}].`
            : `You must strictly evaluate this portfolio against the technical capabilities and requirements explicitly expected for these technical roles: [${preferredRoles || "Software Engineer"}].`;

        const systemPrompt = `You are a strict, highly deterministic technical recruiter evaluating a candidate's portfolio.
You have been provided with:
GitHub URL: ${github || "Not provided"}
LinkedIn URL: ${linkedin || "Not provided"}
Portfolio Website URL: ${portfolioUrl || "Not provided"}

            Project Documentation / Source Code / Contents: 
            ${projectText ? projectText.substring(0, 5000) : "Not provided"}

Your task is to analyze these materials and return a JSON object with:
1. "rating": A numerical rating STRICTLY between 0 and 100.
2. "feedback": A brief Markdown-formatted feedback text summarizing key strengths, key improvement areas, and recommended study topics/skills to improve. Use standard markdown headers. Limit the response to 150 words.

${evaluationCriteria}

Strict Rubric:
- Base score starts at 50 if they provided at least one valid professional link (GitHub, LinkedIn, or Portfolio).
- Analyze their uploaded code or provided links to determine if they meet the specific difficulty/quality constraints of their target roles/companies. Add points for aligned, high-quality architectures, system design, or clear docs (up to 100).
- Heavily penalize or score lowly if the submitted code is trivial and they are applying for senior/complex roles or top-tier companies in realistic mode.
- Since you do not have live internet access, you MUST NOT heavily penalize the candidate if their GitHub or LinkedIn URL contents are not explicitly printed below. The mere presence of professional links should guarantee a baseline score of at least 65.
- Only drop the score below 50 if the provided materials or files are explicitly junk, irrelevant, or highly unprofessional.

Formatting Instructions for the "feedback" field:
Make sure to include these sections:
### Key Strengths
- [Brief strength points]

### Skills to Improve & Study Recommendations
- [Mention specific study resources, technical topics, or system architecture concepts the candidate should read/study to meet the bar for the target role/company]

Respond ONLY with a valid JSON block containing the fields "rating" and "feedback". Do not write any markdown code blocks or explanatory text outside of the JSON.`;

        let result;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                result = await model.generateContent(systemPrompt);
                break;
            } catch (retryErr: any) {
                if (retryErr?.status === 429) {
                    console.warn("Gemini quota exhausted for portfolio analysis; returning fallback evaluation.");
                    return buildFallbackResponse("Please retry later once the quota resets.");
                }

                const isTransient = retryErr?.status === 429 || retryErr?.status === 503 || 
                                    (retryErr?.message && (retryErr.message.includes("429") || retryErr.message.includes("503") || retryErr.message.includes("demand")));
                if (isTransient && attempt < 2) {
                    const delay = (attempt + 1) * 3000;
                    console.warn(`Gemini transient error (${retryErr?.status || '503'}), retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    throw retryErr;
                }
            }
        }
        if (!result) {
            return buildFallbackResponse("Please retry later once the quota resets.");
        }
        const ratingText = result.response.text().trim();
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
