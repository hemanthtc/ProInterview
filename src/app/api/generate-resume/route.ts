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
        const userInput = formData.get("userInput") as string;
        const missingSectionsRaw = formData.get("missingSections") as string || "summary,workExperience";
        const projectFiles = formData.getAll("projectFiles") as File[];
        const resumeFile = formData.get("resumeFile") as File;

        let resumeFileText = "";
        if (resumeFile) {
            resumeFileText = await extractTextFromFile(resumeFile);
        }

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
Generate professional resume details for a candidate with the following credentials.
Generate ONLY the requested sections listed here: ${missingSectionsRaw}. Do not generate keys for any other sections.

${resumeFileText ? `Existing Resume / CV Document (Use this text as the primary source of truth. Translate and clean it into the requested format):
${resumeFileText}
` : ""}

Target Roles: ${preferredRoles || "Software Engineer"}
Target Companies: ${targetCompanies || "Top Tech Companies"}
GitHub Profile: ${github || "Not specified"}
LinkedIn Profile: ${linkedin || "Not specified"}
Portfolio Website: ${portfolioUrl || "Not specified"}

${userInput ? `Candidate's Background & Notes (incorporate this to write accurate, highly-tailored resume details):
${userInput}
` : ""}Additional Code / Projects / Files context:
${projectText || "No project files provided."}

Return a valid JSON block matching this schema. ONLY include keys that are in the requested list [${missingSectionsRaw}] (omit any keys not requested):
{
  "summary": "A professional summary paragraph of 3-4 sentences.",
  "workExperience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "startDate": "Start Date (e.g. 2022)",
      "endDate": "End Date or 'Present'",
      "current": true or false,
      "description": "Bulleted list of achievements starting with - (separate bullet points with newlines)"
    }
  ],
  "education": [
    {
      "institution": "University/School Name",
      "degree": "e.g. B.Tech / High School",
      "fieldOfStudy": "e.g. Computer Science",
      "location": "City, State or Country",
      "startDate": "Start Date",
      "endDate": "End Date",
      "cgpa": "Grade/CGPA (e.g. 9.2/10)",
      "percentage": "Percentage score (e.g. 88%)",
      "description": "Coursework or honors"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Details about the project...",
      "technologies": ["React", "TypeScript", "Node.js"],
      "link": "Project URL or GitHub repository",
      "role": "e.g. Frontend Developer"
    }
  ],
  "skills": [
    {
      "name": "Skill Name (e.g. React.js)",
      "level": "Advanced or Intermediate or Expert",
      "category": "e.g. Frontend or Backend or Languages"
    }
  ],
  "languages": [
    {
      "name": "Language Name",
      "proficiency": "e.g. Native or Fluent or Conversational"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuer Name",
      "date": "Issue Date (e.g. 2023)",
      "link": "Credential URL"
    }
  ]
}

Respond ONLY with a valid JSON block. Do not write any markdown code blocks (e.g. \`\`\`json) or explanatory text outside of the JSON. Ensure it parses cleanly with JSON.parse.`;

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
        let parsedJson = {};
        try {
            const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
            parsedJson = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON parsing failed, returning raw text error:", rawText);
            return NextResponse.json({ error: "Failed to parse AI generated JSON response", rawText }, { status: 500 });
        }

        return NextResponse.json(parsedJson);
    } catch (error: any) {
        console.error("Resume Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate resume" }, { status: 500 });
    }
}
