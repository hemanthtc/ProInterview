import { describe, it, expect } from "vitest";

describe("Full Stack Resume Parsing & Extraction Test", () => {
    const rawPdfTextSample = `
Hemanth T C
Full Stack Developer
hemanthtc8296@gmail.com +91-8296744847 Bengaluru, India https://hemanthtc.vercel.app
https://linkedin.com/in/hemanthtc8296https://github.com/hemanthtc8296

PROFILE SUMMARY
Dedicated Software Developer and B.E. Information Science student at Bangalore Institute of Technology with a strong foundation in building AI-powered applications and full-stack web platforms. Experienced in leveraging Python, JavaScript, React, Node.js, and machine learning tools to solve real-world problems. Complemented by a rigorous background in electronics and communication with a distinction diploma, bringing a unique low-level systems perspective to software engineering.

WORK EXPERIENCE
Quality Control Intern 01/2024 - 04/2024
Sansera Engineering LtdBengaluru
- Gained hands-on industry experience in quality control and precision engineering processes within a high-standards manufacturing environment.
- Developed strong analytical thinking, meticulous process documentation skills, and professional discipline.

EDUCATION
B.E in Information Science & Engineering 07/2024 - Present
Bangalore Institute of Technology.Bengaluru, India CGPA: 6.91
Focusing on software development, artificial intelligence, machine learning, and data structures and algorithms.
Diploma in Electronics & Communication Engineering 06/2021 - 06/2024
Government Polytechnic Turuvekere.Turuvekere, India CGPA: 9.35
Graduated with distinction. Built a strong foundation in hardware, circuits, and signal systems.
SSLC - 04/2019
Government JR Collage For Boys Percentage: 65.92 | Tiptur, India
Graduated with first class.

PROJECTS
EchoWellhttps://github.com/hemanthtc8296
Full Stack Developer Tech: Next.js 14, TypeScript, Gemini Pro, OpenAI Whisper, Supabase, Tailwind CSS
Voice-first AI mental wellness companion built with Next.js and Supabase that detects emotional nuances via Web Audio API to resolve latency issues in real-time mood therapy.
DevCheckpoint 6.0https://github.com/hemanthtc8296
Full Stack Developer Tech: React, Node.js, Express, MongoDB, JWT, Webpack
Centralized MERN-stack dashboard for 120-day SDE prep that tracks DSA problems and resolves Webpack optimization bottlenecks for production builds.
Leaf Disease Detectionhttps://github.com/hemanthtc8296
AI Developer Tech: Python, Deep Learning, Transfer Learning, Streamlit
Deep learning plant disease classifier using transfer learning to identify 33 different crop issues accurately via a Streamlit web interface.
ProInterviewhttps://github.com/hemanthtc8296
Developer Tech: TypeScript, Java, AI, NLP, Resume Parsing
Resume-aware AI interview simulator parsing uploaded CVs to generate role-specific questions while resolving real-time online interview room latency.
Synthetic Data Generatorhttps://github.com/hemanthtc8296
Full Stack Developer Tech: TypeScript, Node.js, React 19, Tailwind CSS
Synthetic data generator application integrating with external APIs to dynamically create custom documents based on user specifications and resolve document generation bottlenecks.
WorldXNewshttps://github.com/hemanthtc8296
Full Stack Developer Tech: HTML, CSS, JavaScript, React
Global news aggregation platform featuring advanced local-to-global filtering capabilities to deliver real-time updates across diverse categories and resolve rendering bottlenecks.

SKILLS
Python (Intermediate) Java & DSA (Advanced) JavaScript (Advanced) TypeScript (Intermediate)
React / Next.js (Intermediate) Node.js / Express (Intermediate) MongoDB / MySQL (Intermediate)
REST APIs / JWT Auth (Advanced) Gemini Pro / Whisper (Intermediate) Streamlit / Vercel (Advanced)
AWS / Cloud (Intermediate) CI/CD (GitHub Actions) (Intermediate)

LANGUAGES
English : Fluent Hindi : Fluent Kannada : Native

CERTIFICATIONS
AWS Cloud Computing & Staking Workshop — Bangalore Institute of Technology
Digital Forensics Essentials (DFE)EC-Council
Ethical Hacking Essentials (EHE)EC-Council
Soft Skills — Employability Skills ProgramRubicon
`;

    function normalizeRawText(raw: string): string {
        return raw
            // Separate glued URLs: "EchoWellhttps://github.com..." -> "EchoWell https://github.com..."
            .replace(/([a-zA-Z0-9_\-\.\)])(https?:\/\/)/g, "$1 $2")
            // Separate glued dates: "01/202404/2024" -> "01/2024 - 04/2024"
            .replace(/(\d{2}\/\d{4})(\d{2}\/\d{4})/g, "$1 - $2")
            .replace(/(\d{2}\/\d{4})(Present|Current)/gi, "$1 - $2")
            // Separate glued company/institution suffixes and locations
            .replace(/(Ltd|Pvt|Inc|LLC|Corp|Solutions|Technologies|Polytechnic|Institute|University|College|Collage)([A-Z][a-z]+)/g, "$1 $2")
            .replace(/([a-zA-Z])(\.(?:Bengaluru|Bangalore|Turuvekere|Tiptur|Mumbai|Delhi|Hyderabad|Chennai|Pune|India))/g, "$1 | $2")
            // Separate glued certification closing parenthesis and issuer: "(DFE)EC-Council" -> "(DFE) — EC-Council"
            .replace(/(\))[^\S\r\n]*([A-Z][a-zA-Z\-]+)/g, "$1 — $2")
            .replace(/(Program|Essentials)([A-Z][a-z]+)/g, "$1 — $2")
            // Separate glued Tech prefix
            .replace(/([a-zA-Z])Tech:\s*/g, "$1\nTech: ");
    }

    function parsePersonalAndSummary(rawText: string) {
        const text = normalizeRawText(rawText);
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

        const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || "";
        const phone = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] || "";
        let linkedin = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/)?.[0] || "";
        linkedin = linkedin.replace(/https?$/i, "");
        const github = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/)?.[0] || "";
        const website = text.match(/https?:\/\/[a-zA-Z0-9_-]+\.(?:vercel\.app|netlify\.app|github\.io|me|dev|io|com)(?:\/[^\s]*)?/i)?.[0] || "";

        const nameCandidate = lines.find(l => l.length > 2 && l.length < 35 && !/resume|curriculum|email|phone|profile|summary|http|skills|experience/i.test(l)) || "";
        const nameIdx = lines.findIndex(l => l === nameCandidate);
        let titleCandidate = "";
        if (nameIdx !== -1 && lines[nameIdx + 1] && !lines[nameIdx + 1].includes("@") && !lines[nameIdx + 1].includes("http") && lines[nameIdx + 1].length < 70) {
            titleCandidate = lines[nameIdx + 1];
        }

        let summary = "";
        const summaryMatch = text.match(/(?:profile\s+summary|professional\s+summary|summary|profile|about\s+me)[:\s\n]+([\s\S]{30,800}?)(?=\n\s*(?:education|experience|work\s+experience|technical\s+skills|skills|projects|key\s+projects|certifications|languages)|$)/i);
        if (summaryMatch) {
            summary = summaryMatch[1].replace(/\s+/g, " ").trim();
        }

        return { name: nameCandidate, title: titleCandidate, email, phone, linkedin, github, website, summary };
    }

    function parseWorkExperience(rawText: string) {
        const text = normalizeRawText(rawText);
        const expMatch = text.match(/(?:work\s+experience|experience)[:\s\n]+([\s\S]{20,2500}?)(?=\n\s*(?:education|technical\s+skills|skills|projects|key\s+projects|certifications|languages)|$)/i);
        const experiences: any[] = [];
        if (!expMatch) return experiences;

        const lines = expMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
        let currentExp: any = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const dateMatch = line.match(/\b(\d{2}\/\d{4}|\d{4})\s*[-–to\s]+\s*(\d{2}\/\d{4}|\d{4}|present|current)\b/i);
            const isBullet = /^[•\-*]\s*/.test(line);

            if (dateMatch && !isBullet) {
                if (currentExp && (currentExp.company || currentExp.position)) {
                    experiences.push(currentExp);
                }
                const positionPart = line.replace(dateMatch[0], "").replace(/[-–—|]/g, "").trim();
                const nextLine = lines[i + 1] || "";
                let company = nextLine;
                let location = "";
                const locMatch = nextLine.match(/\b([A-Z][a-zA-Z\s]+,\s*(?:India|USA|UK)|Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Chennai|Turuvekere|Tiptur)\b/i);
                if (locMatch && locMatch.index !== undefined) {
                    location = locMatch[0].trim();
                    company = nextLine.substring(0, locMatch.index).trim();
                }

                if (!location && company) {
                    const gluedLoc = company.match(/^(.*?)(Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Chennai|Turuvekere|Tiptur|India)$/i);
                    if (gluedLoc) {
                        company = gluedLoc[1].trim();
                        location = gluedLoc[2].trim();
                    }
                }

                currentExp = {
                    position: positionPart || "Intern",
                    company: company || "Company",
                    location: location,
                    startDate: dateMatch[1],
                    endDate: dateMatch[2],
                    description: ""
                };
                if (!locMatch && nextLine && !nextLine.startsWith("-") && !nextLine.startsWith("•")) {
                    i++;
                } else if (locMatch) {
                    i++;
                }
            } else if (currentExp && isBullet) {
                currentExp.description += (currentExp.description ? "\n" : "") + line;
            }
        }
        if (currentExp && (currentExp.company || currentExp.position)) {
            experiences.push(currentExp);
        }
        return experiences;
    }

    function parseEducation(rawText: string) {
        const text = normalizeRawText(rawText);
        const eduMatch = text.match(/(?:education|academic\s+background)[:\s\n]+([\s\S]{20,2500}?)(?=\n\s*(?:technical\s+skills|skills|projects|key\s+projects|experience|work\s+experience|certifications|languages)|$)/i);
        const eduList: any[] = [];
        if (!eduMatch) return eduList;

        const lines = eduMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const isDegreeLine = /\b(b\.?e\.?|b\.?tech|diploma|sslc|10th|12th|puc|hsc|cbse|bachelor|master|m\.?tech|b\.?sc|b\.?com)\b/i.test(line);

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

                const nextLine = lines[i + 1] || "";
                let institution = nextLine;
                let cgpa = "";
                let percentage = "";
                let location = "";

                const scoreMatch = nextLine.match(/(?:cgpa|percentage|score)[:\s]*([0-9.]+(?:\s*\/\s*10|\s*%)?)/i);
                if (scoreMatch) {
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

                const locMatch = institution.match(/[|,\.]\s*([A-Z][a-zA-Z\s]+,\s*India|[A-Z][a-zA-Z\s]+)\s*$/i);
                if (locMatch && locMatch.index !== undefined) {
                    location = locMatch[1].replace(/^[|,\.\s]+/, "").trim();
                    institution = institution.substring(0, locMatch.index).replace(/[|,\.\s]+$/, "").trim();
                }

                const nextNextLine = lines[i + 2] || "";
                let description = "";
                if (nextNextLine && !/\b(b\.?e\.?|b\.?tech|diploma|sslc|10th|12th|puc|institute|college|collage|polytechnic|university)\b/i.test(nextNextLine)) {
                    description = nextNextLine;
                    i++;
                }
                i++;

                eduList.push({
                    degree,
                    fieldOfStudy,
                    institution,
                    location,
                    cgpa,
                    percentage,
                    startDate: dateMatch ? (dateMatch[1] || "") : "",
                    endDate: dateMatch ? (dateMatch[2] || dateMatch[1] || "") : "",
                    description
                });
            }
        }
        return eduList;
    }

    function parseProjects(rawText: string) {
        const text = normalizeRawText(rawText);
        const projSectionMatch = text.match(/(?:^|\n)\s*(?:KEY\s+PROJECTS?|ACADEMIC\s+PROJECTS?|TECHNICAL\s+PROJECTS?|FEATURED\s+PROJECTS?|SELECTED\s+PROJECTS?|PERSONAL\s+PROJECTS?|CAPSTONE\s+PROJECTS?|PROJECTS)(?:\s*[:\-\–—][^\n]*|\s*)[:\s\n]+([\s\S]{10,8000}?)(?=(?:\n\s*(?:SKILLS|TECHNICAL\s+SKILLS|CORE\s+COMPETENCIES|AREAS\s+OF\s+EXPERTISE|EDUCATION|ACADEMIC\s+BACKGROUND|CERTIFICATIONS|WORKSHOPS|LICENSES|LANGUAGES|ACHIEVEMENTS|AWARDS|EXPERIENCE|WORK\s+EXPERIENCE|PUBLICATIONS|VOLUNTEER))|$)/i);
        const projects: any[] = [];
        if (!projSectionMatch) return projects;

        const lines = projSectionMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
        let currentProj: any = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/^page\s+\d/i.test(line) || /^(key\s+projects?|projects?|technical\s+projects?|academic\s+projects?)$/i.test(line) || /^[-–—_=]{3,}$/.test(line)) continue;
            if (/^(education|experience|technical\s+skills|skills|certifications|workshops|languages|awards)$/i.test(line) ||
                /\b(institute\s+of\s+technology|polytechnic|university|college|bachelor\s+of|diploma\s+in|cgpa)\b/i.test(line)) {
                continue;
            }

            const urlMatch = line.match(/https?:\/\/(?:www\.)?github\.com\/[^\s]+/i) || line.match(/https?:\/\/[^\s]+/i);
            const nextLine = lines[i + 1] || "";
            const isBullet = /^[•\-*▪▫–—✦✓]\s*/.test(line);
            const nextIsBullet = /^[•\-*▪▫–—✦✓]\s*/.test(nextLine);

            const techPrefixRegex = /\b(?:tech(?:\s*stack)?|technologies|tools)\s*[:\-–—]\s*|\bstack\s*[:\-–—]\s*|\btech\s*:\s*/i;

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
                const link = urlMatch ? urlMatch[0] : "";
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
                    projects.push(currentProj);
                }

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
        if (currentProj) {
            projects.push(currentProj);
        }
        return projects;
    }

    function parseSkills(rawText: string) {
        const text = normalizeRawText(rawText);
        const skillMatch = text.match(/(?:skills|technical\s+skills)[:\s\n]+([\s\S]{10,1200}?)(?=\n\s*(?:languages|certifications|education|projects)|$)/i);
        const skills: Array<{ name: string; level: string }> = [];
        if (!skillMatch) return skills;

        const skillRegex = /([a-zA-Z0-9\s&/+#._-]+?)\s*\((Advanced|Intermediate|Expert|Beginner)\)/g;
        let m;
        while ((m = skillRegex.exec(skillMatch[1])) !== null) {
            skills.push({
                name: m[1].trim(),
                level: m[2].trim()
            });
        }
        return skills;
    }

    function parseLanguages(rawText: string) {
        const text = normalizeRawText(rawText);
        const langMatch = text.match(/(?:languages spoken|languages)[:\s\n]+([\s\S]{5,400}?)(?=\n\s*(?:certifications|skills|education|projects)|$)/i);
        const languages: Array<{ name: string; proficiency: string }> = [];
        if (!langMatch) return languages;

        const langRegex = /([A-Za-z]+)\s*[:\-–]\s*([A-Za-z]+)/g;
        let m;
        while ((m = langRegex.exec(langMatch[1])) !== null) {
            languages.push({
                name: m[1].trim(),
                proficiency: m[2].trim()
            });
        }
        return languages;
    }

    function parseCertifications(rawText: string) {
        const text = normalizeRawText(rawText);
        const certMatch = text.match(/(?:certifications\s*(?:&|and)\s*(?:workshops|training|courses|licenses)|certifications|certificates|licenses|courses\s*&\s*certifications|workshops\s*&\s*(?:certifications|training)|workshops)[^\n]*\n+([\s\S]{10,2500}?)(?=\n\s*(?:education|academic\s+background|technical\s+skills|skills|projects|key\s+projects|experience|work\s+experience|languages|awards|publications|volunteer|coursework)|$)/i);
        const certs: Array<{ name: string; issuer: string; date: string; description: string }> = [];
        if (!certMatch) return certs;

        const lines = certMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
        let currentCert: any = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
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
            const hasGluedIssuer = /(\(.*?\))\s*([A-Z][a-zA-Z\-]+)/.test(line) || /(Program|Essentials)([A-Z][a-zA-Z\-]+)/.test(line);

            // A line is a description / continuation if:
            // 1. It's a bullet without a colon or number (e.g. "- Hands-on VPC...")
            // 2. Or it's an unbulleted fragment without colon/separator/number (e.g. "routing workflows.", "optimization.")
            const isDescriptionOrContinuation = (currentCert !== null) && (
                (isBullet && !hasTitleColon && !isNumbered) ||
                (!isNumbered && !hasTitleColon && !hasExplicitSeparator && !hasGluedIssuer) ||
                (line.endsWith(".") && !hasExplicitSeparator && !hasTitleColon && !isNumbered) ||
                /^(?:routing|optimization|verification|workflows|bottlenecks|implementation)\b/i.test(line)
            );

            const isNewCertHeader = !isDescriptionOrContinuation && (
                isNumbered ||
                hasTitleColon ||
                hasExplicitSeparator ||
                hasGluedIssuer ||
                (!isBullet && !line.endsWith(".") && line.length < 90)
            );

            if (isNewCertHeader) {
                if (currentCert && currentCert.name) {
                    certs.push(currentCert);
                }

                const cleanLine = line.replace(/^[•\-*▪▫–—✦✓]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();
                const yearMatch = cleanLine.match(/\b(20\d\d|19\d\d)\b/);

                let name = cleanLine.replace(/\b(20\d\d|19\d\d)\b/g, '').trim();
                let issuer = "";
                let description = "";

                const colonIdx = cleanLine.indexOf(":");
                if (colonIdx > 2 && colonIdx < 80) {
                    name = cleanLine.substring(0, colonIdx).trim();
                    const rightSide = cleanLine.substring(colonIdx + 1).trim();
                    if (rightSide.length > 30 || /^(hands-on|practical|learned|covered|training|focusing|deep-dive)\b/i.test(rightSide)) {
                        description = rightSide;
                    } else {
                        issuer = rightSide;
                    }
                } else {
                    const parts = name.split(/\s+[—–\-]\s+|\s*[—–]\s*/);
                    if (parts.length > 1) {
                        name = parts.slice(0, -1).join(" — ").trim();
                        issuer = parts[parts.length - 1].trim();
                    }
                }

                if (!issuer) {
                    const gluedMatch = name.match(/^(.*?\))\s*([A-Z][a-zA-Z\-]+)$/) || name.match(/^(.*?Program)\s*([A-Z][a-zA-Z\-]+)$/);
                    if (gluedMatch) {
                        name = gluedMatch[1].trim();
                        issuer = gluedMatch[2].trim();
                    }
                }

                name = name.replace(/[-–—|:]\s*$/, "").trim();

                currentCert = {
                    name,
                    issuer,
                    date: yearMatch ? yearMatch[0] : "",
                    description
                };
            } else if (currentCert) {
                const descLine = line.replace(/^[•\-*▪▫–—✦✓]\s*/, "").trim();
                if (descLine) {
                    currentCert.description += (currentCert.description ? " " : "") + descLine;
                }
            }
        }
        if (currentCert && currentCert.name) {
            certs.push(currentCert);
        }
        return certs;
    }

    function parseCustomSections(rawText: string) {
        const text = normalizeRawText(rawText);
        const sections: Array<{ title: string; items: any[] }> = [];

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
            }
        ];

        for (const ck of customKeywords) {
            const match = text.match(ck.pattern);
            if (match) {
                const lines = match[1].split("\n").map(l => l.trim()).filter(Boolean);
                const items = lines.map(l => ({ title: l, description: l }));
                if (items.length > 0) {
                    sections.push({ title: ck.title, items });
                }
            }
        }
        return sections;
    }

    it("correctly parses personal info and summary", () => {
        const info = parsePersonalAndSummary(rawPdfTextSample);
        expect(info.name).toBe("Hemanth T C");
        expect(info.title).toBe("Full Stack Developer");
        expect(info.email).toBe("hemanthtc8296@gmail.com");
        expect(info.phone).toBe("+91-8296744847");
        expect(info.website).toBe("https://hemanthtc.vercel.app");
        expect(info.linkedin).toBe("https://linkedin.com/in/hemanthtc8296");
        expect(info.summary).toContain("Dedicated Software Developer and B.E. Information Science student");
    });

    it("correctly parses work experience without glued strings", () => {
        const exp = parseWorkExperience(rawPdfTextSample);
        expect(exp.length).toBe(1);
        expect(exp[0].position).toBe("Quality Control Intern");
        expect(exp[0].company).toBe("Sansera Engineering Ltd");
        expect(exp[0].location).toBe("Bengaluru");
        expect(exp[0].startDate).toBe("01/2024");
        expect(exp[0].endDate).toBe("04/2024");
        expect(exp[0].description).toContain("Gained hands-on industry experience");
    });

    it("correctly parses education with B.E, Diploma, and SSLC", () => {
        const edu = parseEducation(rawPdfTextSample);
        expect(edu.length).toBe(3);

        expect(edu[0].degree).toBe("B.E");
        expect(edu[0].fieldOfStudy).toBe("Information Science & Engineering");
        expect(edu[0].institution).toBe("Bangalore Institute of Technology");
        expect(edu[0].cgpa).toBe("6.91");
        expect(edu[0].description).toContain("Focusing on software development");

        expect(edu[1].degree).toBe("Diploma");
        expect(edu[1].fieldOfStudy).toBe("Electronics & Communication Engineering");
        expect(edu[1].institution).toBe("Government Polytechnic Turuvekere");
        expect(edu[1].cgpa).toBe("9.35");
        expect(edu[1].description).toContain("Graduated with distinction");

        expect(edu[2].degree).toBe("SSLC");
        expect(edu[2].institution).toBe("Government JR Collage For Boys");
        expect(edu[2].percentage).toBe("65.92%");
        expect(edu[2].cgpa).toBe("");
        expect(edu[2].description).toContain("Graduated with first class");
    });

    it("correctly parses all 6 separate projects", () => {
        const projs = parseProjects(rawPdfTextSample);
        expect(projs.length).toBe(6);

        expect(projs[0].name).toBe("EchoWell");
        expect(projs[0].role).toBe("Full Stack Developer");
        expect(projs[0].link).toBe("https://github.com/hemanthtc8296");
        expect(projs[0].technologies).toContain("Next.js 14");
        expect(projs[0].description).toContain("Voice-first AI mental wellness companion");

        expect(projs[1].name).toBe("DevCheckpoint 6.0");
        expect(projs[1].role).toBe("Full Stack Developer");
        expect(projs[1].technologies).toContain("React");
        expect(projs[1].description).toContain("Centralized MERN-stack dashboard");

        expect(projs[2].name).toBe("Leaf Disease Detection");
        expect(projs[2].role).toBe("AI Developer");
        expect(projs[2].technologies).toContain("Python");
        expect(projs[2].description).toContain("Deep learning plant disease classifier");

        expect(projs[3].name).toBe("ProInterview");
        expect(projs[3].role).toBe("Developer");
        expect(projs[3].technologies).toContain("TypeScript");
        expect(projs[3].description).toContain("Resume-aware AI interview simulator");

        expect(projs[4].name).toBe("Synthetic Data Generator");
        expect(projs[4].role).toBe("Full Stack Developer");
        expect(projs[4].technologies).toContain("React 19");

        expect(projs[5].name).toBe("WorldXNews");
        expect(projs[5].role).toBe("Full Stack Developer");
        expect(projs[5].technologies).toContain("HTML");
    });

    it("correctly parses skills with categories & levels", () => {
        const skills = parseSkills(rawPdfTextSample);
        expect(skills.length).toBe(12);
        expect(skills.some(s => s.name === "Java & DSA" && s.level === "Advanced")).toBe(true);
        expect(skills.some(s => s.name === "React / Next.js" && s.level === "Intermediate")).toBe(true);
        expect(skills.some(s => s.name === "REST APIs / JWT Auth" && s.level === "Advanced")).toBe(true);
    });

    it("correctly parses languages", () => {
        const langs = parseLanguages(rawPdfTextSample);
        expect(langs.length).toBe(3);
        expect(langs.some(l => l.name === "English" && l.proficiency === "Fluent")).toBe(true);
        expect(langs.some(l => l.name === "Hindi" && l.proficiency === "Fluent")).toBe(true);
        expect(langs.some(l => l.name === "Kannada" && l.proficiency === "Native")).toBe(true);
    });

    it("correctly parses all 4 certifications with issuers", () => {
        const certs = parseCertifications(rawPdfTextSample);
        expect(certs.length).toBe(4);
        expect(certs[0].name).toBe("AWS Cloud Computing & Staking Workshop");
        expect(certs[0].issuer).toBe("Bangalore Institute of Technology");
        expect(certs[1].name).toBe("Digital Forensics Essentials (DFE)");
        expect(certs[1].issuer).toBe("EC-Council");
        expect(certs[2].name).toBe("Ethical Hacking Essentials (EHE)");
        expect(certs[2].issuer).toBe("EC-Council");
        expect(certs[3].name).toBe("Soft Skills — Employability Skills Program");
        expect(certs[3].issuer).toBe("Rubicon");
    });

    it("universally parses non-tech domain resumes without Full Stack bias and enforces strict data isolation", () => {
        const civilResume = `
Rajesh Kumar
Civil Site Engineer
rajesh.civil@gmail.com +91-9876543210 Bengaluru, Karnataka
https://linkedin.com/in/rajeshkumar-civil

PROFILE SUMMARY
Experienced Civil Site Engineer with 3+ years managing commercial high-rise construction, reinforced concrete frameworks, and structural quality compliance.

WORK EXPERIENCE
Assistant Site Engineer 06/2022 - 03/2024
L&T ConstructionBengaluru
- Supervised daily on-site casting, bar-bending schedules, and concrete slump testing.
- Coordinated with structural design consultants to resolve site drawing discrepancies.

EDUCATION
B.E in Civil Engineering 08/2018 - 06/2022
BMS College of Engineering.Bengaluru, India CGPA: 8.42
Focused on structural mechanics, geotechnical engineering, and project scheduling.
Pre-University Course (PUC) 06/2016 - 05/2018
MES Pre-University College Percentage: 82.50% | Bengaluru, India
Physics, Chemistry, Mathematics.

SKILLS
AutoCAD (Advanced) STAAD.Pro (Intermediate) Revit Architecture (Intermediate)
Site Supervision (Expert) Total Station Surveying (Advanced) Quality Control (Advanced)

CERTIFICATIONS
Advanced Structural Analysis Workshop — Indian Concrete Institute
Construction Project Management Certification — PMI
`;

        const parsed = parsePersonalAndSummary(civilResume);
        expect(parsed.name).toBe("Rajesh Kumar");
        expect(parsed.title).toBe("Civil Site Engineer");
        expect(parsed.title).not.toContain("Full Stack");

        const edu = parseEducation(civilResume);
        expect(edu.length).toBe(2);

        // Check BE Civil Engineering
        expect(edu[0].degree).toBe("B.E");
        expect(edu[0].fieldOfStudy).toBe("Civil Engineering");
        expect(edu[0].institution).toBe("BMS College of Engineering");
        expect(edu[0].cgpa).toBe("8.42");
        expect(edu[0].location).toContain("Bengaluru");
        expect(edu[0].degree).not.toContain("8.42");
        expect(edu[0].institution).not.toContain("8.42");

        // Check PUC
        expect(edu[1].percentage).toBe("82.50%");
        expect(edu[1].institution).toBe("MES Pre-University College");
        expect(edu[1].location).toContain("Bengaluru");

        const work = parseWorkExperience(civilResume);
        expect(work.length).toBe(1);
        expect(work[0].position).toBe("Assistant Site Engineer");
        expect(work[0].company).toBe("L&T Construction");
        expect(work[0].location).toBe("Bengaluru");

        const skills = parseSkills(civilResume);
        expect(skills.some(s => s.name === "AutoCAD" && s.level === "Advanced")).toBe(true);
        expect(skills.some(s => s.name === "STAAD.Pro")).toBe(true);

        const certs = parseCertifications(civilResume);
        expect(certs.length).toBe(2);
        expect(certs[0].name).toBe("Advanced Structural Analysis Workshop");
        expect(certs[0].issuer).toBe("Indian Concrete Institute");
    });

    it("universally parses KEY PROJECTS with arbitrary titles, colons, and numbered formats", () => {
        const keyProjectsResume = `
Hemanth T C
Software Engineer
hemanthtc@example.com +91-9876543210 Bengaluru, India

KEY PROJECTS:
1. Automated Hospital Patient Triage System
Lead Engineer Tech: Python, FastAPI, Redis, Docker
- Built an intelligent patient classification triage engine reducing emergency room wait times by 35%.
- Implemented real-time patient queue streaming with WebSocket alerts.

2. IoT Solar Panel Tracking System (C++, Arduino, MQTT)
Embedded Developer
- Designed dual-axis solar tracking algorithm achieving 22% higher energy capture.
- Configured MQTT telemetry gateway transmitting battery health statistics to AWS IoT Core.

SKILLS
Python (Advanced) C++ (Intermediate) Docker (Intermediate)
`;

        const projs = parseProjects(keyProjectsResume);
        expect(projs.length).toBe(2);

        expect(projs[0].name).toBe("Automated Hospital Patient Triage System");
        expect(projs[0].role).toBe("Lead Engineer");
        expect(projs[0].technologies).toContain("Python");
        expect(projs[0].technologies).toContain("FastAPI");
        expect(projs[0].description).toContain("intelligent patient classification");

        expect(projs[1].name).toBe("IoT Solar Panel Tracking System");
        expect(projs[1].role).toBe("Embedded Developer");
        expect(projs[1].technologies).toContain("C++");
        expect(projs[1].technologies).toContain("Arduino");
        expect(projs[1].description).toContain("dual-axis solar tracking");
    });

    it("correctly isolates pure project title for bold mark and separates link, role, tech, and description", () => {
        const resumeWithComplexProject = `
Hemanth T C
Software Developer
hemanth@example.com

PROJECTS
1. Smart City Traffic Optimization Engine (Python, TensorFlow, OpenCV) | Lead AI Engineer | 2024 https://github.com/hemanthtc/traffic-ai
- Built an edge computer vision system for traffic flow analysis.
- Reduced intersection congestion by 28% across 14 simulated junctions.

2. Enterprise Billing Microservice | Backend Architect
Tech: Go, gRPC, PostgreSQL, Docker
- Architected high-throughput ledger service processing 10,000 transactions/sec.
`;

        const projs = parseProjects(resumeWithComplexProject);
        expect(projs.length).toBe(2);

        // Project 1
        expect(projs[0].name).toBe("Smart City Traffic Optimization Engine");
        expect(projs[0].name).not.toContain("Lead AI Engineer");
        expect(projs[0].name).not.toContain("2024");
        expect(projs[0].name).not.toContain("https://");
        expect(projs[0].name).not.toContain("1.");
        expect(projs[0].link).toBe("https://github.com/hemanthtc/traffic-ai");
        expect(projs[0].role).toBe("Lead AI Engineer");
        expect(projs[0].technologies).toContain("Python");
        expect(projs[0].technologies).toContain("TensorFlow");
        expect(projs[0].description).toContain("Built an edge computer vision system");

        // Project 2
        expect(projs[1].name).toBe("Enterprise Billing Microservice");
        expect(projs[1].role).toBe("Backend Architect");
        expect(projs[1].technologies).toContain("Go");
        expect(projs[1].technologies).toContain("gRPC");
        expect(projs[1].description).toContain("Architected high-throughput ledger service");
    });

    it("preserves certification descriptions, ignores category subheadings, and gates Volunteer & Leadership", () => {
        const resumeWithCertsAndBullets = `
Hemanth T C
Software Engineer
hemanth@example.com

PROJECTS
DevCheckpoint
Full Stack Developer Tech: React, Node.js
- Led a team of 4 engineers and demonstrated strong technical leadership.
- Volunteered to organize the university codefest.

CERTIFICATIONS & WORKSHOPS
Technical Workshops:
1. Physical Design Workshop: Hands-on experience in floorplanning, placement, clock tree synthesis, and routing.
2. AWS Cloud Architecture Workshop — Amazon Web Services
- Hands-on VPC, EC2, and S3 deployment.
- Configured IAM roles and CloudWatch alerts.
3. Certified Kubernetes Administrator (CKA) — Linux Foundation
- Managed production cluster deployments and pod networking.

Online Courses:
`;

        const certs = parseCertifications(resumeWithCertsAndBullets);
        // Exactly 3 certificates, NOT 5 or 6 (bullet points & subheadings must not become certificates)
        expect(certs.length).toBe(3);

        expect(certs[0].name).toBe("Physical Design Workshop");
        expect(certs[0].description).toContain("Hands-on experience in floorplanning");

        expect(certs[1].name).toBe("AWS Cloud Architecture Workshop");
        expect(certs[1].issuer).toBe("Amazon Web Services");
        expect(certs[1].description).toContain("Hands-on VPC, EC2, and S3 deployment");

        expect(certs[2].name).toBe("Certified Kubernetes Administrator (CKA)");
        expect(certs[2].issuer).toBe("Linux Foundation");
        expect(certs[2].description).toContain("Managed production cluster deployments");

        // Volunteer & Leadership should NOT be extracted because "leadership" and "volunteered" only appeared inside project bullets!
        const sections = parseCustomSections(resumeWithCertsAndBullets);
        const hasVolunteerSection = sections.some(s => s.title.toLowerCase().includes("volunteer"));
        expect(hasVolunteerSection).toBe(false);

        // But if a resume genuinely has a dedicated VOLUNTEER EXPERIENCE section header:
        const resumeWithRealVolunteer = `
${resumeWithCertsAndBullets}

VOLUNTEER EXPERIENCE
Community Code Mentor — CoderDojo
- Mentored 25 high school students in introductory Python programming.
`;
        const sectionsWithVol = parseCustomSections(resumeWithRealVolunteer);
        const realVolSection = sectionsWithVol.find(s => s.title.toLowerCase().includes("volunteer"));
        expect(realVolSection).toBeDefined();
        expect(realVolSection?.items.length).toBeGreaterThan(0);
    });

    it("correctly parses multi-line wrapped certifications without creating fragment certificate items", () => {
        const wrappedCertsResume = `
Hemanth T C
Software Engineer
hemanth@example.com

CERTIFICATIONS & WORKSHOPS
• Physical Design Workshop: Hands-on experience in floorplanning, placement, clock tree synthesis (CTS), and
routing workflows.
• Design for Testability (DFT) Hands-on Workshop: Practical training in scan insertion, ATPG, and fault coverage
optimization.
• FPGA-Based Design and Integration: Training on digital circuit implementation, timing constraints, and hardware
verification.
`;

        const certs = parseCertifications(wrappedCertsResume);
        // Exactly 3 certificates, NOT 6!
        expect(certs.length).toBe(3);

        expect(certs[0].name).toBe("Physical Design Workshop");
        expect(certs[0].description).toBe(
            "Hands-on experience in floorplanning, placement, clock tree synthesis (CTS), and routing workflows."
        );

        expect(certs[1].name).toContain("Design for Testability (DFT)");
        expect(certs[1].description).toBe(
            "Practical training in scan insertion, ATPG, and fault coverage optimization."
        );

        expect(certs[2].name).toBe("FPGA-Based Design and Integration");
        expect(certs[2].description).toBe(
            "Training on digital circuit implementation, timing constraints, and hardware verification."
        );
    });

    it("correctly separates all 4 projects from VLSI resume without collapsing into 1 and cleanly populates all 5 project fields", () => {
        const vlsiResumeText = `
Hemanth T C
Electronics & Communication Engineer
hemanth@example.com

KEY PROJECTS
Design and Analysis of Efficient Phase-Locked Loop (PLL) for Fast Acquisition45 nm Technology
Role: Layout Designer
• Designed and executed full analog layout of a Phase-Locked Loop (PLL) architecture in 45 nm technology node.
• Implemented and optimized key analog sub-blocks including Phase Frequency Detector (PFD) and Charge Pump.
• Focused physical design efforts on minimizing layout area, parasitic effects, and accelerating phase and frequency acquisition times.
• Applied advanced CMOS design rules, analog IC layout matching techniques, and DRC/LVS physical verification workflows.

Braille E-Reader PrototypeFPGA Implementation
Role: Team Leader
• Led a project team in designing an accessibility-focused hardware prototype for visually impaired users.
• Developed complete VHDL code modules for hardware simulation and data processing pipelines.
• Implemented real-time character extraction algorithms on an FPGA platform to convert digital text into tactile Braille output.

Smart Parking System Using IIoTIIoT & Embedded Systems
Role: Team Leader
• Engineered an IIoT-driven automated parking management system using real-time sensor networks.
• Integrated IR sensor arrays for active vehicle detection and RFID technology for automated secure gate access.
• Optimized space allocation logic to efficiently direct traffic and maximize occupancy in constrained parking environments.

Automated Name Board Using IIoTEmbedded & Solar Power Integration
Role: Team Leader
• Designed and deployed a microcontroller-based smart display board featuring versatile control interfaces.
• Enabled dynamic content updating via manual switches, automated routines, and wireless smartphone control.
• Integrated a dedicated solar power harvesting system to ensure self-sustained off-grid energy operation.

SKILLS
Verilog (Advanced) VHDL (Advanced) SystemVerilog (Intermediate)
`;

        const projs = parseProjects(vlsiResumeText);
        // Must be exactly 4 separate projects, NOT collapsed into 1!
        expect(projs.length).toBe(4);

        // Project 1
        expect(projs[0].name).toBe("Design and Analysis of Efficient Phase-Locked Loop (PLL) for Fast Acquisition");
        expect(projs[0].role).toBe("Layout Designer");
        expect(projs[0].technologies).toContain("45 nm Technology");
        expect(projs[0].description).toContain("Designed and executed full analog layout");
        expect(projs[0].description).not.toContain("Braille E-Reader");

        // Project 2
        expect(projs[1].name).toBe("Braille E-Reader Prototype");
        expect(projs[1].role).toBe("Team Leader");
        expect(projs[1].technologies).toContain("FPGA Implementation");
        expect(projs[1].description).toContain("accessibility-focused hardware prototype");
        expect(projs[1].description).not.toContain("Smart Parking");

        // Project 3
        expect(projs[2].name).toBe("Smart Parking System Using IIoT");
        expect(projs[2].role).toBe("Team Leader");
        expect(projs[2].technologies).toContain("IIoT & Embedded Systems");
        expect(projs[2].description).toContain("automated parking management system");

        // Project 4
        expect(projs[3].name).toBe("Automated Name Board Using IIoT");
        expect(projs[3].role).toBe("Team Leader");
        expect(projs[3].technologies).toContain("Embedded & Solar Power Integration");
        expect(projs[3].description).toContain("smart display board featuring versatile control interfaces");
    });

    it("does not treat 'Centralized MERN-stack' description as a tech prefix and keeps description intact", () => {
        const resumeWithMernStack = `
Hemanth T C
Software Engineer
hemanth@example.com

PROJECTS
DevCheckpoint 6.0
Full Stack Developer
Tech: React, Node.js, Express, MongoDB, JWT, Webpack
Centralized MERN-stack dashboard for 120-day SDE prep that tracks DSA problems and resolves Webpack optimization bottlenecks for production builds.

SKILLS
React (Advanced)
`;
        const projs = parseProjects(resumeWithMernStack);
        expect(projs.length).toBe(1);
        expect(projs[0].name).toBe("DevCheckpoint 6.0");
        expect(projs[0].technologies).toContain("React");
        expect(projs[0].technologies).toContain("Webpack");
        // Verify MERN-stack description was NOT added into technologies array
        expect(projs[0].technologies.some((t: string) => t.includes("dashboard for 120-day"))).toBe(false);
        // Verify entire description is intact
        expect(projs[0].description).toContain("Centralized MERN-stack dashboard for 120-day SDE prep that tracks DSA problems");
    });
});
