import { CanonicalEducation, CanonicalResume, CanonicalWorkExperience, ExtractionWarning } from "./types";
import { detectSections } from "./sectionDetector";
import { extractScoreDetails, separateDegreeAndField, classifyEducationTier } from "./educationClassifier";

/**
 * Validates and repairs the canonical resume against the source text to ensure 100% record completeness.
 */
export function validateAndRepairAgainstSource(
    canonical: CanonicalResume,
    rawText: string
): CanonicalResume {
    const warnings: ExtractionWarning[] = [...canonical.metadata.warnings];

    if (!rawText || rawText.trim().length === 0) {
        return canonical;
    }

    const detectedSections = detectSections(rawText);

    // 1. Education Completeness Verification
    // Check if the source text contains degrees not present in canonical.education
    const knownDegreePatterns = [
        { regex: /\b(sslc|class\s*x\b|10th\s*standard|matriculation)\b/i, name: "10th / SSLC" },
        { regex: /\b(puc|class\s*xii\b|12th\s*standard|higher\s*secondary|pre-university|hsc)\b/i, name: "12th / PUC" },
        { regex: /\b(iti|industrial\s*training\s*institute)\b/i, name: "ITI" },
        { regex: /\b(polytechnic|diploma\s+in\b)/i, name: "Diploma" },
        { regex: /\b(b\.?e\b|b\.?tech\b|bachelor\s+of\s+(?:technology|engineering|science|commerce|arts))\b/i, name: "Bachelor's Degree" },
        { regex: /\b(m\.?tech\b|m\.?e\b|mba|m\.?b\.?a|master\s+of\s+(?:technology|engineering|science|business|commerce|arts))\b/i, name: "Master's Degree" },
        { regex: /\b(ph\.?d\b|doctorate)\b/i, name: "Ph.D." }
    ];

    const currentEduText = canonical.education.map(e => `${e.degree} ${e.fieldOfStudy} ${e.institution}`).join(" ").toLowerCase();

    for (const degPat of knownDegreePatterns) {
        if (degPat.regex.test(rawText)) {
            // Check if this degree exists in canonical education
            const isPresent = canonical.education.some(e => {
                const itemText = `${e.degree} ${e.fieldOfStudy} ${e.institution} ${e.degreeType}`.toLowerCase();
                return degPat.regex.test(itemText) || itemText.includes(degPat.name.toLowerCase());
            });

            if (!isPresent) {
                // The AI omitted a degree that is clearly present in the source text!
                // Search the raw text or detected education section to recover this entry
                const eduSection = detectedSections.find(s => s.type === "education");
                const searchTarget = eduSection ? eduSection.rawContent : rawText;
                const recovered = recoverMissingDegree(searchTarget, degPat.regex);

                if (recovered) {
                    canonical.education.push({
                        ...recovered,
                        id: `edu-recovered-${canonical.education.length}`
                    });
                    warnings.push({
                        code: "RECOVERED_OMITTED_QUALIFICATION",
                        message: `Recovered ${degPat.name} from source document that was omitted by AI extractor.`,
                        section: "education",
                        severity: "info"
                    });
                }
            }
        }
    }

    // 2. Work Experience vs Internship Check
    // If source document has an INTERNSHIP section header, ensure each internship is recorded
    const internshipSection = detectedSections.find(s =>
        s.type === "workExperience" &&
        /(?:internship[s]?|industrial\s+training)/i.test(s.originalTitle)
    );

    if (internshipSection) {
        // Ensure each internship from the dedicated section is present
        const recoveredJobs = extractInternshipsFromText(internshipSection.rawContent);
        for (const job of recoveredJobs) {
            const alreadyExists = canonical.workExperience.some(w =>
                w.company.toLowerCase().includes(job.company.toLowerCase()) ||
                job.company.toLowerCase().includes(w.company.toLowerCase())
            );
            if (!alreadyExists) {
                canonical.workExperience.push(job);
                warnings.push({
                    code: "RECOVERED_INTERNSHIPS",
                    message: `Extracted internship at "${job.company}" from the Internship section.`,
                    section: "workExperience",
                    severity: "info"
                });
            }
        }
    }

    // Ensure all internship records have the internship employmentType and appropriate position tag
    canonical.workExperience.forEach(job => {
        if (/intern/i.test(`${job.position} ${job.company}`) || (internshipSection && internshipSection.rawContent.toLowerCase().includes(job.company.toLowerCase()))) {
            job.employmentType = "internship";
            if (!/intern/i.test(job.position)) {
                job.position = `${job.position} — Internship`;
            }
        }
    });

    // 3. Project Merging Check:
    // If the raw text has multiple distinct numbered projects or project headers (e.g. 4 projects),
    // but canonical.projects has fewer, warn the user.
    const projSection = detectedSections.find(s => s.type === "projects");
    if (projSection) {
        const titleMatches = projSection.rawContent.match(/(?:^|\n)\s*(?:[A-Z0-9][a-zA-Z0-9\s/&-]{3,50})(?:\s*https?:\/\/github|\n\s*Role:|\n\s*Tech:)/g) || [];
        if (titleMatches.length > canonical.projects.length + 1) {
            warnings.push({
                code: "POTENTIAL_PROJECTS_UNMERGED",
                message: `Source document appears to contain approximately ${titleMatches.length} projects, while ${canonical.projects.length} were extracted. Please review the Projects section.`,
                section: "projects",
                severity: "warning"
            });
        }
    }

    // 4. Custom Sections Verification
    // Check if any detected custom section is missing from canonical.customSections
    const unmappedCustomSections = detectedSections.filter(s =>
        s.type === "custom" &&
        !canonical.customSections.some(cs => cs.title.toLowerCase().trim() === s.originalTitle.toLowerCase().trim())
    );

    for (const unmapped of unmappedCustomSections) {
        const items = unmapped.rawContent.split("\n").map(l => l.trim()).filter(Boolean).map((line, idx) => ({
            id: `item-unmapped-${idx}`,
            title: line.replace(/^[•\-*]\s*/, ""),
            subtitle: "",
            date: "",
            description: line
        }));

        if (items.length > 0) {
            canonical.customSections.push({
                id: `custom-sec-${canonical.customSections.length}`,
                title: unmapped.originalTitle,
                items: items.slice(0, 10)
            });
            warnings.push({
                code: "PRESERVED_CUSTOM_SECTION",
                message: `Preserved custom section "${unmapped.originalTitle}" from source document.`,
                section: "customSections",
                severity: "info"
            });
        }
    }

    // 5. Update Metadata Record Counts and Warnings
    canonical.metadata.warnings = warnings;
    canonical.metadata.recordCounts = {
        education: canonical.education.length,
        workExperience: canonical.workExperience.length,
        projects: canonical.projects.length,
        skills: canonical.skills.length,
        certifications: canonical.certifications.length,
        languages: canonical.languages.length,
        customSections: canonical.customSections.length
    };

    return canonical;
}

/**
 * Recovers a missing degree entry from the raw text using the matching pattern.
 */
function recoverMissingDegree(text: string, pattern: RegExp): CanonicalEducation | null {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line)) {
            const nextLine = lines[i + 1] || "";
            const isInst = /\b(institute|university|college|polytechnic|school|academy)\b/i.test(nextLine);

            let degree = line;
            let institution = isInst ? nextLine : "Institution";
            let startDate = "";
            let endDate = "";

            const dateMatch = (line + " " + nextLine).match(/\b(\d{1,2}\/\d{4}|\d{4})\s*[-–to\s]+\s*(\d{1,2}\/\d{4}|\d{4}|present|current)\b/i);
            if (dateMatch) {
                startDate = dateMatch[1];
                endDate = /present|current/i.test(dateMatch[2]) ? "Present" : dateMatch[2];
                degree = degree.replace(dateMatch[0], "").trim();
            }

            const scoreInfo = extractScoreDetails(line + " " + nextLine);
            const { degree: cleanDeg, fieldOfStudy } = separateDegreeAndField(degree);
            const tier = classifyEducationTier(cleanDeg, fieldOfStudy, institution);

            return {
                id: "edu-rec",
                degree: cleanDeg,
                fieldOfStudy,
                institution,
                location: "",
                startDate,
                endDate,
                cgpa: scoreInfo.scoreType === "cgpa" ? scoreInfo.scoreValue : "",
                percentage: scoreInfo.scoreType === "percentage" ? scoreInfo.scoreValue : "",
                scoreType: scoreInfo.scoreType,
                scoreValue: scoreInfo.scoreValue,
                description: "",
                degreeType: tier,
                originalDegreeName: degree
            };
        }
    }
    return null;
}

/**
 * Extracts individual internship entries from an Internship section text.
 */
function extractInternshipsFromText(text: string): CanonicalWorkExperience[] {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const jobs: CanonicalWorkExperience[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\d{1,2}\/\d{4}|\d{4})\s*[-–—to\s]+\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\d{1,2}\/\d{4}|\d{4}|present|current)\b/i);

        if (dateMatch) {
            const pos = line.replace(dateMatch[0], "").replace(/[-–—|]/g, "").trim() || "Intern";
            const nextL = lines[i + 1] || "Company";
            jobs.push({
                id: `exp-intern-${jobs.length}`,
                position: /intern/i.test(pos) ? pos : `${pos} — Internship`,
                company: nextL,
                location: "",
                startDate: dateMatch[1],
                endDate: /present|current/i.test(dateMatch[2]) ? "" : dateMatch[2],
                current: /present|current/i.test(dateMatch[2]),
                description: "",
                employmentType: "internship"
            });
            if (nextL !== "Company") i++;
        }
    }

    return jobs;
}
