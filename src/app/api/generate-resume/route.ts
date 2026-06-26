import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
const pdfParse = require("pdf-parse").PDFParse ?? require("pdf-parse");
import JSZip from "jszip";

async function extractTextFromFile(file: File): Promise<string> {
    const name = file.name.toLowerCase();

    if (name.endsWith(".pdf") || file.type === "application/pdf") {
        try {
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

    if (file.size > 2000000) return "";
    try {
        const text = await file.text();
        return `--- [File: ${file.name}] ---\n${text.substring(0, 3000)}\n`;
    } catch (e) { return ""; }
}

async function fetchUrlText(url: string) {
    if (!url) return "";
    try {
        if (!url.startsWith("http")) url = "https://" + url;
        const res = await fetch(url);
        const html = await res.text();
        const cleanText = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return `\n--- [Website: ${url}] ---\n${cleanText.substring(0, 5000)}\n`;
    } catch (e) {
        return `\n--- [Failed to fetch website: ${url}] ---\n`;
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const github = formData.get("github") as string;
        const linkedin = formData.get("linkedin") as string;
        const portfolioUrl = formData.get("portfolioUrl") as string;
        const targetCompanies = formData.get("targetCompanies") as string;
        const preferredRoles = formData.get("preferredRoles") as string;
        const projectFiles = formData.getAll("projectFiles") as File[];

        let projectText = "";
        for (const file of projectFiles) {
            projectText += await extractTextFromFile(file);
        }
        if (portfolioUrl) {
            projectText += await fetchUrlText(portfolioUrl);
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY in environment" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite", generationConfig: { temperature: 0.7 } });

        const systemPrompt = `You are an expert resume writer.
Generate a professional resume summary and structured work experience for a candidate with the following credentials:

Target Roles: ${preferredRoles || "Software Engineer"}
Target Companies: ${targetCompanies || "Top Tech Companies"}
GitHub Profile: ${github || "Not specified"}
LinkedIn Profile: ${linkedin || "Not specified"}
Portfolio Website: ${portfolioUrl || "Not specified"}

Additional Code / Projects / Files context:
${projectText || "No project files provided."}

Return a valid JSON block containing exactly:
{
  "summary": "...",
  "experience": "..."
}

Ensure the "summary" is a single highly professional paragraph (about 3-4 sentences).
Ensure the "experience" value is a single string formatted with newlines, listing 2 distinct, highly relevant job positions with dates, company names, and bullet points. Use strong action verbs and metrics. Example:
Lead Software Engineer at TechCorp (2022 - Present)
- Led frontend design of Next.js web application, resulting in a 40% speed boost
- Configured robust CI/CD deployment pipelines on AWS

Software Engineer at DevLabs (2020 - 2022)
- Built interactive and responsive features using React
- Collaborated in an agile team to design REST API endpoints

Respond ONLY with a valid JSON block. Do not write any markdown code blocks or explanatory text outside of the JSON.`;

        let result;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                result = await model.generateContent(systemPrompt);
                break;
            } catch (retryErr: any) {
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
            return NextResponse.json({ error: "AI rate-limited after retries." }, { status: 429 });
        }

        const rawText = result.response.text().trim();
        let summary = "";
        let experience = "";

        try {
            const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleanJson);
            summary = parsed.summary || "";
            experience = parsed.experience || "";
        } catch (e) {
            // fallback parsing in case JSON parsing failed
            const summaryMatch = rawText.match(/"summary"\s*:\s*"([\s\S]*?)"/);
            const expMatch = rawText.match(/"experience"\s*:\s*"([\s\S]*?)"/);
            summary = summaryMatch ? summaryMatch[1].replace(/\\n/g, "\n") : "";
            experience = expMatch ? expMatch[1].replace(/\\n/g, "\n") : rawText;
        }

        return NextResponse.json({ summary, experience });
    } catch (error: any) {
        console.error("Resume Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate resume" }, { status: 500 });
    }
}
