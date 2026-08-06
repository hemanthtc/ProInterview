export interface SavedResume {
    id: string;
    title: string;
    updatedAt: number;
    templateId: string;
    name: string;
    email: string;
    phone: string;
    summary: string;
    skills: string;
    experience: string;
    education: string;
    projects: string;
    internships: string;
    certifications?: string;
    awards?: string;
    accentColor?: string;
    fontSize?: number;
}

export interface RoadmapPhase {
    title?: string;
    phase?: string;
    duration?: string;
    description?: string;
    topics?: string[];
    tasks?: string[];
    resources?: string[];
    [key: string]: unknown;
}

export interface RoadmapData {
    overview?: string;
    timeline?: RoadmapPhase[];
    interviewTips?: string[];
    [key: string]: unknown;
}

export interface SavedRoadmap {
    id: string;
    course: string;
    company: string;
    location: string;
    additionalInfo: string;
    createdAt: number;
    roadmapData: RoadmapData;
    tasksChecked: Record<string, boolean>;
}

export interface PortfolioAnalysisCache {
    completed: boolean;
    rating: number;
    feedback: string;
    analyzedAt: number;
}

export interface PausedInterviewSession {
    resumeText?: string;
    mode?: string;
    timestamp?: number;
    [key: string]: unknown;
}
