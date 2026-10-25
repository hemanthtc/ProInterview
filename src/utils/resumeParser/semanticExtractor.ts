import { generateWithFallback, parseJsonFromModel } from "@/utils/gemini";
import { CanonicalEducation, CanonicalPersonalInfo, CanonicalProject, CanonicalResume, CanonicalWorkExperience, CanonicalSkill, CanonicalLanguage, CanonicalCertification, CanonicalCustomSection, DocumentExtractionResult, ExtractionWarning } from "./types";
import { detectSections, DetectedSection } from "./sectionDetector";
import { classifyEducationTier, extractScoreDetails, separateDegreeAndField } from "./educationClassifier";

/**
 * Normalizes date strings to HTML5 YYYY-MM or YYYY format.
 */
export function formatToStandardDate(dateStr: string): string {
    if (!dateStr) return "";
    const clean = dateStr.trim();
    if (/present|current|ongoing/i.test(clean)) return "Present";

    // MM/YYYY or M/YYYY
    const mmYyyy = clean.match(/^(\d{1,2})\/(\d{4})$/);
    if (mmYyyy) {
        return `${mmYyyy[2]}-${mmYyyy[1].padStart(2, "0")}`;
    }

    // YYYY-MM
    if (/^\d{4}-\d{2}$/.test(clean)) {
        return clean;
    }

    // Month YYYY (e.g. "Jan 2024", "January 2024")
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

    // YYYY only (e.g. "2024")
    if (/^\d{4}$/.test(clean)) {
        return clean;
    }

    return clean;
}

/**
 * Builds the comprehensive zero-fabrication prompt for Gemini.
 */
export function buildExtractionPrompt(rawText: string, hasBinaryPart: boolean): string {
    return `You are an expert resume parsing engine. Your objective is 100% FACTUAL EXTRACTION and zero fabrication.

STRICT EXTRACTION RULES:
1. ZERO FABRICATION: Do NOT invent, guess, infer, or fabricate any missing information. If an institution, degree, score, company, title, date, skill, or project is not stated in the source, leave it as an empty string ("") or empty array ([]).
2. PRESERVE ALL RECORDS:
   - Extract ALL education qualifications as separate entries in "education". If the candidate has 3, 4, 5+ qualifications (e.g. 10th/SSLC, 12th/PUC, ITI, Diploma, Bachelor's, Master's, PhD), extract EVERY ONE of them. NEVER merge or omit any qualification!
   - Extract ALL employment and internship records as separate entries in "workExperience". If an internship is present, include it in "workExperience".
   - Extract ALL projects as separate entries in "projects". NEVER merge multiple projects together!
   - Extract ALL certifications, licenses, and workshops as separate entries in "certifications".
   - Extract ALL skills and languages.
3. PRESERVE UNRECOGNIZED SECTIONS: If the resume contains custom or extra sections (e.g. Awards, Publications, Patents, Volunteer Work, Research, Coursework, Speaking Engagements), capture them cleanly in "customSections" with their original section title.
4. CLEAN FIELD ISOLATION:
   - "education.degree": The qualification name ONLY (e.g. "B.E.", "Diploma", "SSLC / Class X", "M.Tech"). NEVER put institution, dates, or scores in "degree".
   - "education.fieldOfStudy": The major or specialization ONLY (e.g. "Computer Science", "Information Science").
   - "education.institution": The school/college/university name ONLY. NEVER put location or CGPA in "institution".
   - "education.cgpa" / "percentage": Strictly numeric score values.
   - "workExperience.company": The company name ONLY.
   - "workExperience.position": The job title ONLY.
   - "workExperience.startDate" & "endDate": Dates in YYYY-MM or YYYY format. If currently working, set "current": true and "endDate": "".
   - "projects.name": Clean project title ONLY.
   - "projects.technologies": Array of tools/technologies used.
5. DOMAIN AGNOSTIC: The candidate may be an engineer, accountant, doctor, lawyer, designer, technician, manager, teacher, or any other profession. Do NOT bias toward software engineering or default any title to "Full Stack Developer".

${rawText ? `DOCUMENT TEXT:\n${rawText}\n` : ""}
${hasBinaryPart ? `[Refer to the attached binary document part for visual layout, tables, and multi-column contents]` : ""}

Return ONLY a valid JSON object matching this schema:
{
  "personalInfo": {
    "name": "Full name",
    "title": "Professional title or headline",
    "email": "Email address",
    "phone": "Phone number",
    "location": "City, State/Country",
    "website": "Portfolio or website URL",
    "linkedin": "LinkedIn profile URL",
    "github": "GitHub profile URL",
    "summary": "Professional summary or objective text if present in source"
  },
  "workExperience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "location": "Location",
      "startDate": "YYYY-MM or YYYY",
      "endDate": "YYYY-MM or YYYY or empty if current",
      "current": true or false,
      "description": "Responsibilities and bullet points"
    }
  ],
  "education": [
    {
      "institution": "School or University Name",
      "degree": "Degree or Qualification Name",
      "fieldOfStudy": "Major or Specialization",
      "location": "Location",
      "startDate": "Start date or year",
      "endDate": "End date or year",
      "cgpa": "CGPA if present",
      "percentage": "Percentage if present",
      "degreeType": "10th or 12th or vocational or diploma or ug or pg or phd or other",
      "description": "Honors or coursework if present"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Project description and achievements",
      "technologies": ["Tool1", "Tool2"],
      "link": "Project URL or GitHub link",
      "role": "Role"
    }
  ],
  "skills": [
    {
      "name": "Skill name",
      "level": "Beginner / Intermediate / Advanced / Expert or empty",
      "category": "Domain category"
    }
  ],
  "languages": [
    {
      "name": "Language name",
      "proficiency": "Proficiency level"
    }
  ],
  "certifications": [
    {
      "name": "Certification or Workshop Name",
      "issuer": "Issuing organization",
      "date": "Issue date",
      "link": "Credential link",
      "description": "Details or topics covered"
    }
  ],
  "customSections": [
    {
      "title": "Section Title",
      "items": [
        {
          "title": "Item Title",
          "subtitle": "Subtitle or organization",
          "date": "Date or year",
          "description": "Description"
        }
      ]
    }
  ]
}

No markdown outside JSON. Must parse cleanly with JSON.parse.`;
}

/**
 * Deterministic regex-based fallback extractor for offline / rate-limited situations.
 * Strictly adheres to zero fabrication.
 */
export function extractDeterministicResumeData(rawText: string, sections: DetectedSection[]): CanonicalResume {
    const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);

    // Personal Info
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const linkedinMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/);
    const githubMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/);
    const allUrls = rawText.match(/https?:\/\/[^\s,;|()]+/gi) || [];
    const website = allUrls.find(u => !/linkedin\.com|github\.com|twitter\.com|x\.com/i.test(u)) || "";

    // Candidate Name: first line with letters, not a header or contact line
    let name = "";
    for (const l of lines.slice(0, 10)) {
        if (l.length >= 2 && l.length <= 40 &&
            !l.includes("@") && !l.includes("http") && !/^\+?\d/.test(l) &&
            !/^(resume|curriculum|cv|profile|summary|contact)/i.test(l)) {
            name = l;
            break;
        }
    }

    // Title: line immediately after name or matching role keywords
    let title = "";
    const nameIdx = lines.indexOf(name);
    if (nameIdx !== -1 && lines[nameIdx + 1]) {
        const nextL = lines[nameIdx + 1];
        if (nextL.length < 60 && !nextL.includes("@") && !nextL.includes("http") && !/^\+?\d/.test(nextL) && !/^(skills|experience|education)/i.test(nextL)) {
            title = nextL;
        }
    }

    // Location
    let location = "";
    const locMatch = rawText.match(/\b([A-Z][a-zA-Z\s]+,\s*(?:[A-Z][a-zA-Z\s]+|India|USA|UK|Canada|Germany|Singapore|UAE|Spain|France|Italy|Australia))\b/);
    if (locMatch) {
        location = locMatch[1].trim();
    }

    // Summary
    let summary = "";
    const summarySec = sections.find(s => s.type === "summary");
    if (summarySec) {
        summary = summarySec.rawContent.replace(/\s+/g, " ").trim();
    }

    // Education extraction from section
    const education: CanonicalEducation[] = [];
    const eduSections = sections.filter(s => s.type === "education");
    for (const eduSec of eduSections) {
        const eduLines = eduSec.rawContent.split("\n").map(l => l.trim()).filter(Boolean);
        let currentEdu: Partial<CanonicalEducation> | null = null;

        for (let i = 0; i < eduLines.length; i++) {
            const line = eduLines[i];
            const isInstLine = /\b(institute|institution|university|universidad|universität|université|college|colegio|polytechnic|politécnica|school|escuela|academy|academia|vidyalaya|mahavidyalaya|campus|faculty|facultad)\b/i.test(line);
            const isDegreeLine = /\b(b\.?e\b|b\.?tech\b|diploma\b|sslc\b|10th\b|12th\b|hsc\b|puc\b|bachelor\b|master\b|m\.?tech\b|b\.?sc\b|m\.?sc\b|b\.?com\b|m\.?com\b|bba\b|mba\b|ph\.?d\b|iti\b|trade)\b/i.test(line);
            const isGovtOrSchool = /\b(government|govt|dept|department|ministry)\b/i.test(line);

            // Table row support: if line contains pipe dividers (e.g. from DOCX table), extract cell by cell
            if (line.includes("|")) {
                const parts = line.split("|").map(p => p.trim()).filter(Boolean);
                let deg = "";
                let inst = "";
                let sDate = "";
                let eDate = "";
                let cgpa = "";
                let pct = "";

                for (const part of parts) {
                    const isDeg = /\b(b\.?e\b|b\.?tech\b|diploma\b|sslc\b|10th\b|12th\b|hsc\b|puc\b|bachelor\b|master\b|m\.?tech\b|b\.?sc\b|m\.?sc\b|b\.?com\b|m\.?com\b|bba\b|mba\b|ph\.?d\b|iti\b|trade)\b/i.test(part);
                    const isIns = /\b(institute|institution|university|universidad|universität|université|college|colegio|polytechnic|politécnica|school|escuela|academy|academia|vidyalaya|mahavidyalaya|campus|faculty|facultad)\b/i.test(part);
                    const dtMatch = part.match(/\b(\d{1,2}\/\d{4}|\d{4})\s*[-–to\s]+\s*(\d{1,2}\/\d{4}|\d{4}|present|current)\b/i);
                    const scInfo = extractScoreDetails(part);

                    if (scInfo.scoreValue) {
                        if (scInfo.scoreType === "cgpa" || scInfo.scoreType === "gpa") cgpa = scInfo.scoreValue;
                        else if (scInfo.scoreType === "percentage") pct = scInfo.scoreValue;
                    } else if (dtMatch) {
                        sDate = formatToStandardDate(dtMatch[1]);
                        eDate = formatToStandardDate(dtMatch[2]);
                    } else if (isDeg && !deg) {
                        deg = part;
                    } else if (isIns && !inst) {
                        inst = part;
                    } else if (!inst && !isDeg) {
                        inst = part;
                    }
                }

                if (deg || inst) {
                    if (currentEdu && (currentEdu.institution || currentEdu.degree)) {
                        education.push(finalizeEducation(currentEdu, education.length));
                        currentEdu = null;
                    }
                    education.push(finalizeEducation({
                        degree: deg || "Degree",
                        institution: inst || "Institution",
                        startDate: sDate,
                        endDate: eDate,
                        cgpa,
                        percentage: pct,
                        description: ""
                    }, education.length));
                    continue;
                }
            }

            // If currentEdu is open, missing institution, and this line looks like an institution name, assign it
            if (currentEdu && !currentEdu.institution && (isInstLine || isGovtOrSchool || (!isDegreeLine && !extractScoreDetails(line).scoreValue && line.length < 90))) {
                currentEdu.institution = line;
                const scoreInfo = extractScoreDetails(line);
                if (scoreInfo.scoreType === "cgpa" || scoreInfo.scoreType === "gpa") {
                    currentEdu.cgpa = scoreInfo.scoreValue;
                } else if (scoreInfo.scoreType === "percentage") {
                    currentEdu.percentage = scoreInfo.scoreValue;
                }
                continue;
            }

            if (isDegreeLine || (isInstLine && !currentEdu)) {
                if (currentEdu && (currentEdu.institution || currentEdu.degree)) {
                    education.push(finalizeEducation(currentEdu, education.length));
                }

                currentEdu = {
                    institution: (isInstLine && !isDegreeLine) ? line : "",
                    degree: isDegreeLine ? line : "",
                    fieldOfStudy: "",
                    location: "",
                    startDate: "",
                    endDate: "",
                    cgpa: "",
                    percentage: "",
                    description: ""
                };

                // Extract date from this line if present
                const dateMatch = line.match(/\b(\d{1,2}\/\d{4}|\d{4})\s*[-–to\s]+\s*(\d{1,2}\/\d{4}|\d{4}|present|current)\b/i);
                if (dateMatch) {
                    currentEdu.startDate = formatToStandardDate(dateMatch[1]);
                    currentEdu.endDate = formatToStandardDate(dateMatch[2]);
                    if (isDegreeLine) {
                        currentEdu.degree = currentEdu.degree?.replace(dateMatch[0], "").trim();
                    } else if (isInstLine) {
                        currentEdu.institution = currentEdu.institution?.replace(dateMatch[0], "").trim();
                    }
                }
            } else if (currentEdu) {
                // Check if line contains score
                const scoreInfo = extractScoreDetails(line);
                if (scoreInfo.scoreType === "cgpa" || scoreInfo.scoreType === "gpa") {
                    currentEdu.cgpa = scoreInfo.scoreValue;
                } else if (scoreInfo.scoreType === "percentage") {
                    currentEdu.percentage = scoreInfo.scoreValue;
                }

                // Check for institution or degree if missing
                if (!currentEdu.institution && isInstLine) {
                    currentEdu.institution = line;
                } else if (!currentEdu.degree && isDegreeLine) {
                    currentEdu.degree = line;
                } else {
                    currentEdu.description = (currentEdu.description ? currentEdu.description + " " : "") + line;
                }
            }
        }
        if (currentEdu && (currentEdu.institution || currentEdu.degree)) {
            education.push(finalizeEducation(currentEdu, education.length));
        }
    }

    // Work Experience
    const workExperience: CanonicalWorkExperience[] = [];
    const expSections = sections.filter(s => s.type === "workExperience");
    for (const expSec of expSections) {
        const expLines = expSec.rawContent.split("\n").map(l => l.trim()).filter(Boolean);
        let currentExp: Partial<CanonicalWorkExperience> | null = null;

        for (let i = 0; i < expLines.length; i++) {
            const line = expLines[i];
            const cleanLine = line.replace(/^[•\-*▪▫–—✦✓]\s*/, "");
            const dateMatch = line.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\d{4}(?:-\d{2})?|\d{1,2}\/\d{4})\s*[-–—to\s]+\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\d{4}(?:-\d{2})?|\d{1,2}\/\d{4}|present|current)\b/i);
            const isBullet = /^[•\-*▪▫–—✦✓]/.test(line);

            if (dateMatch && (!isBullet || cleanLine.includes(" at ") || /\b(engineer|developer|designer|analyst|manager|specialist|intern|lead|consultant)\b/i.test(cleanLine))) {
                if (currentExp && (currentExp.company || currentExp.position)) {
                    workExperience.push(finalizeWorkExperience(currentExp, workExperience.length));
                }

                const nextLine = expLines[i + 1] || "";
                let position = "";
                let company = "";
                let loc = "";

                if (cleanLine.includes(" at ")) {
                    const lineWithoutDate = cleanLine.replace(dateMatch[0], "").replace(/[()]/g, "").trim();
                    const atParts = lineWithoutDate.split(/\s+at\s+/i);
                    position = atParts[0].trim();
                    const remainder = atParts[1] || "";
                    const dashParts = remainder.split(/\s*[-–—]\s*/);
                    company = dashParts[0].trim();
                    loc = dashParts.length > 1 ? dashParts[1].trim() : "";
                } else {
                    position = line.replace(dateMatch[0], "").replace(/[-–—|]/g, "").trim() || "Role";
                    company = nextLine && !nextLine.startsWith("•") && !nextLine.startsWith("-") ? nextLine : "";
                    if (nextLine && !nextLine.startsWith("•") && !nextLine.startsWith("-")) {
                        i++;
                    }
                }

                currentExp = {
                    position: position || "Role",
                    company: company || "",
                    location: loc || "",
                    startDate: formatToStandardDate(dateMatch[1]),
                    endDate: /present|current/i.test(dateMatch[2]) ? "" : formatToStandardDate(dateMatch[2]),
                    current: /present|current/i.test(dateMatch[2]),
                    description: ""
                };
            } else if (currentExp) {
                currentExp.description = (currentExp.description ? currentExp.description + "\n" : "") + line;
            }
        }
        if (currentExp && (currentExp.company || currentExp.position)) {
            workExperience.push(finalizeWorkExperience(currentExp, workExperience.length));
        }
    }

    // Projects
    const projects: CanonicalProject[] = [];
    const projSec = sections.find(s => s.type === "projects");
    if (projSec) {
        const pLines = projSec.rawContent.split("\n").map(l => l.trim()).filter(Boolean);
        let currentProj: Partial<CanonicalProject> | null = null;

        for (let i = 0; i < pLines.length; i++) {
            const line = pLines[i];
            const cleanLine = line.replace(/^[•\-*▪▫–—✦✓]\s*/, "");
            const urlMatch = line.match(/https?:\/\/[^\s\)]+/i);
            const isFieldPrefix = /^(?:role|tech|technologies|tools|stack|link|url|github|duration)\s*[:\-–]/i.test(cleanLine);
            const nextLine = pLines[i + 1] || "";
            const nextIsBullet = /^[•\-*▪▫–—✦✓]/.test(nextLine);

            const hasProjectMeta = /\(role:|\(tech:|\[tech:|\b(lead|architect|developer|engineer|creator)\b/i.test(line);
            const isHeader = !isFieldPrefix && (Boolean(urlMatch) || hasProjectMeta || nextIsBullet || nextLine.toLowerCase().startsWith("tech:") || nextLine.toLowerCase().startsWith("role:") || (cleanLine.length < 50 && !/[.?!]$/.test(cleanLine)));

            if (isHeader) {
                if (currentProj && currentProj.name) {
                    projects.push(finalizeProject(currentProj, projects.length));
                }

                const roleMatch = line.match(/\(role:\s*(.*?)\)/i);
                const techMatch = line.match(/\[tech:\s*(.*?)\]/i) || line.match(/\(tech:\s*(.*?)\)/i);
                const cleanName = cleanLine
                    .replace(/\(https?:\/\/[^)]*\)/gi, "")
                    .replace(/\[tech:[^\]]*\]/gi, "")
                    .replace(/\(tech:[^)]*\)/gi, "")
                    .replace(/\(role:[^)]*\)/gi, "")
                    .replace(/https?:\/\/[^\s\)]+/gi, "")
                    .replace(/\(\s*\)/g, "")
                    .replace(/\[\s*\]/g, "")
                    .replace(/[-–—|:]\s*$/, "")
                    .replace(/\s+/g, " ")
                    .trim();

                currentProj = {
                    name: cleanName || cleanLine,
                    link: urlMatch ? urlMatch[0] : "",
                    role: roleMatch ? roleMatch[1].trim() : "Developer",
                    technologies: techMatch ? techMatch[1].split(/[,|]/).map(t => t.trim()).filter(Boolean) : [],
                    description: ""
                };
            } else if (currentProj) {
                if (/^tech(?:\s*stack)?\s*[:\-–—]/i.test(cleanLine)) {
                    const techStr = cleanLine.replace(/^tech(?:\s*stack)?\s*[:\-–—]\s*/i, "");
                    currentProj.technologies = techStr.split(/[,|]/).map(t => t.trim()).filter(Boolean);
                } else if (/^role\s*[:\-–—]/i.test(cleanLine)) {
                    currentProj.role = cleanLine.replace(/^role\s*[:\-–—]\s*/i, "").trim();
                } else {
                    currentProj.description = (currentProj.description ? currentProj.description + "\n" : "") + cleanLine;
                }
            }
        }
        if (currentProj && currentProj.name) {
            projects.push(finalizeProject(currentProj, projects.length));
        }
    }

    // Skills
    const skills: CanonicalSkill[] = [];
    const skillSec = sections.find(s => s.type === "skills");
    if (skillSec) {
        const rawItems = skillSec.rawContent
            .split(/(?<=\))\s+|[\n,•|▪▫–—✦✓;\t]+/)
            .map(s => s.trim())
            .filter(s => s.length > 1 && s.length < 80);
        for (const item of rawItems) {
            const levelMatch = item.match(/\((Advanced|Intermediate|Expert|Beginner)\)/i);
            const cleanName = item.replace(/\((Advanced|Intermediate|Expert|Beginner)\)/i, "").trim();
            if (cleanName && !skills.some(s => s.name.toLowerCase() === cleanName.toLowerCase())) {
                skills.push({
                    id: `skill-det-${skills.length}`,
                    name: cleanName,
                    level: levelMatch ? levelMatch[1] : "",
                    category: "Core Skills"
                });
            }
        }
    }

    // Certifications
    const certifications: CanonicalCertification[] = [];
    const certSec = sections.find(s => s.type === "certifications");
    if (certSec) {
        const cLines = certSec.rawContent.split("\n").map(l => l.trim()).filter(Boolean);
        for (const l of cLines) {
            const clean = l.replace(/^[•\-*▪▫–—✦✓\d\.\)\s]+/, "").trim();
            if (clean.length > 3) {
                const parts = clean.split(/\s+[—–\-]\s+|\s*:\s*/);
                certifications.push({
                    id: `cert-det-${certifications.length}`,
                    name: parts[0].trim(),
                    issuer: parts.length > 1 ? parts[1].trim() : "",
                    date: "",
                    link: "",
                    description: parts.length > 2 ? parts.slice(2).join(" ") : ""
                });
            }
        }
    }

    // Languages
    const languages: CanonicalLanguage[] = [];
    const langSec = sections.find(s => s.type === "languages");
    if (langSec) {
        const langItems = langSec.rawContent.split(/[\n,•|]+/).map(l => l.trim()).filter(Boolean);
        for (const item of langItems) {
            const parts = item.split(/[:\-–]/);
            if (parts[0].trim().length > 1) {
                languages.push({
                    id: `lang-det-${languages.length}`,
                    name: parts[0].trim(),
                    proficiency: parts[1] ? parts[1].trim() : ""
                });
            }
        }
    }

    // Custom Sections
    const customSections: CanonicalCustomSection[] = [];
    const otherSections = sections.filter(s => s.type === "custom" || s.type === "achievements" || s.type === "publications" || s.type === "volunteering");
    for (const sec of otherSections) {
        const items = sec.rawContent.split("\n").map(l => l.trim()).filter(Boolean).map((line, idx) => ({
            id: `item-det-${idx}`,
            title: line.replace(/^[•\-*]\s*/, ""),
            subtitle: "",
            date: "",
            description: line
        }));
        if (items.length > 0) {
            customSections.push({
                id: `custom-sec-${customSections.length}`,
                title: sec.originalTitle,
                items: items.slice(0, 10)
            });
        }
    }

    return {
        personalInfo: {
            name,
            title,
            email: emailMatch ? emailMatch[0] : "",
            phone: phoneMatch ? phoneMatch[0] : "",
            location,
            website: website || "",
            linkedin: linkedinMatch ? linkedinMatch[0] : "",
            github: githubMatch ? githubMatch[0] : "",
            summary
        },
        workExperience,
        education,
        projects,
        skills,
        languages,
        certifications,
        customSections,
        metadata: {
            sourceFormat: "txt",
            extractionMethod: "fallback",
            isScanned: false,
            rawCharCount: rawText.length,
            warnings: [],
            unmappedSections: [],
            recordCounts: {
                education: education.length,
                workExperience: workExperience.length,
                projects: projects.length,
                skills: skills.length,
                certifications: certifications.length,
                languages: languages.length,
                customSections: customSections.length
            },
            confidenceScore: 70,
            isFallback: true
        }
    };
}

function finalizeEducation(raw: Partial<CanonicalEducation>, index: number): CanonicalEducation {
    const rawDegree = raw.degree || "Degree";
    const { degree, fieldOfStudy } = separateDegreeAndField(rawDegree, raw.fieldOfStudy);
    const score = extractScoreDetails(raw.cgpa || raw.percentage || raw.description || "");
    const tier = classifyEducationTier(degree, fieldOfStudy, raw.institution || "");

    return {
        id: `edu-canonical-${index}`,
        institution: raw.institution || "Institution",
        degree,
        fieldOfStudy,
        location: raw.location || "",
        startDate: raw.startDate || "",
        endDate: raw.endDate || "",
        cgpa: score.scoreType === "cgpa" || score.scoreType === "gpa" ? score.scoreValue : (raw.cgpa || ""),
        percentage: score.scoreType === "percentage" ? score.scoreValue : (raw.percentage || ""),
        scoreType: score.scoreType,
        scoreValue: score.scoreValue,
        description: raw.description || "",
        degreeType: tier,
        originalDegreeName: rawDegree
    };
}

function finalizeWorkExperience(raw: Partial<CanonicalWorkExperience>, index: number): CanonicalWorkExperience {
    return {
        id: `exp-canonical-${index}`,
        company: raw.company || "Company",
        position: raw.position || "Position",
        location: raw.location || "",
        startDate: raw.startDate || "",
        endDate: raw.endDate || "",
        current: !!raw.current,
        description: raw.description || "",
        employmentType: /intern/i.test((raw.position || "") + " " + (raw.company || "")) ? "internship" : "full-time"
    };
}

function finalizeProject(raw: Partial<CanonicalProject>, index: number): CanonicalProject {
    return {
        id: `proj-canonical-${index}`,
        name: raw.name || "Project",
        description: raw.description || "",
        technologies: Array.isArray(raw.technologies) ? raw.technologies : [],
        link: raw.link || "",
        role: raw.role || "Developer"
    };
}

/**
 * Executes semantic extraction using Gemini with automatic fallback to deterministic extraction.
 */
export async function extractSemanticResume(docResult: DocumentExtractionResult): Promise<CanonicalResume> {
    const { rawText, binaryPart, warnings: docWarnings } = docResult;
    const warnings: ExtractionWarning[] = [...docWarnings];

    const detectedSections = detectSections(rawText);
    const prompt = buildExtractionPrompt(rawText, !!binaryPart);
    const promptParts: any[] = [prompt];

    if (binaryPart) {
        promptParts.push(binaryPart);
    }

    let parsedJson: any = null;
    let isFallback = false;

    try {
        const rawResponse = (await generateWithFallback(promptParts, {
            model: "gemini-3-flash-preview",
            timeout: 28000,
            generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json"
            }
        })).trim();

        parsedJson = parseJsonFromModel(rawResponse);
    } catch (aiErr: any) {
        warnings.push({
            code: "AI_GATEWAY_FALLBACK",
            message: `AI gateway timed out or encountered rate limit (${aiErr?.message || "timeout"}). Switched to deterministic source extraction.`,
            severity: "warning"
        });
        isFallback = true;
        const fallbackRes = extractDeterministicResumeData(rawText, detectedSections);
        fallbackRes.metadata.sourceFormat = docResult.sourceFormat;
        fallbackRes.metadata.isScanned = docResult.isScanned;
        fallbackRes.metadata.warnings = [...warnings, ...fallbackRes.metadata.warnings];
        fallbackRes.metadata.isFallback = true;
        return fallbackRes;
    }

    if (!parsedJson || typeof parsedJson !== "object") {
        warnings.push({
            code: "AI_INVALID_OUTPUT",
            message: "AI returned unparseable structure. Recovering via deterministic source extraction.",
            severity: "warning"
        });
        const fallbackRes = extractDeterministicResumeData(rawText, detectedSections);
        fallbackRes.metadata.sourceFormat = docResult.sourceFormat;
        fallbackRes.metadata.isScanned = docResult.isScanned;
        fallbackRes.metadata.warnings = [...warnings, ...fallbackRes.metadata.warnings];
        fallbackRes.metadata.isFallback = true;
        return fallbackRes;
    }

    // Process and validate parsed JSON into canonical structure
    const pInfo = parsedJson.personalInfo || {};
    const personalInfo: CanonicalPersonalInfo = {
        name: (pInfo.name || "").trim(),
        title: (pInfo.title || "").trim(),
        email: (pInfo.email || "").trim(),
        phone: (pInfo.phone || "").trim(),
        location: (pInfo.location || "").trim(),
        website: (pInfo.website || "").trim(),
        linkedin: (pInfo.linkedin || "").trim(),
        github: (pInfo.github || "").trim(),
        summary: (parsedJson.summary || pInfo.summary || "").trim()
    };

    const education: CanonicalEducation[] = (Array.isArray(parsedJson.education) ? parsedJson.education : []).map((e: any, idx: number) => {
        const rawDegree = (e.degree || "").trim();
        const { degree, fieldOfStudy } = separateDegreeAndField(rawDegree, e.fieldOfStudy);
        const score = extractScoreDetails(`${e.cgpa || ""} ${e.percentage || ""}`);
        const tier = e.degreeType && ["10th", "12th", "vocational", "diploma", "ug", "pg", "phd", "other"].includes(e.degreeType)
            ? e.degreeType
            : classifyEducationTier(degree, fieldOfStudy, e.institution || "");

        return {
            id: `edu-canonical-${idx}`,
            institution: (e.institution || "").trim(),
            degree,
            fieldOfStudy,
            location: (e.location || "").trim(),
            startDate: formatToStandardDate(e.startDate || ""),
            endDate: formatToStandardDate(e.endDate || ""),
            cgpa: score.scoreType === "cgpa" || score.scoreType === "gpa" ? score.scoreValue : (e.cgpa || "").trim(),
            percentage: score.scoreType === "percentage" ? score.scoreValue : (e.percentage || "").trim(),
            scoreType: score.scoreType,
            scoreValue: score.scoreValue,
            description: (e.description || "").trim(),
            degreeType: tier,
            originalDegreeName: rawDegree
        };
    });

    const workExperience: CanonicalWorkExperience[] = (Array.isArray(parsedJson.workExperience) ? parsedJson.workExperience : []).map((w: any, idx: number) => ({
        id: `exp-canonical-${idx}`,
        company: (w.company || "").trim(),
        position: (w.position || "").trim(),
        location: (w.location || "").trim(),
        startDate: formatToStandardDate(w.startDate || ""),
        endDate: formatToStandardDate(w.endDate || ""),
        current: !!w.current,
        description: Array.isArray(w.description) ? w.description.join("\n") : (w.description || "").trim(),
        employmentType: /intern/i.test((w.position || "") + " " + (w.company || "")) ? "internship" : "full-time"
    }));

    const projects: CanonicalProject[] = (Array.isArray(parsedJson.projects) ? parsedJson.projects : []).map((p: any, idx: number) => ({
        id: `proj-canonical-${idx}`,
        name: (p.name || "").trim(),
        description: Array.isArray(p.description) ? p.description.join("\n") : (p.description || "").trim(),
        technologies: Array.isArray(p.technologies) ? p.technologies.map((t: any) => String(t).trim()).filter(Boolean) : [],
        link: (p.link || "").trim(),
        role: (p.role || "Developer").trim()
    })).filter((p: CanonicalProject) => p.name.length > 0 && !/^(project|untitled project)$/i.test(p.name));

    const skills: CanonicalSkill[] = (Array.isArray(parsedJson.skills) ? parsedJson.skills : []).map((s: any, idx: number) => {
        const name = typeof s === "string" ? s : (s.name || s.skill || "");
        return {
            id: `skill-canonical-${idx}`,
            name: name.trim().replace(/\.+$/, ""),
            level: typeof s === "string" ? "" : (s.level || "").trim(),
            category: typeof s === "string" ? "Skills" : (s.category || "Skills").trim()
        };
    }).filter((s: CanonicalSkill) => s.name.length > 0);

    const languages: CanonicalLanguage[] = (Array.isArray(parsedJson.languages) ? parsedJson.languages : []).map((l: any, idx: number) => {
        const name = typeof l === "string" ? l : (l.name || l.language || "");
        return {
            id: `lang-canonical-${idx}`,
            name: name.trim(),
            proficiency: typeof l === "string" ? "" : (l.proficiency || "").trim()
        };
    }).filter((l: CanonicalLanguage) => l.name.length > 0);

    const certifications: CanonicalCertification[] = (Array.isArray(parsedJson.certifications) ? parsedJson.certifications : []).map((c: any, idx: number) => {
        const name = typeof c === "string" ? c : (c.name || "");
        return {
            id: `cert-canonical-${idx}`,
            name: name.trim(),
            issuer: typeof c === "string" ? "" : (c.issuer || "").trim(),
            date: typeof c === "string" ? "" : formatToStandardDate(c.date || ""),
            link: typeof c === "string" ? "" : (c.link || "").trim(),
            description: typeof c === "string" ? "" : (c.description || "").trim()
        };
    }).filter((c: CanonicalCertification) => c.name.length > 0);

    const customSections: CanonicalCustomSection[] = (Array.isArray(parsedJson.customSections) ? parsedJson.customSections : []).map((cs: any, sIdx: number) => ({
        id: `custom-sec-${sIdx}`,
        title: (cs.title || "Additional Section").trim(),
        items: (Array.isArray(cs.items) ? cs.items : []).map((it: any, iIdx: number) => ({
            id: `custom-item-${sIdx}-${iIdx}`,
            title: (it.title || "").trim(),
            subtitle: (it.subtitle || "").trim(),
            date: formatToStandardDate(it.date || ""),
            description: (it.description || "").trim()
        }))
    })).filter((cs: CanonicalCustomSection) => cs.items.length > 0);

    return {
        personalInfo,
        workExperience,
        education,
        projects,
        skills,
        languages,
        certifications,
        customSections,
        metadata: {
            sourceFormat: docResult.sourceFormat,
            extractionMethod: docResult.extractionMethod,
            isScanned: docResult.isScanned,
            rawCharCount: rawText.length,
            warnings,
            unmappedSections: [],
            recordCounts: {
                education: education.length,
                workExperience: workExperience.length,
                projects: projects.length,
                skills: skills.length,
                certifications: certifications.length,
                languages: languages.length,
                customSections: customSections.length
            },
            confidenceScore: 92,
            isFallback
        }
    };
}
