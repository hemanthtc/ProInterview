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

    let extractedTitle = params.preferredRoles || "";
    if (!extractedTitle && rawText) {
        const lines = rawText.split("\n").map(l => l.replace(/---.*?---/, "").trim()).filter(Boolean);
        const nameIdx = lines.findIndex(l => l === extractedName);
        if (nameIdx !== -1 && lines[nameIdx + 1] && !lines[nameIdx + 1].includes("@") && !lines[nameIdx + 1].includes("http") && lines[nameIdx + 1].length < 70) {
            extractedTitle = lines[nameIdx + 1];
        }
    }

    let extractedLocation = "";
    if (rawText) {
        const locMatch = rawText.match(/\b([A-Z][a-zA-Z\s]+,\s*(?:Karnataka|Maharashtra|Delhi|Tamil\s+Nadu|Telangana|Uttar\s+Pradesh|Kerala|Gujarat|India|USA|UK|California|Texas|New\s+York))\b/i);
        if (locMatch) {
            extractedLocation = locMatch[1].trim();
        }
    }

    // Extract Summary if present in raw resume text - NO hallucinated default
    let extractedSummary = "";
    if (rawText) {
        const summaryMatch = rawText.match(/(?:professional\s+summary|summary|profile|about\s+me|career\s+objective)[:\s\n]+([\s\S]{30,800}?)(?=\n\s*(?:education|experience|technical\s+skills|skills|projects|key\s+projects|certifications|languages|awards)|$)/i);
        if (summaryMatch) {
            extractedSummary = summaryMatch[1].replace(/\s+/g, ' ').trim();
        }
    }

    // Heuristically extract real work experience if present in raw text - ZERO fake companies
    const extractedWorkExperience: Array<{
        company: string;
        position: string;
        location: string;
        startDate: string;
        endDate: string;
        current: boolean;
        description: string;
    }> = [];

    if (rawText) {
        const expSectionMatch = rawText.match(/(?:work\s+experience|professional\s+experience|employment\s+history|experience)[:\s\n]+([\s\S]{20,2500}?)(?=\n\s*(?:education|academic\s+background|technical\s+skills|skills|projects|key\s+projects|certifications|languages|awards|publications)|$)/i);
        if (expSectionMatch) {
            const expLines = expSectionMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
            let currentExp: any = null;
            for (let i = 0; i < expLines.length; i++) {
                const line = expLines[i];
                const dateMatch = line.match(/\b(20\d\d|19\d\d)\s*[-–to\s]+\s*(20\d\d|present|current)\b/i);
                const isHeaderLine = dateMatch || line.match(/\b(engineer|developer|intern|analyst|manager|lead|architect|consultant|specialist|designer|associate)\b/i);
                
                if (isHeaderLine && line.length < 90 && !line.startsWith("•") && !line.startsWith("-")) {
                    if (currentExp && (currentExp.company || currentExp.position)) {
                        extractedWorkExperience.push(currentExp);
                    }
                    const nextLine = expLines[i + 1] || "";
                    currentExp = {
                        company: line.includes("|") ? line.split("|")[0].trim() : line,
                        position: line.includes("|") ? line.split("|")[1].trim() : (nextLine.length < 50 && !nextLine.startsWith("•") && !nextLine.startsWith("-") ? nextLine : "Role"),
                        location: "",
                        startDate: dateMatch ? dateMatch[1] : "",
                        endDate: dateMatch ? dateMatch[2] : "Present",
                        current: /present|current/i.test(dateMatch ? dateMatch[2] : ""),
                        description: ""
                    };
                } else if (currentExp && (line.startsWith("•") || line.startsWith("-") || line.startsWith("*"))) {
                    currentExp.description += (currentExp.description ? "\n" : "") + line;
                }
            }
            if (currentExp && (currentExp.company || currentExp.position)) {
                extractedWorkExperience.push(currentExp);
            }
        }
    }

    // Heuristically extract real technical skills from raw resume text
    const knownSkills = [
        "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "C", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin",
        "React", "React Native", "Next.js", "Angular", "Vue", "HTML", "CSS", "Tailwind CSS", "Bootstrap",
        "Node.js", "Express", "Django", "Flask", "Spring Boot", "FastAPI", "GraphQL", "REST APIs",
        "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Oracle", "SQLite",
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git", "GitHub", "CI/CD", "Linux", "Jira", "Agile",
        "Cadence Virtuoso", "Cadence Innovus", "Cadence Genus", "Cadence Modus", "Xilinx Vivado", "Verilog HDL", "Verilog", "SystemVerilog", "VHDL",
        "VLSI", "CMOS", "Physical Design", "DFT", "FPGA", "PCB Design", "Circuit Analysis", "Signals & Systems",
        "Analog Electronics", "Digital Electronics", "Microcontrollers", "Embedded Systems",
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

    // Heuristically extract real education from raw text - ZERO fake colleges
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
        const eduSectionMatch = rawText.match(/(?:education|academic\s+background)[:\s\n]+([\s\S]{20,900}?)(?=\n\s*(?:technical\s+skills|skills|projects|key\s+projects|experience|work\s+experience|certifications|awards)|$)/i);
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
                        location: extractedLocation || "India",
                        startDate: yearMatch ? yearMatch[1].split(/[-–]/)[0]?.trim() : "",
                        endDate: yearMatch ? (yearMatch[1].split(/[-–]/)[1]?.trim() || "Present") : "",
                        cgpa: cgpaMatch ? cgpaMatch[1].trim() : "",
                        description: ""
                    });
                }
            }
        }
    }

    // Heuristically extract real projects from raw text - ZERO fake projects
    const extractedProjects: Array<{
        name: string;
        description: string;
        technologies: string[];
        link: string;
        role: string;
    }> = [];
    if (rawText) {
        const projSectionMatch = rawText.match(/(?:key\s+projects|projects|academic\s+projects)[:\s\n]+([\s\S]{20,1500}?)(?=\n\s*(?:certifications|workshops|languages|achievements|education|awards)|$)/i);
        if (projSectionMatch) {
            const pLines = projSectionMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
            for (let i = 0; i < pLines.length; i++) {
                const line = pLines[i];
                if (line.length > 5 && line.length < 90 && !line.startsWith("•") && !line.startsWith("-") && !/^(role:|technology:|tools:|page\s+\d)/i.test(line)) {
                    if (extractedProjects.length < 6) {
                        extractedProjects.push({
                            name: line,
                            description: pLines[i + 1]?.startsWith("•") || pLines[i + 1]?.startsWith("-") ? pLines[i + 1].replace(/^[•\-*]\s*/, "") : "",
                            technologies: foundSkills.slice(0, 3).map(s => s.name),
                            link: extractedGithub || "",
                            role: "Team Member"
                        });
                    }
                }
            }
        }
    }

    // Heuristically extract real languages from raw text
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

    // Heuristically extract real certifications from raw text - ZERO fake certifications
    const extractedCertifications: Array<{
        name: string;
        issuer: string;
        date: string;
        link: string;
    }> = [];
    if (rawText) {
        const certSectionMatch = rawText.match(/(?:certifications|certificates|licenses|courses\s*&\s*certifications)[:\s\n]+([\s\S]{10,1200}?)(?=\n\s*(?:education|experience|technical\s+skills|skills|projects|languages|awards|publications)|$)/i);
        if (certSectionMatch) {
            const cLines = certSectionMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
            for (const line of cLines) {
                if (line.length > 3 && line.length < 120 && !/^(certifications|page\s+\d)/i.test(line)) {
                    const yearMatch = line.match(/\b(20\d\d|19\d\d)\b/);
                    const cleanName = line.replace(/^[•\-*]\s*/, '').replace(/\b(20\d\d|19\d\d)\b/, '').trim();
                    if (cleanName.length > 3) {
                        extractedCertifications.push({
                            name: cleanName,
                            issuer: "",
                            date: yearMatch ? yearMatch[0] : "",
                            link: ""
                        });
                    }
                }
            }
        }
    }

    // Heuristically extract custom sections (Awards, Publications, Volunteer, Research, Patents, Coursework)
    const extractedCustomSections: Array<{
        title: string;
        items: Array<{
            title: string;
            subtitle: string;
            date: string;
            description: string;
        }>;
    }> = [];

    if (rawText) {
        const customKeywords = [
            { title: "Awards & Honors", pattern: /(?:awards|honors|achievements|academic\s+achievements)[:\s\n]+([\s\S]{15,1200}?)(?=\n\s*(?:education|experience|technical\s+skills|skills|projects|certifications|languages|publications|volunteer)|$)/i },
            { title: "Publications & Research", pattern: /(?:publications|research|papers|patents)[:\s\n]+([\s\S]{15,1200}?)(?=\n\s*(?:education|experience|technical\s+skills|skills|projects|certifications|languages|awards)|$)/i },
            { title: "Volunteer & Leadership", pattern: /(?:volunteer\s+experience|volunteer|leadership|extracurricular\s+activities|activities)[:\s\n]+([\s\S]{15,1200}?)(?=\n\s*(?:education|experience|technical\s+skills|skills|projects|certifications|languages)|$)/i },
            { title: "Relevant Coursework", pattern: /(?:relevant\s+coursework|coursework)[:\s\n]+([\s\S]{15,800}?)(?=\n\s*(?:education|experience|technical\s+skills|skills|projects|certifications|languages)|$)/i }
        ];

        for (const ck of customKeywords) {
            const match = rawText.match(ck.pattern);
            if (match) {
                const lines = match[1].split("\n").map(l => l.trim()).filter(Boolean);
                const items: Array<{ title: string; subtitle: string; date: string; description: string }> = [];
                for (const l of lines) {
                    if (l.length > 4 && !/^(page\s+\d)/i.test(l)) {
                        const cleanLine = l.replace(/^[•\-*]\s*/, "").trim();
                        const dateMatch = cleanLine.match(/\b(20\d\d|19\d\d)\b/);
                        items.push({
                            title: cleanLine.split(/[:\-–]/)[0].trim(),
                            subtitle: "",
                            date: dateMatch ? dateMatch[0] : "",
                            description: cleanLine
                        });
                    }
                }
                if (items.length > 0) {
                    extractedCustomSections.push({
                        title: ck.title,
                        items: items.slice(0, 6)
                    });
                }
            }
        }
    }

    return {
        personalInfo: {
            name: extractedName,
            title: extractedTitle,
            email: extractedEmail,
            phone: extractedPhone,
            location: extractedLocation,
            linkedin: extractedLinkedin,
            github: extractedGithub,
            website: params.portfolioUrl || "",
        },
        summary: extractedSummary,
        workExperience: extractedWorkExperience,
        education: extractedEducation,
        projects: extractedProjects,
        skills: foundSkills,
        languages: extractedLanguages,
        certifications: extractedCertifications,
        customSections: extractedCustomSections,
        isFallback: true
    };
}

// Server-Side Data Integrity & Fact Verification Layer
function verifyAndRepairResumeData(parsed: any, rawText: string) {
    if (!parsed || typeof parsed !== 'object') {
        parsed = {};
    }

    // Scrub any banned placeholder phrases
    const bannedPlaceholders = [
        "Engineering Solutions",
        "Institute of Technology",
        "Engineering System Project",
        "Professional Technical Training"
    ];

    const cleanField = (val: any) => {
        if (typeof val !== 'string') return val;
        for (const banned of bannedPlaceholders) {
            if (val.includes(banned) && !rawText.includes(banned)) {
                return "";
            }
        }
        return val;
    };

    if (!parsed.personalInfo || typeof parsed.personalInfo !== 'object') {
        parsed.personalInfo = {};
    }
    for (const key of ['name', 'title', 'email', 'phone', 'location', 'linkedin', 'github', 'website']) {
        parsed.personalInfo[key] = cleanField(parsed.personalInfo[key] || "");
    }
    parsed.summary = cleanField(parsed.summary || "");

    parsed.workExperience = Array.isArray(parsed.workExperience) ? parsed.workExperience : [];
    parsed.education = Array.isArray(parsed.education) ? parsed.education : [];
    parsed.projects = Array.isArray(parsed.projects) ? parsed.projects : [];
    parsed.skills = Array.isArray(parsed.skills) ? parsed.skills : [];
    parsed.languages = Array.isArray(parsed.languages) ? parsed.languages : [];
    parsed.certifications = Array.isArray(parsed.certifications) ? parsed.certifications : [];
    parsed.customSections = Array.isArray(parsed.customSections) ? parsed.customSections : [];

    parsed.workExperience = parsed.workExperience.filter((item: any) => {
        item.company = cleanField(item.company || "");
        item.position = cleanField(item.position || "");
        return item.company || item.position;
    });

    parsed.education = parsed.education.filter((item: any) => {
        item.institution = cleanField(item.institution || "");
        item.degree = cleanField(item.degree || "");
        return item.institution || item.degree;
    });

    parsed.projects = parsed.projects.filter((item: any) => {
        item.name = cleanField(item.name || "");
        return item.name;
    });

    parsed.certifications = parsed.certifications.filter((item: any) => {
        item.name = cleanField(item.name || "");
        return item.name;
    });

    // RECOVERY: If raw text has education but AI returned empty array, recover from source
    if (parsed.education.length === 0 && rawText) {
        const fallback = generateResumeFallback({ resumeText: rawText });
        if (fallback.education.length > 0) {
            parsed.education = fallback.education;
        }
    }

    // RECOVERY: If raw text has projects but AI returned empty array, recover from source
    if (parsed.projects.length === 0 && rawText) {
        const fallback = generateResumeFallback({ resumeText: rawText });
        if (fallback.projects.length > 0) {
            parsed.projects = fallback.projects;
        }
    }

    // RECOVERY: If raw text has skills but AI returned empty array, recover from source
    if (parsed.skills.length === 0 && rawText) {
        const fallback = generateResumeFallback({ resumeText: rawText });
        if (fallback.skills.length > 0) {
            parsed.skills = fallback.skills;
        }
    }

    // RECOVERY: If raw text has custom sections (awards, publications, volunteer, etc.) not captured, recover them
    if (rawText) {
        const fallback = generateResumeFallback({ resumeText: rawText });
        if (fallback.customSections && fallback.customSections.length > 0) {
            for (const fbSect of fallback.customSections) {
                const alreadyExists = parsed.customSections.some((s: any) => 
                    s.title?.toLowerCase().includes(fbSect.title.toLowerCase()) || 
                    fbSect.title.toLowerCase().includes(s.title?.toLowerCase())
                );
                if (!alreadyExists) {
                    parsed.customSections.push(fbSect);
                }
            }
        }
    }

    return parsed;
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
        const resumeText = (formData.get("resumeText") as string || "").trim();

        const hasResumeSource = !!(resumeFile || resumeUrl || resumeText || sourceMode === "resume" || sourceMode === "both");
        const missingSectionsInput = (formData.get("missingSections") as string || "").trim();
        const missingSectionsRaw = (hasResumeSource || !missingSectionsInput || missingSectionsInput === "all")
            ? "summary,workExperience,education,projects,skills,languages,certifications,customSections"
            : (missingSectionsInput.includes("customSections") ? missingSectionsInput : `${missingSectionsInput},customSections`);

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

        // Account resume text fallback when no file/URL is present
        if (!resumeFileText && resumeText) {
            resumeFileText = `--- [Source: Account Profile Resume Text] ---\n${resumeText}\n`;
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
        let sectionSpecificNotesText = "";

        if (userInput) {
            try {
                const parsed = JSON.parse(userInput);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.instructions) {
                        parsedInputText += `General Instructions: ${parsed.instructions}\n`;
                    }
                    if (parsed.existingResume) {
                        parsedResumeDataText = `\nExisting Resume Details (use this source of truth to extract, clean, and optimize candidate data):\n${JSON.stringify(parsed.existingResume, null, 2)}\n`;
                    }
                    const noteKeys = ['summary', 'workExperience', 'education', 'projects', 'skills', 'languages', 'certifications', 'customSections'];
                    for (const key of noteKeys) {
                        if (parsed[key] && typeof parsed[key] === 'string' && parsed[key].trim()) {
                            sectionSpecificNotesText += `- Section "${key}": "${parsed[key].trim()}"\n`;
                        }
                    }
                    for (const [k, v] of Object.entries(parsed)) {
                        if (!noteKeys.includes(k) && k !== 'instructions' && k !== 'existingResume' && typeof v === 'string' && v.trim()) {
                            sectionSpecificNotesText += `- User Note on "${k}": "${v.trim()}"\n`;
                        }
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

        let systemPrompt = `You are extracting and restructuring an existing resume. Your primary objective is factual preservation, not creative generation.
Extract and organize ALL candidate credentials from the provided sources into a structured JSON document.

CRITICAL FACTUAL PRESERVATION & ZERO-FABRICATION RULES:
1. PRESERVE EVERY FACTUAL DETAIL: Capture all degrees, institutions, GPA/scores, companies, job titles, start/end dates, accomplishments, metrics, percentages, tools, projects, skills, certifications, and languages.
2. ZERO FABRICATION / ZERO INVENTED DATA: NEVER invent or guess companies, job positions, colleges, degrees, CGPAs, dates, metrics, projects, or certifications. If information is not in the source, leave the string empty ("") or array empty ([]).
3. DO NOT LOSE SMALL INFORMATION: Preserve all metrics, exact numbers, percentages (e.g. 40%), tools, libraries, and context. Do NOT aggressively compress or summarize away technical facts.
4. TWO-COLUMN, SIDEBAR & TABLE EXTRACTION: Carefully read multi-column, sidebar, and tabular layouts to associate job titles with their correct company and dates.
5. FRESHER / CANDIDATE WITHOUT INDUSTRY WORK EXPERIENCE: If the candidate has no corporate employment or industry jobs listed in their resume (e.g. they only have academic projects or degrees), set "workExperience": []. Do not invent corporate jobs.
6. COMPREHENSIVE SKILLS & PROJECTS: Extract every project listed in the resume into the "projects" array. Extract ALL technical skills, tools, methodologies, and frameworks into the "skills" array.
7. PROFESSIONAL TITLE / DEGREE: Extract the candidate's degree specialization or professional title from the resume header (e.g. "Electronics Engineering – VLSI Design & Technology") into "personalInfo.title".
8. CUSTOM & ADDITIONAL SECTIONS: If the source resume contains sections such as Awards, Honors, Achievements, Publications, Research, Volunteer Work, Extracurricular Activities, Patents, Key Coursework, or any other meaningful section, extract them into the 'customSections' array so NO information is lost.

${sectionSpecificNotesText ? `
USER'S SECTION-SPECIFIC CUSTOM NOTES & EMPHASIS:
${sectionSpecificNotesText}
CRITICAL INSTRUCTION: Apply the user's focus, tone, or emphasis to the specified sections, but NEVER invent non-existent factual credentials or companies.
` : ""}

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

Return a valid JSON block matching this schema. ONLY include keys that are in the requested list [${missingSectionsRaw}] as well as the 'personalInfo' key (omit any other keys not requested):
{
  "personalInfo": {
    "name": "Candidate Full Name (extract from source, or fall back to metadata)",
    "title": "Candidate Professional Title / Degree / Field of study (e.g. Electronics Engineering - VLSI Design & Technology)",
    "email": "Email address (extract from source)",
    "phone": "Phone/mobile number (extract from source)",
    "location": "City, State, or Country (extract from source)",
    "linkedin": "LinkedIn profile link (extract from source or fall back to metadata)",
    "github": "GitHub profile link (extract from source or fall back to metadata)",
    "website": "Portfolio URL / Personal Website (extract from source or fall back to metadata)"
  },
  "summary": "A professional summary paragraph of 3-4 sentences extracted or tailored based on candidate background.",
  "workExperience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "location": "Job Location",
      "startDate": "Start Date (e.g. 2022)",
      "endDate": "End Date or 'Present'",
      "current": true or false,
      "description": "Bulleted list of achievements starting with - (separate bullet points with newlines, preserving all original metrics, tools, and results)"
    }
  ],
  "education": [
    {
      "institution": "University/School Name",
      "degree": "e.g. B.Tech / B.E. / Diploma / High School",
      "fieldOfStudy": "e.g. Electronics Engineering - VLSI",
      "location": "City, State or Country",
      "startDate": "Start Date",
      "endDate": "End Date",
      "cgpa": "Grade/CGPA (e.g. 9.2/10)",
      "percentage": "Percentage score (e.g. 88%)",
      "description": "Coursework, honors, or achievements"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Details about the project, metrics, and problems resolved...",
      "technologies": ["React", "TypeScript", "Node.js"],
      "link": "Project URL or GitHub repository",
      "role": "e.g. Frontend Developer / Lead"
    }
  ],
  "skills": [
    {
      "name": "Skill Name (e.g. Cadence Virtuoso, React.js)",
      "level": "Advanced or Intermediate or Expert",
      "category": "e.g. Hardware & VLSI, Frontend, Backend, Tools"
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
  ],
  "customSections": [
    {
      "title": "Section Title (e.g. Awards & Achievements, Publications, Volunteer Experience, Research, Patents, Relevant Coursework)",
      "items": [
        {
          "title": "Item Title / Honor / Paper Title / Role",
          "subtitle": "Organization / Issuer / Context",
          "date": "Date or Year",
          "description": "Details, descriptions, metrics, or bullet points"
        }
      ]
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

        // Apply Data Integrity Check & Fact Verification Layer
        const verifiedJson = verifyAndRepairResumeData(parsedJson, resumeFileText || projectText || portfolioText || "");

        return NextResponse.json(verifiedJson);
    } catch (error: any) {
        console.error("Resume Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate resume" }, { status: 500 });
    }
}
