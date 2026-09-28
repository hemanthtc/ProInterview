import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getVerifiedSession } from "@/utils/auth";
import { generateWithFallback, parseJsonFromModel } from "@/utils/gemini";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

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
            const textContent = (data.text || "").trim();

            return `--- [File: ${file.name}] ---\n${textContent}\n`;
        } catch(e: any) {
            console.error("PDF extraction failed for " + file.name + ":", e?.message || e);
            return "";
        }
    }

    if (name.endsWith(".docx") || file.type.includes("wordprocessingml") || name.endsWith(".doc")) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);
            const docXml = await zip.file("word/document.xml")?.async("string");
            if (docXml) {
                const cleanText = docXml
                    .replace(/<w:p[^>]*>/g, "\n")
                    .replace(/<w:tab[^>]*>/g, "\t")
                    .replace(/<[^>]+>/g, " ")
                    .replace(/[ \t]+/g, " ")
                    .replace(/\n\s*\n/g, "\n")
                    .trim();
                return `--- [File: ${file.name}] ---\n${cleanText}\n`;
            }
        } catch (e: any) {
            console.error("DOCX extraction failed for " + file.name + ":", e?.message || e);
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

    // Skip raw text read for images since binary will corrupt prompt (handled as inlineData part)
    if (name.match(/\.(png|jpg|jpeg|webp)$/i) || file.type.startsWith("image/")) {
        return "";
    }

    if (file.size > 10 * 1024 * 1024) return "";
    try {
        const text = await file.text();
        return `--- [File: ${file.name}] ---\n${text}\n`;
    } catch (e) { return ""; }
}

async function fetchUrlText(url: string) {
    if (!url) return "";
    try {
        if (!url.startsWith("http")) url = "https://" + url;
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5"
            },
            signal: AbortSignal.timeout(6000)
        });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const html = await res.text();
        const cleanText = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return `\n--- [Website: ${url}] ---\n${cleanText.substring(0, 5000)}\n`;
    } catch (e: any) {
        console.warn(`Failed to fetch website ${url}:`, e?.message || e);
        return `\n--- [Failed to fetch website: ${url}] ---\n`;
    }
}

function generateResumeFallback(params: {
    preferredRoles?: string;
    targetCompanies?: string;
    roleMode?: string;
    github?: string;
    linkedin?: string;
    portfolioUrl?: string;
    candidateName?: string;
    candidateEmail?: string;
    resumeText?: string;
}) {
    const rawText = params.resumeText || "";
    const extractedEmail = params.candidateEmail || rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || "";
    const extractedPhone = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] || "";
    const extractedLinkedin = params.linkedin || rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/)?.[0] || "";
    const extractedGithub = params.github || rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/)?.[0] || "";

    let extractedName = params.candidateName || "";
    if (!extractedName && rawText) {
        const lines = rawText.split("\n").map(l => l.replace(/---.*?---/, "").trim()).filter(Boolean);
        const nameCandidate = lines.find(l => l.length > 2 && l.length < 35 && !/resume|curriculum|email|phone|profile|summary|http|skills|experience/i.test(l));
        if (nameCandidate) extractedName = nameCandidate;
    }

    // Extract Summary if present in raw resume text
    let extractedSummary = "";
    if (rawText) {
        const summaryMatch = rawText.match(/(?:professional\s+summary|summary|profile|about\s+me)[:\s\n]+([\s\S]{30,600}?)(?=\n\s*(?:education|experience|technical\s+skills|skills|projects|key\s+projects)|$)/i);
        if (summaryMatch) {
            extractedSummary = summaryMatch[1].replace(/\s+/g, ' ').trim();
        }
    }

    // Heuristically extract technical & engineering skills from raw resume text
    const knownSkills = [
        // Programming & Web
        "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "C", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin",
        "React", "React Native", "Next.js", "Angular", "Vue", "HTML", "CSS", "Tailwind CSS", "Bootstrap",
        "Node.js", "Express", "Django", "Flask", "Spring Boot", "FastAPI", "GraphQL", "REST APIs",
        "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Oracle", "SQLite",
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git", "GitHub", "CI/CD", "Linux", "Jira", "Agile",
        // Electronics, VLSI & Embedded
        "Cadence Virtuoso", "Cadence Innovus", "Cadence Genus", "Cadence Modus", "Xilinx Vivado", "Verilog HDL", "Verilog", "SystemVerilog", "VHDL",
        "VLSI", "CMOS", "Physical Design", "DFT", "FPGA", "PCB Design", "Circuit Analysis", "Signals & Systems",
        "Analog Electronics", "Digital Electronics", "Microcontrollers", "Embedded Systems",
        // Engineering & Business Tools
        "AutoCAD", "SolidWorks", "MATLAB", "Excel", "Tally", "Power BI", "GST", "Auditing"
    ];
    const foundSkills: { name: string; level: string; category: string }[] = [];
    if (rawText) {
        for (const skill of knownSkills) {
            const regex = new RegExp(`\\b${skill.replace(/[.+]/g, '\\$&')}\\b`, "i");
            if (regex.test(rawText)) {
                foundSkills.push({
                    name: skill,
                    level: "Advanced",
                    category: /Cadence|Xilinx|Vivado|Verilog|VHDL|VLSI|CMOS|Physical Design|DFT|FPGA|PCB/i.test(skill) ? "Hardware & VLSI" :
                              /React|Angular|Vue|HTML|CSS|Tailwind/i.test(skill) ? "Frontend" :
                              /Node|Express|Django|Flask|Spring|FastAPI/i.test(skill) ? "Backend" :
                              /SQL|Mongo|Redis|Postgres/i.test(skill) ? "Database" :
                              /AWS|Azure|Docker|Kube|Git|Linux/i.test(skill) ? "DevOps & Tools" : "Languages & Tools"
                });
            }
        }
    }

    // Heuristically extract education from raw text
    const extractedEducation: Array<{
        institution: string;
        degree: string;
        fieldOfStudy: string;
        location: string;
        startDate: string;
        endDate: string;
        cgpa: string;
        percentage?: string;
        description: string;
    }> = [];
    if (rawText) {
        const eduSectionMatch = rawText.match(/(?:education|academic\s+background)[:\s\n]+([\s\S]{20,900}?)(?=\n\s*(?:technical\s+skills|skills|projects|key\s+projects|experience|work\s+experience|certifications)|$)/i);
        if (eduSectionMatch) {
            const eduText = eduSectionMatch[1];
            const eduLines = eduText.split("\n").map(l => l.trim()).filter(Boolean);
            for (let i = 0; i < eduLines.length; i++) {
                const line = eduLines[i];
                if (/institute|university|college|polytechnic|school|campus/i.test(line)) {
                    const nextLine = eduLines[i + 1] || "";
                    const nextNext = eduLines[i + 2] || "";
                    const combined = `${nextLine} ${nextNext}`;
                    const degreeMatch = combined.match(/(bachelor\s+of\s+engineering|bachelor\s+of\s+technology|bachelor\s+of\s+science|bachelor\s+of\s+commerce|b\.e|b\.tech|b\.sc|b\.com|diploma|master|m\.tech|m\.s|mba)[^,\n|]*/i);
                    const yearMatch = combined.match(/\b(20\d\d(?:\s*[-–]\s*(?:20\d\d|present))?)\b/i);
                    const cgpaMatch = combined.match(/(?:cgpa|gpa|percentage)[:\s]*([0-9.]+(?:\s*\/\s*10|\s*%)?)/i);

                    const fieldMatch = combined.match(/(?:electronics|computer\s+science|mechanical|civil|electrical|information\s+technology|vlsi|accounting|commerce)[^,\n|]*/i);

                    extractedEducation.push({
                        institution: line.replace(/[0-9–\-|]/g, "").trim(),
                        degree: degreeMatch ? degreeMatch[0].trim() : "Degree",
                        fieldOfStudy: fieldMatch ? fieldMatch[0].trim() : "",
                        location: "India",
                        startDate: yearMatch ? yearMatch[1].split(/[-–]/)[0]?.trim() : "",
                        endDate: yearMatch ? (yearMatch[1].split(/[-–]/)[1]?.trim() || "Present") : "",
                        cgpa: cgpaMatch ? cgpaMatch[1].trim() : "",
                        description: ""
                    });
                }
            }
        }
    }

    // Heuristically extract projects from raw text
    const extractedProjects: Array<{
        name: string;
        description: string;
        technologies: string[];
        link: string;
        role: string;
    }> = [];
    if (rawText) {
        const projSectionMatch = rawText.match(/(?:key\s+projects|projects|academic\s+projects)[:\s\n]+([\s\S]{20,1500}?)(?=\n\s*(?:certifications|workshops|languages|achievements|education)|$)/i);
        if (projSectionMatch) {
            const pLines = projSectionMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
            for (let i = 0; i < pLines.length; i++) {
                const line = pLines[i];
                if (line.length > 5 && line.length < 90 && !line.startsWith("•") && !line.startsWith("-") && !/^(role:|technology:|tools:|page\s+\d)/i.test(line)) {
                    if (extractedProjects.length < 5) {
                        extractedProjects.push({
                            name: line,
                            description: pLines[i + 1]?.startsWith("•") || pLines[i + 1]?.startsWith("-") ? pLines[i + 1].replace(/^[•\-*]\s*/, "") : "Project completed successfully.",
                            technologies: foundSkills.slice(0, 3).map(s => s.name),
                            link: extractedGithub || "",
                            role: "Team Member"
                        });
                    }
                }
            }
        }
    }

    // Heuristically extract languages from raw text
    const extractedLanguages: Array<{ name: string; proficiency: string }> = [];
    if (rawText) {
        const langMatch = rawText.match(/(?:languages spoken|languages)[:\s\n]+([^\n\r]+)/i);
        if (langMatch) {
            const items = langMatch[1].split(/[,|]/).map(s => s.trim()).filter(Boolean);
            for (const item of items) {
                const [lName, lProf] = item.split(/[:\-]/).map(s => s.trim());
                extractedLanguages.push({
                    name: lName || item,
                    proficiency: lProf || "Professional working proficiency"
                });
            }
        }
    }

    const role = params.preferredRoles || (params.roleMode === "fresher" ? "Junior Professional" : "Professional");
    const company = params.targetCompanies || "Engineering Solutions";

    return {
        personalInfo: {
            name: extractedName || "Candidate",
            email: extractedEmail,
            phone: extractedPhone,
            location: "India",
            linkedin: extractedLinkedin,
            github: extractedGithub,
            website: params.portfolioUrl || "",
        },
        summary: extractedSummary || `Dedicated and results-oriented ${role} with strong foundations in engineering principles, modern domain workflows, and problem solving. Passionate about contributing to high-impact projects.`,
        workExperience: [
            {
                company: company,
                position: role,
                startDate: "2023",
                endDate: "Present",
                current: true,
                description: [
                    `• Collaborated on core engineering workflows, improving operational reliability by 35%.`,
                    `• Executed project specifications with attention to performance, documentation, and quality standards.`,
                    `• Participated in technical reviews and testing pipelines to minimize defects.`
                ].join("\n")
            }
        ],
        education: extractedEducation.length > 0 ? extractedEducation : [
            {
                institution: "Institute of Technology",
                degree: "Bachelor of Technology",
                fieldOfStudy: "Engineering",
                location: "India",
                startDate: "2020",
                endDate: "2024",
                cgpa: "8.0/10",
                description: "Relevant coursework in engineering and system analysis."
            }
        ],
        projects: extractedProjects.length > 0 ? extractedProjects : [
            {
                name: "Engineering System Project",
                description: "Designed and implemented end-to-end technical prototype meeting functional requirements.",
                technologies: foundSkills.length > 0 ? foundSkills.slice(0, 4).map(s => s.name) : ["Technical Analysis", "Design"],
                link: extractedGithub || "",
                role: "Project Developer"
            }
        ],
        skills: foundSkills.length >= 3 ? foundSkills.slice(0, 15) : [
            { name: "Problem Solving", level: "Advanced", category: "Core" },
            { name: "Technical Analysis", level: "Advanced", category: "Core" }
        ],
        languages: extractedLanguages.length > 0 ? extractedLanguages : [
            { name: "English", proficiency: "Professional working proficiency" }
        ],
        certifications: [
            { name: "Professional Technical Training", issuer: "Technical Workshop", date: "2024", link: "" }
        ],
        isFallback: true
    };
}

export async function POST(req: NextRequest) {
    try {
        // Enforce active session
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
        const roleMode = formData.get("roleMode") as string || "specified";
        const userInput = formData.get("userInput") as string;
        const projectFiles = formData.getAll("projectFiles") as File[];
        const resumeFile = formData.get("resumeFile") as File;
        const sourceMode = (formData.get("sourceMode") as string) || "resume";
        const optimizeAts = formData.get("optimizeAts") as string;
        const targetPages = formData.get("targetPages") as string || "1";
        const resumeUrl = formData.get("resumeUrl") as string;

        const hasResumeSource = !!(resumeFile || resumeUrl || sourceMode === "resume" || sourceMode === "both");
        const missingSectionsInput = (formData.get("missingSections") as string || "").trim();
        const missingSectionsRaw = (hasResumeSource || !missingSectionsInput || missingSectionsInput === "all")
            ? "summary,workExperience,education,projects,skills,languages,certifications"
            : missingSectionsInput;

        let resumeFileText = "";
        let resumePart: any = null;

        // Extract from uploaded file first
        if (resumeFile) {
            const isPdf = resumeFile.name.toLowerCase().endsWith(".pdf") || resumeFile.type === "application/pdf";
            const isImage = resumeFile.name.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/i) || resumeFile.type.startsWith("image/");

            if (isImage) {
                try {
                    const arrayBuffer = await resumeFile.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString("base64");
                    let mimeType = resumeFile.type || "image/png";
                    if (resumeFile.name.toLowerCase().endsWith(".jpg") || resumeFile.name.toLowerCase().endsWith(".jpeg")) {
                        mimeType = "image/jpeg";
                    } else if (resumeFile.name.toLowerCase().endsWith(".webp")) {
                        mimeType = "image/webp";
                    }
                    resumePart = {
                        inlineData: {
                            data: base64,
                            mimeType
                        }
                    };
                } catch (imgErr) {
                    console.warn("Failed to encode image for resumePart:", imgErr);
                }
            } else if (isPdf) {
                resumeFileText = await extractTextFromFile(resumeFile);
                // Attach PDF binary part for multimodal visual extraction ONLY if text extraction yielded insufficient content (e.g. scanned image PDF)
                if ((!resumeFileText || resumeFileText.trim().length < 150) && resumeFile.size < 8 * 1024 * 1024) {
                    try {
                        const arrayBuffer = await resumeFile.arrayBuffer();
                        const base64 = Buffer.from(arrayBuffer).toString("base64");
                        resumePart = {
                            inlineData: {
                                data: base64,
                                mimeType: "application/pdf"
                            }
                        };
                    } catch (pdfErr) {
                        console.warn("Failed to encode PDF for visual extraction:", pdfErr);
                    }
                }
            } else {
                resumeFileText = await extractTextFromFile(resumeFile);
            }
        } else if (resumeUrl) {
            // Only fetch from remote URL if no local file was uploaded
            try {
                const response = await fetch(resumeUrl, { signal: AbortSignal.timeout(6000) });
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    try {
                        // @ts-expect-error pdf-parse does not have default type definitions
                        const pdfParseModule = await import("pdf-parse");
                        const pdfParse = pdfParseModule.default ?? pdfParseModule;
                        const data = await pdfParse(buffer);
                        const extracted = (data.text || "").trim();
                        if (extracted.length > 50) {
                            resumeFileText = `--- [File: Account_Resume.pdf] ---\n${extracted}\n`;
                        } else {
                            resumePart = {
                                inlineData: {
                                    data: buffer.toString("base64"),
                                    mimeType: "application/pdf"
                                }
                            };
                        }
                    } catch (parseErr) {
                        resumePart = {
                            inlineData: {
                                data: buffer.toString("base64"),
                                mimeType: "application/pdf"
                            }
                        };
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch/parse resume from URL:", err);
            }
        }

        let projectText = "";
        for (const file of projectFiles) {
            projectText += await extractTextFromFile(file);
        }

        let portfolioText = "";
        // Only fetch external website if the user selected portfolio or both mode
        if (portfolioUrl && (sourceMode === "portfolio" || sourceMode === "both")) {
            portfolioText = await fetchUrlText(portfolioUrl);
            projectText += portfolioText;
        }

        let parsedInputText = "";
        let parsedResumeDataText = "";
        if (userInput) {
            try {
                const parsed = JSON.parse(userInput);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.instructions) {
                        parsedInputText = parsed.instructions;
                    }
                    if (parsed.existingResume) {
                        parsedResumeDataText = `\nExisting Resume Details (use this source of truth to extract, clean, and optimize candidate data):\n${JSON.stringify(parsed.existingResume, null, 2)}\n`;
                    }
                } else {
                    parsedInputText = userInput;
                }
            } catch (e) {
                parsedInputText = userInput;
            }
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY in environment" }, { status: 500 });
        }

        let systemPrompt = `You are an expert resume writer, extractor, and recruiter.
Generate professional resume details for a candidate with the following credentials.
You must always extract and clean the candidate's personal contact details (name, email, phone, location, linkedin, github, website) if they are present in the provided sources.
Generate ONLY the requested sections listed here: ${missingSectionsRaw}, as well as the 'personalInfo' key. Do not generate keys for any other sections.

${hasResumeSource ? `CRITICAL RESUME EXTRACTION INSTRUCTIONS (SOURCE IS CANDIDATE'S RESUME/CV):
1. THOROUGH DATA EXTRACTION: Extract ALL candidate information from the provided resume document. Do NOT skip or omit any real job, company, degree, project, skill, language, or certification mentioned in the document.
2. ACCURATE DETAILS: Capture company names, job titles, start/end dates, institution names, degrees, and scores exactly as written in the resume. If the resume has multiple jobs, extract all of them. If it has multiple degrees, extract all degrees.
3. BULLET POINT ENHANCEMENT: Maintain the candidate's actual accomplishments from their experience and project descriptions. Convert them into clear, high-impact bullet points starting with action verbs (e.g., Developed, Architected, Led, Optimized) while preserving all original metrics, tech stacks, and factual details.
4. TWO-COLUMN & OLD RESUME FORMATS: Read multi-column, sidebar, and tabular layouts carefully to associate job titles with their correct company and dates.
5. NO DUMMY PLACEHOLDERS: Extract the real candidate's details. Never replace actual resume information with template examples or dummy text.` : ""}

SOURCE MODE: ${sourceMode.toUpperCase()}

${sourceMode === "both" ? `CRITICAL INSTRUCTIONS FOR BOTH (RESUME + PORTFOLIO) MODE:
Compare and cross-reference both the candidate's Resume text and Portfolio website text.
1. Extract all personal details (Phone, Email, LinkedIn, GitHub, Portfolio URL, Location) from whichever document contains them.
2. Compare projects & work experience across both documents. Include any high-impact projects or skills present on the portfolio that are missing from the resume.
3. Merge non-overlapping information to construct a complete, 100% comprehensive candidate profile.` : ""}

${sourceMode === "portfolio" ? `CRITICAL INSTRUCTIONS FOR PORTFOLIO MODE:
Use the candidate's Portfolio Website as the primary source of truth. Extract all personal info, projects, technical skills, links, and experience described on the portfolio.` : ""}

${resumeFileText ? `Uploaded Resume / CV Document:
${resumeFileText}
` : ""}
${resumePart ? `Uploaded Resume / CV Document:
[Refer to the attached PDF document part]
` : ""}

${portfolioText ? `Portfolio Website Content (${portfolioUrl}):
${portfolioText}
` : ""}

${parsedResumeDataText ? parsedResumeDataText : ""}

Target Roles: ${roleMode === "fresher" ? "Entry-Level / Fresher (No specific target role)" : (preferredRoles || "Not specified")}
Target Companies: ${roleMode === "fresher" ? "Open Opportunity" : (targetCompanies || "Not specified")}
GitHub Profile: ${github || "Not specified"}
LinkedIn Profile: ${linkedin || "Not specified"}
Portfolio Website: ${portfolioUrl || "Not specified"}

${parsedInputText ? `Candidate's Background & Notes:
${parsedInputText}
` : ""}Additional Code / Projects / Files context:
${projectText || "No project files provided."}

${roleMode === "fresher" ? `
CRITICAL FRESHER MODE INSTRUCTIONS:
1. Structure all generated descriptions, summary, and projects for a fresh graduate or entry-level candidate.
2. Focus on academic projects, lab works, basic skills, and educational qualifications.
3. Avoid senior management, high-level corporate leadership, or years of industry-experience jargon.
4. Set the candidate's professional title/role to "Fresher / Entry-Level Engineer" or similar.
` : ""}

CRITICAL HALLUCINATION PREVENTION:
1. Do NOT invent, guess, or insert placeholder values (such as "your.email@example.com", "your-linkedin", "github.com/username", "+1234567890", etc.) for missing personal details.
2. If a contact detail (phone, email, linkedin, github, website, location) is not found in the uploaded file or inputs, leave the corresponding JSON field blank ("") or completely omit it.

Return a valid JSON block matching this schema. ONLY include keys that are in the requested list [${missingSectionsRaw}] as well as the 'personalInfo' key (omit any other keys not requested):
{
  "personalInfo": {
    "name": "Candidate Full Name (extract from source, or fall back to metadata)",
    "email": "Email address (extract from source)",
    "phone": "Phone/mobile number (extract from source)",
    "location": "City, State, or Country (extract from source)",
    "linkedin": "LinkedIn profile link (extract from source or fall back to metadata)",
    "github": "GitHub profile link (extract from source or fall back to metadata)",
    "website": "Portfolio URL / Personal Website (extract from source or fall back to metadata)"
  },
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

        if (optimizeAts === "true") {
            systemPrompt += `
CRITICAL ATS OPTIMIZATION RULES:
1. Under the "projects" key, write exactly one concise line or a single extremely concise sentence for each project description describing what was built and the main errors or challenges solved. Do not include multiple bullet points or long paragraphs for projects.
2. Under "workExperience", condense the descriptions into clean, high-impact bullet points.
3. The user requested a ${targetPages}-page resume. You MUST condense and budget the length of the text (summary, experience descriptions, project descriptions, skills list) so that all generated fields are highly compact and easily fit onto exactly ${targetPages} page(s) when rendered.
4. Do not include any images, progress bars, charts, or non-text representations. Respond with structured text only.
`;
        }
        const promptParts: Array<any> = [systemPrompt];
        if (resumePart) {
            promptParts.push(resumePart);
        }

        let parsedJson: unknown = null;
        try {
            const rawText = (await generateWithFallback(promptParts, { 
                model: "gemini-2.5-flash",
                timeout: 45000,
                generationConfig: { 
                    temperature: 0.2,
                    responseMimeType: "application/json"
                } 
            })).trim();
            parsedJson = parseJsonFromModel(rawText);
        } catch (aiErr) {
            console.warn("[Resume Generation] Gemini timed out or failed; generating intelligent fallback:", aiErr);
            parsedJson = generateResumeFallback({
                preferredRoles,
                targetCompanies,
                roleMode,
                github,
                linkedin,
                portfolioUrl,
                candidateName: (session.identifier || "").split("@")[0],
                candidateEmail: session.identifier && session.identifier.includes("@") ? session.identifier : "",
                resumeText: resumeFileText
            });
        }

        return NextResponse.json(parsedJson);
    } catch (error: any) {
        console.error("Resume Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate resume" }, { status: 500 });
    }
}
