/**
 * Formats structured resume data to clean plain text for profile import and ATS ingestion,
 * strictly honoring section visibility toggles (style.visibleSections) and item-level
 * hidden flags (item.hidden).
 */
export function formatResumeDataToText(data: any, style?: any): string {
    if (!data) return "";
    let text = "";
    const visible = style?.visibleSections || {};

    // Personal Info
    const p = data.personalInfo || {};
    if (p.name) text += `${p.name}\n`;
    if (p.title) text += `${p.title}\n`;

    const contactParts: string[] = [];
    if (p.email) contactParts.push(p.email);
    if (p.phone) contactParts.push(p.phone);
    if (p.location) contactParts.push(p.location);
    if (contactParts.length > 0) {
        text += contactParts.join(" | ") + "\n";
    }

    const socialParts: string[] = [];
    if (p.linkedin) socialParts.push(p.linkedin);
    if (p.github) socialParts.push(p.github);
    if (p.website) socialParts.push(p.website);
    if (socialParts.length > 0) {
        text += socialParts.join(" | ") + "\n";
    }

    // Summary: only if summary section is not hidden
    if (visible.summary !== false && p.summary) {
        text += `\nProfessional Summary:\n${p.summary}\n`;
    }

    // Experience: only if experience section is not hidden, and filter out hidden items
    if (visible.experience !== false) {
        const rawExp = data.workExperience || data.experience || [];
        const exp = rawExp.filter((e: any) => !e.hidden);
        if (exp.length > 0) {
            text += `\nWork Experience:\n`;
            exp.forEach((e: any) => {
                const dateStr = e.startDate || e.endDate 
                    ? ` (${e.startDate || ""} - ${e.endDate || (e.current ? "Present" : "")})` 
                    : "";
                const locStr = e.location ? ` - ${e.location}` : "";
                text += `- ${e.position || "Role"} at ${e.company || "Company"}${dateStr}${locStr}\n`;
                if (e.description) text += `  ${e.description}\n`;
            });
        }
    }

    // Education: only if education section is not hidden, and filter out hidden items
    if (visible.education !== false) {
        const rawEdu = data.education || [];
        const edu = rawEdu.filter((e: any) => !e.hidden);
        if (edu.length > 0) {
            text += `\nEducation:\n`;
            edu.forEach((e: any) => {
                const schoolName = e.institution || e.school || "";
                const dateStr = e.startDate || e.endDate 
                    ? ` (${e.startDate || ""} - ${e.endDate || ""})` 
                    : "";
                const scoreParts: string[] = [];
                if (e.cgpa) scoreParts.push(`CGPA: ${e.cgpa}`);
                if (e.percentage) scoreParts.push(`Percentage: ${e.percentage}`);
                const scoreStr = scoreParts.length > 0 ? ` [${scoreParts.join(", ")}]` : "";
                const locStr = e.location ? ` - ${e.location}` : "";

                text += `- ${e.degree || "Degree"} in ${e.fieldOfStudy || "Field"} from ${schoolName}${dateStr}${locStr}${scoreStr}\n`;
                if (e.description) text += `  ${e.description}\n`;
            });
        }
    }

    // Skills: only if skills section is not hidden, and filter out hidden skills
    if (visible.skills !== false) {
        const rawSkills = data.skills || [];
        const skills = rawSkills.filter((s: any) => !s.hidden);
        if (skills.length > 0) {
            text += `\nSkills:\n`;
            const skillList = skills.map((s: any) => {
                if (typeof s === "string") return s;
                if (s.name) {
                    return s.level ? `${s.name} (${s.level})` : s.name;
                }
                return "";
            }).filter(Boolean);
            if (skillList.length > 0) {
                text += skillList.join(" | ") + "\n";
            }
        }
    }

    // Projects: only if projects section is not hidden, and filter out hidden projects
    if (visible.projects !== false) {
        const rawProjects = data.projects || [];
        const projects = rawProjects.filter((pr: any) => !pr.hidden);
        if (projects.length > 0) {
            text += `\nProjects:\n`;
            projects.forEach((pr: any) => {
                const projectUrl = pr.link || pr.url || "";
                const techStr = Array.isArray(pr.technologies) && pr.technologies.length > 0 
                    ? ` [Tech: ${pr.technologies.join(", ")}]` 
                    : "";
                const roleStr = pr.role ? ` (Role: ${pr.role})` : "";

                text += `- ${pr.name || "Project"}${roleStr}${techStr}${projectUrl ? ` (${projectUrl})` : ""}\n`;
                if (pr.description) text += `  ${pr.description}\n`;
            });
        }
    }

    // Languages: only if languages section is not hidden, and filter out hidden languages
    if (visible.languages !== false) {
        const rawLanguages = data.languages || [];
        const languages = rawLanguages.filter((l: any) => !l.hidden);
        if (languages.length > 0) {
            text += `\nLanguages:\n`;
            const langList = languages.map((l: any) => {
                if (typeof l === "string") return l;
                if (l.name) {
                    return l.proficiency ? `${l.name} (${l.proficiency})` : l.name;
                }
                return "";
            }).filter(Boolean);
            if (langList.length > 0) {
                text += langList.join(" | ") + "\n";
            }
        }
    }

    // Certifications: only if certifications section is not hidden, and filter out hidden certifications
    if (visible.certifications !== false) {
        const rawCertifications = data.certifications || [];
        const certifications = rawCertifications.filter((c: any) => !c.hidden);
        if (certifications.length > 0) {
            text += `\nCertifications:\n`;
            certifications.forEach((c: any) => {
                const dateStr = c.date ? ` (${c.date})` : "";
                const urlStr = c.link || c.url ? ` - Link: ${c.link || c.url}` : "";
                const issuerStr = c.issuer ? ` by ${c.issuer}` : "";
                text += `- ${c.name || "Certification"}${issuerStr}${dateStr}${urlStr}\n`;
                if (c.description) text += `  ${c.description}\n`;
            });
        }
    }

    // Custom Sections: only if custom sections is not hidden, and filter out hidden items
    if (visible.customSections !== false) {
        const custom = data.customSections || [];
        if (custom.length > 0) {
            custom.forEach((sect: any) => {
                const visibleItems = (sect.items || []).filter((item: any) => !item.hidden);
                if (sect.title && visibleItems.length > 0) {
                    text += `\n${sect.title}:\n`;
                    visibleItems.forEach((item: any) => {
                        const dateStr = item.date ? ` (${item.date})` : "";
                        const subStr = item.subtitle ? ` - ${item.subtitle}` : "";
                        text += `- ${item.title || "Item"}${subStr}${dateStr}\n`;
                        if (item.description) text += `  ${item.description}\n`;
                    });
                }
            });
        }
    }

    return text.trim();
}
