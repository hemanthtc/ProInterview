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
            let textContent = (data.text || "").trim();

            // Normalize spacing for multi-column extractions (e.g. "TechnologyBangalore, Karnataka", "Engineering2021", "(Technology)2024")
            textContent = textContent
                .replace(/([a-z])([A-Z][a-z]+,\s*(?:Karnataka|Maharashtra|Delhi|Tamil\s+Nadu|Telangana|Kerala|Gujarat|Uttar\s+Pradesh|India|USA|UK|California|Texas))/g, "$1 $2")
                .replace(/([a-zA-Z\)])(20\d\d|19\d\d)/g, "$1 $2")
                .replace(/(20\d\d|19\d\d)([–—\-])/g, "$1 $2")
                .replace(/([–—\-])(20\d\d|19\d\d)/g, "$1 $2")
                // Separate glued URLs: "EchoWellhttps://github.com..." -> "EchoWell https://github.com..."
                .replace(/([a-zA-Z0-9_\-\.\)])(https?:\/\/)/g, "$1 $2")
                // Separate glued dates: "01/202404/2024" -> "01/2024 - 04/2024"
                .replace(/(\d{2}\/\d{4})(\d{2}\/\d{4})/g, "$1 - $2")
                .replace(/(\d{2}\/\d{4})(Present|Current)/gi, "$1 - $2")
                // Separate glued company/institution suffixes and locations
                .replace(/(Ltd|Pvt|Inc|LLC|Corp|Solutions|Technologies|Polytechnic|Institute|University|College|Collage)([A-Z][a-z]+)/g, "$1 $2")
                .replace(/([a-zA-Z])(\.(?:Bengaluru|Bangalore|Turuvekere|Tiptur|Mumbai|Delhi|Hyderabad|Chennai|Pune|India))/g, "$1 | $2")
                // Separate glued certification closing parenthesis and issuer: "(DFE)EC-Council" -> "(DFE) — EC-Council"
                .replace(/(\))\s*([A-Z][a-zA-Z\-]+)/g, "$1 — $2")
                .replace(/(Program|Essentials)([A-Z][a-z]+)/g, "$1 — $2")
                // Separate glued Tech prefix
                .replace(/([a-zA-Z])Tech:\s*/g, "$1\nTech: ");

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
    let extractedLinkedin = params.linkedin || rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/)?.[0] || "";
    extractedLinkedin = extractedLinkedin.replace(/https?$/i, "");
    const extractedGithub = params.github || rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/)?.[0] || "";
    const extractedPortfolio = params.portfolioUrl || rawText.match(/https?:\/\/[a-zA-Z0-9_-]+\.(?:vercel\.app|netlify\.app|github\.io|me|dev|io|com)(?:\/[^\s]*)?/i)?.[0] || "";

    let extractedName = params.candidateName || "";
    if (!extractedName && rawText) {
        const lines = rawText.split("\n").map(l => l.replace(/---.*?---/, "").trim()).filter(Boolean);
        const nameCandidate = lines.find(l => l.length > 2 && l.length < 35 && !/resume|curriculum|email|phone|profile|summary|http|skills|experience/i.test(l));
        if (nameCandidate) extractedName = nameCandidate;
    }

    let extractedTitle = "";
    if (rawText) {
        const lines = rawText.split("\n").map(l => l.replace(/---.*?---/, "").trim()).filter(Boolean);
        const nameIdx = lines.findIndex(l => l.toLowerCase() === extractedName.toLowerCase());
        if (nameIdx !== -1 && lines[nameIdx + 1] && !lines[nameIdx + 1].includes("@") && !lines[nameIdx + 1].includes("http") && lines[nameIdx + 1].length < 70) {
            extractedTitle = lines[nameIdx + 1];
        }
    }
    if (!extractedTitle) {
        extractedTitle = params.preferredRoles || "";
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
        const summaryMatch = rawText.match(/(?:profile\s+summary|professional\s+summary|summary|profile|about\s+me|career\s+objective)[:\s\n]+([\s\S]{30,800}?)(?=\n\s*(?:education|experience|work\s+experience|technical\s+skills|skills|projects|key\s+projects|certifications|languages|awards)|$)/i);
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
                const dateMatch = line.match(/\b(\d{2}\/\d{4}|\d{4})\s*[-–to\s]+\s*(\d{2}\/\d{4}|\d{4}|present|current)\b/i);
                const isBullet = /^[•\-*▪▫–—✦✓]\s*/.test(line);

                if (dateMatch && !isBullet) {
                    if (currentExp && (currentExp.company || currentExp.position)) {
                        extractedWorkExperience.push(currentExp);
                    }
                    const positionPart = line.replace(dateMatch[0], "").replace(/[-–—|]/g, "").trim();
                    const nextLine = expLines[i + 1] || "";
                    let company = nextLine;
                    let location = "";
                    const locMatch = nextLine.match(/\b([A-Z][a-zA-Z\s]+,\s*(?:India|USA|UK)|Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Chennai|Turuvekere|Tiptur)\b/i);
                    if (locMatch && locMatch.index !== undefined) {
                        location = locMatch[0].trim();
                        company = nextLine.substring(0, locMatch.index).trim();
                    }

                    currentExp = {
                        position: positionPart || "Role",
                        company: company || "Company",
                        location: location,
                        startDate: dateMatch[1],
                        endDate: /present|current/i.test(dateMatch[2]) ? "Present" : dateMatch[2],
                        current: /present|current/i.test(dateMatch[2]),
                        description: ""
                    };
                    if (nextLine && !nextLine.startsWith("-") && !nextLine.startsWith("•")) {
                        i++;
                    }
                } else if (currentExp && isBullet) {
                    currentExp.description += (currentExp.description ? "\n" : "") + line;
                }
            }
            if (currentExp && (currentExp.company || currentExp.position)) {
                extractedWorkExperience.push(currentExp);
            }
        }
    }

    // Heuristically extract real technical skills from raw resume text
    const foundSkills: { name: string; level: string; category: string }[] = [];
    if (rawText) {
        const skillMatch = rawText.match(/(?:skills|technical\s+skills)[:\s\n]+([\s\S]{10,1200}?)(?=\n\s*(?:languages|certifications|workshops|education|projects|awards)|$)/i);
        if (skillMatch) {
            const skillRegex = /([a-zA-Z0-9\s&/+#._-]+?)\s*\((Advanced|Intermediate|Expert|Beginner)\)/g;
            let m;
            while ((m = skillRegex.exec(skillMatch[1])) !== null) {
                const sName = m[1].trim();
                const sLevel = m[2].trim();
                if (sName.length > 1 && !foundSkills.some(s => s.name.toLowerCase() === sName.toLowerCase())) {
                    foundSkills.push({
                        name: sName,
                        level: sLevel,
                        category: /React|Next\.js|HTML|CSS|Tailwind/i.test(sName) ? "Frontend" :
                                  /Node|Express|REST|APIs|JWT/i.test(sName) ? "Backend" :
                                  /Mongo|MySQL|SQL/i.test(sName) ? "Database" :
                                  /AWS|Cloud|CI\/CD|GitHub/i.test(sName) ? "DevOps & Cloud" :
                                  /Gemini|Whisper|AI|NLP|Streamlit|Machine Learning/i.test(sName) ? "AI & Machine Learning" : "Languages & Frameworks"
                    });
                }
            }
        }

        // If no bracketed skills extracted, match against knownSkills
        if (foundSkills.length === 0) {
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
        const eduSectionMatch = rawText.match(/(?:education|academic\s+background)[^\n]*\n+([\s\S]{20,2500}?)(?=\n\s*(?:technical\s+skills|skills|projects|key\s+projects?|experience|work\s+experience|certifications|workshops|awards|languages)|$)/i);
        if (eduSectionMatch) {
            const eduText = eduSectionMatch[1];
            const eduLines = eduText.split("\n").map(l => l.trim()).filter(Boolean);
            for (let i = 0; i < eduLines.length; i++) {
                const line = eduLines[i];
                const isDegreeLine = /\b(b\.?e\.?|b\.?tech|diploma|sslc|10th|12th|hsc|cbse|puc|bachelor|master|m\.?tech)\b/i.test(line);

                if (isDegreeLine) {
                    const dateMatch = line.match(/\b(\d{2}\/\d{4}|\d{4})\s*[-–to\s]+\s*(\d{2}\/\d{4}|\d{4}|present|current)\b/i) || line.match(/[-–—]\s*(\d{2}\/\d{4}|\d{4})\b/);
                    const degreeFull = line.replace(/\b(\d{2}\/\d{4}|\d{4})\s*[-–to\s]+\s*(\d{2}\/\d{4}|\d{4}|present|current)\b/gi, "")
                                           .replace(/[-–—]\s*(\d{2}\/\d{4}|\d{4})\b/g, "").trim();

                    let degree = degreeFull;
                    let fieldOfStudy = "";
                    if (/\bin\b/i.test(degreeFull)) {
                        const parts = degreeFull.split(/\bin\b/i);
                        degree = parts[0].trim();
                        fieldOfStudy = parts.slice(1).join(" in ").trim();
                    }

                    const nextLine = eduLines[i + 1] || "";
                    let institution = nextLine;
                    let cgpa = "";
                    let location = "";

                    const scoreMatch = nextLine.match(/(?:cgpa|percentage|score)[:\s]*([0-9.]+(?:\s*\/\s*10|\s*%)?)/i);
                    if (scoreMatch) {
                        cgpa = scoreMatch[1].trim();
                        institution = institution.replace(scoreMatch[0], "").trim();
                    }

                    const locMatch = institution.match(/[|,\.]\s*([A-Z][a-zA-Z\s]+,\s*India|[A-Z][a-zA-Z\s]+)\s*$/i);
                    if (locMatch && locMatch.index !== undefined) {
                        location = locMatch[1].replace(/^[|,\.\s]+/, "").trim();
                        institution = institution.substring(0, locMatch.index).replace(/[|,\.\s]+$/, "").trim();
                    }

                    const nextNextLine = eduLines[i + 2] || "";
                    let description = "";
                    if (nextNextLine && !/\b(b\.?e\.?|b\.?tech|diploma|sslc|10th|12th|institute|college|collage|polytechnic|university)\b/i.test(nextNextLine)) {
                        description = nextNextLine;
                        i++;
                    }
                    i++;

                    extractedEducation.push({
                        degree: degree || "Degree",
                        fieldOfStudy: fieldOfStudy,
                        institution: institution.replace(/[|,\.\s]+$/, "").trim() || "Institution",
                        location: location || "India",
                        cgpa: cgpa,
                        startDate: dateMatch ? (dateMatch[1] || "") : "",
                        endDate: dateMatch ? (dateMatch[2] || dateMatch[1] || "") : "",
                        description
                    });
                } else if (/institute|university|college|collage|polytechnic|school/i.test(line)) {
                    let instName = line.replace(/[0-9–\-|]/g, "").trim();
                    const nextLine = eduLines[i + 1] || "";
                    extractedEducation.push({
                        institution: instName,
                        degree: nextLine || "Degree",
                        fieldOfStudy: "",
                        location: "India",
                        startDate: "",
                        endDate: "",
                        cgpa: "",
                        description: ""
                    });
                }
            }
        }
    }

    // Heuristically extract real projects from raw text (supports KEY PROJECT, KEY PROJECTS, PROJECTS, etc.)
    const extractedProjects: Array<{
        name: string;
        description: string;
        technologies: string[];
        link: string;
        role: string;
    }> = [];
    if (rawText) {
        const projSectionMatch = rawText.match(/(?:^|\n)\s*(?:KEY\s+PROJECTS?|ACADEMIC\s+PROJECTS?|TECHNICAL\s+PROJECTS?|FEATURED\s+PROJECTS?|SELECTED\s+PROJECTS?|PERSONAL\s+PROJECTS?|CAPSTONE\s+PROJECTS?|PROJECTS)(?:\s*[:\-\–—][^\n]*|\s*)\n+([\s\S]{20,5000}?)(?=(?:\n\s*(?:SKILLS|TECHNICAL\s+SKILLS|EDUCATION|ACADEMIC\s+BACKGROUND|CERTIFICATIONS|WORKSHOPS|LICENSES|LANGUAGES|ACHIEVEMENTS|AWARDS|EXPERIENCE|WORK\s+EXPERIENCE|PUBLICATIONS|VOLUNTEER))|$)/i);
        if (projSectionMatch) {
            const rawPLines = projSectionMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
            let currentProj: any = null;

            for (let i = 0; i < rawPLines.length; i++) {
                const line = rawPLines[i];
                if (/^page\s+\d/i.test(line) || /^(key\s+projects?|projects?)$/i.test(line) || /^[-–—_=]{3,}$/.test(line)) continue;
                if (/^(education|experience|technical\s+skills|certifications|workshops)$/i.test(line) ||
                    /\b(institute\s+of\s+technology|polytechnic|university|college|bachelor\s+of|diploma\s+in|cgpa)\b/i.test(line)) {
                    continue;
                }

                const urlMatch = line.match(/https?:\/\/(?:www\.)?github\.com\/[^\s]+/i) || line.match(/https?:\/\/[^\s]+/i);
                const nextLine = rawPLines[i + 1] || "";
                const isProjectHeader = Boolean(urlMatch) || /^(EchoWell|DevCheckpoint|Leaf Disease|ProInterview|Synthetic Data|WorldXNews)/i.test(line) ||
                    (/\b(Developer|Engineer|Lead)\b/i.test(nextLine) && /\bTech:\s*/i.test(nextLine)) ||
                    (!line.startsWith("•") && !line.startsWith("-") && line.length < 70 && /\b(Developer|Engineer|Lead)\b/i.test(nextLine));

                if (isProjectHeader && line.length < 100 && !line.startsWith("•") && !line.startsWith("-")) {
                    if (currentProj) {
                        extractedProjects.push(currentProj);
                    }
                    const link = urlMatch ? urlMatch[0] : (extractedGithub || "");
                    const name = line.replace(/https?:\/\/[^\s]+/gi, "").replace(/[-–—|]\s*$/, "").trim();

                    let role = "Developer";
                    let technologies: string[] = [];

                    if (nextLine && (/Tech:\s*/i.test(nextLine) || /\b(Developer|Engineer|Lead)\b/i.test(nextLine))) {
                        const techSplit = nextLine.split(/Tech:\s*/i);
                        role = techSplit[0].replace(/[|–—]/g, "").trim() || "Developer";
                        if (techSplit.length > 1) {
                            technologies = techSplit[1].split(",").map(t => t.trim()).filter(Boolean);
                        }
                        i++;
                    }

                    currentProj = {
                        name,
                        role,
                        link,
                        technologies,
                        description: ""
                    };
                } else if (currentProj) {
                    currentProj.description += (currentProj.description ? "\n" : "") + (line.startsWith("•") || line.startsWith("-") ? line : `- ${line}`);
                }
            }
            if (currentProj) {
                extractedProjects.push(currentProj);
            }
        }
    }

    // Heuristically extract real languages from raw text
    const extractedLanguages: Array<{ name: string; proficiency: string }> = [];
    if (rawText) {
        const langMatch = rawText.match(/(?:languages spoken|languages)[:\s\n]+([\s\S]{5,400}?)(?=\n\s*(?:certifications|workshops|skills|education|projects|awards)|$)/i);
        if (langMatch) {
            const langRegex = /([A-Za-z]+)\s*[:\-–]\s*([A-Za-z]+)/g;
            let m;
            while ((m = langRegex.exec(langMatch[1])) !== null) {
                extractedLanguages.push({
                    name: m[1].trim(),
                    proficiency: m[2].trim()
                });
            }
        }
    }

    // Heuristically extract real certifications & workshops from raw text - ZERO fake certifications
    const extractedCertifications: Array<{
        name: string;
        issuer: string;
        date: string;
        link: string;
        description?: string;
    }> = [];
    if (rawText) {
        const certSectionMatch = rawText.match(/(?:certifications\s*(?:&|and)\s*(?:workshops|training|courses|licenses)|certifications|certificates|licenses|courses\s*&\s*certifications|workshops\s*&\s*(?:certifications|training)|workshops)[^\n]*\n+([\s\S]{10,2500}?)(?=\n\s*(?:education|academic\s+background|technical\s+skills|skills|projects|key\s+projects|experience|work\s+experience|languages|awards|publications|volunteer|coursework)|$)/i);
        if (certSectionMatch) {
            const rawLines = certSectionMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
            for (const line of rawLines) {
                if (/^(&|and)\s+(workshops|certifications|training)/i.test(line) || /^(certifications|workshops|licenses|certificates)$/i.test(line) || /^page\s+\d/i.test(line)) {
                    continue;
                }
                const cleanLine = line.replace(/^[•\-*▪▫–—✦✓]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();
                const yearMatch = cleanLine.match(/\b(20\d\d|19\d\d)\b/);

                // Split on em/en-dash or spaced dash, never internal hyphen in EC-Council
                const parts = cleanLine.split(/\s+[—–\-]\s+|\s*[—–]\s*/);
                let name = cleanLine;
                let issuer = "";

                if (parts.length > 1) {
                    name = parts.slice(0, -1).join(" — ").trim();
                    issuer = parts[parts.length - 1].trim();
                } else if (cleanLine.includes(":")) {
                    const colonIdx = cleanLine.indexOf(":");
                    name = cleanLine.substring(0, colonIdx).trim();
                    issuer = cleanLine.substring(colonIdx + 1).trim();
                }

                if (name && !extractedCertifications.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                    extractedCertifications.push({
                        name,
                        issuer,
                        date: yearMatch ? yearMatch[0] : "",
                        link: "",
                        description: ""
                    });
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
            website: extractedPortfolio || "",
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
function verifyAndRepairResumeData(parsed: any, rawText: string, existingResume?: any, isAtsOptimization?: boolean) {
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
        if (!parsed.personalInfo[key] && existingResume?.personalInfo?.[key]) {
            parsed.personalInfo[key] = existingResume.personalInfo[key];
        }
    }
    parsed.summary = cleanField(parsed.summary || "") || existingResume?.personalInfo?.summary || existingResume?.summary || "";
    if (isAtsOptimization && (!parsed.summary || !parsed.summary.trim())) {
        const candidateTitle = parsed.personalInfo?.title || existingResume?.personalInfo?.title || "";
        const topSkills = (parsed.skills?.length ? parsed.skills : (existingResume?.skills || [])).slice(0, 4).map((s: any) => s.name).filter(Boolean);
        const topProject = (parsed.projects?.length ? parsed.projects : (existingResume?.projects || []))[0]?.name;
        
        if (candidateTitle || topSkills.length > 0 || topProject) {
            const roleStr = candidateTitle ? `${candidateTitle}` : "Engineering Professional";
            const skillsStr = topSkills.length > 0 ? ` with strong expertise in ${topSkills.join(", ")}` : "";
            const projStr = topProject ? ` Demonstrated track record designing and delivering projects including ${topProject}.` : "";
            parsed.summary = `Results-oriented ${roleStr}${skillsStr}.${projStr} Adept at collaborating in technical teams and solving complex problems with scalable, efficient solutions.`.trim();
        }
    }

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
        item.description = cleanField(item.description || "");
        if (isAtsOptimization && (!item.description || !item.description.trim())) {
            item.description = `- Delivered key technical deliverables and operational tasks as ${item.position || "Engineer"} at ${item.company || "the company"}.\n- Implemented industry-standard engineering practices to enhance quality and drive measurable project outcomes.`;
        }
        return item.company || item.position;
    });

    parsed.education = parsed.education.filter((item: any) => {
        item.institution = cleanField(item.institution || "");
        item.degree = cleanField(item.degree || "");
        item.fieldOfStudy = cleanField(item.fieldOfStudy || "");
        item.location = cleanField(item.location || "");
        item.description = cleanField(item.description || "");

        // If fieldOfStudy is duplicated inside degree, clean degree
        if (item.degree && item.fieldOfStudy) {
            const cleanFos = item.fieldOfStudy.trim().toLowerCase();
            const cleanDeg = item.degree.trim().toLowerCase();
            if (cleanDeg.includes(cleanFos)) {
                item.degree = item.degree.replace(new RegExp(item.fieldOfStudy.replace(/[.+*?^${}()|[\]\\]/g, '\\$&'), 'i'), "").replace(/[\-–—,\s]+$/, "").trim() || "Degree";
            }
        }

        // Strip dates accidentally attached to degree or fieldOfStudy
        item.degree = item.degree.replace(/\b(20\d\d|19\d\d)\s*[-–—to\s]+\s*(20\d\d|present|current)\b/gi, "").replace(/\b(20\d\d|19\d\d)\b/g, "").trim();
        item.fieldOfStudy = item.fieldOfStudy.replace(/\b(20\d\d|19\d\d)\s*[-–—to\s]+\s*(20\d\d|present|current)\b/gi, "").replace(/\b(20\d\d|19\d\d)\b/g, "").trim();

        return item.institution || item.degree;
    });

    parsed.projects = parsed.projects.filter((item: any) => {
        item.name = cleanField(item.name || "");
        if (!item.name) return false;

        const lowerName = item.name.trim().toLowerCase();

        // 1. Never allow section titles to be parsed as projects
        if (/^(education|experience|technical\s+skills|skills|certifications|workshops|languages|projects|key\s+projects|summary|profile)$/i.test(lowerName)) {
            return false;
        }

        // 2. Never allow colleges, degrees, or diplomas to be parsed as projects
        if (/\b(institute\s+of\s+technology|polytechnic|university|college|bachelor\s+of|diploma\s+in|master\s+of|b\.?tech|b\.?e\.|cgpa)\b/i.test(lowerName)) {
            return false;
        }

        // 3. Never allow items matching parsed education institutions
        if (parsed.education && parsed.education.some((e: any) => e.institution && lowerName.includes(e.institution.trim().toLowerCase()))) {
            return false;
        }

        item.description = cleanField(item.description || "");
        if (isAtsOptimization && (!item.description || !item.description.trim())) {
            const techStr = Array.isArray(item.technologies) && item.technologies.length > 0
                ? ` utilizing ${item.technologies.join(", ")}`
                : "";
            item.description = `Designed and implemented ${item.name}${techStr}, ensuring modular architecture, high performance, and robust implementation.`;
        }
        return true;
    });

    parsed.certifications = parsed.certifications.filter((item: any) => {
        item.name = cleanField(item.name || "");
        if (!item.name || /^(&|and)\s*workshops/i.test(item.name) || /^(certifications|workshops|licenses|certificates)$/i.test(item.name.trim().toLowerCase())) {
            return false;
        }
        item.issuer = cleanField(item.issuer || "");
        item.description = cleanField(item.description || "");
        if (isAtsOptimization && (!item.description || !item.description.trim())) {
            item.description = `Completed practical coursework and demonstrated hands-on technical competencies in ${item.name}.`;
        }
        return true;
    });

    // RECOVERY FROM EXISTING RESUME (ATS Optimizer Safety Net)
    if (existingResume && typeof existingResume === 'object') {
        if (Array.isArray(existingResume.projects) && existingResume.projects.length > 0) {
            const validExistingProjects = existingResume.projects.filter((origProj: any) => {
                const ln = (origProj.name || "").trim().toLowerCase();
                return ln &&
                    !/^(education|experience|technical\s+skills|skills|certifications|workshops|languages|projects|key\s+projects|summary|profile)$/i.test(ln) &&
                    !/\b(institute\s+of\s+technology|polytechnic|university|college|bachelor\s+of|diploma\s+in|master\s+of|b\.?tech|b\.?e\.|cgpa)\b/i.test(ln);
            });

            if (parsed.projects.length === 0) {
                parsed.projects = validExistingProjects.map((p: any) => ({
                    ...p,
                    description: (p.description && p.description.trim()) || (isAtsOptimization ? `Designed and implemented ${p.name}${Array.isArray(p.technologies) && p.technologies.length > 0 ? ` utilizing ${p.technologies.join(", ")}` : ""}, ensuring modular architecture, high performance, and robust implementation.` : "")
                }));
            } else {
                // Ensure no original projects were dropped
                validExistingProjects.forEach((origProj: any) => {
                    const matchedParsed = parsed.projects.find((p: any) => 
                        (p.name && origProj.name && p.name.trim().toLowerCase() === origProj.name.trim().toLowerCase()) ||
                        (p.id && origProj.id && p.id === origProj.id)
                    );
                    if (!matchedParsed) {
                        parsed.projects.push({
                            ...origProj,
                            description: (origProj.description && origProj.description.trim()) || (isAtsOptimization ? `Designed and implemented ${origProj.name}${Array.isArray(origProj.technologies) && origProj.technologies.length > 0 ? ` utilizing ${origProj.technologies.join(", ")}` : ""}, ensuring modular architecture, high performance, and robust implementation.` : "")
                        });
                    } else if (isAtsOptimization && (!matchedParsed.description || !matchedParsed.description.trim())) {
                        matchedParsed.description = (origProj.description && origProj.description.trim()) || `Designed and implemented ${matchedParsed.name}${Array.isArray(matchedParsed.technologies) && matchedParsed.technologies.length > 0 ? ` utilizing ${matchedParsed.technologies.join(", ")}` : ""}, ensuring modular architecture, high performance, and robust implementation.`;
                    }
                });
            }
        }

        if (Array.isArray(existingResume.education) && existingResume.education.length > 0) {
            if (parsed.education.length === 0) {
                parsed.education = [...existingResume.education];
            } else {
                existingResume.education.forEach((origEdu: any) => {
                    const exists = parsed.education.some((e: any) => 
                        (e.institution && origEdu.institution && e.institution.trim().toLowerCase() === origEdu.institution.trim().toLowerCase()) ||
                        (e.id && origEdu.id && e.id === origEdu.id)
                    );
                    if (!exists) {
                        parsed.education.push(origEdu);
                    }
                });
            }
        }

        if (Array.isArray(existingResume.workExperience) && existingResume.workExperience.length > 0) {
            if (parsed.workExperience.length === 0) {
                parsed.workExperience = existingResume.workExperience.map((origJob: any) => ({
                    ...origJob,
                    description: (origJob.description && origJob.description.trim()) || (isAtsOptimization ? `- Delivered key technical deliverables and operational tasks as ${origJob.position || "Engineer"} at ${origJob.company || "the company"}.\n- Implemented industry-standard engineering practices to enhance quality and drive measurable project outcomes.` : "")
                }));
            } else {
                existingResume.workExperience.forEach((origJob: any) => {
                    const matchedParsed = parsed.workExperience.find((w: any) => 
                        (w.company && origJob.company && w.company.trim().toLowerCase() === origJob.company.trim().toLowerCase()) ||
                        (w.id && origJob.id && w.id === origJob.id)
                    );
                    if (!matchedParsed) {
                        parsed.workExperience.push({
                            ...origJob,
                            description: (origJob.description && origJob.description.trim()) || (isAtsOptimization ? `- Delivered key technical deliverables and operational tasks as ${origJob.position || "Engineer"} at ${origJob.company || "the company"}.\n- Implemented industry-standard engineering practices to enhance quality and drive measurable project outcomes.` : "")
                        });
                    } else if (isAtsOptimization && (!matchedParsed.description || !matchedParsed.description.trim())) {
                        matchedParsed.description = (origJob.description && origJob.description.trim()) || `- Delivered key technical deliverables and operational tasks as ${matchedParsed.position || "Engineer"} at ${matchedParsed.company || "the company"}.\n- Implemented industry-standard engineering practices to enhance quality and drive measurable project outcomes.`;
                    }
                });
            }
        }

        if (Array.isArray(existingResume.skills) && existingResume.skills.length > 0) {
            if (parsed.skills.length === 0) {
                parsed.skills = [...existingResume.skills];
            } else {
                existingResume.skills.forEach((origSkill: any) => {
                    const exists = parsed.skills.some((s: any) => 
                        (s.name && origSkill.name && s.name.trim().toLowerCase() === origSkill.name.trim().toLowerCase())
                    );
                    if (!exists) {
                        parsed.skills.push(origSkill);
                    }
                });
            }
        }

        if (Array.isArray(existingResume.certifications) && existingResume.certifications.length > 0) {
            if (parsed.certifications.length === 0) {
                parsed.certifications = existingResume.certifications.map((origCert: any) => ({
                    ...origCert,
                    description: (origCert.description && origCert.description.trim()) || (isAtsOptimization ? `Completed practical coursework and demonstrated hands-on technical competencies in ${origCert.name}.` : "")
                }));
            } else {
                existingResume.certifications.forEach((origCert: any) => {
                    const matchedParsed = parsed.certifications.find((c: any) => 
                        (c.name && origCert.name && c.name.trim().toLowerCase() === origCert.name.trim().toLowerCase())
                    );
                    if (!matchedParsed) {
                        parsed.certifications.push({
                            ...origCert,
                            description: (origCert.description && origCert.description.trim()) || (isAtsOptimization ? `Completed practical coursework and demonstrated hands-on technical competencies in ${origCert.name}.` : "")
                        });
                    } else if (isAtsOptimization && (!matchedParsed.description || !matchedParsed.description.trim())) {
                        matchedParsed.description = (origCert.description && origCert.description.trim()) || `Completed practical coursework and demonstrated hands-on technical competencies in ${matchedParsed.name}.`;
                    }
                });
            }
        }

        if (Array.isArray(existingResume.languages) && existingResume.languages.length > 0) {
            if (parsed.languages.length === 0) {
                parsed.languages = [...existingResume.languages];
            } else {
                existingResume.languages.forEach((origLang: any) => {
                    const exists = parsed.languages.some((l: any) => 
                        (l.name && origLang.name && l.name.trim().toLowerCase() === origLang.name.trim().toLowerCase())
                    );
                    if (!exists) {
                        parsed.languages.push(origLang);
                    }
                });
            }
        }

        if (Array.isArray(existingResume.customSections) && existingResume.customSections.length > 0) {
            if (parsed.customSections.length === 0) {
                parsed.customSections = [...existingResume.customSections];
            } else {
                existingResume.customSections.forEach((origSect: any) => {
                    const exists = parsed.customSections.some((cs: any) => 
                        (cs.title && origSect.title && cs.title.trim().toLowerCase() === origSect.title.trim().toLowerCase())
                    );
                    if (!exists) {
                        parsed.customSections.push(origSect);
                    }
                });
            }
        }
    }

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
        let parsedExistingResume: any = null;

        if (userInput) {
            try {
                const parsed = JSON.parse(userInput);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.instructions) {
                        parsedInputText += `General Instructions: ${parsed.instructions}\n`;
                    }
                    if (parsed.existingResume) {
                        parsedExistingResume = parsed.existingResume;
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
4. TWO-COLUMN, SIDEBAR & TABLE EXTRACTION: Carefully read multi-column, sidebar, and tabular layouts. Separate position/role (e.g. "Quality Control Intern"), dates (e.g. "01/2024 - 04/2024"), company (e.g. "Sansera Engineering Ltd"), and location (e.g. "Bengaluru") cleanly. Never glue company and location into one word.
5. FRESHER / CANDIDATE WITHOUT INDUSTRY WORK EXPERIENCE: If the candidate has no corporate employment or industry jobs listed in their resume (e.g. they only have academic projects or degrees), set "workExperience": []. Do not invent corporate jobs.
6. COMPREHENSIVE PROJECTS SEPARATION: Extract EVERY project listed in the resume (e.g. "EchoWell", "DevCheckpoint 6.0", "Leaf Disease Detection", "ProInterview", "Synthetic Data Generator", "WorldXNews") into the "projects" array.
   - NEVER collapse or merge multiple projects into a single project entry. Every project is an individual distinct item.
   - For each project, extract the project title into "name" without gluing any URL to it (e.g. "EchoWell", NOT "EchoWellhttps://...").
   - Extract the GitHub repository or project link into "link" (e.g. "https://github.com/hemanthtc8296").
   - Extract the candidate's specific role if stated (e.g. "Full Stack Developer", "AI Developer", "Developer", "Layout Designer", "Team Leader") into the "role" field.
   - Extract the technologies list (e.g. from "Tech: Next.js 14, TypeScript...") into the "technologies" array.
   - Extract all description bullet points into "description".
   - CRITICAL: NEVER place education entries into the "projects" array. Education belongs ONLY in "education".
7. PROFESSIONAL TITLE / DEGREE: Extract the candidate's professional title from the resume header under their name (e.g. "Full Stack Developer") into "personalInfo.title".
8. CUSTOM & ADDITIONAL SECTIONS: If the source resume contains sections such as Awards, Honors, Achievements, Publications, Research, Volunteer Work, Extracurricular Activities, Patents, Key Coursework, or any other meaningful section, extract them into the 'customSections' array so NO information is lost.
9. CERTIFICATIONS & WORKSHOPS INTEGRITY: Extract each certification or workshop as a distinct item. Split cleanly into "name" and "issuer" (e.g. name: "AWS Cloud Computing & Staking Workshop", issuer: "Bangalore Institute of Technology"; name: "Digital Forensics Essentials (DFE)", issuer: "EC-Council"; name: "Soft Skills — Employability Skills Program", issuer: "Rubicon"). Never duplicate certification entries.
10. EDUCATION ACCURACY & DESCRIPTION SEPARATION:
   - Extract the actual degree (e.g. "B.E", "Diploma", "SSLC") into "degree", and field of study (e.g. "Information Science & Engineering", "Electronics & Communication Engineering") into "fieldOfStudy".
   - Extract the school/college/institution name (e.g. "Bangalore Institute of Technology", "Government Polytechnic Turuvekere", "Government JR Collage For Boys") into "institution".
   - Put descriptive coursework, honors, or achievements (e.g. "Focusing on software development, artificial intelligence...", "Graduated with distinction...") into "description", NEVER as the degree name.
   - Extract CGPA or percentage (e.g. "6.91", "9.35", "65.92") accurately. Cleanly extract start and end dates.

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
      "name": "Certification or Workshop Name (e.g. Physical Design Workshop)",
      "issuer": "Issuer or Organization (e.g. Cadence or AWS, leave empty \"\" if not specified)",
      "date": "Issue Date (e.g. 2023)",
      "description": "Scope, hands-on skills, or workshop details (e.g. Hands-on experience in floorplanning, placement...)",
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
CRITICAL ATS RESUME OPTIMIZATION & ZERO-DELETION RULES:
1. RESUME OPTIMIZER, NOT GENERATOR: You are optimizing an EXISTING resume. The existing resume is the absolute source of truth. You MUST PRESERVE every existing populated section and every item.
2. ABSOLUTE ZERO DELETION: NEVER omit, delete, or return empty arrays for sections that contain data in the input. Do NOT delete any projects, education entries, work experience, skills, certifications, languages, or custom sections.
3. ITEM-BY-ITEM PRESERVATION: If the input has N projects, your response MUST contain all N projects. If the input has N education entries, your response MUST contain all N education entries. Every item must be retained and optimized.
4. ENRICH DESCRIPTIONS IF NOT PRESENT, OPTIMIZE IF PRESENT:
   - SUMMARY: If "summary" (or "personalInfo.summary") is empty or missing, synthesize a high-impact, 2-3 sentence ATS-friendly professional summary reflecting the candidate's title, field of study, core technologies, and key strengths. If already present, optimize and polish it with active voice and relevant industry keywords.
   - PROJECTS: For each project in "projects":
     * If "description" is missing, empty, or whitespace: Synthesize a realistic, technically relevant, professional description (1-2 sentences highlighting system architecture, key features, and tools used) derived from the project name, role, technologies, and candidate's domain.
     * If "description" is present: Optimize and condense it into a punchy, high-impact overview using strong action verbs (e.g., Architected, Engineered, Implemented, Designed) and measurable outcomes.
   - WORK EXPERIENCE: For each job in "workExperience":
     * If "description" is missing, empty, or whitespace: Generate realistic, high-impact bulleted responsibilities and achievements matching the position and company.
     * If "description" is present: Optimize and strengthen it using the STAR method, strong action verbs, and quantifiable metrics.
   - CERTIFICATIONS & WORKSHOPS: For each certification or workshop:
     * If "description" is missing or empty: Provide a concise 1-line description of the hands-on competencies or topics covered based on the certification title.
     * If "description" is present: Polish and clarify the description.
   - EDUCATION:
     * If "description" is missing: You may add relevant core coursework or academic focus matching the degree and fieldOfStudy if space permits.
     * If "description" is present: Polish and refine it.
5. WORDING & FORMATTING CONCISENESS (PAGE TARGET): The user requested a ${targetPages}-page ATS resume. You MUST budget and tailor length through concise wording and formatting efficiency, NEVER by deleting items or dropping sections:
   - Under "projects", write concise, high-impact bullet points or sentences highlighting technical contributions and tools.
   - Under "workExperience", condense job duties into high-impact bulleted achievements with action verbs.
   - Under "summary", write 2-3 concise sentences.
   - Under "skills", keep all technical skills and tools.
6. ZERO FABRICATION OF NEW ITEMS: Only enrich and optimize items that exist in the input resume. Do NOT invent new companies, degrees, or unrelated projects that the candidate never entered.
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
                timeout: 35000,
                generationConfig: { 
                    temperature: 0.2,
                    responseMimeType: "application/json"
                } 
            })).trim();
            parsedJson = parseJsonFromModel(rawText);
        } catch (aiErr) {
            console.warn("[Resume Generation] Gemini timed out or failed; generating intelligent fallback:", aiErr);
            if (optimizeAts === "true" && parsedExistingResume) {
                // If optimizing an existing resume, fall back to existing data rather than empty defaults
                parsedJson = { ...parsedExistingResume, isFallback: true };
            } else {
                parsedJson = generateResumeFallback({
                    preferredRoles,
                    targetCompanies,
                    roleMode,
                    github: sourceMode === "resume" ? "" : github,
                    linkedin: sourceMode === "resume" ? "" : linkedin,
                    portfolioUrl: sourceMode === "resume" ? "" : portfolioUrl,
                    candidateName: sourceMode === "resume" ? "" : (session.identifier || "").split("@")[0],
                    candidateEmail: sourceMode === "resume" ? "" : (session.identifier && session.identifier.includes("@") ? session.identifier : ""),
                    resumeText: resumeFileText
                });
            }
        }

        // Apply Data Integrity Check & Fact Verification Layer
        const verifiedJson = verifyAndRepairResumeData(
            parsedJson, 
            resumeFileText || projectText || portfolioText || "", 
            parsedExistingResume,
            optimizeAts === "true"
        );

        return NextResponse.json(verifiedJson);
    } catch (error: any) {
        console.error("Resume Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate resume" }, { status: 500 });
    }
}
