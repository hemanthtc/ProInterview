export type QualificationTier =
    | "10th"
    | "12th"
    | "vocational" // ITI, trade certifications
    | "diploma"    // Polytechnic, engineering diploma, associate degree
    | "ug"         // Bachelor's degrees (B.E., B.Tech, B.Sc, B.Com, etc.)
    | "pg"         // Master's degrees (M.Tech, MBA, M.Sc, etc.)
    | "phd"        // Doctorate / Ph.D. / Research fellowships
    | "other";     // Preserves original name when category cannot be proven

export type ScoreType = "cgpa" | "percentage" | "gpa" | "marks" | "none";

export interface CanonicalPersonalInfo {
    name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    linkedin: string;
    github: string;
    avatar?: string;
    summary: string;
}

export interface CanonicalWorkExperience {
    id: string;
    company: string;
    position: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
    employmentType?: "full-time" | "part-time" | "internship" | "contract" | "freelance" | "unspecified";
    sourceEvidence?: string;
}

export interface CanonicalEducation {
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy: string;
    location: string;
    startDate: string;
    endDate: string;
    cgpa?: string;
    percentage?: string;
    scoreType?: ScoreType;
    scoreValue?: string;
    description: string;
    degreeType?: QualificationTier;
    originalDegreeName?: string;
    sourceEvidence?: string;
}

export interface CanonicalProject {
    id: string;
    name: string;
    description: string;
    technologies: string[];
    link: string;
    role: string;
    sourceEvidence?: string;
}

export interface CanonicalSkill {
    id: string;
    name: string;
    level: string; // e.g. "Beginner", "Intermediate", "Advanced", "Expert", or ""
    category: string; // e.g. "Languages", "Frameworks", "Tools", "Core"
}

export interface CanonicalLanguage {
    id: string;
    name: string;
    proficiency: string; // e.g. "Native", "Fluent", "Conversational", "Basic"
}

export interface CanonicalCertification {
    id: string;
    name: string;
    issuer: string;
    date: string;
    link: string;
    description?: string;
}

export interface CanonicalCustomSectionItem {
    id: string;
    title: string;
    subtitle: string;
    date: string;
    description: string;
}

export interface CanonicalCustomSection {
    id: string;
    title: string;
    items: CanonicalCustomSectionItem[];
}

export interface ExtractionWarning {
    code: string;
    message: string;
    section?: string;
    severity: "info" | "warning" | "error";
    details?: string;
}

export interface ExtractionMetadata {
    sourceFormat: "pdf" | "docx" | "txt" | "image" | "url" | "text" | "mixed";
    extractionMethod: "pdf-text" | "pdf-multimodal" | "docx-xml" | "plain-text" | "vision" | "fallback";
    isScanned: boolean;
    pageCount?: number;
    rawCharCount: number;
    warnings: ExtractionWarning[];
    unmappedSections: Array<{ title: string; content: string }>;
    recordCounts: {
        education: number;
        workExperience: number;
        projects: number;
        skills: number;
        certifications: number;
        languages: number;
        customSections: number;
    };
    confidenceScore: number; // 0 - 100
    isFallback?: boolean;
}

export interface CanonicalResume {
    personalInfo: CanonicalPersonalInfo;
    workExperience: CanonicalWorkExperience[];
    education: CanonicalEducation[];
    projects: CanonicalProject[];
    skills: CanonicalSkill[];
    languages: CanonicalLanguage[];
    certifications: CanonicalCertification[];
    customSections: CanonicalCustomSection[];
    metadata: ExtractionMetadata;
}

export interface DocumentExtractionResult {
    rawText: string;
    sourceFormat: ExtractionMetadata["sourceFormat"];
    extractionMethod: ExtractionMetadata["extractionMethod"];
    isScanned: boolean;
    pageCount?: number;
    binaryPart?: {
        inlineData: {
            data: string;
            mimeType: string;
        };
    };
    warnings: ExtractionWarning[];
}

export type MergePolicy = "replace" | "smart-merge" | "fill-empty-only";
