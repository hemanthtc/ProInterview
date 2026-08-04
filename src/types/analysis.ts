export type EmailType = "job_invite" | "offer_letter" | "unknown" | string;

export interface EmailExtractedDetails {
    company?: string;
    location?: string;
    role?: string;
    skills?: string[];
    platformOrFormat?: string;
    interviewDate?: string;
    hrName?: string;
    meetingUrl?: string;
    [key: string]: unknown;
}

export interface EmailAnalysisResult {
    emailType: EmailType;
    extractedDetails: EmailExtractedDetails;
    importantPoints?: string | string[];
    mandatoryThings?: string | string[];
    [key: string]: unknown;
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
