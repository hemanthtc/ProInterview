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
            .replace(/(\))\s*([A-Z][a-zA-Z\-]+)/g, "$1 — $2")
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
            const isDegreeLine = /\b(b\.?e\.?|b\.?tech|diploma|sslc|10th|12th|bachelor|master|m\.?tech)\b/i.test(line);

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

                const nextNextLine = lines[i + 2] || "";
                let description = "";
                if (nextNextLine && !/\b(b\.?e\.?|b\.?tech|diploma|sslc|10th|12th|institute|college|collage|polytechnic|university)\b/i.test(nextNextLine)) {
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
        const projSectionMatch = text.match(/(?:^|\n)\s*(?:KEY\s+PROJECTS?|PROJECTS)(?:\s*[:\-\–—][^\n]*|\s*)\n+([\s\S]{20,5000}?)(?=(?:\n\s*(?:SKILLS|TECHNICAL\s+SKILLS|EDUCATION|CERTIFICATIONS|LANGUAGES))|$)/i);
        const projects: any[] = [];
        if (!projSectionMatch) return projects;

        const lines = projSectionMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
        let currentProj: any = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const urlMatch = line.match(/https?:\/\/(?:www\.)?github\.com\/[^\s]+/i) || line.match(/https?:\/\/[^\s]+/i);
            const nextLine = lines[i + 1] || "";
            const isProjectHeader = Boolean(urlMatch) || /^(EchoWell|DevCheckpoint|Leaf Disease|ProInterview|Synthetic Data|WorldXNews)/i.test(line) ||
                (/\b(Developer|Engineer|Lead)\b/i.test(nextLine) && /\bTech:\s*/i.test(nextLine));

            if (isProjectHeader && line.length < 90 && !line.startsWith("•") && !line.startsWith("-")) {
                if (currentProj) {
                    projects.push(currentProj);
                }
                const link = urlMatch ? urlMatch[0] : "";
                const name = line.replace(/https?:\/\/[^\s]+/gi, "").trim();

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
                currentProj.description += (currentProj.description ? " " : "") + line.replace(/^[•\-*]\s*/, "");
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
        const certMatch = text.match(/(?:certifications|courses\s*&\s*certifications)[^\n]*\n+([\s\S]{10,2500}?)(?=\n\s*(?:education|skills|projects|languages)|$)/i);
        const certs: Array<{ name: string; issuer: string }> = [];
        if (!certMatch) return certs;

        const lines = certMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            if (/^(certifications|workshops)$/i.test(line)) continue;
            // Only split on em/en-dash or spaced dash, not internal hyphens like EC-Council
            const parts = line.split(/\s+[—–\-]\s+|\s*[—–]\s*/);
            if (parts.length > 1) {
                certs.push({
                    name: parts.slice(0, -1).join(" — ").trim(),
                    issuer: parts[parts.length - 1].trim()
                });
            } else {
                certs.push({ name: line, issuer: "" });
            }
        }
        return certs;
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
        expect(edu[2].cgpa).toBe("65.92");
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
});
