export interface ProfileInterviewSession {
    timestamp: number;
    updatedAt?: number;
    finalScore?: number;
    technicalRating?: number;
    behavioralRating?: number;
    communicationRating?: number;
    portfolioRating?: number | string;
    interviewRating?: number;
    summary?: string;
    transcript?: string;
    company?: string;
    role?: string;
    [key: string]: unknown;
}

export type ProfileToastType = "success" | "error" | "info";

export interface ProfileToastState {
    show: boolean;
    message: string;
    type: ProfileToastType;
}
