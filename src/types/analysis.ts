export type EmailType = "job_invite" | "offer_letter" | "unknown" | string;

export interface SalaryDetails {
    baseSalary?: string;
    benefits?: string[];
    joiningDate?: string;
    [key: string]: unknown;
}

export interface EmailExtractedDetails {
    company?: string;
    location?: string;
    role?: string;
    requiredSkills?: string[];
    skills?: string[];
    meetingPlatform?: string;
    platformOrFormat?: string;
    schedule?: string;
    interviewDate?: string;
    salary?: string;
    salaryDetails?: SalaryDetails | string;
    basePay?: string;
    benefits?: string;
    joiningDate?: string;
    hrName?: string;
    emailSnippet?: string;
    meetingUrl?: string;
    [key: string]: unknown;
}

export interface EmailAnalysisResult {
    emailType: EmailType;
    extractedDetails: EmailExtractedDetails;
    importantPoints?: string | string[];
    mandatoryThings?: string | string[];
    scores?: {
        companyScore?: number;
        locationScore?: number;
        authenticityScore?: number;
        [key: string]: number | undefined;
    };
    summary?: string;
    [key: string]: unknown;
}

export interface VerificationResult {
    companyScore?: number;
    locationScore?: number;
    authenticityScore?: number;
    [key: string]: number | undefined;
}

export interface InterviewScoreBreakdown {
    technical?: number;
    communication?: number;
    behavioral?: number;
    iScore?: number;
    finalScore?: number;
    reportMarkdown?: string;
}

export interface SystemDesignEval {
    overall: number;
    scores: Record<string, number>;
    strengths: string[];
    gaps: string[];
}

export interface AtsMatchResult {
    matchPercent: number;
    keywordHits: string[];
    keywordGaps: string[];
    readyForMock?: boolean;
}
