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

            // Comprehensive un-gluing for multi-column and dense PDF text extractions:
            textContent = textContent
                // Separate glued URLs from project names, linkedin, or text
                .replace(/([a-zA-Z0-9_\-\.\)])(https?:\/\/)/g, "$1 $2")
                .replace(/(https?:\/\/[^\s]+)(https?:\/\/)/g, "$1\n$2")
                // Separate glued dates: "01/202404/2024" -> "01/2024 - 04/2024"
                .replace(/(\d{2}\/\d{4})(\d{2}\/\d{4})/g, "$1 - $2")
                .replace(/(\d{2}\/\d{4})(Present|Current)/gi, "$1 - $2")
                .replace(/([a-zA-Z\)])(20\d\d|19\d\d)/g, "$1 $2")
                .replace(/(20\d\d|19\d\d)([–—\-])/g, "$1 $2")
                .replace(/([–—\-])(20\d\d|19\d\d)/g, "$1 $2")
                // Separate glued company/institution suffixes and locations
                .replace(/(Ltd|Pvt|Inc|LLC|Corp|Solutions|Technologies|Polytechnic|Institute|University|College|Collage)([A-Z][a-z]+)/g, "$1 $2")
                .replace(/([a-zA-Z])(\.(?:Bengaluru|Bangalore|Turuvekere|Tiptur|Mumbai|Delhi|Hyderabad|Chennai|Pune|India))/g, "$1 | $2")
                .replace(/([a-z])([A-Z][a-z]+,\s*(?:Karnataka|Maharashtra|Delhi|Tamil\s+Nadu|Telangana|Kerala|Gujarat|Uttar\s+Pradesh|India|USA|UK|California|Texas))/g, "$1 $2")
                // Separate new project boundaries starting after sentence periods or closing parens
                .replace(/(\.|\))\s*([A-Z][a-zA-Z0-9\s\.\-]{2,40}?)\s*(https?:\/\/github\.com)/g, "$1\n\n$2\n$3")
                // Separate role from URL
                .replace(/(https?:\/\/[^\s]+)\s+([A-Z][a-zA-Z\s]+Developer|[A-Z][a-zA-Z\s]+Engineer|Developer|Lead|Engineer)/g, "$1\n$2")
                // Separate Tech prefix
                .replace(/([a-zA-Z0-9_\-\.\)])\s*(Tech:\s*)/g, "$1\n$2")
                // Separate project description after Tech line
                .replace(/(Tech:[^\n]+?)\s+([A-Z][a-z]+[^\n]*\b(?:built|companion|dashboard|classifier|application|platform|simulator|designed|developed|implements|tracks|features)\b)/g, "$1\n$2")
                // Ensure KEY PROJECTS heading is separated onto its own line
                .replace(/([a-zA-Z0-9_\-\.\)])\s*(KEY\s+PROJECTS?|ACADEMIC\s+PROJECTS?|TECHNICAL\s+PROJECTS?|FEATURED\s+PROJECTS?|SELECTED\s+PROJECTS?|PROJECTS)\b/gi, "$1\n\n$2\n")
                .replace(/(KEY\s+PROJECTS?|ACADEMIC\s+PROJECTS?|TECHNICAL\s+PROJECTS?|FEATURED\s+PROJECTS?|SELECTED\s+PROJECTS?|PROJECTS)\s*([A-Z0-9])/gi, "$1\n$2")
                // Separate education items
                .replace(/(\.|\))\s*(B\.?E\.?\b|B\.?Tech\b|Diploma\b|SSLC\b|10th\b|12th\b|PUC\b|Bachelor\b|Master\b)/gi, "$1\n$2")
                .replace(/(\.|\))\s*(Bangalore Institute|Government Polytechnic|Government JR Coll[ea]ge)/gi, "$1\n$2")
                // Separate glued certification closing parenthesis, workshops, and issuers
                .replace(/(\))\s*([A-Z][a-zA-Z\-]+)/g, "$1 — $2")
                .replace(/(Program|Essentials)([A-Z][a-z]+)/g, "$1 — $2")
                .replace(/(Technology|Council|Rubicon)\s*(Digital Forensics|Ethical Hacking|Soft Skills|AWS Cloud)/gi, "$1\n$2");

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

function formatToMonthInput(dateStr: string): string {
    if (!dateStr) return "";
    const clean = dateStr.trim();
    // Match MM/YYYY or M/YYYY (e.g. 01/2024, 1/2024, 04/2024)
    const mmYyyy = clean.match(/^(\d{1,2})\/(\d{4})$/);
    if (mmYyyy) {
        return `${mmYyyy[2]}-${mmYyyy[1].padStart(2, "0")}`;
    }
    // Match YYYY-MM
    if (/^\d{4}-\d{2}$/.test(clean)) {
        return clean;
    }
    // Match Month YYYY (e.g. "Jan 2024", "January 2024")
    const monthNames: Record<string, string> = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
    };
    const monthYear = clean.match(/^([a-zA-Z]+)[\s,]+(\d{4})$/);
    if (monthYear) {
        const mKey = monthYear[1].toLowerCase().substring(0, 3);
        if (monthNames[mKey]) {
            return `${monthYear[2]}-${monthNames[mKey]}`;
        }
    }
    // Match YYYY only (e.g. "2024")
    if (/^\d{4}$/.test(clean)) {
        return `${clean}-01`;
    }
    return clean;
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
    const extractedPortfolio = params.portfolioUrl || rawText.match(/https?:\/\/[a-zA-Z0-9_\-\.]+\.(?:vercel\.app|netlify\.app|github\.io|me|dev|io|com)(?:\/[^\s]*)?/i)?.[0] || "";

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
        if (nameIdx !== -1) {
            for (let offset = 1; offset <= 3; offset++) {
                const candidateLine = lines[nameIdx + offset];
                if (candidateLine && 
                    !candidateLine.includes("@") && 
                    !candidateLine.includes("http") && 
                    !/^\+?\d/.test(candidateLine) && 
                    candidateLine.length < 70 &&
                    !/^(contact|phone|email|linkedin|github|summary|profile|about|education|experience|skills|projects)/i.test(candidateLine)
                ) {
                    extractedTitle = candidateLine.trim();
                    break;
                }
            }
        }
    }
    if (!extractedTitle && rawText) {
        // Universal role matcher across Engineering, Sciences, Healthcare, Business, Management, Arts, Legal, Trades
        const universalTitleMatch = rawText.match(/\b([A-Z][a-zA-Z\s/&-]{2,45}?(?:Engineer|Developer|Specialist|Manager|Consultant|Analyst|Designer|Architect|Lead|Executive|Coordinator|Officer|Technician|Scientist|Associate|Assistant|Surveyor|Inspector|Technologist|Physician|Doctor|Nurse|Therapist|Pharmacist|Accountant|Auditor|Teacher|Professor|Researcher|Practitioner|Administrator|Director|Strategist|Advocate))\b/);
        if (universalTitleMatch) {
            extractedTitle = universalTitleMatch[0].trim();
        }
    }
    if (!extractedTitle && params.preferredRoles && params.preferredRoles !== "Entry-Level / Fresher" && params.preferredRoles !== "Not specified" && params.preferredRoles !== "Open Opportunity") {
        extractedTitle = params.preferredRoles;
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

    // Heuristically extract real work experience if present in raw text
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

                    // Separate glued location from company if needed
                    if (!location && company) {
                        const gluedLoc = company.match(/^(.*?)(Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Chennai|Turuvekere|Tiptur|India)$/i);
                        if (gluedLoc) {
                            company = gluedLoc[1].trim();
                            location = gluedLoc[2].trim();
                        }
                    }

                    currentExp = {
                        position: positionPart || "Role",
                        company: company || "Company",
                        location: location,
                        startDate: formatToMonthInput(dateMatch[1]),
                        endDate: /present|current/i.test(dateMatch[2]) ? "" : formatToMonthInput(dateMatch[2]),
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

    // Universally extract skills from raw resume text (handles any domain: technical, business, creative, medical, etc.)
    const foundSkills: { name: string; level: string; category: string }[] = [];
    if (rawText) {
        const skillSectionMatch = rawText.match(/(?:skills|technical\s+skills|core\s+competencies|key\s+skills|areas\s+of\s+expertise|competencies)[:\s\n]+([\s\S]{10,1500}?)(?=\n\s*(?:languages|certifications|workshops|education|academic\s+background|projects|awards|experience|work\s+experience)|$)/i);
        if (skillSectionMatch) {
            const skillText = skillSectionMatch[1];
            // 1. Bracketed format: Skill Name (Level) e.g. "Python (Intermediate)" or "Project Management (Advanced)"
            const bracketRegex = /([a-zA-Z0-9\s&/+#._-]+?)\s*\((Advanced|Intermediate|Expert|Beginner|Proficient|Familiar)\)/g;
            let m;
            while ((m = bracketRegex.exec(skillText)) !== null) {
                const sName = m[1].replace(/^[•\-*▪▫–—✦✓]\s*/, '').trim();
                const sLevel = m[2].trim();
                if (sName.length > 1 && !foundSkills.some(s => s.name.toLowerCase() === sName.toLowerCase())) {
                    foundSkills.push({
                        name: sName,
                        level: sLevel,
                        category: "Skills & Competencies"
                    });
                }
            }

            // 2. If no bracketed skills found, extract bulleted, comma-separated, or pipe-separated skills
            if (foundSkills.length === 0) {
                const rawItems = skillText.split(/[\n,•|▪▫–—✦✓;]+/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 50);
                for (const item of rawItems) {
                    if (!/^(skills|technical|tools|frameworks|methodologies|proficiencies)$/i.test(item) &&
                        !foundSkills.some(s => s.name.toLowerCase() === item.toLowerCase())) {
                        foundSkills.push({
                            name: item,
                            level: "",
                            category: "Core Skills"
                        });
                    }
                }
            }
        }
    }

    // Heuristically extract real education from raw text with clean field separation
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
        degreeType?: string;
    }> = [];

    if (rawText) {
        const eduSectionMatch = rawText.match(/(?:education|academic\s+background|academic\s+qualifications|qualification)[:\s\n]+([\s\S]{20,2500}?)(?=\n\s*(?:technical\s+skills|skills|projects|key\s+projects?|experience|work\s+experience|certifications|workshops|awards|languages|publications)|$)/i);
        if (eduSectionMatch) {
            const eduText = eduSectionMatch[1];
            const eduLines = eduText.split("\n").map(l => l.trim()).filter(Boolean);

            for (let i = 0; i < eduLines.length; i++) {
                const line = eduLines[i];
                if (/^page\s+\d/i.test(line) || /^[-–—_=]{3,}$/.test(line)) continue;

                const isDegreeLine = /\b(b\.?e\b|b\.?tech\b|diploma\b|sslc\b|10th\b|12th\b|hsc\b|cbse\b|icse\b|puc\b|bachelor\b|master\b|m\.?tech\b|b\.?sc\b|m\.?sc\b|b\.?com\b|m\.?com\b|bba\b|mba\b|ph\.?d\b)/i.test(line);
                const isInstLine = /\b(institute|university|college|collage|polytechnic|school|academy)\b/i.test(line);

                if (isDegreeLine) {
                    const dateMatch = line.match(/\b(\d{2}\/\d{4}|\d{4})\s*[-–to\s]+\s*(\d{2}\/\d{4}|\d{4}|present|current)\b/i) || line.match(/[-–—]\s*(\d{2}\/\d{4}|\d{4})\b/);
                    let degreeFull = line;
                    if (dateMatch) {
                        degreeFull = degreeFull.replace(dateMatch[0], "").trim();
                    }

                    let degree = degreeFull.replace(/[-–—|]\s*$/, "").trim();
                    let fieldOfStudy = "";
                    if (/\bin\b/i.test(degree)) {
                        const parts = degree.split(/\bin\b/i);
                        degree = parts[0].trim();
                        fieldOfStudy = parts.slice(1).join(" in ").trim();
                    }

                    const nextLine = eduLines[i + 1] || "";
                    let institution = nextLine;
                    let cgpa = "";
                    let percentage = "";
                    let location = "";

                    // Extract score strictly into score fields, NOT institution
                    const scoreMatch = nextLine.match(/(?:cgpa|percentage|score|marks)?[:\s]*([0-9.]+(?:\s*\/\s*10|\s*%)?)/i);
                    if (scoreMatch && scoreMatch[1] && /\d/.test(scoreMatch[1])) {
                        const sVal = scoreMatch[1].trim();
                        if (sVal.includes("%")) {
                            percentage = sVal;
                        } else if (parseFloat(sVal) <= 10) {
                            cgpa = sVal;
                        } else {
                            percentage = `${sVal}%`;
                        }
                        institution = institution.replace(scoreMatch[0], "").trim();
                    }

                    // Extract location strictly into location field, NOT institution
                    const locMatch = institution.match(/[|,\.]\s*([A-Z][a-zA-Z\s]+,\s*(?:India|USA|UK)|Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Chennai|Turuvekere|Tiptur)\s*$/i);
                    if (locMatch && locMatch.index !== undefined) {
                        location = locMatch[1].replace(/^[|,\.\s]+/, "").trim();
                        institution = institution.substring(0, locMatch.index).trim();
                    }
                    institution = institution.replace(/[|,\.\s]+$/, "").trim();

                    // Optional 3rd line: description, coursework, or honors
                    const nextNextLine = eduLines[i + 2] || "";
                    let description = "";
                    if (nextNextLine && !/\b(b\.?e\b|b\.?tech\b|diploma\b|sslc\b|10th\b|12th\b|institute|college|collage|polytechnic|university)\b/i.test(nextNextLine)) {
                        description = nextNextLine;
                        i++;
                    }
                    i++;

                    let degreeType = "";
                    const degLower = (degree + " " + fieldOfStudy).toLowerCase();
                    if (degLower.includes("10th") || degLower.includes("sslc") || degLower.includes("secondary")) degreeType = "10th";
                    else if (degLower.includes("12th") || degLower.includes("puc") || degLower.includes("high school") || degLower.includes("hsc")) degreeType = "12th";
                    else if (degLower.includes("bachelor") || degLower.includes("b.e") || degLower.includes("b.tech") || degLower.includes("diploma")) degreeType = "ug";
                    else if (degLower.includes("master") || degLower.includes("m.tech") || degLower.includes("mba") || degLower.includes("m.s") || degLower.includes("pg")) degreeType = "pg";

                    extractedEducation.push({
                        degree: degree || "Degree",
                        fieldOfStudy: fieldOfStudy,
                        institution: institution || "Institution",
                        location: location || "",
                        cgpa: cgpa,
                        percentage: percentage,
                        startDate: dateMatch ? formatToMonthInput(dateMatch[1] || "") : "",
                        endDate: dateMatch ? (/present|current/i.test(dateMatch[2] || "") ? "Present" : formatToMonthInput(dateMatch[2] || dateMatch[1] || "")) : "",
                        description,
                        degreeType
                    });
                } else if (isInstLine) {
                    // Institution-first format e.g.
                    // Bangalore Institute of Technology, Bengaluru
                    // B.E. in Information Science & Engineering | CGPA: 6.91 | 2020 - 2024
                    let instName = line.trim();
                    let location = "";
                    const locMatch = instName.match(/[|,\.]\s*([A-Z][a-zA-Z\s]+,\s*(?:India|USA|UK)|Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Chennai|Turuvekere|Tiptur)\s*$/i);
                    if (locMatch && locMatch.index !== undefined) {
                        location = locMatch[1].replace(/^[|,\.\s]+/, "").trim();
                        instName = instName.substring(0, locMatch.index).trim();
                    }
                    instName = instName.replace(/[|,\.\s]+$/, "").trim();

                    const nextLine = eduLines[i + 1] || "";
                    let degree = "Degree";
                    let fieldOfStudy = "";
                    let cgpa = "";
                    let percentage = "";
                    let startDate = "";
                    let endDate = "";

                    const dateMatch = nextLine.match(/\b(\d{2}\/\d{4}|\d{4})\s*[-–to\s]+\s*(\d{2}\/\d{4}|\d{4}|present|current)\b/i) || nextLine.match(/[-–—]\s*(\d{2}\/\d{4}|\d{4})\b/);
                    if (dateMatch) {
                        startDate = formatToMonthInput(dateMatch[1] || "");
                        endDate = /present|current/i.test(dateMatch[2] || "") ? "Present" : formatToMonthInput(dateMatch[2] || dateMatch[1] || "");
                    }

                    let cleanNext = nextLine;
                    if (dateMatch) {
                        cleanNext = cleanNext.replace(dateMatch[0], "").trim();
                    }

                    const scoreMatch = cleanNext.match(/(?:cgpa|percentage|score|marks)?[:\s]*([0-9.]+(?:\s*\/\s*10|\s*%)?)/i);
                    if (scoreMatch && scoreMatch[1] && /\d/.test(scoreMatch[1])) {
                        const sVal = scoreMatch[1].trim();
                        if (sVal.includes("%")) {
                            percentage = sVal;
                        } else if (parseFloat(sVal) <= 10) {
                            cgpa = sVal;
                        } else {
                            percentage = `${sVal}%`;
                        }
                        cleanNext = cleanNext.replace(scoreMatch[0], "").trim();
                    }

                    cleanNext = cleanNext.replace(/[|,\.\s\-–—]+$/, "").trim();
                    if (/\bin\b/i.test(cleanNext)) {
                        const parts = cleanNext.split(/\bin\b/i);
                        degree = parts[0].trim();
                        fieldOfStudy = parts.slice(1).join(" in ").trim();
                    } else if (cleanNext && !cleanNext.startsWith("-") && cleanNext.length < 60) {
                        degree = cleanNext;
                    }

                    let degreeType = "";
                    const degLower = (degree + " " + fieldOfStudy).toLowerCase();
                    if (degLower.includes("10th") || degLower.includes("sslc") || degLower.includes("secondary")) degreeType = "10th";
                    else if (degLower.includes("12th") || degLower.includes("puc") || degLower.includes("high school") || degLower.includes("hsc")) degreeType = "12th";
                    else if (degLower.includes("bachelor") || degLower.includes("b.e") || degLower.includes("b.tech") || degLower.includes("diploma")) degreeType = "ug";
                    else if (degLower.includes("master") || degLower.includes("m.tech") || degLower.includes("mba") || degLower.includes("m.s") || degLower.includes("pg")) degreeType = "pg";

                    // Optional 3rd line: description, coursework, or honors
                    const nextNextLine = eduLines[i + 2] || "";
                    let description = "";
                    if (nextNextLine && !/\b(b\.?e\b|b\.?tech\b|diploma\b|sslc\b|10th\b|12th\b|institute|college|collage|polytechnic|university)\b/i.test(nextNextLine)) {
                        description = nextNextLine;
                        i++;
                    }
                    i++;

                    extractedEducation.push({
                        institution: instName,
                        degree: degree,
                        fieldOfStudy: fieldOfStudy,
                        location: location,
                        startDate: startDate,
                        endDate: endDate,
                        cgpa: cgpa,
                        percentage: percentage,
                        description: description,
                        degreeType: degreeType
                    });
                }
            }
        }
    }

    // Heuristically extract real projects from raw text (universal for all domains)
    const extractedProjects: Array<{
        name: string;
        description: string;
        technologies: string[];
        link: string;
        role: string;
    }> = [];

    if (rawText) {
        const projSectionMatch = rawText.match(/(?:^|\n)\s*(?:KEY\s+PROJECTS?|ACADEMIC\s+PROJECTS?|TECHNICAL\s+PROJECTS?|FEATURED\s+PROJECTS?|SELECTED\s+PROJECTS?|PERSONAL\s+PROJECTS?|CAPSTONE\s+PROJECTS?|PROJECTS)(?:\s*[:\-\–—][^\n]*|\s*)[:\s\n]+([\s\S]{10,8000}?)(?=(?:\n\s*(?:SKILLS|TECHNICAL\s+SKILLS|CORE\s+COMPETENCIES|AREAS\s+OF\s+EXPERTISE|EDUCATION|ACADEMIC\s+BACKGROUND|CERTIFICATIONS|WORKSHOPS|LICENSES|LANGUAGES|ACHIEVEMENTS|AWARDS|EXPERIENCE|WORK\s+EXPERIENCE|PUBLICATIONS|VOLUNTEER))|$)/i);
        if (projSectionMatch) {
            let projText = projSectionMatch[1];
            projText = projText
                .replace(/(\.|\))\s*([A-Z][a-zA-Z0-9\s\.\-]{2,40}?)\s*(https?:\/\/github\.com)/g, "$1\n\n$2\n$3")
                .replace(/(https?:\/\/[^\s]+)\s+([A-Z][a-zA-Z\s]+Developer|[A-Z][a-zA-Z\s]+Engineer|Developer|Lead|Engineer|Manager|Specialist)/g, "$1\n$2")
                .replace(/([a-zA-Z0-9_\-\.\)])\s*(Tech:\s*)/g, "$1\n$2")
                .replace(/(Tech:[^\n]+?)\s+([A-Z][a-z]+[^\n]*\b(?:built|companion|dashboard|classifier|application|platform|simulator|designed|developed|implements|tracks|features)\b)/g, "$1\n$2");

            const rawPLines = projText.split("\n").map(l => l.trim()).filter(Boolean);
            let currentProj: any = null;

            for (let i = 0; i < rawPLines.length; i++) {
                const line = rawPLines[i];
                if (/^page\s+\d/i.test(line) || /^(key\s+projects?|projects?|technical\s+projects?|academic\s+projects?)$/i.test(line) || /^[-–—_=]{3,}$/.test(line)) continue;
                if (/^(education|experience|technical\s+skills|skills|certifications|workshops|languages|awards)$/i.test(line) ||
                    /\b(institute\s+of\s+technology|polytechnic|university|college|bachelor\s+of|diploma\s+in|cgpa)\b/i.test(line)) {
                    continue;
                }

                const urlMatch = line.match(/https?:\/\/(?:www\.)?github\.com\/[^\s]+/i) || line.match(/https?:\/\/[^\s]+/i);
                const nextLine = rawPLines[i + 1] || "";
                const isBullet = /^[•\-*▪▫–—✦✓]\s*/.test(line);
                const nextIsBullet = /^[•\-*▪▫–—✦✓]\s*/.test(nextLine);

                const techPrefixRegex = /^(?:[•\-*▪▫–—✦✓]\s*)?(?:tech(?:\s*stack)?|technologies|tools)\s*[:\-–—]\s*|^(?:[•\-*▪▫–—✦✓]\s*)?tech\s*:\s*|\b(?:tech(?:\s*stack)?|technologies)\s*:\s*/i;

                // 1. Standalone URL line
                if (/^https?:\/\/[^\s]+$/i.test(line)) {
                    if (currentProj && !currentProj.link) {
                        currentProj.link = line.trim();
                    }
                    continue;
                }

                // 2. Tech stack line: "Tech: React, Node.js..."
                if (techPrefixRegex.test(line)) {
                    if (currentProj) {
                        const tSplit = line.split(techPrefixRegex);
                        if (tSplit.length > 1) {
                            const newTech = tSplit[1].split(/[,|]/).map(t => t.trim()).filter(Boolean);
                            currentProj.technologies.push(...newTech);
                            currentProj.technologies = Array.from(new Set(currentProj.technologies));
                        }
                    }
                    continue;
                }

                // 3. Role line alone: "Role: Layout Designer", "Full Stack Developer", "AI Developer"
                const isRoleOnly = /^(?:role|position)\s*[:\-–—]\s*.+$/i.test(line) || /^(?:full\s*stack\s+developer|ai\s+developer|software\s+engineer|web\s+developer|lead\s+developer|team\s+leader|developer|lead\s+engineer|frontend\s+developer|backend\s+developer|layout\s+designer|data\s+scientist|analyst|engineer|designer)\s*$/i.test(line);
                if (isRoleOnly) {
                    if (currentProj) {
                        currentProj.role = line.replace(/^(?:role|position)\s*[:\-–—]\s*/i, "").replace(/[|–—]/g, "").trim();
                    }
                    continue;
                }

                // 4. Check if this line is a sentence or description fragment
                const isSentence = line.endsWith(".") || line.endsWith("...") || /^(built|developed|designed|implemented|engineered|created|voice-first\s+ai|deep\s+learning\s+plant|centralized\s+mern|resume-aware\s+ai|synthetic\s+data\s+generator\s+app|global\s+news\s+agg|optimization\s+bottlenecks)\b/i.test(line);

                // 5. Genuine project header checks
                const isNumbered = /^(?:project\s*\d*[:\s]|\d+[\.\)]\s*)/i.test(line);
                const hasTechNext = techPrefixRegex.test(nextLine);
                const hasRoleNext = /^(?:role|position)\s*[:\-–—]\s*/i.test(nextLine) || /\b(developer|engineer|lead|leader|manager|designer|analyst|creator|contributor|architect|specialist|intern)\b/i.test(nextLine);
                const hasUrlNext = /https?:\/\//i.test(nextLine);

                const isProjectHeader = !isBullet && !isSentence && !isRoleOnly && (
                    Boolean(urlMatch) ||
                    isNumbered ||
                    hasTechNext ||
                    hasRoleNext ||
                    hasUrlNext
                );

                const lineWithoutUrlLen = line.replace(/https?:\/\/[^\s]+/gi, "").trim().length;
                if (isProjectHeader && lineWithoutUrlLen < 140 && !isBullet) {
                    const link = urlMatch ? urlMatch[0] : (extractedGithub || "");
                    
                    // STEP 1: Extract project title ONLY (clean, bold title in templates)
                    let cleanName = line;

                    // Strip leading numbers or "Project 1:"
                    cleanName = cleanName.replace(/^(?:project\s*\d*[:\s]|\d+[\.\)]\s*|[•\-*▪▫–—✦✓]\s*)/i, "");

                    // Strip URL from name
                    if (urlMatch) {
                        cleanName = cleanName.replace(urlMatch[0], "");
                    } else {
                        cleanName = cleanName.replace(/https?:\/\/[^\s]+/gi, "");
                    }

                    let role = "Developer";
                    let technologies: string[] = [];

                    // Extract domain tags or right-aligned tech tags from title line: "Design and Analysis... 45 nm Technology" or "Braille E-Reader FPGA Implementation"
                    const domainTagRegex = /(?:(?<=[a-zA-Z0-9])|\b)(\d+\s*nm\s+Technology|FPGA\s+Implementation|IIoT\s*&\s*Embedded\s+Systems|Embedded\s*&\s*Solar\s+Power\s+Integration|IoT\s*&\s*Embedded\s+Systems|VLSI\s+Design|Embedded\s+Systems|Machine\s+Learning|Deep\s+Learning|Computer\s+Vision)\s*$/i;
                    const domainMatch = cleanName.match(domainTagRegex);
                    if (domainMatch && domainMatch.index) {
                        technologies.push(domainMatch[1].trim());
                        cleanName = cleanName.substring(0, domainMatch.index).trim();
                    } else {
                        const tagSeparators = cleanName.split(/\s{2,}|\t/);
                        if (tagSeparators.length > 1) {
                            cleanName = tagSeparators[0].trim();
                            technologies.push(...tagSeparators.slice(1).map(t => t.trim()).filter(Boolean));
                        }
                    }

                    // Extract tech tags or dates in parentheses: "EchoWell (Next.js 14, TypeScript)" or "Project (2024)"
                    const parenTechMatch = cleanName.match(/\(([^)]+)\)/);
                    if (parenTechMatch) {
                        const content = parenTechMatch[1].trim();
                        if (content.includes(",") || content.includes("/") || /\b(react|next|node|python|java|c\+\+|vue|angular|aws|sql|docker|figma|tailwind|fastapi|graphql|mongodb)\b/i.test(content)) {
                            technologies.push(...content.split(/[,/]/).map(t => t.trim()).filter(Boolean));
                            cleanName = cleanName.replace(parenTechMatch[0], "").trim();
                        } else if (/\b(20\d\d|\d{2}\/\d{4}|present|current)\b/i.test(content)) {
                            cleanName = cleanName.replace(parenTechMatch[0], "").trim();
                        }
                    }

                    // Strip dates from header line if present
                    cleanName = cleanName.replace(/\b(?:\d{2}\/\d{4}|\d{4})\s*[-–to\s]+\s*(?:\d{2}\/\d{4}|\d{4}|present|current)\b/gi, "");
                    cleanName = cleanName.replace(/\b(?:20\d\d|19\d\d)\b/g, "");

                    // Check for role or tech separated by |, —, –, or - on the title line itself
                    if (/[\s]+[|–—\-][\s]+/.test(cleanName)) {
                        const parts = cleanName.split(/[\s]+[|–—\-][\s]+/);
                        cleanName = parts[0].trim();
                        for (let pIdx = 1; pIdx < parts.length; pIdx++) {
                            const part = parts[pIdx].trim();
                            if (techPrefixRegex.test(part)) {
                                const tSplit = part.split(techPrefixRegex);
                                if (tSplit[1]) {
                                    technologies.push(...tSplit[1].split(/[,|]/).map(t => t.trim()).filter(Boolean));
                                }
                            } else if (/\b(developer|engineer|lead|manager|designer|analyst|creator|contributor|architect)\b/i.test(part)) {
                                role = part.replace(/[|–—]/g, "").trim();
                            } else if (part.includes(",")) {
                                technologies.push(...part.split(/[,|]/).map(t => t.trim()).filter(Boolean));
                            }
                        }
                    }

                    cleanName = cleanName.replace(/[-–—|:]\s*$/, "").replace(/^[-–—|:]\s*/, "").trim();

                    // If cleanName is empty or dummy, do not create project
                    if (!cleanName || cleanName.toLowerCase() === "project" || cleanName.toLowerCase() === "untitled project") {
                        continue;
                    }

                    if (currentProj && currentProj.name) {
                        extractedProjects.push(currentProj);
                    }

                    // Check if next line contains role and/or tech
                    if (nextLine && !nextIsBullet && (hasTechNext || hasRoleNext)) {
                        if (hasTechNext) {
                            const techSplit = nextLine.split(techPrefixRegex);
                            if (techSplit[0].trim()) {
                                role = techSplit[0].replace(/^(?:role|position)\s*[:\-–—]\s*/i, "").replace(/[|–—]/g, "").trim() || role;
                            }
                            if (techSplit.length > 1) {
                                technologies.push(...techSplit[1].split(/[,|]/).map(t => t.trim()).filter(Boolean));
                            }
                        } else if (hasRoleNext) {
                            role = nextLine.replace(/^(?:role|position)\s*[:\-–—]\s*/i, "").replace(/[|–—]/g, "").trim();
                        }
                        i++;
                    }

                    technologies = Array.from(new Set(technologies.map(t => t.trim()).filter(Boolean)));

                    currentProj = {
                        name: cleanName,
                        role,
                        link,
                        technologies,
                        description: ""
                    };
                } else if (currentProj) {
                    const descLine = line.replace(/^[•\-*▪▫–—✦✓]\s*/, "");
                    if (descLine) {
                        currentProj.description += (currentProj.description ? " " : "") + descLine;
                    }
                }
            }
            if (currentProj && currentProj.name) {
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

    // Heuristically extract real certifications & workshops with clean issuer separation
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
            const lines = certSectionMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
            const mergedItems: Array<{ line: string; continuations: string[] }> = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Skip category subheadings, generic headers, and pagination
                if (/^(?:online\s+courses|technical\s+workshops|workshops\s*(?:&|and)\s*certifications|certifications\s*(?:&|and)\s*workshops|certifications|certificates|licenses|courses|workshops|training|webinars|professional\s+certifications)[\s:]*$/i.test(line) ||
                    /^(&|and)\s+(workshops|certifications|training)/i.test(line) ||
                    /^page\s+\d/i.test(line) ||
                    /^[-–—_=]{3,}$/.test(line)) {
                    continue;
                }

                const isBullet = /^[•\-*▪▫–—✦✓]\s*/.test(line);
                const isNumbered = /^\d+[\.\)]\s*/.test(line);
                const hasTitleColon = /^[•\-*▪▫–—✦✓]?\s*[A-Z][a-zA-Z0-9\s()/\-–—&,]{2,80}:/.test(line);
                const hasExplicitSeparator = /\s+[—–\-]\s+|\s*[—–]\s*/.test(line);
                const isExplicitDescVerb = /^[•\-*▪▫–—✦✓]?\s*(?:hands-on|practical|learned|covered|training|focusing|worked\s+on|responsible\s+for|delivered|conducted|designed|implemented|engineered|assisted)\b/i.test(line);

                // A line is a continuation / description fragment ONLY if:
                // 1. It is unbulleted and starts with lowercase or continuation word (e.g. "routing workflows.", "optimization.")
                // 2. OR it is unbulleted, ends in a period, has no colon/separator, and previous item exists
                // 3. OR it is a bullet, but explicitly starts with a description action verb WITHOUT colon/separator (sub-bullet description)
                const isContinuation = (mergedItems.length > 0) && (
                    (!isBullet && !isNumbered && (
                        /^[a-z]/.test(line) ||
                        /^(?:routing|optimization|verification|workflows|bottlenecks|implementation|testing|synthesis)\b/i.test(line) ||
                        (line.endsWith(".") && !hasTitleColon && !hasExplicitSeparator && line.length < 80)
                    )) ||
                    (isBullet && isExplicitDescVerb && !hasTitleColon && !hasExplicitSeparator)
                );

                if (isContinuation) {
                    const cleanFragment = line.replace(/^[•\-*▪▫–—✦✓]\s*/, "").trim();
                    if (cleanFragment) {
                        mergedItems[mergedItems.length - 1].continuations.push(cleanFragment);
                    }
                } else {
                    mergedItems.push({ line, continuations: [] });
                }
            }

            for (const item of mergedItems) {
                const cleanLine = item.line.replace(/^[•\-*▪▫–—✦✓]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();
                if (cleanLine.length < 3) continue;

                const yearMatch = cleanLine.match(/\b(20\d\d|19\d\d)\b/);
                let name = cleanLine.replace(/\b(20\d\d|19\d\d)\b/g, '').trim();
                let issuer = "";
                let description = "";

                // Case A: Title with colon: "Physical Design Workshop: Hands-on experience in..."
                const colonIdx = cleanLine.indexOf(":");
                if (colonIdx > 2 && colonIdx < 80) {
                    name = cleanLine.substring(0, colonIdx).trim();
                    const rightSide = cleanLine.substring(colonIdx + 1).trim();
                    if (rightSide.length > 25 || /^(hands-on|practical|learned|covered|training|focusing|deep-dive)\b/i.test(rightSide)) {
                        description = rightSide;
                    } else {
                        issuer = rightSide;
                    }
                } else {
                    // Case B: Title with dash/em-dash separator: "AWS Workshop — Bangalore Institute of Technology"
                    const parts = name.split(/\s+[—–\-]\s+|\s*[—–]\s*/);
                    if (parts.length > 1) {
                        name = parts.slice(0, -1).join(" — ").trim();
                        issuer = parts[parts.length - 1].trim();
                    }
                }

                // If issuer was glued into name: "(DFE)EC-Council" or "ProgramRubicon"
                if (!issuer) {
                    const gluedMatch = name.match(/^(.*?\))\s*([A-Z][a-zA-Z\-]+)$/) || name.match(/^(.*?Program)\s*([A-Z][a-zA-Z\-]+)$/);
                    if (gluedMatch) {
                        name = gluedMatch[1].trim();
                        issuer = gluedMatch[2].trim();
                    }
                }

                name = name.replace(/[-–—|:]\s*$/, "").trim();

                // Append any continuation fragments strictly to description
                if (item.continuations.length > 0) {
                    const contText = item.continuations.join(" ").trim();
                    description = description ? `${description} ${contText}` : contText;
                }

                if (/^(&|and)\s*workshops/i.test(name) || /^(certifications|workshops|licenses|certificates)$/i.test(name.toLowerCase())) {
                    continue;
                }

                extractedCertifications.push({
                    name,
                    issuer,
                    date: yearMatch ? formatToMonthInput(yearMatch[0]) : "",
                    link: "",
                    description: description.trim() // Strictly empty "" if no description exists in the resume
                });
            }
        }
    }

    // Heuristically extract custom sections (Awards, Publications, Volunteer, Coursework)
    // ONLY matches genuine, standalone section headers (never inline words in bullets)
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
            { 
                title: "Awards & Honors", 
                pattern: /(?:^|\n)\s*(?:AWARDS\s*(?:&|and)\s*HONORS|ACADEMIC\s+AWARDS|HONORS\s*(?:&|and)\s*AWARDS|ACHIEVEMENTS|HONORS|AWARDS)(?:\s*[:\-\–—][^\n]*|\s*)[:\s\n]+([\s\S]{15,1200}?)(?=(?:\n\s*(?:education|experience|technical\s+skills|skills|projects|key\s+projects|certifications|languages|publications|volunteer))|$)/i 
            },
            { 
                title: "Publications & Research", 
                pattern: /(?:^|\n)\s*(?:PUBLICATIONS\s*(?:&|and)\s*RESEARCH|RESEARCH\s+PUBLICATIONS|PUBLICATIONS|RESEARCH\s+PAPERS|PATENTS)(?:\s*[:\-\–—][^\n]*|\s*)[:\s\n]+([\s\S]{15,1200}?)(?=(?:\n\s*(?:education|experience|technical\s+skills|skills|projects|key\s+projects|certifications|languages|awards))|$)/i 
            },
            { 
                title: "Volunteer & Leadership", 
                pattern: /(?:^|\n)\s*(?:VOLUNTEER\s+EXPERIENCE|VOLUNTEERING|COMMUNITY\s+SERVICE|VOLUNTEER\s+WORK|LEADERSHIP\s*(?:&|and)\s*VOLUNTEERING)(?:\s*[:\-\–—][^\n]*|\s*)[:\s\n]+([\s\S]{15,1200}?)(?=(?:\n\s*(?:education|experience|technical\s+skills|skills|projects|key\s+projects|certifications|languages|awards|publications))|$)/i 
            },
            { 
                title: "Relevant Coursework", 
                pattern: /(?:^|\n)\s*(?:RELEVANT\s+COURSEWORK|KEY\s+COURSEWORK|COURSEWORK)(?:\s*[:\-\–—][^\n]*|\s*)[:\s\n]+([\s\S]{15,800}?)(?=(?:\n\s*(?:education|experience|technical\s+skills|skills|projects|key\s+projects|certifications|languages))|$)/i 
            }
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
    // Clean trailing https from LinkedIn
    if (parsed.personalInfo.linkedin) {
        parsed.personalInfo.linkedin = parsed.personalInfo.linkedin.replace(/https?$/i, "").trim();
    }
    // Extract website from rawText if omitted
    if (!parsed.personalInfo.website && rawText) {
        const portMatch = rawText.match(/https?:\/\/[a-zA-Z0-9_\-\.]+\.(?:vercel\.app|netlify\.app|github\.io|me|dev|io|com)(?:\/[^\s]*)?/i);
        if (portMatch) {
            parsed.personalInfo.website = portMatch[0].trim();
        }
    }

    // Fix 4: Sanitize professional title — strip section headers that leaked into title
    if (parsed.personalInfo.title) {
        const BANNED_TITLE_PREFIXES = /^\s*(INTERNSHIP[S]?|EDUCATION|PROJECTS|SKILLS|EXPERIENCE|DECLARATION|SUMMARY|OBJECTIVE|HOBBIES|REFERENCES|CERTIFICATIONS|TRAINING|WORK\s+EXPERIENCE)\s*/i;
        parsed.personalInfo.title = parsed.personalInfo.title.replace(BANNED_TITLE_PREFIXES, "").trim();
        // If title is now empty or too short, derive from highest education
        if (parsed.personalInfo.title.length < 3 && Array.isArray(parsed.education)) {
            const highestEdu = parsed.education.find((e: any) => /pg|master|mba|m\.?tech|m\.?e\b|m\.?com|m\.?sc|mca/i.test((e.degreeType || "") + " " + (e.degree || "")));
            if (highestEdu) {
                const degStr = [highestEdu.degree, highestEdu.fieldOfStudy].filter(Boolean).join(" ");
                if (degStr.length > 2) parsed.personalInfo.title = degStr + " Graduate";
            }
        }
    }

    // Fix 5: Clean location — strip company names that leaked into personalInfo.location
    if (parsed.personalInfo.location) {
        const COMPANY_SUFFIXES = /\b(Infotech|Technologies|Ltd|Pvt|Solutions|Engineerings?|Enterprises|Corp|Inc|LLC|Systems|Services|Software|Consulting|Associates|Industries|Group|Company)\b/i;
        if (COMPANY_SUFFIXES.test(parsed.personalInfo.location)) {
            // Try to extract just the city/geographic part
            const KNOWN_CITIES = /\b(Bangalore|Bengaluru|Mumbai|Bombay|Delhi|Hyderabad|Chennai|Pune|Kolkata|Ahmedabad|Jaipur|Lucknow|Chandigarh|Indore|Coimbatore|Mysuru|Mysore|Tiptur|Turuvekere|Kochi|Thiruvananthapuram|Noida|Gurgaon|Gurugram|Ghaziabad|Faridabad|Thane|Navi Mumbai|India|USA|UK|Canada|Singapore|Dubai|Remote)\b/i;
            const cityMatch = parsed.personalInfo.location.match(KNOWN_CITIES);
            if (cityMatch) {
                // Extract the city and everything after it (e.g. "Bangalore, India")
                const cityIdx = parsed.personalInfo.location.indexOf(cityMatch[0]);
                parsed.personalInfo.location = parsed.personalInfo.location.substring(cityIdx).replace(/^[,\s]+/, "").trim();
            }
        }
    }

    parsed.summary = cleanField(parsed.summary || "") || existingResume?.personalInfo?.summary || existingResume?.summary || "";
    if (isAtsOptimization && (!parsed.summary || !parsed.summary.trim())) {
        const candidateTitle = parsed.personalInfo?.title || existingResume?.personalInfo?.title || "";
        const topSkills = (parsed.skills?.length ? parsed.skills : (existingResume?.skills || [])).slice(0, 4).map((s: any) => s.name).filter(Boolean);
        const topProject = (parsed.projects?.length ? parsed.projects : (existingResume?.projects || []))[0]?.name;
        
        if (candidateTitle || topSkills.length > 0 || topProject) {
            const roleStr = candidateTitle ? `${candidateTitle}` : "Professional";
            const skillsStr = topSkills.length > 0 ? ` with strong expertise in ${topSkills.join(", ")}` : "";
            const projStr = topProject ? ` Demonstrated track record delivering projects including ${topProject}.` : "";
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
        item.company = cleanField(item.company || "").trim();
        item.position = cleanField(item.position || "").trim();
        item.location = cleanField(item.location || "").trim();

        // Un-glue company and location if needed (e.g. "Sansera Engineering LtdBengaluru" -> "Sansera Engineering Ltd" / "Bengaluru")
        if (item.company && !item.location) {
            const gluedLoc = item.company.match(/^(.*?)(Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Chennai|Turuvekere|Tiptur|India)$/i);
            if (gluedLoc) {
                item.company = gluedLoc[1].trim();
                item.location = gluedLoc[2].trim();
            }
        }

        // Clean dates glued to position: "Quality Control Intern - 01/202404/2024"
        const gluedDateMatch = item.position.match(/[-–—\s]*(\d{2}\/\d{4})\s*[-–to\s]*(\d{2}\/\d{4}|present|current)/i);
        if (gluedDateMatch) {
            if (!item.startDate) item.startDate = gluedDateMatch[1];
            if (!item.endDate && !/present|current/i.test(gluedDateMatch[2])) item.endDate = gluedDateMatch[2];
            if (/present|current/i.test(gluedDateMatch[2])) item.current = true;
            item.position = item.position.replace(gluedDateMatch[0], "").trim();
        }

        item.startDate = formatToMonthInput(item.startDate || "");
        if (item.current || /present|current/i.test(item.endDate || "")) {
            item.current = true;
            item.endDate = "";
        } else {
            item.endDate = formatToMonthInput(item.endDate || "");
        }

        item.description = cleanField(item.description || "");
        if (isAtsOptimization && (!item.description || !item.description.trim())) {
            item.description = `- Delivered key responsibilities and operational tasks as ${item.position || "Professional"} at ${item.company || "the company"}.\n- Applied industry standards to enhance quality and drive measurable project outcomes.`;
        }
        return item.company || item.position;
    });

    parsed.education = parsed.education.filter((item: any) => {
        item.institution = cleanField(item.institution || "").trim();
        item.degree = cleanField(item.degree || "").trim();
        item.fieldOfStudy = cleanField(item.fieldOfStudy || "").trim();
        item.location = cleanField(item.location || "").trim();
        item.description = cleanField(item.description || "").trim();
        item.cgpa = cleanField(item.cgpa || "").trim();
        item.percentage = cleanField(item.percentage || "").trim();
        item.startDate = cleanField(item.startDate || "").trim();
        item.endDate = cleanField(item.endDate || "").trim();

        // 1. Isolate and scrub any score stuck in text fields (degree, fieldOfStudy, institution, description)
        const textFields: ('degree' | 'fieldOfStudy' | 'institution' | 'description')[] = ['degree', 'fieldOfStudy', 'institution', 'description'];
        for (const f of textFields) {
            if (typeof item[f] === 'string' && item[f]) {
                // Check for percentage e.g. "Percentage: 65.92%" or "65.92%" or "65.92 %"
                const pctMatch = item[f].match(/(?:percentage|marks|aggregate|score)?[:\s]*([0-9]{2}(?:\.[0-9]+)?\s*%)/i) ||
                                 item[f].match(/(?:percentage|marks|aggregate)[:\s]*([0-9]{2}(?:\.[0-9]+)?)/i);
                if (pctMatch) {
                    if (!item.percentage) {
                        const rawNum = pctMatch[1].replace("%", "").trim();
                        item.percentage = `${rawNum}%`;
                    }
                    item[f] = item[f].replace(pctMatch[0], "").replace(/^[|,\.\s\-–—]+|[|,\.\s\-–—]+$/g, "").trim();
                }

                // Check for CGPA e.g. "CGPA: 6.91" or "6.91 CGPA" or "GPA: 6.91" or "9.35 / 10"
                const cgpaMatch = item[f].match(/(?:cgpa|gpa|grade)[:\s]*([0-9]\.[0-9]{1,2}(?:\s*\/\s*10)?)/i) ||
                                  item[f].match(/\b([0-9]\.[0-9]{1,2})\s*(?:cgpa|gpa)\b/i) ||
                                  item[f].match(/(?:cgpa|gpa)[:\s]*([0-9]\.[0-9]{1,2})/i);
                if (cgpaMatch) {
                    if (!item.cgpa) {
                        const numMatch = cgpaMatch[0].match(/([0-9]\.[0-9]{1,2})/);
                        if (numMatch) item.cgpa = numMatch[1];
                    }
                    item[f] = item[f].replace(cgpaMatch[0], "").replace(/^[|,\.\s\-–—]+|[|,\.\s\-–—]+$/g, "").trim();
                }
            }
        }

        // 2. Clean item.cgpa strictly to numeric value e.g. "6.91" or "9.35"
        if (item.cgpa) {
            const cgpaValMatch = item.cgpa.match(/([0-9]\.[0-9]{1,2})/);
            if (cgpaValMatch) {
                item.cgpa = cgpaValMatch[1];
            } else if (item.cgpa.includes("%")) {
                if (!item.percentage) item.percentage = item.cgpa;
                item.cgpa = "";
            } else {
                item.cgpa = item.cgpa.replace(/^(?:cgpa|gpa|grade)[:\s]*/i, "").trim();
            }
        }

        // 3. Clean item.percentage strictly to percentage value e.g. "65.92%"
        if (item.percentage) {
            const cleanPct = item.percentage.replace(/^(?:percentage|marks|score)[:\s]*/i, "").trim();
            const pctValMatch = cleanPct.match(/([0-9]{1,2}(?:\.[0-9]+)?)/);
            if (pctValMatch) {
                const valNum = parseFloat(pctValMatch[1]);
                if (valNum <= 10 && !cleanPct.includes("%") && !item.cgpa) {
                    item.cgpa = pctValMatch[1];
                    item.percentage = "";
                } else if (valNum < 30) {
                    // Fix 7: Reject implausibly low percentages (likely extracted from year fragments)
                    item.percentage = "";
                } else {
                    item.percentage = `${pctValMatch[1]}%`;
                }
            }
        }

        // 4. Split field of study from degree if " in " is present: "B.E in Information Science & Engineering"
        if (item.degree && /\bin\b/i.test(item.degree)) {
            const parts = item.degree.split(/\bin\b/i);
            const candDegree = parts[0].trim();
            const candFos = parts.slice(1).join(" in ").trim();
            if (!item.fieldOfStudy) {
                item.degree = candDegree;
                item.fieldOfStudy = candFos;
            } else {
                item.degree = candDegree;
            }
        }

        // Clean fieldOfStudy if duplicated in degree
        if (item.degree && item.fieldOfStudy) {
            const cleanFos = item.fieldOfStudy.trim().toLowerCase();
            const cleanDeg = item.degree.trim().toLowerCase();
            if (cleanDeg.includes(cleanFos)) {
                item.degree = item.degree.replace(new RegExp(item.fieldOfStudy.replace(/[.+*?^${}()|[\]\\]/g, '\\$&'), 'i'), "").replace(/^[|,\.\s\-–—]+|[|,\.\s\-–—]+$/g, "").trim() || "Degree";
            }
        }

        // 5. Strip dates accidentally attached to degree, fieldOfStudy, or institution
        const dateRangeMatch = (item.degree + " " + item.institution).match(/\b(\d{2}\/\d{4}|\d{4})\s*[-–to\s]+\s*(\d{2}\/\d{4}|\d{4}|present|current)\b/i);
        if (dateRangeMatch && (!item.startDate || !item.endDate)) {
            const dParts = dateRangeMatch[0].split(/[-–to\s]+/);
            if (!item.startDate) item.startDate = dParts[0];
            if (!item.endDate && !/present|current/i.test(dParts[dParts.length - 1])) item.endDate = dParts[dParts.length - 1];
        }
        item.degree = item.degree.replace(/\b(20\d\d|19\d\d)\s*[-–—to\s]+\s*(20\d\d|present|current)\b/gi, "").replace(/\b(20\d\d|19\d\d)\b/g, "").replace(/^[|,\.\s\-–—]+|[|,\.\s\-–—]+$/g, "").trim();
        item.fieldOfStudy = item.fieldOfStudy.replace(/\b(20\d\d|19\d\d)\s*[-–—to\s]+\s*(20\d\d|present|current)\b/gi, "").replace(/\b(20\d\d|19\d\d)\b/g, "").replace(/^[|,\.\s\-–—]+|[|,\.\s\-–—]+$/g, "").trim();

        // 6. Separate location if glued into institution: "Bangalore Institute of Technology.Bengaluru, India" or "Government Polytechnic, Turuvekere"
        const instLocMatch = item.institution.match(/[|,\.]\s*([A-Z][a-zA-Z\s]+,\s*(?:India|USA|UK)|Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Chennai|Turuvekere|Tiptur|Mysuru|Karnataka|India)\s*$/i);
        if (instLocMatch && instLocMatch.index !== undefined) {
            if (!item.location) {
                item.location = instLocMatch[1].replace(/^[|,\.\s]+/, "").trim();
            }
            item.institution = item.institution.substring(0, instLocMatch.index).trim();
        }
        item.institution = item.institution.replace(/^[|,\.\s\-–—]+|[|,\.\s\-–—]+$/g, "").trim();

        // 7. Detect degreeType
        const degLower = (item.degree + " " + item.fieldOfStudy).toLowerCase();
        if (!item.degreeType) {
            if (degLower.includes("10th") || degLower.includes("secondary") || degLower.includes("sslc") || degLower.includes("class x")) {
                item.degreeType = "10th";
            } else if (degLower.includes("12th") || degLower.includes("high school") || degLower.includes("puc") || degLower.includes("pre-university") || degLower.includes("class xii") || degLower.includes("hsc")) {
                item.degreeType = "12th";
            } else if (degLower.includes("bachelor") || degLower.includes("b.e") || degLower.includes("b.tech") || degLower.includes("diploma") || degLower.includes("b.sc") || degLower.includes("bca") || degLower.includes("b.com") || degLower.includes("ug")) {
                item.degreeType = "ug";
            } else if (degLower.includes("master") || degLower.includes("m.tech") || degLower.includes("m.s") || degLower.includes("mca") || degLower.includes("mba") || degLower.includes("m.com") || degLower.includes("pg")) {
                item.degreeType = "pg";
            }
        }

        return item.institution || item.degree;
    });

    parsed.projects = parsed.projects.filter((item: any) => {
        item.name = cleanField(item.name || "").trim();
        if (!item.name) return false;

        // Clean glued URLs from project name: "EchoWellhttps" or "EchoWellhttps://github.com..."
        item.name = item.name.replace(/https?.*$/i, "").replace(/[-–—|]\s*$/, "").trim();
        if (!item.name) return false;

        // Clean glued domain/tech tags from project name: "Design and Analysis...45 nm Technology"
        const domainTagRegex = /(?:(?<=[a-zA-Z0-9])|\b)(\d+\s*nm\s+Technology|FPGA\s+Implementation|IIoT\s*&\s*Embedded\s+Systems|Embedded\s*&\s*Solar\s+Power\s+Integration|IoT\s*&\s*Embedded\s+Systems|VLSI\s+Design|Embedded\s+Systems|Machine\s+Learning|Deep\s+Learning|Computer\s+Vision)\s*$/i;
        const domainMatch = item.name.match(domainTagRegex);
        if (domainMatch && domainMatch.index !== undefined) {
            item.technologies = Array.from(new Set([...(Array.isArray(item.technologies) ? item.technologies : []), domainMatch[1].trim()]));
            item.name = item.name.substring(0, domainMatch.index).trim();
        }

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

        // Ensure technologies is clean array
        if (typeof item.technologies === 'string') {
            item.technologies = item.technologies.split(',').map((t: string) => t.trim()).filter(Boolean);
        } else if (!Array.isArray(item.technologies)) {
            item.technologies = [];
        }
        item.technologies = item.technologies.map((t: any) => String(t).trim()).filter(Boolean);

        item.role = cleanField(item.role || "").replace(/^(?:role|position)\s*[:\-–—]\s*/i, "").trim() || "Developer";
        item.link = cleanField(item.link || "").trim();
        item.description = cleanField(item.description || "").trim();

        if (isAtsOptimization && (!item.description || !item.description.trim())) {
            const techStr = item.technologies.length > 0 ? ` utilizing ${item.technologies.join(", ")}` : "";
            item.description = `Designed and executed ${item.name}${techStr}, delivering robust and efficient outcomes.`;
        }
        return true;
    });

    const seenCerts = new Set<string>();
    const cleanedCerts: any[] = [];
    for (const item of (Array.isArray(parsed.certifications) ? parsed.certifications : [])) {
        if (!item || typeof item !== 'object') continue;
        item.name = cleanField(item.name || "").trim();
        if (!item.name || /^(&|and)\s*workshops/i.test(item.name) || /^(certifications|workshops|licenses|certificates)$/i.test(item.name.toLowerCase())) {
            continue;
        }

        // Check if item.name is a genuine wrapped fragment (e.g. "routing workflows.", "optimization.", "verification.")
        const isFragment = (
            /^(?:routing|optimization|verification|workflows|bottlenecks|implementation|synthesis)\b/i.test(item.name) ||
            (/^[a-z]/.test(item.name) && item.name.length < 50)
        ) &&
            (!item.issuer || item.issuer.trim() === "") &&
            (!item.description || item.description.trim() === "");

        if (isFragment && cleanedCerts.length > 0) {
            // Merge fragment into the previous certificate's description!
            const prev = cleanedCerts[cleanedCerts.length - 1];
            prev.description = (prev.description ? prev.description + " " : "") + item.name;
            continue;
        }

        if (item.name.endsWith(".")) {
            item.name = item.name.replace(/\.+$/, "").trim();
        }

        item.issuer = cleanField(item.issuer || "").trim();

        // If issuer was glued into name: "(DFE)EC-Council" or "ProgramRubicon"
        if (!item.issuer) {
            const gluedMatch = item.name.match(/^(.*?\))\s*([A-Z][a-zA-Z\-]+)$/) || item.name.match(/^(.*?Program)\s*([A-Z][a-zA-Z\-]+)$/);
            if (gluedMatch) {
                item.name = gluedMatch[1].trim();
                item.issuer = gluedMatch[2].trim();
            }
        }

        item.date = formatToMonthInput(item.date || "");

        const certKey = item.name.toLowerCase();
        if (seenCerts.has(certKey)) {
            continue;
        }
        seenCerts.add(certKey);

        item.description = cleanField(item.description || "");
        if (isAtsOptimization && (!item.description || !item.description.trim())) {
            item.description = `Completed practical coursework and demonstrated competencies in ${item.name}.`;
        }
        cleanedCerts.push(item);
    }
    parsed.certifications = cleanedCerts;

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

    // MIGRATION: If AI placed "Key Projects" or "Projects" in customSections instead of projects
    if (Array.isArray(parsed.customSections) && parsed.customSections.length > 0) {
        const projSectIndices: number[] = [];
        parsed.customSections.forEach((cs: any, idx: number) => {
            if (/^(key\s+projects?|projects?|technical\s+projects?|academic\s+projects?|featured\s+projects?|selected\s+projects?|personal\s+projects?)$/i.test((cs.title || "").trim())) {
                projSectIndices.push(idx);
                if (Array.isArray(cs.items) && cs.items.length > 0) {
                    const converted = cs.items.map((item: any) => ({
                        name: item.title || "Project",
                        role: item.subtitle || "Developer",
                        description: item.description || "",
                        technologies: [],
                        link: ""
                    }));
                    parsed.projects.push(...converted);
                }
            }
        });
        for (let i = projSectIndices.length - 1; i >= 0; i--) {
            parsed.customSections.splice(projSectIndices[i], 1);
        }
    }

    // PROJECT SANITIZATION & CLEANUP:
    // Remove bogus placeholder projects, tech stack headers, or sentence fragments ending in periods
    if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
        parsed.projects = parsed.projects.filter((p: any) => {
            if (!p || !p.name) return false;
            const name = p.name.trim();
            const nameLower = name.toLowerCase();
            // Discard dummy "Project" names
            if (nameLower === "project" || nameLower === "untitled project") return false;
            // Discard lines that are tech stack lists
            if (nameLower.startsWith("tech:") || nameLower.startsWith("technologies:") || nameLower.startsWith("stack:")) return false;
            // Discard sentence fragments ending with a period (these are descriptions, not titles)
            if (name.endsWith(".") || name.endsWith("...") || /^(built|developed|designed|implemented|engineered|created|voice-first|deep\s+learning|centralized|resume-aware|optimization|streamlit\s+web\s+interface)\b/i.test(name)) return false;
            // Discard standalone roles
            if (/^(?:developer|engineer|lead|full\s*stack\s+developer|ai\s+developer|software\s+engineer)$/i.test(name)) return false;
            return true;
        });

        // Clean each project's fields:
        parsed.projects.forEach((p: any) => {
            // Clean name: strip any leading numbering, URLs, or trailing punctuation
            p.name = p.name
                .replace(/^(?:project\s*\d*[:\s]|\d+[\.\)]\s*|[•\-*▪▫–—✦✓]\s*)/i, "")
                .replace(/https?:\/\/[^\s]+/gi, "")
                .replace(/[-–—|:]\s*$/, "")
                .trim();

            // If description has "Tech: ...", extract it into technologies
            if (p.description && /\b(?:tech|technologies|tools|stack)[:\s]+/i.test(p.description)) {
                const techMatch = p.description.match(/\b(?:tech|technologies|tools|stack)[:\s]+([^\n]+)/i);
                if (techMatch) {
                    const extractedTech = techMatch[1].split(/[,|]/).map((t: string) => t.trim()).filter(Boolean);
                    p.technologies = Array.from(new Set([...(p.technologies || []), ...extractedTech]));
                    p.description = p.description.replace(techMatch[0], "").trim();
                }
            }

            // Remove leading bullet from description if only "- Tech: ..." was removed
            if (p.description) {
                p.description = p.description.replace(/^[•\-*▪▫–—✦✓\s]+/, "").trim();
            }
        });
    }

    // RECOVERY: If parsed.projects is empty OR if multiple projects were collapsed into 1 giant project
    const singleProjHasCollapsedProjects = parsed.projects.length === 1 && (
        /(?:role|position)\s*:\s*(?:team\s+leader|developer|lead|engineer|designer)/i.test(parsed.projects[0].description || "") ||
        /\b(?:Braille\s+E-Reader|Smart\s+Parking|Automated\s+Name\s+Board)\b/i.test(parsed.projects[0].description || "")
    );

    if ((parsed.projects.length === 0 || singleProjHasCollapsedProjects) && rawText) {
        const fallback = generateResumeFallback({ resumeText: rawText });
        if (fallback.projects.length > 1 || (parsed.projects.length === 0 && fallback.projects.length > 0)) {
            parsed.projects = fallback.projects.filter((p: any) => {
                const nameLower = (p.name || "").toLowerCase().trim();
                return nameLower !== "project" && 
                       nameLower !== "untitled project" && 
                       !nameLower.startsWith("tech:") && 
                       !p.name.endsWith(".");
            });
        }
    }

    // RECOVERY: If raw text has certifications but AI returned empty array, recover from source
    if (parsed.certifications.length === 0 && rawText) {
        const fallback = generateResumeFallback({ resumeText: rawText });
        if (fallback.certifications.length > 0) {
            parsed.certifications = fallback.certifications;
        }
    }

    // RECOVERY: If raw text has skills but AI returned empty array, recover from source
    if (parsed.skills.length === 0 && rawText) {
        const fallback = generateResumeFallback({ resumeText: rawText });
        if (fallback.skills.length > 0) {
            parsed.skills = fallback.skills;
        }
    }

    // RECOVERY: If raw text has custom sections (awards, publications, coursework) not captured,
    // ONLY recover if rawText contains an unmistakable standalone section heading
    if (rawText) {
        const fallback = generateResumeFallback({ resumeText: rawText });
        if (fallback.customSections && fallback.customSections.length > 0) {
            for (const fbSect of fallback.customSections) {
                const hasExplicitHeader = 
                    (fbSect.title.includes("Volunteer") && /(?:^|\n)\s*(?:VOLUNTEER\s+EXPERIENCE|VOLUNTEERING|COMMUNITY\s+SERVICE|VOLUNTEER\s+WORK|LEADERSHIP\s*(?:&|and)\s*VOLUNTEERING)\b/i.test(rawText)) ||
                    (fbSect.title.includes("Awards") && /(?:^|\n)\s*(?:AWARDS|HONORS|ACHIEVEMENTS)\b/i.test(rawText)) ||
                    (fbSect.title.includes("Publications") && /(?:^|\n)\s*(?:PUBLICATIONS|RESEARCH\s+PAPERS|PATENTS)\b/i.test(rawText)) ||
                    (fbSect.title.includes("Coursework") && /(?:^|\n)\s*(?:RELEVANT\s+COURSEWORK|KEY\s+COURSEWORK|COURSEWORK)\b/i.test(rawText));

                if (!hasExplicitHeader) continue;

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

    // SANITIZATION: If parsed.customSections has "Volunteer" or "Leadership" but the source resume NEVER had a dedicated volunteer section header
    if (Array.isArray(parsed.customSections) && parsed.customSections.length > 0 && rawText) {
        const hasDedicatedVolunteerHeader = /(?:^|\n)\s*(?:VOLUNTEER\s+EXPERIENCE|VOLUNTEERING|COMMUNITY\s+SERVICE|VOLUNTEER\s+WORK|LEADERSHIP\s*(?:&|and)\s*VOLUNTEERING)\b/i.test(rawText);
        if (!hasDedicatedVolunteerHeader) {
            parsed.customSections = parsed.customSections.filter((cs: any) => {
                const titleLower = (cs.title || "").toLowerCase();
                return !(titleLower.includes("volunteer") || titleLower === "leadership" || titleLower.includes("extracurricular"));
            });
        }
    }

    // Fix 6: Skills blocklist — filter out section headers parsed as skills
    const BANNED_SKILL_NAMES = new Set([
        "declaration", "education", "projects", "experience", "internship",
        "internships", "summary", "objective", "hobbies", "interests",
        "references", "personal details", "profile", "training",
        "certifications", "workshops", "achievements", "awards",
        "work experience", "key projects", "academic projects",
        "volunteer", "extracurricular", "activities", "languages",
    ]);
    if (Array.isArray(parsed.skills)) {
        parsed.skills = parsed.skills.filter((s: any) => {
            const name = (s.name || "").trim().toLowerCase().replace(/\.+$/, "");
            return name.length > 0 && !BANNED_SKILL_NAMES.has(name);
        });
    }

    // Fix 2B: Reclassify internship entries from projects → workExperience
    // Detect projects that are actually internships (section header leak or internship-named entries)
    if (Array.isArray(parsed.projects) && parsed.projects.length > 0 && rawText) {
        const hasInternshipHeader = /(?:^|\n)\s*(?:INTERNSHIP[S]?|INTERNSHIP\s+EXPERIENCE|INDUSTRIAL\s+TRAINING)\b/i.test(rawText);
        const projectsToRemove: number[] = [];

        parsed.projects.forEach((proj: any, idx: number) => {
            const projName = (proj.name || "").trim();
            const projNameLower = projName.toLowerCase();
            const projDesc = (proj.description || "").trim();

            // Detect if this "project" is actually an internship entry
            const isInternshipProject = (
                // Name is exactly a section header like "INTERNSHIP" or "INTERNSHIPS"
                /^(internship[s]?|internship\s+experience|industrial\s+training|training)$/i.test(projNameLower) ||
                // Name contains "Intern" as a job title pattern
                /\bintern\b/i.test(projNameLower) ||
                // Source resume has INTERNSHIP section and description contains company+date patterns
                (hasInternshipHeader && /\b\d{2}\/\d{4}\b/.test(projDesc) && /\b(pvt|ltd|infotech|technologies|solutions|engineering|company)\b/i.test(projDesc))
            );

            if (!isInternshipProject) return;

            projectsToRemove.push(idx);

            // Try to split merged internship blobs into individual entries
            // Pattern: detect company boundaries like "CompanyName City" or date patterns
            const descLines = projDesc.split(/\n/).map((l: string) => l.trim()).filter(Boolean);
            
            // Try to extract individual internships from merged description
            // Look for patterns like "Company Name City" or "Role MM/YYYY" boundaries
            const internshipEntries: any[] = [];
            let currentEntry: any = null;
            const companyPattern = /^([A-Z][a-zA-Z\s]+(?:Infotech|Technologies|Ltd|Pvt|Solutions|Engineerings?|Enterprises|Corp|Inc|LLC|Systems|Services))[\s,.-]+([A-Za-z]+(?:,\s*India)?)/i;
            const roleDatePattern = /^(.+?)\s+(\d{2}\/\d{4}|\d{4})\s*[-–to\s]+(\d{2}\/\d{4}|\d{4}|present|current)/i;

            // Simple heuristic: if description mentions multiple companies, split
            const companyMentions = projDesc.match(/\b([A-Z][a-zA-Z]+\s+(?:Infotech|Technologies|Ltd|Pvt|Solutions|Engineerings?|Enterprises))\b/gi) || [];
            const uniqueCompanies = [...new Set(companyMentions.map((c: string) => c.trim().toLowerCase()))];

            if (uniqueCompanies.length >= 2) {
                // Multiple companies found — split by company boundaries
                const chunks: string[] = [];
                let remaining = projDesc;
                for (let i = 1; i < companyMentions.length; i++) {
                    const splitIdx = remaining.indexOf(companyMentions[i]);
                    if (splitIdx > 0) {
                        chunks.push(remaining.substring(0, splitIdx).trim());
                        remaining = remaining.substring(splitIdx).trim();
                    }
                }
                chunks.push(remaining.trim());

                for (const chunk of chunks) {
                    const compMatch = chunk.match(/([A-Z][a-zA-Z\s]+(?:Infotech|Technologies|Ltd|Pvt|Solutions|Engineerings?|Enterprises))/i);
                    const dateMatch = chunk.match(/(\d{2}\/\d{4}|\d{4})\s*[-–to\s]+(\d{2}\/\d{4}|\d{4}|present|current)/i);
                    internshipEntries.push({
                        company: compMatch ? compMatch[1].trim() : "",
                        position: projNameLower.includes("intern") ? projName : (projName.replace(/^internship[s]?\s*/i, "").trim() || "Intern"),
                        location: "",
                        startDate: dateMatch ? dateMatch[1] : "",
                        endDate: dateMatch ? dateMatch[2] : "",
                        current: dateMatch ? /present|current/i.test(dateMatch[2]) : false,
                        description: chunk.replace(compMatch?.[0] || "", "").replace(dateMatch?.[0] || "", "").replace(/^[\s,.-]+|[\s,.-]+$/g, "").trim()
                    });
                }
            } else {
                // Single internship or can't split — move as one entry
                internshipEntries.push({
                    company: "",
                    position: projNameLower.includes("intern") ? projName : (projName.replace(/^internship[s]?\s*/i, "").trim() || "Intern"),
                    location: "",
                    startDate: "",
                    endDate: "",
                    current: false,
                    description: projDesc
                });
            }

            // Tag each entry with "Internship" in position if not already present
            for (const entry of internshipEntries) {
                if (!/intern/i.test(entry.position)) {
                    entry.position = entry.position ? `${entry.position} — Internship` : "Internship";
                }
                parsed.workExperience.push(entry);
            }
        });

        // Remove reclassified entries from projects (in reverse order to preserve indices)
        for (let i = projectsToRemove.length - 1; i >= 0; i--) {
            parsed.projects.splice(projectsToRemove[i], 1);
        }
    }

    // Fix 2B (continued): Ensure ALL workExperience entries from internship sections have "Intern" tag
    if (Array.isArray(parsed.workExperience) && rawText) {
        const hasInternshipHeader = /(?:^|\n)\s*(?:INTERNSHIP[S]?|INTERNSHIP\s+EXPERIENCE|INDUSTRIAL\s+TRAINING)\b/i.test(rawText);
        if (hasInternshipHeader) {
            for (const job of parsed.workExperience) {
                const pos = (job.position || "").trim();
                // If this entry's position text appears near the INTERNSHIP section in rawText, tag it
                if (pos && !/intern/i.test(pos)) {
                    // Check if this position text is mentioned near the INTERNSHIP header in raw text
                    const posEscaped = pos.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const nearInternshipPattern = new RegExp(`INTERNSHIP[S]?[\\s\\S]{0,500}${posEscaped}`, 'i');
                    if (nearInternshipPattern.test(rawText)) {
                        job.position = `${pos} — Internship`;
                    }
                }
            }
        }
    }

    // Fix 1: Recover missing education entries (e.g. MBA dropped by AI)
    if (Array.isArray(parsed.education) && rawText) {
        const DEGREE_KEYWORDS = [
            { pattern: /\b(MBA|M\.?B\.?A|PGDM|Master\s+of\s+Business\s+Administration)\b/i, label: "MBA" },
            { pattern: /\b(M\.?Tech|M\.?E\.?(?:\s|$)|Master\s+of\s+Technology)\b/i, label: "M.Tech" },
            { pattern: /\b(M\.?Com|Master\s+of\s+Commerce)\b/i, label: "M.Com" },
            { pattern: /\b(M\.?Sc|Master\s+of\s+Science)\b/i, label: "M.Sc" },
            { pattern: /\b(MCA|M\.?C\.?A)\b/i, label: "MCA" },
            { pattern: /\b(B\.?Tech|B\.?E\.?(?:\s|$)|Bachelor\s+of\s+Technology|Bachelor\s+of\s+Engineering)\b/i, label: "B.Tech" },
            { pattern: /\b(B\.?Com|Bachelor\s+of\s+Commerce)\b/i, label: "B.Com" },
            { pattern: /\b(B\.?Sc|Bachelor\s+of\s+Science)\b/i, label: "B.Sc" },
            { pattern: /\b(BCA|B\.?C\.?A)\b/i, label: "BCA" },
            { pattern: /\b(BBA|B\.?B\.?A)\b/i, label: "BBA" },
            { pattern: /\b(B\.?Pharm|Pharm\.?D)\b/i, label: "B.Pharm" },
            { pattern: /\b(B\.?Arch)\b/i, label: "B.Arch" },
            { pattern: /\b(Diploma|Polytechnic)\b/i, label: "Diploma" },
            { pattern: /\b(PUC|Pre-University|HSC|Class\s*XII|12th)\b/i, label: "12th" },
            { pattern: /\b(SSLC|Class\s*X(?:$|\s)|10th)\b/i, label: "10th" },
        ];

        for (const dk of DEGREE_KEYWORDS) {
            if (!dk.pattern.test(rawText)) continue;

            // Check if any existing education entry already covers this degree
            const alreadyCovered = parsed.education.some((e: any) => {
                const allEduText = `${e.degree || ""} ${e.fieldOfStudy || ""} ${e.institution || ""} ${e.degreeType || ""}`.toLowerCase();
                return dk.pattern.test(allEduText) || allEduText.includes(dk.label.toLowerCase());
            });

            if (!alreadyCovered) {
                // Run fallback parser to recover the missing entry
                const fallback = generateResumeFallback({ resumeText: rawText });
                if (fallback.education.length > 0) {
                    for (const fbEdu of fallback.education) {
                        const fbText = `${fbEdu.degree || ""} ${fbEdu.fieldOfStudy || ""} ${fbEdu.institution || ""}`.toLowerCase();
                        if (dk.pattern.test(fbText) || fbText.includes(dk.label.toLowerCase())) {
                            // Verify this specific entry isn't already present
                            const alreadyPresent = parsed.education.some((e: any) =>
                                (e.institution || "").toLowerCase().trim() === (fbEdu.institution || "").toLowerCase().trim()
                            );
                            if (!alreadyPresent) {
                                parsed.education.push(fbEdu);
                            }
                        }
                    }
                }
                break; // Only run fallback once
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
                // Attach PDF binary part for multimodal visual extraction if file size is under 15MB
                if (resumeFile.size < 15 * 1024 * 1024) {
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
                        }
                        if (buffer.length < 15 * 1024 * 1024) {
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
4. TWO-COLUMN, SIDEBAR & TABLE EXTRACTION: Carefully read multi-column, sidebar, and tabular layouts. Separate position/role (e.g. "Quality Control Intern"), dates (e.g. "2024-01" to "2024-04"), company (e.g. "Sansera Engineering Ltd"), and location (e.g. "Bengaluru") cleanly. Never glue company and location into one word. Format work experience and certification dates as HTML5 YYYY-MM (e.g. "2024-01").
5. FRESHER / CANDIDATE WITHOUT INDUSTRY WORK EXPERIENCE: If the candidate has no corporate employment or industry jobs listed in their resume (e.g. they only have academic projects or degrees), set "workExperience": []. Do not invent corporate jobs.
5b. INTERNSHIP / TRAINING SECTION HANDLING:
   - Resume sections titled "INTERNSHIP", "INTERNSHIPS", "INTERNSHIP EXPERIENCE", "INDUSTRIAL TRAINING", or "TRAINING" MUST be extracted into "workExperience" (NOT into "projects").
   - Each internship listed under such a section is a SEPARATE workExperience entry with its own company, position, startDate, endDate, location, and description.
   - CRITICAL INTERNSHIP TAGGING: If the position/role came from an internship section, the "position" field MUST include the word "Internship" or "Intern" in it (e.g. "Jr Analyst Finance and Accounts — Internship", "Accounting Intern"). If the original title already contains "Intern", keep it as-is.
   - NEVER merge multiple internships into a single entry.
   - NEVER place internships into "projects".
6. KEY PROJECTS & COMPREHENSIVE PROJECTS SEPARATION:
   - Resumes frequently label their project section as "KEY PROJECTS", "PROJECTS", "TECHNICAL PROJECTS", "ACADEMIC PROJECTS", "PERSONAL PROJECTS", or "FEATURED PROJECTS".
   - You MUST ALWAYS extract EVERY SINGLE project from any of these sections into the top-level "projects" array.
   - ABSOLUTE ZERO-COLLAPSE RULE: NEVER merge, collapse, or concatenate multiple projects into a single project! Even if projects do not contain GitHub links, each project title (e.g. "Design and Analysis of Efficient Phase-Locked Loop (PLL) for Fast Acquisition", "Braille E-Reader Prototype", "Smart Parking System Using IIoT", "Automated Name Board Using IIoT") is an INDEPENDENT project entry.
   - STRICT 5-FIELD SEPARATION FOR EACH PROJECT:
     * "name": Extract the clean, pure project title ONLY (this is displayed in bold mark in the resume). Strip leading numbers (e.g. "1. "), URLs, and domain/tech tags (e.g. "45 nm Technology", "FPGA Implementation"). NEVER glue tech tags or roles into "name".
     * "link": Extract the project URL or GitHub repository link into "link" (leave empty "" if unstated).
     * "role": Extract the candidate's specific role on this project (e.g. "Layout Designer", "Team Leader", "Full Stack Developer"). Strip any leading "Role: " prefix.
     * "technologies": Extract the tools, technologies, and domain tags used into an array of strings (e.g. ["45 nm Technology"], ["FPGA Implementation"], ["IIoT & Embedded Systems"], ["Embedded & Solar Power Integration"], ["React", "Node.js"]). NEVER put descriptive sentences or hyphenated terms like "MERN-stack dashboard" into "technologies"!
     * "description": Extract all descriptive points, achievements, and metrics belonging exclusively to THIS project, formatted as bullet points. NEVER include other projects or subsequent project headers inside "description"!
   - CRITICAL: Fill ONLY the data that the candidate's uploaded resume/portfolio contains. Zero fabrication, zero adding anything from anywhere.
   - CRITICAL: NEVER place education entries or "Key Projects" into "customSections". Projects belong exclusively in the "projects" array.
7. UNIVERSAL DOMAIN SUPPORT & PROFESSIONAL TITLE: The candidate may belong to ANY industry or profession (Civil Engineering, Mechanical Engineering, Electrical / VLSI, Biotechnology, Medicine / Healthcare, Business / Finance, Sales / Marketing, Graphic Design, Law, Software, Education, Trades, etc.).
   - NEVER bias towards "Full Stack Developer", "Software Engineer", or any single tech track.
   - Extract the candidate's actual professional title or degree from their resume header under their name (e.g. "Civil Site Engineer", "Mechanical Design Engineer", "Financial Analyst", "Marketing Executive", "Electronics & Communication Engineer") into "personalInfo.title".
8. CUSTOM & ADDITIONAL SECTIONS: If the source resume contains GENUINE, DEDICATED sections such as Awards, Honors, Achievements, Publications, Research, Patents, Key Coursework, extract them into the 'customSections' array so NO information is lost.
   - CRITICAL: Do NOT place "Key Projects" or any project entries into "customSections" (projects must always be in the "projects" array).
   - CRITICAL VOLUNTEER & LEADERSHIP RULE: ONLY create a section in "customSections" for Volunteering/Leadership if the source resume contains a GENUINE, STANDALONE SECTION HEADER (e.g. a dedicated "VOLUNTEER EXPERIENCE", "VOLUNTEERING", or "COMMUNITY SERVICE" heading). NEVER create a "Volunteer & Leadership" section from mentions of leadership, extracurriculars, or volunteering inside project descriptions, work experience, or summary! If there is no dedicated volunteer section header in the uploaded resume, do NOT create one.
9. CERTIFICATIONS & WORKSHOPS INTEGRITY:
   - Extract each genuine certification or workshop as a distinct item.
   - NEVER treat category subheadings (e.g. "Workshops", "Courses", "Certifications", "Technical Training", "Online Courses") as certificate items.
   - ZERO-MERGE RULE: NEVER merge multiple certifications together! NEVER treat subsequent certification titles, bullet points, or workshop names as the description of an earlier certification. Every certificate listed in the resume must be its own INDEPENDENT entry in the 'certifications' array.
   - EMPTY DESCRIPTION RULE: If the source resume does not provide a description or bullet points for a certification/workshop (e.g. it is just a list of certificate names), set "description": "" (empty string). NEVER invent or fabricate descriptions during resume autofill; only ATS AI Optimization enriches descriptions if explicitly triggered later.
   - CRITICAL LINE WRAP & COLON SEPARATION: When a certification or workshop contains a colon (':') or multi-line text (e.g. "• Physical Design Workshop: Hands-on experience in floorplanning, placement, clock tree synthesis (CTS), and \n routing workflows."), the certificate "name" is strictly the title before the colon ("Physical Design Workshop"). The full description after the colon and across wrapped lines MUST be captured in "description".
   - ZERO FRAGMENTATION: NEVER create a separate certification item for wrapped description fragments or words ending in a period (such as "routing workflows.", "optimization.", or "verification."). Never duplicate certification entries.
   - Split cleanly into:
     * "name": The clean certification or workshop title (without any trailing period).
     * "issuer": Issuing organization or institution (e.g. "Bangalore Institute of Technology", "EC-Council", "Rubicon"). Leave empty "" if not specified.
     * "date": HTML5 YYYY-MM or YYYY if present (e.g. "2024-05", "2024").
     * "description": If the certification or workshop has details or bullet points describing what was covered or learned, capture them completely in "description". If unstated in source resume, leave empty "".
   - Adjust each item cleanly according to this format without spoiling anything. Never duplicate certification entries.
10. STRICT EDUCATION DATA ISOLATION (ZERO FIELD OVERLAP):
   - In "education", each field must strictly hold ONLY its specific data with ZERO overlap:
     * "degree": ONLY the degree/qualification name (e.g. "B.E.", "Bachelor of Engineering", "Diploma", "SSLC / Class X", "High School"). NEVER include the college name, CGPA, percentage, or dates in "degree".
     * "fieldOfStudy": ONLY the major/specialization (e.g. "Information Science & Engineering", "Civil Engineering", "Accounting"). Leave empty "" if not applicable (such as for 10th standard/SSLC).
     * "institution": ONLY the school/college/university name (e.g. "Bangalore Institute of Technology", "Government Polytechnic Turuvekere"). NEVER include location, city, dates, or CGPA in "institution".
     * "cgpa": Strictly numeric CGPA value only (e.g. "6.91", "9.35"). NEVER put college name or text into "cgpa". Leave empty "" if not present.
     * "percentage": Strictly percentage value only (e.g. "65.92%", "88%"). Leave empty "" if not present.
     * "location": Strictly the city/state/country of the institution (e.g. "Bengaluru, India", "Turuvekere, India").
     * "degreeType": Cleanly classify as "10th", "12th", "ug", or "pg".
     * "description": Academic honors, distinctions, or coursework.

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
    "title": "Candidate Professional Title / Degree / Field of study directly from resume header (e.g. Civil Site Engineer, Mechanical Design Engineer, Financial Analyst, Marketing Executive, B.E. Graduate). Never default to 'Full Stack Developer'.",
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
      "company": "Company Name (clean name only, no glued location)",
      "position": "Job Title (clean title only, no glued dates)",
      "location": "Job Location (City, Country)",
      "startDate": "Start Date in HTML5 format YYYY-MM (e.g. 2024-01)",
      "endDate": "End Date in HTML5 format YYYY-MM (e.g. 2024-04), or empty if current",
      "current": true or false,
      "description": "Bulleted list of achievements starting with - (separate bullet points with newlines, preserving all original metrics, tools, and results)"
    }
  ],
  "education": [
    {
      "institution": "University/School Name ONLY (e.g. Bangalore Institute of Technology, Government Polytechnic Turuvekere)",
      "degree": "Degree/Qualification ONLY (e.g. B.E. / Bachelor of Engineering / Diploma / SSLC)",
      "fieldOfStudy": "Major/Specialization ONLY (e.g. Information Science & Engineering / Civil Engineering / Finance)",
      "location": "City, State or Country ONLY (e.g. Bengaluru, India)",
      "startDate": "Start Date or year (e.g. 2020)",
      "endDate": "End Date or year (e.g. 2024)",
      "cgpa": "Strictly numeric CGPA (e.g. 6.91 or 9.35, leave empty \"\" if not present)",
      "percentage": "Strictly percentage score (e.g. 65.92%, leave empty \"\" if not present)",
      "degreeType": "10th or 12th or ug or pg",
      "description": "Coursework, honors, or achievements"
    }
  ],
  "projects": [
    {
      "name": "Project Name (clean title only, NO URLs glued)",
      "description": "Details about the project, metrics, and problems resolved...",
      "technologies": ["Tool1", "Tool2"],
      "link": "Project URL or GitHub repository",
      "role": "Candidate's specific role"
    }
  ],
  "skills": [
    {
      "name": "Skill Name (e.g. AutoCAD, Python, Financial Modeling, React)",
      "level": "Advanced or Intermediate or Expert",
      "category": "Domain category (e.g. Core Engineering, Software, Tools, Management)"
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
      "name": "Certification or Workshop Name",
      "issuer": "Issuer or Organization (e.g. EC-Council, Rubicon, AWS, PMI)",
      "date": "Issue Date in YYYY-MM or YYYY (e.g. 2023-05 or 2023)",
      "description": "Scope, hands-on skills, or workshop details",
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
