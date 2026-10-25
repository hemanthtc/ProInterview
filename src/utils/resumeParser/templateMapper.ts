import { ResumeData } from "@/components/prointerviewer/types";
import { CanonicalResume, MergePolicy } from "./types";

/**
 * Maps a canonical resume object into the ProInterview ResumeData schema,
 * respecting the chosen merge policy and never silently destroying existing data.
 */
export function mapCanonicalToResumeData(
    canonical: CanonicalResume,
    existingData?: ResumeData | null,
    policy: MergePolicy = "replace"
): ResumeData {
    if (!existingData || policy === "replace") {
        return createFreshResumeData(canonical, existingData);
    }

    if (policy === "smart-merge") {
        return smartMergeResumeData(canonical, existingData);
    }

    if (policy === "fill-empty-only") {
        return fillEmptyOnlyResumeData(canonical, existingData);
    }

    return createFreshResumeData(canonical, existingData);
}

/**
 * Creates fresh ResumeData from canonical resume while preserving existing photo and untouched custom sections.
 */
function createFreshResumeData(canonical: CanonicalResume, existing?: ResumeData | null): ResumeData {
    const p = canonical.personalInfo;

    return {
        personalInfo: {
            name: p.name || existing?.personalInfo.name || "",
            title: p.title || existing?.personalInfo.title || "",
            email: p.email || existing?.personalInfo.email || "",
            phone: p.phone || existing?.personalInfo.phone || "",
            location: p.location || existing?.personalInfo.location || "",
            website: p.website || existing?.personalInfo.website || "",
            linkedin: p.linkedin || existing?.personalInfo.linkedin || "",
            github: p.github || existing?.personalInfo.github || "",
            avatar: p.avatar || existing?.personalInfo.avatar || "",
            summary: p.summary || existing?.personalInfo.summary || ""
        },
        workExperience: canonical.workExperience.map((w, idx) => ({
            id: w.id || `exp-ai-${Date.now()}-${idx}`,
            company: w.company,
            position: w.position,
            location: w.location,
            startDate: w.startDate,
            endDate: w.endDate,
            current: w.current,
            description: w.description
        })),
        education: canonical.education.map((e, idx) => ({
            id: e.id || `edu-ai-${Date.now()}-${idx}`,
            institution: e.institution,
            degree: e.degree,
            fieldOfStudy: e.fieldOfStudy,
            location: e.location,
            startDate: e.startDate,
            endDate: e.endDate,
            cgpa: e.cgpa || "",
            percentage: e.percentage || "",
            description: e.description,
            degreeType: e.degreeType || ""
        })),
        projects: canonical.projects.map((pr, idx) => ({
            id: pr.id || `proj-ai-${Date.now()}-${idx}`,
            name: pr.name,
            description: pr.description,
            technologies: pr.technologies,
            link: pr.link,
            role: pr.role
        })),
        skills: canonical.skills.map((s, idx) => ({
            id: s.id || `skill-ai-${Date.now()}-${idx}`,
            name: s.name,
            level: s.level,
            category: s.category || "Skills"
        })),
        languages: canonical.languages.map((l, idx) => ({
            id: l.id || `lang-ai-${Date.now()}-${idx}`,
            name: l.name,
            proficiency: l.proficiency
        })),
        certifications: canonical.certifications.map((c, idx) => ({
            id: c.id || `cert-ai-${Date.now()}-${idx}`,
            name: c.name,
            issuer: c.issuer,
            date: c.date,
            link: c.link,
            description: c.description || ""
        })),
        customSections: canonical.customSections.length > 0
            ? canonical.customSections.map((cs, sIdx) => ({
                id: cs.id || `custom-ai-${Date.now()}-${sIdx}`,
                title: cs.title,
                items: cs.items.map((it, iIdx) => ({
                    id: it.id || `item-ai-${Date.now()}-${sIdx}-${iIdx}`,
                    title: it.title,
                    subtitle: it.subtitle,
                    date: it.date,
                    description: it.description
                }))
            }))
            : (existing?.customSections || [])
    };
}

/**
 * Merges canonical data with existing data, deduplicating records by title/name/institution.
 */
function smartMergeResumeData(canonical: CanonicalResume, existing: ResumeData): ResumeData {
    const p = canonical.personalInfo;
    const ep = existing.personalInfo;

    const mergedPersonal = {
        name: p.name || ep.name,
        title: p.title || ep.title,
        email: p.email || ep.email,
        phone: p.phone || ep.phone,
        location: p.location || ep.location,
        website: p.website || ep.website,
        linkedin: p.linkedin || ep.linkedin,
        github: p.github || ep.github,
        avatar: ep.avatar || p.avatar || "",
        summary: p.summary || ep.summary
    };

    // Work Experience merge
    const mergedExp = [...existing.workExperience];
    for (const w of canonical.workExperience) {
        const matchIdx = mergedExp.findIndex(e =>
            (e.company && w.company && e.company.toLowerCase().trim() === w.company.toLowerCase().trim()) &&
            (e.position && w.position && e.position.toLowerCase().trim() === w.position.toLowerCase().trim())
        );
        if (matchIdx >= 0) {
            // Update fields if new data has content
            mergedExp[matchIdx] = {
                ...mergedExp[matchIdx],
                location: w.location || mergedExp[matchIdx].location,
                startDate: w.startDate || mergedExp[matchIdx].startDate,
                endDate: w.endDate || mergedExp[matchIdx].endDate,
                current: w.current !== undefined ? w.current : mergedExp[matchIdx].current,
                description: w.description || mergedExp[matchIdx].description
            };
        } else {
            mergedExp.push({
                id: w.id || `exp-merged-${Date.now()}-${mergedExp.length}`,
                company: w.company,
                position: w.position,
                location: w.location,
                startDate: w.startDate,
                endDate: w.endDate,
                current: w.current,
                description: w.description
            });
        }
    }

    // Education merge
    const mergedEdu = [...existing.education];
    for (const e of canonical.education) {
        const matchIdx = mergedEdu.findIndex(ed =>
            (ed.institution && e.institution && ed.institution.toLowerCase().trim() === e.institution.toLowerCase().trim()) ||
            (ed.degree && e.degree && ed.degree.toLowerCase().trim() === e.degree.toLowerCase().trim())
        );
        if (matchIdx >= 0) {
            mergedEdu[matchIdx] = {
                ...mergedEdu[matchIdx],
                fieldOfStudy: e.fieldOfStudy || mergedEdu[matchIdx].fieldOfStudy,
                cgpa: e.cgpa || mergedEdu[matchIdx].cgpa,
                percentage: e.percentage || mergedEdu[matchIdx].percentage,
                startDate: e.startDate || mergedEdu[matchIdx].startDate,
                endDate: e.endDate || mergedEdu[matchIdx].endDate,
                description: e.description || mergedEdu[matchIdx].description
            };
        } else {
            mergedEdu.push({
                id: e.id || `edu-merged-${Date.now()}-${mergedEdu.length}`,
                institution: e.institution,
                degree: e.degree,
                fieldOfStudy: e.fieldOfStudy,
                location: e.location,
                startDate: e.startDate,
                endDate: e.endDate,
                cgpa: e.cgpa || "",
                percentage: e.percentage || "",
                description: e.description,
                degreeType: e.degreeType || ""
            });
        }
    }

    // Projects merge
    const mergedProj = [...existing.projects];
    for (const pr of canonical.projects) {
        const matchIdx = mergedProj.findIndex(p =>
            p.name && pr.name && p.name.toLowerCase().trim() === pr.name.toLowerCase().trim()
        );
        if (matchIdx >= 0) {
            mergedProj[matchIdx] = {
                ...mergedProj[matchIdx],
                technologies: Array.from(new Set([...mergedProj[matchIdx].technologies, ...pr.technologies])),
                description: pr.description || mergedProj[matchIdx].description,
                link: pr.link || mergedProj[matchIdx].link,
                role: pr.role || mergedProj[matchIdx].role
            };
        } else {
            mergedProj.push({
                id: pr.id || `proj-merged-${Date.now()}-${mergedProj.length}`,
                name: pr.name,
                description: pr.description,
                technologies: pr.technologies,
                link: pr.link,
                role: pr.role
            });
        }
    }

    // Skills merge
    const mergedSkills = [...existing.skills];
    for (const s of canonical.skills) {
        if (!mergedSkills.some(sk => sk.name.toLowerCase().trim() === s.name.toLowerCase().trim())) {
            mergedSkills.push({
                id: s.id || `skill-merged-${Date.now()}-${mergedSkills.length}`,
                name: s.name,
                level: s.level,
                category: s.category
            });
        }
    }

    // Languages merge
    const mergedLang = [...existing.languages];
    for (const l of canonical.languages) {
        if (!mergedLang.some(lg => lg.name.toLowerCase().trim() === l.name.toLowerCase().trim())) {
            mergedLang.push({
                id: l.id || `lang-merged-${Date.now()}-${mergedLang.length}`,
                name: l.name,
                proficiency: l.proficiency
            });
        }
    }

    // Certifications merge
    const mergedCerts = [...existing.certifications];
    for (const c of canonical.certifications) {
        if (!mergedCerts.some(ct => ct.name.toLowerCase().trim() === c.name.toLowerCase().trim())) {
            mergedCerts.push({
                id: c.id || `cert-merged-${Date.now()}-${mergedCerts.length}`,
                name: c.name,
                issuer: c.issuer,
                date: c.date,
                link: c.link,
                description: c.description || ""
            });
        }
    }

    // Custom Sections merge
    const mergedCustom = [...existing.customSections];
    for (const cs of canonical.customSections) {
        const matchSec = mergedCustom.find(s => s.title.toLowerCase().trim() === cs.title.toLowerCase().trim());
        if (!matchSec) {
            mergedCustom.push({
                id: cs.id || `custom-merged-${Date.now()}-${mergedCustom.length}`,
                title: cs.title,
                items: cs.items.map((it, iIdx) => ({
                    id: it.id || `item-merged-${Date.now()}-${iIdx}`,
                    title: it.title,
                    subtitle: it.subtitle,
                    date: it.date,
                    description: it.description
                }))
            });
        }
    }

    return {
        personalInfo: mergedPersonal,
        workExperience: mergedExp,
        education: mergedEdu,
        projects: mergedProj,
        skills: mergedSkills,
        languages: mergedLang,
        certifications: mergedCerts,
        customSections: mergedCustom
    };
}

/**
 * Fills only empty fields in the existing resume, never replacing existing user content.
 */
function fillEmptyOnlyResumeData(canonical: CanonicalResume, existing: ResumeData): ResumeData {
    return {
        personalInfo: {
            name: existing.personalInfo.name || canonical.personalInfo.name,
            title: existing.personalInfo.title || canonical.personalInfo.title,
            email: existing.personalInfo.email || canonical.personalInfo.email,
            phone: existing.personalInfo.phone || canonical.personalInfo.phone,
            location: existing.personalInfo.location || canonical.personalInfo.location,
            website: existing.personalInfo.website || canonical.personalInfo.website,
            linkedin: existing.personalInfo.linkedin || canonical.personalInfo.linkedin,
            github: existing.personalInfo.github || canonical.personalInfo.github,
            avatar: existing.personalInfo.avatar,
            summary: existing.personalInfo.summary || canonical.personalInfo.summary
        },
        workExperience: existing.workExperience.length > 0
            ? existing.workExperience
            : canonical.workExperience.map((w, idx) => ({ ...w, id: `exp-${Date.now()}-${idx}` })),
        education: existing.education.length > 0
            ? existing.education
            : canonical.education.map((e, idx) => ({ ...e, id: `edu-${Date.now()}-${idx}`, cgpa: e.cgpa || "", percentage: e.percentage || "", degreeType: e.degreeType || "" })),
        projects: existing.projects.length > 0
            ? existing.projects
            : canonical.projects.map((p, idx) => ({ ...p, id: `proj-${Date.now()}-${idx}` })),
        skills: existing.skills.length > 0
            ? existing.skills
            : canonical.skills.map((s, idx) => ({ ...s, id: `skill-${Date.now()}-${idx}` })),
        languages: existing.languages.length > 0
            ? existing.languages
            : canonical.languages.map((l, idx) => ({ ...l, id: `lang-${Date.now()}-${idx}` })),
        certifications: existing.certifications.length > 0
            ? existing.certifications
            : canonical.certifications.map((c, idx) => ({ ...c, id: `cert-${Date.now()}-${idx}`, description: c.description || "" })),
        customSections: existing.customSections.length > 0
            ? existing.customSections
            : canonical.customSections.map((cs, sIdx) => ({
                id: `custom-${Date.now()}-${sIdx}`,
                title: cs.title,
                items: cs.items.map((it, iIdx) => ({ ...it, id: `item-${Date.now()}-${sIdx}-${iIdx}` }))
            }))
    };
}
